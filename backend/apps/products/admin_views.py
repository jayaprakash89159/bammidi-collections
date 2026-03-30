"""
Admin-specific product management views with full CRUD + multi-image upload.
"""
import json
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from .models import Category, Product, Inventory
from .serializers import (
    CategorySerializer, ProductDetailSerializer,
    ProductCreateUpdateSerializer, InventorySerializer,
)


def _save_additional_images(request, product):
    """Save extra uploaded images into product.additional_images (absolute URLs)."""
    files = request.FILES.getlist('additional_images_upload')
    if not files:
        return
    urls = []
    for f in files[:3]:
        path = default_storage.save(
            f'products/extra/{product.id}_{f.name}',
            ContentFile(f.read())
        )
        abs_url = request.build_absolute_uri(default_storage.url(path))
        urls.append(abs_url)
    if urls:
        existing = list(product.additional_images or [])
        product.additional_images = existing + urls
        product.save(update_fields=['additional_images'])


def _parse_sizes(data):
    """
    Parse available_sizes from any format into a Python list.
    Handles: JSON string, comma-separated string, already-a-list, QueryDict.
    Returns a regular mutable dict.
    """
    # Convert QueryDict / immutable dict to a normal mutable dict
    if hasattr(data, 'dict'):
        data = data.dict()
    else:
        data = dict(data)

    raw = data.get('available_sizes', '')

    # Already a list — fine
    if isinstance(raw, list):
        return data

    if isinstance(raw, str):
        stripped = raw.strip()
        if not stripped:
            data['available_sizes'] = []
            return data
        # Try JSON first: ["S","M","L"]
        try:
            parsed = json.loads(stripped)
            if isinstance(parsed, list):
                data['available_sizes'] = [str(s).strip() for s in parsed if str(s).strip()]
            else:
                data['available_sizes'] = [str(parsed).strip()]
            return data
        except (json.JSONDecodeError, ValueError):
            pass
        # Fall back: plain comma-separated  →  "S, M, L, XL"  or  "Free Size"
        data['available_sizes'] = [s.strip() for s in stripped.split(',') if s.strip()]

    return data


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_all_products(request):
    """Get ALL products (including inactive) for admin."""
    products = (
        Product.objects.all()
        .select_related('category', 'inventory')
        .order_by('-created_at')
    )
    return Response(
        ProductDetailSerializer(products, many=True, context={'request': request}).data
    )


@api_view(['POST'])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_create_product(request):
    """Create a product with primary + up-to-3 additional image uploads."""
    data = _parse_sizes(request.data.copy())
    serializer = ProductCreateUpdateSerializer(data=data)
    if serializer.is_valid():
        product = serializer.save()
        _save_additional_images(request, product)
        return Response(
            ProductDetailSerializer(product, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_product_detail(request, product_id):
    """Admin get / update / soft-delete a product."""
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(ProductDetailSerializer(product, context={'request': request}).data)

    elif request.method in ['PUT', 'PATCH']:
        data = _parse_sizes(request.data.copy())
        partial = request.method == 'PATCH'
        serializer = ProductCreateUpdateSerializer(product, data=data, partial=partial)
        if serializer.is_valid():
            product = serializer.save()
            _save_additional_images(request, product)
            return Response(ProductDetailSerializer(product, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        product.is_active = False
        product.save()
        return Response({'message': 'Product deactivated'})


@api_view(['GET', 'POST', 'PUT', 'DELETE'])
@permission_classes([IsAdminUser])
def admin_categories(request, category_id=None):
    """Admin category management — list, create, update, deactivate."""
    if request.method == 'GET' and category_id is None:
        cats = Category.objects.all().order_by('sort_order', 'name')
        return Response(CategorySerializer(cats, many=True, context={'request': request}).data)

    elif request.method == 'POST':
        serializer = CategorySerializer(data=request.data)
        if serializer.is_valid():
            cat = serializer.save()
            return Response(
                CategorySerializer(cat, context={'request': request}).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif category_id:
        try:
            cat = Category.objects.get(id=category_id)
        except Category.DoesNotExist:
            return Response({'error': 'Category not found'}, status=status.HTTP_404_NOT_FOUND)

        if request.method == 'PUT':
            serializer = CategorySerializer(cat, data=request.data, partial=True)
            if serializer.is_valid():
                cat = serializer.save()
                return Response(CategorySerializer(cat, context={'request': request}).data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        elif request.method == 'DELETE':
            cat.is_active = False
            cat.save()
            return Response({'message': 'Category deactivated'})

    return Response({'error': 'Invalid request'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_inventory_list(request):
    """Get all inventory records with low-stock alerts."""
    inventories = Inventory.objects.all().select_related('product')
    data = []
    for inv in inventories:
        image_url = None
        if inv.product.image:
            try:
                image_url = request.build_absolute_uri(inv.product.image.url)
            except Exception:
                pass
        data.append({
            'product_id': inv.product.id,
            'product_name': inv.product.name,
            'product_image': image_url,
            'quantity': inv.quantity,
            'reserved_quantity': inv.reserved_quantity,
            'available_quantity': inv.available_quantity,
            'low_stock_threshold': inv.low_stock_threshold,
            'is_low_stock': inv.is_low_stock,
        })
    return Response(data)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def admin_update_inventory(request, product_id):
    """Update quantity and/or low-stock threshold for a product."""
    try:
        inv = Inventory.objects.get(product_id=product_id)
    except Inventory.DoesNotExist:
        return Response({'error': 'Inventory not found'}, status=status.HTTP_404_NOT_FOUND)

    if 'quantity' in request.data:
        inv.quantity = int(request.data['quantity'])
    if 'low_stock_threshold' in request.data:
        inv.low_stock_threshold = int(request.data['low_stock_threshold'])
    inv.save()
    return Response(InventorySerializer(inv).data)

from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Category, Product, Inventory
from .serializers import (
    CategorySerializer, ProductListSerializer, ProductDetailSerializer,
    ProductCreateUpdateSerializer, InventorySerializer
)
from .filters import ProductFilter


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.filter(is_active=True).select_related('category', 'inventory')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ['name', 'description', 'brand', 'tags']
    ordering_fields = ['price', 'created_at', 'name']
    ordering = ['-created_at']
    lookup_field = 'slug'

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'update_stock']:
            return [IsAdminUser()]
        return [AllowAny()]

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return ProductCreateUpdateSerializer
        return ProductDetailSerializer

    @action(detail=True, methods=['patch'], permission_classes=[IsAdminUser])
    def update_stock(self, request, slug=None):
        product = self.get_object()
        quantity = request.data.get('quantity')
        if quantity is None:
            return Response({'error': 'Quantity required'}, status=status.HTTP_400_BAD_REQUEST)
        inventory, _ = Inventory.objects.get_or_create(product=product)
        inventory.quantity = int(quantity)
        inventory.save()
        return Response(InventorySerializer(inventory).data)

    @action(detail=False, methods=['get'])
    def featured(self, request):
        featured = Product.objects.filter(is_active=True, is_featured=True).select_related('category', 'inventory')[:8]
        return Response(ProductListSerializer(featured, many=True).data)

    @action(detail=False, methods=['get'])
    def by_category(self, request):
        category_slug = request.query_params.get('category')
        if not category_slug:
            return Response({'error': 'Category slug required'}, status=status.HTTP_400_BAD_REQUEST)
        products = self.get_queryset().filter(category__slug=category_slug)
        page = self.paginate_queryset(products)
        if page is not None:
            return self.get_paginated_response(ProductListSerializer(page, many=True).data)
        return Response(ProductListSerializer(products, many=True).data)

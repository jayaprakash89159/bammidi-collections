"""
CSV bulk product upload for admin.
Supports: name, slug, category, price, mrp, brand, description, fabric,
          color, occasion, available_sizes, care_instructions, tags,
          stock_quantity, is_active, is_featured, is_new_arrival,
          image_url (optional public URL that gets downloaded)
"""
import csv
import io
import json
import requests
from django.core.files.base import ContentFile
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from .models import Category, Product, Inventory


def _to_bool(val: str, default=False) -> bool:
    if isinstance(val, bool):
        return val
    return str(val).strip().lower() in ('1', 'true', 'yes', 'y') if val else default


def _parse_sizes_csv(val: str):
    """Convert 'S, M, L' or '["S","M","L"]' to list."""
    if not val or not val.strip():
        return []
    stripped = val.strip()
    try:
        parsed = json.loads(stripped)
        if isinstance(parsed, list):
            return [str(s).strip() for s in parsed if str(s).strip()]
    except (json.JSONDecodeError, ValueError):
        pass
    return [s.strip() for s in stripped.split(',') if s.strip()]


def _get_or_create_category(name: str):
    if not name or not name.strip():
        return None
    name = name.strip()
    slug = name.lower().replace(' ', '-').replace('/', '-')
    cat, _ = Category.objects.get_or_create(
        slug=slug,
        defaults={'name': name, 'is_active': True}
    )
    return cat


def _make_slug(name: str, existing_slugs: set) -> str:
    base = name.lower().strip().replace(' ', '-')
    import re
    base = re.sub(r'[^a-z0-9-]', '', base)
    base = re.sub(r'-+', '-', base).strip('-')
    slug = base
    counter = 1
    while slug in existing_slugs or Product.objects.filter(slug=slug).exists():
        slug = f'{base}-{counter}'
        counter += 1
    existing_slugs.add(slug)
    return slug


def _download_image(url: str, product_name: str):
    """Download image from URL and return (filename, ContentFile) or (None, None)."""
    try:
        resp = requests.get(url.strip(), timeout=10, stream=True)
        if resp.status_code == 200:
            content_type = resp.headers.get('Content-Type', 'image/jpeg')
            ext = 'jpg'
            if 'png' in content_type:
                ext = 'png'
            elif 'webp' in content_type:
                ext = 'webp'
            safe_name = product_name.lower().replace(' ', '_')[:30]
            fname = f'{safe_name}.{ext}'
            return fname, ContentFile(resp.content)
    except Exception:
        pass
    return None, None


EXPECTED_COLUMNS = [
    'name', 'category', 'price', 'mrp', 'brand',
    'description', 'fabric', 'color', 'occasion',
    'available_sizes', 'care_instructions', 'tags',
    'stock_quantity', 'is_active', 'is_featured', 'is_new_arrival',
    'image_url',
]


@api_view(['POST'])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser])
def admin_csv_upload(request):
    """
    Upload a CSV file to bulk-create products.
    Field: csv_file (required)
    Returns: {created, skipped, errors[]}
    """
    csv_file = request.FILES.get('csv_file')
    if not csv_file:
        return Response({'error': 'csv_file is required'}, status=status.HTTP_400_BAD_REQUEST)

    if not csv_file.name.endswith('.csv'):
        return Response({'error': 'File must be a .csv'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        decoded = csv_file.read().decode('utf-8-sig')  # handle BOM
    except UnicodeDecodeError:
        return Response({'error': 'File encoding not supported. Please save as UTF-8.'}, status=400)

    reader = csv.DictReader(io.StringIO(decoded))

    # Validate columns
    if not reader.fieldnames:
        return Response({'error': 'CSV appears empty'}, status=400)

    fieldnames_lower = [f.strip().lower() for f in reader.fieldnames]
    if 'name' not in fieldnames_lower or 'price' not in fieldnames_lower:
        return Response({
            'error': 'CSV must have at least "name" and "price" columns.',
            'your_columns': reader.fieldnames,
            'expected_columns': EXPECTED_COLUMNS,
        }, status=400)

    created = 0
    skipped = 0
    errors = []
    existing_slugs: set = set()

    for row_num, row in enumerate(reader, start=2):  # start=2 because row 1 = header
        # Normalise keys
        row = {k.strip().lower(): v.strip() if isinstance(v, str) else v for k, v in row.items()}

        name = row.get('name', '').strip()
        if not name:
            skipped += 1
            continue

        price_raw = row.get('price', '')
        try:
            price = float(price_raw)
        except (ValueError, TypeError):
            errors.append(f'Row {row_num} ({name}): invalid price "{price_raw}"')
            skipped += 1
            continue

        mrp_raw = row.get('mrp', '') or price_raw
        try:
            mrp = float(mrp_raw)
        except (ValueError, TypeError):
            mrp = price

        category = _get_or_create_category(row.get('category', ''))
        slug = _make_slug(name, existing_slugs)

        try:
            product = Product(
                name=name,
                slug=slug,
                category=category,
                price=price,
                mrp=mrp,
                brand=row.get('brand', ''),
                description=row.get('description', ''),
                fabric=row.get('fabric', ''),
                color=row.get('color', ''),
                occasion=row.get('occasion', ''),
                available_sizes=_parse_sizes_csv(row.get('available_sizes', '')),
                care_instructions=row.get('care_instructions', ''),
                tags=row.get('tags', ''),
                is_active=_to_bool(row.get('is_active', '1'), default=True),
                is_featured=_to_bool(row.get('is_featured', '0')),
                is_new_arrival=_to_bool(row.get('is_new_arrival', '0')),
            )

            # Download image if URL provided
            image_url = row.get('image_url', '').strip()
            if image_url:
                fname, content = _download_image(image_url, name)
                if fname and content:
                    product.image.save(f'products/{fname}', content, save=False)

            product.save()

            # Inventory
            stock = 0
            try:
                stock = int(row.get('stock_quantity', 0) or 0)
            except (ValueError, TypeError):
                stock = 0
            Inventory.objects.create(product=product, quantity=stock)

            created += 1

        except Exception as e:
            errors.append(f'Row {row_num} ({name}): {str(e)}')
            skipped += 1

    return Response({
        'created': created,
        'skipped': skipped,
        'errors': errors,
        'message': f'Done! {created} products created, {skipped} skipped.'
    })

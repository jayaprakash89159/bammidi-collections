#!/bin/bash
set -e

echo "🥻 Starting Bammidi Collections Backend..."

echo "Waiting for PostgreSQL..."
while ! nc -z ${DB_HOST:-db} ${DB_PORT:-5432}; do
  echo "  PostgreSQL not ready, retrying in 2s..."
  sleep 2
done
echo "✅ PostgreSQL port is up!"

# Extra wait to ensure postgres is fully initialized (user/db creation takes a moment)
sleep 3

echo "Waiting for Redis..."
while ! nc -z ${REDIS_HOST:-redis} 6379; do sleep 1; done
echo "✅ Redis is up!"

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput --clear 2>/dev/null || true

echo "Creating superuser..."
python manage.py shell << 'PYTHON'
from apps.users.models import User
if not User.objects.filter(email='admin@bammidi.com').exists():
    User.objects.create_superuser(
        email='admin@bammidi.com',
        password='Bammidi@Admin123',
        first_name='Bammidi',
        last_name='Admin',
        role='admin'
    )
    print("Superuser created: admin@bammidi.com / Bammidi@Admin123")
else:
    print("Superuser already exists")
PYTHON

echo "Loading Bammidi sample categories and products..."
python manage.py shell << 'PYTHON'
from apps.products.models import Category, Product, Inventory

categories_data = [
    {'name': 'Sarees', 'slug': 'sarees', 'sort_order': 1, 'description': 'Silk, Cotton, Georgette & more'},
    {'name': 'Blouses', 'slug': 'blouses', 'sort_order': 2, 'description': 'Designer & readymade blouses'},
    {'name': 'Dresses', 'slug': 'dresses', 'sort_order': 3, 'description': 'Western & indo-western dresses'},
    {'name': 'Nightwear', 'slug': 'nightwear', 'sort_order': 4, 'description': 'Comfortable nightwear sets'},
    {'name': 'Lehengas', 'slug': 'lehengas', 'sort_order': 5, 'description': 'Bridal & party lehengas'},
    {'name': 'Kurtis', 'slug': 'kurtis', 'sort_order': 6, 'description': 'Casual & formal kurtis'},
]
for c in categories_data:
    Category.objects.get_or_create(slug=c['slug'], defaults=c)

products_data = [
    {
        'name': 'Kanjivaram Silk Saree - Royal Blue',
        'slug': 'kanjivaram-silk-saree-royal-blue',
        'price': 3499, 'mrp': 4500,
        'category_slug': 'sarees',
        'fabric': 'Pure Silk', 'color': 'Royal Blue',
        'occasion': 'Wedding', 'is_featured': True, 'is_new_arrival': False, 'stock': 25,
        'description': 'Authentic Kanjivaram silk saree with gold zari border. Perfect for weddings and festive occasions.',
    },
    {
        'name': 'Soft Georgette Saree - Peach',
        'slug': 'georgette-saree-peach',
        'price': 899, 'mrp': 1299,
        'category_slug': 'sarees',
        'fabric': 'Georgette', 'color': 'Peach',
        'occasion': 'Party', 'is_featured': True, 'is_new_arrival': True, 'stock': 50,
        'description': 'Lightweight georgette saree with embroidered border. Ideal for parties and functions.',
    },
    {
        'name': 'Designer Embroidered Blouse - Maroon',
        'slug': 'embroidered-blouse-maroon',
        'price': 649, 'mrp': 899,
        'category_slug': 'blouses',
        'fabric': 'Silk', 'color': 'Maroon',
        'occasion': 'Wedding', 'is_featured': True, 'is_new_arrival': True, 'stock': 40,
        'description': 'Heavily embroidered designer blouse with golden thread work.',
        'available_sizes': ['S', 'M', 'L', 'XL'],
    },
    {
        'name': 'Floral Maxi Dress - Coral',
        'slug': 'floral-maxi-dress-coral',
        'price': 799, 'mrp': 1100,
        'category_slug': 'dresses',
        'fabric': 'Rayon', 'color': 'Coral',
        'occasion': 'Casual', 'is_featured': True, 'is_new_arrival': True, 'stock': 60,
        'description': 'Breezy floral print maxi dress for everyday wear.',
        'available_sizes': ['S', 'M', 'L', 'XL', 'XXL'],
    },
    {
        'name': 'Cotton Nightwear Set - Pastel Pink',
        'slug': 'cotton-nightwear-pink',
        'price': 499, 'mrp': 699,
        'category_slug': 'nightwear',
        'fabric': 'Pure Cotton', 'color': 'Pastel Pink',
        'occasion': 'Nightwear', 'is_featured': True, 'is_new_arrival': False, 'stock': 80,
        'description': 'Comfortable and breathable cotton nightwear set with printed top and pyjama.',
        'available_sizes': ['S', 'M', 'L', 'XL', 'XXL'],
    },
    {
        'name': 'Bridal Lehenga Set - Red Gold',
        'slug': 'bridal-lehenga-red-gold',
        'price': 8999, 'mrp': 12000,
        'category_slug': 'lehengas',
        'fabric': 'Bridal Net', 'color': 'Red & Gold',
        'occasion': 'Bridal', 'is_featured': True, 'is_new_arrival': False, 'stock': 10,
        'description': 'Heavy embroidered bridal lehenga with choli and dupatta. A dream for every bride.',
        'available_sizes': ['S', 'M', 'L', 'XL'],
    },
    {
        'name': 'Anarkali Kurti - Teal',
        'slug': 'anarkali-kurti-teal',
        'price': 599, 'mrp': 799,
        'category_slug': 'kurtis',
        'fabric': 'Cotton Blend', 'color': 'Teal',
        'occasion': 'Casual', 'is_featured': False, 'is_new_arrival': True, 'stock': 70,
        'description': 'Flared anarkali style kurti with printed pattern. Great for college and work.',
        'available_sizes': ['S', 'M', 'L', 'XL', 'XXL'],
    },
    {
        'name': 'Satin Nightgown - Lavender',
        'slug': 'satin-nightgown-lavender',
        'price': 399, 'mrp': 599,
        'category_slug': 'nightwear',
        'fabric': 'Satin', 'color': 'Lavender',
        'occasion': 'Nightwear', 'is_featured': False, 'is_new_arrival': True, 'stock': 55,
        'description': 'Silky smooth satin nightgown for a luxurious sleep experience.',
        'available_sizes': ['Free Size'],
    },
]

for p in products_data:
    cat = Category.objects.get(slug=p['category_slug'])
    defaults = {
        'name': p['name'],
        'price': p['price'],
        'mrp': p['mrp'],
        'category': cat,
        'fabric': p.get('fabric', ''),
        'color': p.get('color', ''),
        'occasion': p.get('occasion', ''),
        'is_featured': p.get('is_featured', False),
        'is_new_arrival': p.get('is_new_arrival', False),
        'is_active': True,
        'description': p.get('description', ''),
        'available_sizes': p.get('available_sizes', []),
    }
    product, created = Product.objects.get_or_create(slug=p['slug'], defaults=defaults)
    Inventory.objects.get_or_create(product=product, defaults={'quantity': p.get('stock', 0)})
    if created:
        print(f"  Created: {product.name}")

print("Sample data loaded for Bammidi Collections!")
PYTHON

echo "Starting Bammidi Collections server..."
exec daphne -b 0.0.0.0 -p 8000 config.asgi:application

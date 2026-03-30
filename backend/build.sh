#!/usr/bin/env bash
set -o errexit

echo "Installing dependencies..."
pip install -r requirements.txt

echo "Collecting static files..."
python manage.py collectstatic --no-input

echo "Running migrations..."
python manage.py migrate

echo "Creating superuser if not exists..."
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
    print("Superuser created")
else:
    print("Superuser already exists")
PYTHON

echo "Loading sample data..."
python manage.py shell << 'PYTHON'
from apps.products.models import Category, Product, Inventory
categories_data = [
    {'name': 'Sarees',    'slug': 'sarees',    'sort_order': 1, 'description': 'Silk, Cotton, Georgette'},
    {'name': 'Blouses',   'slug': 'blouses',   'sort_order': 2, 'description': 'Designer blouses'},
    {'name': 'Dresses',   'slug': 'dresses',   'sort_order': 3, 'description': 'Western dresses'},
    {'name': 'Nightwear', 'slug': 'nightwear', 'sort_order': 4, 'description': 'Comfortable nightwear'},
    {'name': 'Lehengas',  'slug': 'lehengas',  'sort_order': 5, 'description': 'Bridal lehengas'},
    {'name': 'Kurtis',    'slug': 'kurtis',    'sort_order': 6, 'description': 'Casual kurtis'},
]
for c in categories_data:
    Category.objects.get_or_create(slug=c['slug'], defaults=c)
print("Categories ready")
PYTHON

echo "Build complete!"

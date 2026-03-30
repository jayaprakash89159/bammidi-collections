from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .admin_views import (
    admin_all_products, admin_create_product, admin_product_detail,
    admin_categories, admin_inventory_list, admin_update_inventory
)
from .csv_upload import admin_csv_upload

router = DefaultRouter()
router.register('categories', views.CategoryViewSet, basename='category')
router.register('', views.ProductViewSet, basename='product')

urlpatterns = [
    path('', include(router.urls)),
    # Admin endpoints
    path('admin/all/', admin_all_products, name='admin-all-products'),
    path('admin/create/', admin_create_product, name='admin-create-product'),
    path('admin/<int:product_id>/', admin_product_detail, name='admin-product-detail'),
    path('admin/categories/', admin_categories, name='admin-categories'),
    path('admin/categories/<int:category_id>/', admin_categories, name='admin-category-detail'),
    path('admin/inventory/', admin_inventory_list, name='admin-inventory-list'),
    path('admin/inventory/<int:product_id>/', admin_update_inventory, name='admin-update-inventory'),
    path('admin/csv-upload/', admin_csv_upload, name='admin-csv-upload'),
]

from django.urls import path
from . import views

urlpatterns = [
    # Cart
    path('cart/', views.CartView.as_view(), name='cart'),
    path('cart/add/', views.add_to_cart, name='add-to-cart'),
    path('cart/items/<int:item_id>/', views.update_cart_item, name='update-cart-item'),
    path('cart/items/<int:item_id>/remove/', views.remove_from_cart, name='remove-from-cart'),
    # Delivery fee preview (called from checkout page before placing order)
    path('delivery-fee-preview/', views.delivery_fee_preview, name='delivery-fee-preview'),
    # Orders
    path('', views.OrderListView.as_view(), name='order-list'),
    path('create/', views.create_order, name='create-order'),
    path('<int:pk>/', views.OrderDetailView.as_view(), name='order-detail'),
    # Admin
    path('admin/all/', views.AdminOrderListView.as_view(), name='admin-order-list'),
    path('admin/<int:pk>/status/', views.update_order_status, name='update-order-status'),
    path('admin/<int:pk>/awb/', views.update_order_awb, name='update-order-awb'),
    path('admin/dashboard/', views.admin_dashboard, name='admin-dashboard'),
]

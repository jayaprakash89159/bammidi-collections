from django.contrib import admin
from .models import Cart, CartItem, Order, OrderItem, OrderTrackingLog


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['user', 'total_items', 'total_price', 'updated_at']
    inlines = [CartItemInline]


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['product_name', 'unit_price', 'total_price']


class OrderTrackingLogInline(admin.TabularInline):
    model = OrderTrackingLog
    extra = 0
    readonly_fields = ['status', 'message', 'created_at']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'user', 'status', 'payment_status', 'total', 'created_at']
    list_filter = ['status', 'payment_status', 'payment_method']
    search_fields = ['user__email', 'razorpay_order_id']
    readonly_fields = ['order_number', 'razorpay_order_id', 'razorpay_payment_id']
    inlines = [OrderItemInline, OrderTrackingLogInline]
    ordering = ['-created_at']

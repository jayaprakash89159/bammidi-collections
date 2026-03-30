from rest_framework import serializers
from .models import Cart, CartItem, Order, OrderItem, OrderTrackingLog
from apps.products.serializers import ProductListSerializer
from apps.users.serializers import AddressSerializer


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)
    total_price = serializers.ReadOnlyField()

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_id', 'quantity', 'total_price', 'added_at']

    def validate_product_id(self, value):
        from apps.products.models import Product
        try:
            product = Product.objects.get(id=value, is_active=True)
        except Product.DoesNotExist:
            raise serializers.ValidationError("Product not found")
        if not product.is_in_stock:
            raise serializers.ValidationError(f"{product.name} is out of stock")
        return value


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.ReadOnlyField()
    total_items = serializers.ReadOnlyField()

    class Meta:
        model = Cart
        fields = ['id', 'items', 'total_price', 'total_items', 'updated_at']


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'product_image', 'quantity', 'unit_price', 'total_price']


class OrderTrackingLogSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = OrderTrackingLog
        fields = ['id', 'status', 'message', 'created_by_name', 'latitude', 'longitude', 'created_at']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    tracking_logs = OrderTrackingLogSerializer(many=True, read_only=True)
    delivery_address = AddressSerializer(read_only=True)
    order_number = serializers.ReadOnlyField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)

    # FIX 8: Expose customer name to admin — was showing "--" before
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()

    def get_customer_name(self, obj):
        if obj.user:
            name = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return name if name else obj.user.email
        return '—'

    def get_customer_email(self, obj):
        return obj.user.email if obj.user else '—'

    def get_customer_phone(self, obj):
        return getattr(obj.user, 'phone', '') or '—'

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'status', 'status_display', 'payment_status',
            'payment_status_display', 'subtotal', 'delivery_fee', 'discount', 'total',
            'payment_method', 'razorpay_order_id', 'delivery_address',
            'items', 'tracking_logs', 'customer_notes',
            'awb_number', 'tracking_url', 'courier_name',
            # FIX 1: estimated_delivery_date for admin to set & customer to see
            'estimated_delivery_date',
            # FIX 8: customer fields
            'customer_name', 'customer_email', 'customer_phone',
            'created_at', 'updated_at',
        ]


class CreateOrderSerializer(serializers.Serializer):
    address_id = serializers.IntegerField()
    customer_notes = serializers.CharField(required=False, allow_blank=True)
    payment_method = serializers.ChoiceField(choices=['razorpay', 'upi', 'card', 'cod', 'stripe'])

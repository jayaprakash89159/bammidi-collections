from rest_framework import serializers
from .models import DeliveryPartner, DeliveryAssignment
from apps.users.serializers import UserSerializer


class DeliveryPartnerSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = DeliveryPartner
        fields = [
            'id', 'user', 'vehicle_type', 'vehicle_number', 'is_available',
            'is_active', 'current_latitude', 'current_longitude',
            'total_deliveries', 'rating', 'created_at'
        ]
        read_only_fields = ['user', 'total_deliveries', 'rating']


class DeliveryAssignmentSerializer(serializers.ModelSerializer):
    delivery_partner = DeliveryPartnerSerializer(read_only=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    order_total = serializers.DecimalField(source='order.total', max_digits=10, decimal_places=2, read_only=True)
    payment_method = serializers.CharField(source='order.payment_method', read_only=True)
    payment_status = serializers.CharField(source='order.payment_status', read_only=True)
    customer_name = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    delivery_address = serializers.SerializerMethodField()
    order_items = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    order_status = serializers.CharField(source='order.status', read_only=True)

    class Meta:
        model = DeliveryAssignment
        fields = [
            'id', 'order', 'order_number', 'order_total', 'payment_method', 'payment_status',
            'delivery_partner', 'customer_name', 'customer_phone',
            'status', 'status_display', 'order_status', 'delivery_address', 'order_items',
            'assigned_at', 'accepted_at', 'picked_up_at', 'delivered_at',
            'estimated_delivery', 'partner_notes',
            'cash_collected', 'cash_collected_at', 'cash_amount',
        ]

    def get_customer_name(self, obj):
        return obj.order.user.full_name if obj.order.user else ''

    def get_customer_phone(self, obj):
        return obj.order.user.phone if obj.order.user else ''

    def get_delivery_address(self, obj):
        addr = obj.order.delivery_address
        if not addr:
            return {}
        parts = [p for p in [addr.house_no, addr.building_street, addr.street, addr.city, addr.pincode] if p]
        return {
            'id': addr.id,
            'label': addr.label,
            'house_no': addr.house_no,
            'building_street': addr.building_street,
            'street': addr.street,
            'city': addr.city,
            'state': addr.state,
            'pincode': addr.pincode,
            'landmark': getattr(addr, 'landmark', ''),
            'latitude': str(addr.latitude) if addr.latitude else None,
            'longitude': str(addr.longitude) if addr.longitude else None,
            'display': ', '.join(parts),
        }

    def get_order_items(self, obj):
        return [
            {
                'name': item.product_name,
                'quantity': item.quantity,
                'price': str(item.total_price),
            }
            for item in obj.order.items.all()
        ]
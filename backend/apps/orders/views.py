"""
Order management views for Bammidi Collections.
Delivery fee logic:
  - Andhra Pradesh & Telangana: Free if subtotal >= 499, else 199
  - All other states: Free if subtotal >= 999, else 199
"""
from django.db import transaction
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from .models import Cart, CartItem, Order, OrderItem, OrderTrackingLog
from .serializers import (
    CartSerializer, CartItemSerializer, OrderSerializer, CreateOrderSerializer
)
from apps.users.models import Address
from apps.delivery.models import DeliveryPartner, DeliveryAssignment
import razorpay
from django.conf import settings
from decimal import Decimal


# ── Delivery Fee Logic ──────────────────────────────────────────────────────

FREE_DELIVERY_STATES_LOWER_THRESHOLD = {
    'andhra pradesh', 'telangana', 'ap', 'tg'
}

def calculate_delivery_fee(subtotal: Decimal, state: str) -> Decimal:
    """
    Bammidi Collections delivery fee policy:
    - AP & Telangana: Free delivery on orders >= ₹499, else ₹199
    - Other states  : Free delivery on orders >= ₹999, else ₹199
    """
    state_lower = (state or '').strip().lower()
    if state_lower in FREE_DELIVERY_STATES_LOWER_THRESHOLD:
        threshold = Decimal(getattr(settings, 'FREE_DELIVERY_THRESHOLD_AP_TG', 499))
    else:
        threshold = Decimal(getattr(settings, 'FREE_DELIVERY_THRESHOLD_OTHER', 999))

    fee = Decimal(getattr(settings, 'DELIVERY_FEE', 199))
    return Decimal('0') if subtotal >= threshold else fee


# ── Cart Views ──────────────────────────────────────────────────────────────

class CartView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CartSerializer

    def get_object(self):
        cart, _ = Cart.objects.get_or_create(user=self.request.user)
        return cart


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_to_cart(request):
    product_id = request.data.get('product_id')
    quantity = int(request.data.get('quantity', 1))

    if quantity < 1:
        return Response({'error': 'Quantity must be at least 1'}, status=status.HTTP_400_BAD_REQUEST)

    from apps.products.models import Product
    try:
        product = Product.objects.get(id=product_id, is_active=True)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

    if product.current_stock < quantity:
        return Response({'error': f'Only {product.current_stock} units available'}, status=status.HTTP_400_BAD_REQUEST)

    cart, _ = Cart.objects.get_or_create(user=request.user)
    item, created = CartItem.objects.get_or_create(cart=cart, product=product)

    if not created:
        new_quantity = item.quantity + quantity
        if product.current_stock < new_quantity:
            return Response({'error': f'Only {product.current_stock} units available'}, status=status.HTTP_400_BAD_REQUEST)
        item.quantity = new_quantity
        item.save()
    else:
        item.quantity = quantity
        item.save()

    return Response(CartSerializer(cart).data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_cart_item(request, item_id):
    try:
        item = CartItem.objects.get(id=item_id, cart__user=request.user)
    except CartItem.DoesNotExist:
        return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)

    quantity = int(request.data.get('quantity', 1))
    if quantity < 1:
        item.delete()
    else:
        if item.product.current_stock < quantity:
            return Response({'error': f'Only {item.product.current_stock} units available'}, status=status.HTTP_400_BAD_REQUEST)
        item.quantity = quantity
        item.save()

    cart = Cart.objects.get(user=request.user)
    return Response(CartSerializer(cart).data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_from_cart(request, item_id):
    try:
        item = CartItem.objects.get(id=item_id, cart__user=request.user)
        item.delete()
    except CartItem.DoesNotExist:
        return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)

    cart = Cart.objects.get(user=request.user)
    return Response(CartSerializer(cart).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delivery_fee_preview(request):
    """
    Returns the delivery fee for a given address_id before placing order.
    Frontend uses this to show live fee on checkout page.
    """
    address_id = request.data.get('address_id')
    try:
        address = Address.objects.get(id=address_id, user=request.user)
    except Address.DoesNotExist:
        return Response({'error': 'Address not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        cart = Cart.objects.prefetch_related('items__product').get(user=request.user)
    except Cart.DoesNotExist:
        return Response({'subtotal': 0, 'delivery_fee': 0, 'total': 0})

    subtotal = cart.total_price
    fee = calculate_delivery_fee(subtotal, address.state)
    state_lower = (address.state or '').strip().lower()
    is_ap_tg = state_lower in FREE_DELIVERY_STATES_LOWER_THRESHOLD
    threshold = 499 if is_ap_tg else 999

    return Response({
        'subtotal': float(subtotal),
        'delivery_fee': float(fee),
        'total': float(subtotal + fee),
        'state': address.state,
        'is_ap_telangana': is_ap_tg,
        'free_delivery_threshold': threshold,
        'amount_for_free_delivery': max(0, float(threshold - subtotal)),
    })


# ── Order Views ─────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def create_order(request):
    """
    Create order from cart.
    Validates stock availability, reserves inventory, applies delivery fee policy.
    """
    serializer = CreateOrderSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        address = Address.objects.get(id=serializer.validated_data['address_id'], user=request.user)
    except Address.DoesNotExist:
        return Response({'error': 'Address not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        cart = Cart.objects.prefetch_related('items__product__inventory').get(user=request.user)
    except Cart.DoesNotExist:
        return Response({'error': 'Cart is empty'}, status=status.HTTP_400_BAD_REQUEST)

    if not cart.items.exists():
        return Response({'error': 'Cart is empty'}, status=status.HTTP_400_BAD_REQUEST)

    items = list(cart.items.all())
    reserved = []
    try:
        for item in items:
            item.product.inventory.reserve(item.quantity)
            reserved.append((item.product.inventory, item.quantity))
    except Exception as e:
        # Release already-reserved stock
        for inv, qty in reserved:
            inv.release_reservation(qty)
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    # Calculate pricing with Bammidi delivery policy
    subtotal = cart.total_price
    delivery_fee = calculate_delivery_fee(subtotal, address.state)
    total = subtotal + delivery_fee

    order = Order.objects.create(
        user=request.user,
        delivery_address=address,
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        total=total,
        payment_method=serializer.validated_data['payment_method'],
        customer_notes=serializer.validated_data.get('customer_notes', ''),
        status=Order.PENDING,
    )

    for item in items:
        OrderItem.objects.create(
            order=order,
            product=item.product,
            product_name=item.product.name,
            product_image=str(item.product.image) if item.product.image else '',
            quantity=item.quantity,
            unit_price=item.product.price,
            total_price=item.total_price,
        )

    OrderTrackingLog.objects.create(
        order=order,
        status=Order.PENDING,
        message='Order placed successfully',
        created_by=request.user,
    )

    cart.items.all().delete()

    if serializer.validated_data['payment_method'] in ['razorpay', 'upi', 'card']:
        return Response({'order': OrderSerializer(order).data})

    elif serializer.validated_data['payment_method'] == 'cod':
        order.status = Order.CONFIRMED
        order.payment_status = 'pending'
        order.save()
        _assign_delivery_partner(order)
        OrderTrackingLog.objects.create(
            order=order, status=Order.CONFIRMED,
            message='Order confirmed - Cash on Delivery'
        )
        return Response({'order': OrderSerializer(order).data})

    return Response({'order': OrderSerializer(order).data})


def _assign_delivery_partner(order):
    available_partner = DeliveryPartner.objects.filter(
        is_available=True, is_active=True
    ).order_by('?').first()

    if available_partner:
        DeliveryAssignment.objects.create(
            order=order,
            delivery_partner=available_partner,
            status=DeliveryAssignment.ASSIGNED,
        )
        available_partner.is_available = False
        available_partner.save()
        order.status = Order.ASSIGNED
        order.save()


class OrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related(
            'items', 'tracking_logs', 'delivery_address'
        )


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related(
            'items', 'tracking_logs', 'delivery_address'
        )


class AdminOrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAdminUser]
    queryset = Order.objects.all().prefetch_related('items', 'tracking_logs', 'user')


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def update_order_status(request, pk):
    try:
        order = Order.objects.get(pk=pk)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get('status')
    if new_status not in dict(Order.STATUS_CHOICES):
        return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

    order.status = new_status
    order.save()

    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'order_{order.id}',
        {'type': 'order_update', 'status': new_status, 'order_id': order.id}
    )

    OrderTrackingLog.objects.create(
        order=order, status=new_status,
        message=f'Status updated to {order.get_status_display()}',
        created_by=request.user
    )
    return Response(OrderSerializer(order).data)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def update_order_awb(request, pk):
    """Admin sets AWB number, courier name, and tracking URL for an order."""
    try:
        order = Order.objects.get(pk=pk)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

    awb_number = request.data.get('awb_number', '').strip()
    tracking_url = request.data.get('tracking_url', '').strip()
    courier_name = request.data.get('courier_name', '').strip()
    estimated_delivery_date = request.data.get('estimated_delivery_date', '').strip() or None

    if not awb_number:
        return Response({'error': 'AWB number is required'}, status=status.HTTP_400_BAD_REQUEST)

    order.awb_number = awb_number
    order.tracking_url = tracking_url
    order.courier_name = courier_name
    # FIX 1: Save admin-set estimated delivery date
    if estimated_delivery_date:
        order.estimated_delivery_date = estimated_delivery_date
    # Auto-advance to shipped if still confirmed/assigned
    if order.status in ('confirmed', 'assigned', 'packed'):
        order.status = 'shipped'
    order.save()

    OrderTrackingLog.objects.create(
        order=order,
        status=order.status,
        message=f'Shipped via {courier_name}. AWB: {awb_number}',
        created_by=request.user
    )
    return Response(OrderSerializer(order).data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_dashboard(request):
    from django.utils import timezone
    from datetime import timedelta
    from django.db import models as db_models

    today = timezone.now().date()

    total_orders = Order.objects.count()
    today_orders = Order.objects.filter(created_at__date=today).count()
    total_revenue = sum(o.total for o in Order.objects.filter(payment_status='paid'))
    pending_orders = Order.objects.filter(status=Order.PENDING).count()
    active_partners = DeliveryPartner.objects.filter(is_available=True, is_active=True).count()

    from apps.products.models import Inventory
    low_stock_products = Inventory.objects.filter(
        quantity__lte=db_models.F('low_stock_threshold')
    ).count()

    return Response({
        'total_orders': total_orders,
        'today_orders': today_orders,
        'total_revenue': float(total_revenue),
        'pending_orders': pending_orders,
        'active_delivery_partners': active_partners,
        'low_stock_alerts': low_stock_products,
    })

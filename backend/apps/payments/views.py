"""
Payment processing with Razorpay integration.
Supports UPI, Card, Net Banking, Wallets via Razorpay + COD.
"""
import hmac
import hashlib
import razorpay
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from apps.orders.models import Order, OrderTrackingLog
from apps.orders.views import _assign_delivery_partner


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_razorpay_order(request):
    """Create Razorpay order for UPI/Card/NetBanking/Wallet payment."""
    order_id = request.data.get('order_id')
    payment_method = request.data.get('payment_method', 'razorpay')

    if not order_id:
        return Response({'error': 'order_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        order = Order.objects.get(id=order_id, user=request.user, status=Order.PENDING)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found or already processed'}, status=status.HTTP_404_NOT_FOUND)

    try:
        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        rz_order = client.order.create({
            'amount': int(order.total * 100),
            'currency': 'INR',
            'receipt': order.order_number,
            'payment_capture': 1,
            'notes': {
                'order_number': order.order_number,
                'customer_email': request.user.email,
                'payment_method_preference': payment_method,
            },
        })
        order.razorpay_order_id = rz_order['id']
        order.payment_method = payment_method
        order.save()

        return Response({
            'razorpay_order_id': rz_order['id'],
            'razorpay_key': settings.RAZORPAY_KEY_ID,
            'amount': int(order.total * 100),
            'currency': 'INR',
            'order_id': order.id,
            'order_number': order.order_number,
            'customer_name': request.user.full_name,
            'customer_email': request.user.email,
            'customer_phone': request.user.phone or '',
            'payment_method_preference': payment_method,
        })
    except Exception as e:
        return Response({'error': f'Payment gateway error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_razorpay_payment(request):
    """Verify Razorpay payment signature after successful payment."""
    razorpay_order_id = request.data.get('razorpay_order_id')
    razorpay_payment_id = request.data.get('razorpay_payment_id')
    razorpay_signature = request.data.get('razorpay_signature')

    if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
        return Response({'error': 'Missing payment details'}, status=status.HTTP_400_BAD_REQUEST)

    key_secret = settings.RAZORPAY_KEY_SECRET
    message = f"{razorpay_order_id}|{razorpay_payment_id}"
    generated_signature = hmac.new(
        key_secret.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    if generated_signature != razorpay_signature:
        try:
            order = Order.objects.get(razorpay_order_id=razorpay_order_id)
            _release_inventory(order)
            order.status = Order.CANCELLED
            order.payment_status = 'failed'
            order.save()
            OrderTrackingLog.objects.create(order=order, status=Order.CANCELLED, message='Payment verification failed')
        except Order.DoesNotExist:
            pass
        return Response({'error': 'Payment verification failed'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        order = Order.objects.get(razorpay_order_id=razorpay_order_id, user=request.user)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

    order.razorpay_payment_id = razorpay_payment_id
    order.payment_status = 'paid'
    order.status = Order.CONFIRMED
    order.save()

    _confirm_inventory(order)
    _assign_delivery_partner(order)

    OrderTrackingLog.objects.create(
        order=order, status=Order.CONFIRMED,
        message=f'Payment successful via {order.payment_method.upper()} - Order confirmed'
    )

    return Response({
        'success': True,
        'order_id': order.id,
        'order_number': order.order_number,
        'payment_method': order.payment_method,
        'message': 'Payment successful! Your order has been confirmed.',
    })


@api_view(['POST'])
def razorpay_webhook(request):
    """Razorpay webhook for server-side payment confirmation."""
    webhook_secret = settings.RAZORPAY_KEY_SECRET
    received_signature = request.headers.get('X-Razorpay-Signature', '')
    body = request.body
    generated_signature = hmac.new(
        webhook_secret.encode('utf-8'), body, hashlib.sha256
    ).hexdigest()

    if generated_signature != received_signature:
        return Response({'error': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)

    event = request.data.get('event')
    if event == 'payment.captured':
        payment = request.data.get('payload', {}).get('payment', {}).get('entity', {})
        try:
            order = Order.objects.get(razorpay_order_id=payment.get('order_id', ''))
            if order.payment_status != 'paid':
                order.razorpay_payment_id = payment.get('id', '')
                order.payment_status = 'paid'
                order.status = Order.CONFIRMED
                order.save()
                _confirm_inventory(order)
                OrderTrackingLog.objects.create(order=order, status=Order.CONFIRMED, message='Payment captured via webhook')
        except Order.DoesNotExist:
            pass
    elif event == 'payment.failed':
        payment = request.data.get('payload', {}).get('payment', {}).get('entity', {})
        try:
            order = Order.objects.get(razorpay_order_id=payment.get('order_id', ''))
            if order.status == Order.PENDING:
                _release_inventory(order)
                order.payment_status = 'failed'
                order.status = Order.CANCELLED
                order.save()
        except Order.DoesNotExist:
            pass

    return Response({'status': 'ok'})


@api_view(['POST'])
@permission_classes([IsAdminUser])
def process_refund(request, order_id):
    """Admin can initiate a Razorpay refund."""
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

    if order.payment_status != 'paid' or not order.razorpay_payment_id:
        return Response({'error': 'Order not eligible for refund'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        refund = client.payment.refund(order.razorpay_payment_id, {'amount': int(order.total * 100)})
        order.payment_status = 'refunded'
        order.status = Order.CANCELLED
        order.save()
        OrderTrackingLog.objects.create(
            order=order, status=Order.CANCELLED,
            message=f'Refund initiated: ₹{order.total}', created_by=request.user
        )
        return Response({'success': True, 'refund_id': refund.get('id'), 'message': f'Refund of ₹{order.total} initiated'})
    except Exception as e:
        return Response({'error': f'Refund failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _confirm_inventory(order):
    for item in order.items.all():
        if item.product:
            try:
                item.product.inventory.confirm_sale(item.quantity)
            except Exception:
                pass


def _release_inventory(order):
    for item in order.items.all():
        if item.product:
            try:
                item.product.inventory.release_reservation(item.quantity)
            except Exception:
                pass

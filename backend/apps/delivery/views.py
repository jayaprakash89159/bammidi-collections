"""
Delivery partner views.
Partners accept orders, update status, and push real-time updates via WebSocket.
"""
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import DeliveryPartner, DeliveryAssignment
from .serializers import DeliveryPartnerSerializer, DeliveryAssignmentSerializer
from apps.orders.models import Order, OrderTrackingLog


def push_order_update(order_id, status_val, message='', latitude=None, longitude=None):
    """Push real-time order status update via WebSocket."""
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'order_{order_id}',
        {
            'type': 'order_update',
            'status': status_val,
            'order_id': order_id,
            'message': message,
            'latitude': str(latitude) if latitude else None,
            'longitude': str(longitude) if longitude else None,
            'timestamp': timezone.now().isoformat(),
        }
    )


class DeliveryPartnerProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = DeliveryPartnerSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        partner, _ = DeliveryPartner.objects.get_or_create(user=self.request.user)
        return partner


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_assignments(request):
    """Get all delivery assignments for the logged-in delivery partner."""
    try:
        partner = DeliveryPartner.objects.get(user=request.user)
    except DeliveryPartner.DoesNotExist:
        return Response({'error': 'Not a delivery partner'}, status=status.HTTP_403_FORBIDDEN)

    assignments = DeliveryAssignment.objects.filter(
        delivery_partner=partner
    ).select_related('order', 'order__delivery_address', 'order__user').order_by('-assigned_at')

    return Response(DeliveryAssignmentSerializer(assignments, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def active_assignment(request):
    """Get current active delivery assignment."""
    try:
        partner = DeliveryPartner.objects.get(user=request.user)
    except DeliveryPartner.DoesNotExist:
        return Response({'error': 'Not a delivery partner'}, status=status.HTTP_403_FORBIDDEN)

    assignment = DeliveryAssignment.objects.filter(
        delivery_partner=partner,
        status__in=[DeliveryAssignment.ACCEPTED, DeliveryAssignment.PICKED_UP, DeliveryAssignment.OUT_FOR_DELIVERY]
    ).select_related('order').first()

    if not assignment:
        return Response({'assignment': None})

    return Response({'assignment': DeliveryAssignmentSerializer(assignment).data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_order(request, assignment_id):
    """Delivery partner accepts a delivery assignment."""
    try:
        partner = DeliveryPartner.objects.get(user=request.user)
        assignment = DeliveryAssignment.objects.get(id=assignment_id, delivery_partner=partner)
    except (DeliveryPartner.DoesNotExist, DeliveryAssignment.DoesNotExist):
        return Response({'error': 'Assignment not found'}, status=status.HTTP_404_NOT_FOUND)

    assignment.status = DeliveryAssignment.ACCEPTED
    assignment.accepted_at = timezone.now()
    assignment.save()

    order = assignment.order
    order.status = Order.CONFIRMED
    order.save()

    OrderTrackingLog.objects.create(
        order=order, status=Order.CONFIRMED,
        message=f'Order accepted by delivery partner {partner.user.full_name}',
        created_by=request.user
    )
    push_order_update(order.id, Order.CONFIRMED, 'Your order has been accepted by the delivery partner')
    return Response({'message': 'Order accepted', 'assignment': DeliveryAssignmentSerializer(assignment).data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_delivery_status(request, assignment_id):
    """
    Delivery partner updates delivery status.
    Accepted transitions: accepted → picked_up → out_for_delivery → delivered
    """
    VALID_TRANSITIONS = {
        DeliveryAssignment.ACCEPTED: DeliveryAssignment.PICKED_UP,
        DeliveryAssignment.PICKED_UP: DeliveryAssignment.OUT_FOR_DELIVERY,
        DeliveryAssignment.OUT_FOR_DELIVERY: DeliveryAssignment.DELIVERED,
    }

    ORDER_STATUS_MAP = {
        DeliveryAssignment.PICKED_UP: (Order.PICKED_UP, 'Order picked up from store'),
        DeliveryAssignment.OUT_FOR_DELIVERY: (Order.OUT_FOR_DELIVERY, 'Order is out for delivery'),
        DeliveryAssignment.DELIVERED: (Order.DELIVERED, 'Order delivered successfully'),
    }

    try:
        partner = DeliveryPartner.objects.get(user=request.user)
        assignment = DeliveryAssignment.objects.get(id=assignment_id, delivery_partner=partner)
    except (DeliveryPartner.DoesNotExist, DeliveryAssignment.DoesNotExist):
        return Response({'error': 'Assignment not found'}, status=status.HTTP_404_NOT_FOUND)

    new_status = VALID_TRANSITIONS.get(assignment.status)
    if not new_status:
        return Response({'error': 'Invalid status transition'}, status=status.HTTP_400_BAD_REQUEST)

    latitude = request.data.get('latitude')
    longitude = request.data.get('longitude')

    # Update assignment
    assignment.status = new_status
    if new_status == DeliveryAssignment.PICKED_UP:
        assignment.picked_up_at = timezone.now()
    elif new_status == DeliveryAssignment.DELIVERED:
        assignment.delivered_at = timezone.now()
        # Mark partner available again
        partner.is_available = True
        partner.total_deliveries += 1
        partner.save()

        # Confirm stock deduction (already reserved, now confirm)
        order = assignment.order
        for item in order.items.all():
            if item.product:
                item.product.inventory.confirm_sale(item.quantity)
    assignment.save()

    # Update order status
    order_status, message = ORDER_STATUS_MAP[new_status]
    order = assignment.order
    order.status = order_status
    order.save()

    OrderTrackingLog.objects.create(
        order=order, status=order_status, message=message,
        created_by=request.user, latitude=latitude, longitude=longitude
    )
    push_order_update(order.id, order_status, message, latitude, longitude)

    return Response({'message': f'Status updated to {new_status}'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_cash_collected(request, assignment_id):
    """
    COD only: delivery partner confirms cash received from customer.
    Must be called BEFORE update_delivery_status can transition to 'delivered'.
    POST /delivery/assignments/<id>/collect-cash/
    Body: { "amount": 250.00 }  (optional, defaults to order total)
    """
    try:
        partner = DeliveryPartner.objects.get(user=request.user)
        assignment = DeliveryAssignment.objects.get(id=assignment_id, delivery_partner=partner)
    except (DeliveryPartner.DoesNotExist, DeliveryAssignment.DoesNotExist):
        return Response({'error': 'Assignment not found'}, status=status.HTTP_404_NOT_FOUND)

    if assignment.status != DeliveryAssignment.OUT_FOR_DELIVERY:
        return Response(
            {'error': 'Cash can only be confirmed when order is out for delivery'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if assignment.order.payment_method != 'cod':
        return Response({'error': 'This order is not a COD order'}, status=status.HTTP_400_BAD_REQUEST)

    if assignment.cash_collected:
        return Response({'message': 'Cash already confirmed', 'assignment': DeliveryAssignmentSerializer(assignment).data})

    amount = request.data.get('amount', float(assignment.order.total))

    assignment.cash_collected = True
    assignment.cash_collected_at = timezone.now()
    assignment.cash_amount = amount
    assignment.save()

    # Mark order payment as paid (cash received)
    order = assignment.order
    order.payment_status = 'paid'
    order.save()

    OrderTrackingLog.objects.create(
        order=order,
        status=order.status,
        message=f'Cash collected: ₹{amount}',
        created_by=request.user,
    )
    push_order_update(order.id, order.status, f'Cash payment of ₹{amount} received')

    return Response({
        'message': f'Cash ₹{amount} confirmed. You can now mark the order as delivered.',
        'assignment': DeliveryAssignmentSerializer(assignment).data,
    })


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def toggle_availability(request):
    """Toggle delivery partner availability."""
    try:
        partner = DeliveryPartner.objects.get(user=request.user)
        partner.is_available = not partner.is_available
        partner.save()
        return Response({'is_available': partner.is_available})
    except DeliveryPartner.DoesNotExist:
        return Response({'error': 'Not a delivery partner'}, status=status.HTTP_403_FORBIDDEN)
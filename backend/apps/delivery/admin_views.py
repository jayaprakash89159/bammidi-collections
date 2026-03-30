"""
Admin views for delivery partner management.
Includes: list/create/update delivery partners, manual order assignment,
auto-assign logic based on availability.
"""
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import DeliveryPartner, DeliveryAssignment
from .serializers import DeliveryPartnerSerializer, DeliveryAssignmentSerializer
from apps.orders.models import Order, OrderTrackingLog
from apps.users.models import User


def push_order_update(order_id, status_val, message=''):
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'order_{order_id}',
            {
                'type': 'order_update',
                'status': status_val,
                'order_id': order_id,
                'message': message,
                'timestamp': timezone.now().isoformat(),
            }
        )
    except Exception:
        pass


def auto_assign_order(order):
    """
    Auto-assign an order to the most available delivery partner.
    Preference: fewest active assignments → highest rating → most deliveries.
    Returns DeliveryAssignment or None.
    """
    from django.db.models import Count, Q

    available_partners = DeliveryPartner.objects.filter(
        is_available=True,
        is_active=True
    ).annotate(
        active_count=Count(
            'deliveryassignment',
            filter=Q(deliveryassignment__status__in=[
                DeliveryAssignment.ASSIGNED,
                DeliveryAssignment.ACCEPTED,
                DeliveryAssignment.PICKED_UP,
                DeliveryAssignment.OUT_FOR_DELIVERY,
            ])
        )
    ).order_by('active_count', '-rating', '-total_deliveries')

    partner = available_partners.first()
    if not partner:
        return None

    assignment = DeliveryAssignment.objects.create(
        order=order,
        delivery_partner=partner,
        status=DeliveryAssignment.ASSIGNED,
        estimated_delivery=timezone.now() + timezone.timedelta(hours=1),
    )

    order.status = Order.ASSIGNED
    order.save()

    OrderTrackingLog.objects.create(
        order=order,
        status=Order.ASSIGNED,
        message=f'Order auto-assigned to {partner.user.full_name}',
    )

    push_order_update(
        order.id, Order.ASSIGNED,
        f'Order assigned to delivery partner {partner.user.full_name}'
    )
    return assignment


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_delivery_partners(request):
    """List all delivery partners with their stats."""
    from django.db.models import Count, Q
    partners = DeliveryPartner.objects.select_related('user').annotate(
        active_assignments=Count(
            'deliveryassignment',
            filter=Q(deliveryassignment__status__in=[
                DeliveryAssignment.ASSIGNED, DeliveryAssignment.ACCEPTED,
                DeliveryAssignment.PICKED_UP, DeliveryAssignment.OUT_FOR_DELIVERY,
            ])
        )
    ).order_by('-is_active', '-is_available', '-created_at')

    data = []
    for p in partners:
        s = DeliveryPartnerSerializer(p).data
        s['active_assignments'] = p.active_assignments
        data.append(s)
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_create_delivery_partner(request):
    """
    Create a delivery partner account.
    Required: email, first_name, last_name, phone, password
    Optional: vehicle_type, vehicle_number
    """
    email = request.data.get('email')
    password = request.data.get('password')
    first_name = request.data.get('first_name', '')
    last_name = request.data.get('last_name', '')
    phone = request.data.get('phone', '')

    if not email or not password:
        return Response({'error': 'email and password are required'}, status=400)

    if User.objects.filter(email=email).exists():
        return Response({'error': 'Email already exists'}, status=400)

    user = User.objects.create_user(
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        role=User.DELIVERY_PARTNER,
    )

    partner = DeliveryPartner.objects.create(
        user=user,
        vehicle_type=request.data.get('vehicle_type', 'Bike'),
        vehicle_number=request.data.get('vehicle_number', ''),
    )

    return Response(DeliveryPartnerSerializer(partner).data, status=201)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def admin_delivery_partner_detail(request, partner_id):
    """Get, update, or deactivate a delivery partner."""
    try:
        partner = DeliveryPartner.objects.select_related('user').get(id=partner_id)
    except DeliveryPartner.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        return Response(DeliveryPartnerSerializer(partner).data)

    elif request.method == 'PATCH':
        for field in ['vehicle_type', 'vehicle_number', 'is_available', 'is_active']:
            if field in request.data:
                setattr(partner, field, request.data[field])
        # Update user fields too
        user = partner.user
        for field in ['first_name', 'last_name', 'phone']:
            if field in request.data:
                setattr(user, field, request.data[field])
        user.save()
        partner.save()
        return Response(DeliveryPartnerSerializer(partner).data)

    elif request.method == 'DELETE':
        partner.is_active = False
        partner.is_available = False
        partner.save()
        return Response({'message': 'Delivery partner deactivated'})


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_assign_order(request, order_id):
    """
    Manually assign an order to a specific delivery partner.
    Body: { partner_id: int } — or omit for auto-assign.
    """
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=404)

    # Remove existing undelivered assignment if any
    DeliveryAssignment.objects.filter(
        order=order,
        status__in=[DeliveryAssignment.ASSIGNED, DeliveryAssignment.REJECTED]
    ).delete()

    partner_id = request.data.get('partner_id')

    if partner_id:
        try:
            partner = DeliveryPartner.objects.get(id=partner_id, is_active=True)
        except DeliveryPartner.DoesNotExist:
            return Response({'error': 'Delivery partner not found'}, status=404)

        assignment = DeliveryAssignment.objects.create(
            order=order,
            delivery_partner=partner,
            status=DeliveryAssignment.ASSIGNED,
            estimated_delivery=timezone.now() + timezone.timedelta(hours=1),
        )

        order.status = Order.ASSIGNED
        order.save()

        OrderTrackingLog.objects.create(
            order=order,
            status=Order.ASSIGNED,
            message=f'Order manually assigned to {partner.user.full_name}',
            created_by=request.user,
        )
        push_order_update(order.id, Order.ASSIGNED,
                          f'Order assigned to {partner.user.full_name}')
        return Response({
            'message': f'Order assigned to {partner.user.full_name}',
            'assignment': DeliveryAssignmentSerializer(assignment).data
        })
    else:
        assignment = auto_assign_order(order)
        if not assignment:
            return Response({'error': 'No available delivery partners'}, status=400)
        return Response({
            'message': f'Order auto-assigned to {assignment.delivery_partner.user.full_name}',
            'assignment': DeliveryAssignmentSerializer(assignment).data
        })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_delivery_assignments(request):
    """List all delivery assignments with optional filters."""
    qs = DeliveryAssignment.objects.select_related(
        'order', 'order__user', 'order__delivery_address', 'delivery_partner__user'
    ).order_by('-assigned_at')

    partner_id = request.query_params.get('partner_id')
    status_filter = request.query_params.get('status')
    if partner_id:
        qs = qs.filter(delivery_partner_id=partner_id)
    if status_filter:
        qs = qs.filter(status=status_filter)

    return Response(DeliveryAssignmentSerializer(qs[:100], many=True).data)

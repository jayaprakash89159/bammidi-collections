"""
Admin views for full user/customer management.
"""
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from .models import User, Address
from .serializers import UserSerializer


class AdminUserListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = UserSerializer
    queryset = User.objects.all().order_by('-created_at')


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def admin_user_detail(request, user_id):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(UserSerializer(user).data)
    elif request.method == 'PATCH':
        for field in ['first_name', 'last_name', 'phone', 'role', 'is_active']:
            if field in request.data:
                setattr(user, field, request.data[field])
        user.save()
        return Response(UserSerializer(user).data)
    elif request.method == 'DELETE':
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_stats(request):
    """Comprehensive admin stats."""
    from apps.orders.models import Order
    from apps.products.models import Product, Inventory
    from apps.delivery.models import DeliveryPartner
    from django.utils import timezone
    from datetime import timedelta
    from django.db.models import Sum, Count

    today = timezone.now().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    orders_qs = Order.objects.all()
    paid_orders = orders_qs.filter(payment_status='paid')

    total_revenue = paid_orders.aggregate(t=Sum('total'))['t'] or 0
    today_revenue = paid_orders.filter(created_at__date=today).aggregate(t=Sum('total'))['t'] or 0
    week_revenue = paid_orders.filter(created_at__date__gte=week_ago).aggregate(t=Sum('total'))['t'] or 0
    month_revenue = paid_orders.filter(created_at__date__gte=month_ago).aggregate(t=Sum('total'))['t'] or 0

    # Revenue by day for last 7 days
    revenue_chart = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        rev = paid_orders.filter(created_at__date=day).aggregate(t=Sum('total'))['t'] or 0
        revenue_chart.append({'date': str(day), 'revenue': float(rev)})

    # Order status breakdown
    status_breakdown = {
        s: orders_qs.filter(status=s).count()
        for s, _ in Order.STATUS_CHOICES
    }

    # Payment method breakdown
    payment_breakdown = {}
    for method in ['cod', 'upi', 'card', 'razorpay']:
        payment_breakdown[method] = paid_orders.filter(payment_method=method).count()

    low_stock = Inventory.objects.filter(quantity__lte=10).count()
    out_of_stock = Inventory.objects.filter(quantity=0).count()

    return Response({
        'total_orders': orders_qs.count(),
        'today_orders': orders_qs.filter(created_at__date=today).count(),
        'week_orders': orders_qs.filter(created_at__date__gte=week_ago).count(),
        'pending_orders': orders_qs.filter(status=Order.PENDING).count(),
        'total_revenue': float(total_revenue),
        'today_revenue': float(today_revenue),
        'week_revenue': float(week_revenue),
        'month_revenue': float(month_revenue),
        'total_customers': User.objects.filter(role='customer').count(),
        'new_customers_today': User.objects.filter(created_at__date=today, role='customer').count(),
        'total_products': Product.objects.filter(is_active=True).count(),
        'low_stock_alerts': low_stock,
        'out_of_stock': out_of_stock,
        'active_delivery_partners': DeliveryPartner.objects.filter(is_available=True, is_active=True).count(),
        'total_delivery_partners': DeliveryPartner.objects.filter(is_active=True).count(),
        'revenue_chart': revenue_chart,
        'status_breakdown': status_breakdown,
        'payment_breakdown': payment_breakdown,
    })

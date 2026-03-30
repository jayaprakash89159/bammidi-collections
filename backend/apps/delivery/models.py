"""
Delivery partner and assignment models.
Supports geo-proximity assignment in production with lat/lng fields.
"""
from django.db import models
from apps.users.models import User


class DeliveryPartner(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='delivery_profile')
    vehicle_type = models.CharField(max_length=50, default='Bike')
    vehicle_number = models.CharField(max_length=20, blank=True)
    is_available = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    current_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    current_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    total_deliveries = models.PositiveIntegerField(default=0)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=5.0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'delivery_partners'

    def __str__(self):
        return f"{self.user.full_name} - {self.vehicle_type}"


class DeliveryAssignment(models.Model):
    ASSIGNED = 'assigned'
    ACCEPTED = 'accepted'
    PICKED_UP = 'picked_up'
    OUT_FOR_DELIVERY = 'out_for_delivery'
    DELIVERED = 'delivered'
    REJECTED = 'rejected'

    STATUS_CHOICES = [
        (ASSIGNED, 'Assigned'),
        (ACCEPTED, 'Accepted'),
        (PICKED_UP, 'Picked Up'),
        (OUT_FOR_DELIVERY, 'Out for Delivery'),
        (DELIVERED, 'Delivered'),
        (REJECTED, 'Rejected'),
    ]

    order = models.OneToOneField('orders.Order', on_delete=models.CASCADE, related_name='delivery_assignment')
    delivery_partner = models.ForeignKey(DeliveryPartner, on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=ASSIGNED)
    assigned_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    picked_up_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    estimated_delivery = models.DateTimeField(null=True, blank=True)
    partner_notes = models.TextField(blank=True)
    # COD cash collection tracking
    cash_collected = models.BooleanField(default=False)
    cash_collected_at = models.DateTimeField(null=True, blank=True)
    cash_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = 'delivery_assignments'

    def __str__(self):
        return f"Assignment for Order #{self.order.id}"
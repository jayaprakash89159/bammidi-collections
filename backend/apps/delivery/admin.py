from django.contrib import admin
from .models import DeliveryPartner, DeliveryAssignment

@admin.register(DeliveryPartner)
class DeliveryPartnerAdmin(admin.ModelAdmin):
    list_display = ['user', 'vehicle_type', 'is_available', 'is_active', 'total_deliveries', 'rating']
    list_filter = ['is_available', 'is_active', 'vehicle_type']
    search_fields = ['user__email', 'user__first_name']

@admin.register(DeliveryAssignment)
class DeliveryAssignmentAdmin(admin.ModelAdmin):
    list_display = ['order', 'delivery_partner', 'status', 'assigned_at', 'delivered_at']
    list_filter = ['status']
    search_fields = ['order__id', 'delivery_partner__user__email']

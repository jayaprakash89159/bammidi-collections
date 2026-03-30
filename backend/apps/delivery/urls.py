from django.urls import path
from . import views
from .admin_views import (
    admin_delivery_partners,
    admin_create_delivery_partner,
    admin_delivery_partner_detail,
    admin_assign_order,
    admin_delivery_assignments,
)

urlpatterns = [
    # Delivery Partner (self)
    path('profile/', views.DeliveryPartnerProfileView.as_view(), name='delivery-profile'),
    path('assignments/', views.my_assignments, name='my-assignments'),
    path('assignments/active/', views.active_assignment, name='active-assignment'),
    path('assignments/<int:assignment_id>/accept/', views.accept_order, name='accept-order'),
    path('assignments/<int:assignment_id>/status/', views.update_delivery_status, name='update-delivery-status'),
    path('assignments/<int:assignment_id>/collect-cash/', views.confirm_cash_collected, name='confirm-cash-collected'),
    path('availability/', views.toggle_availability, name='toggle-availability'),

    # Admin: Delivery Partners management
    path('admin/partners/', admin_delivery_partners, name='admin-delivery-partners'),
    path('admin/partners/create/', admin_create_delivery_partner, name='admin-create-partner'),
    path('admin/partners/<int:partner_id>/', admin_delivery_partner_detail, name='admin-partner-detail'),

    # Admin: Assignments
    path('admin/assignments/', admin_delivery_assignments, name='admin-delivery-assignments'),
    path('admin/orders/<int:order_id>/assign/', admin_assign_order, name='admin-assign-order'),
]
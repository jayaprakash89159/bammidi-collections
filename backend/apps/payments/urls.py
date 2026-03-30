from django.urls import path
from . import views

urlpatterns = [
    path('razorpay/create/', views.create_razorpay_order, name='create-razorpay-order'),
    path('razorpay/verify/', views.verify_razorpay_payment, name='verify-razorpay'),
    path('razorpay/webhook/', views.razorpay_webhook, name='razorpay-webhook'),
    path('refund/<int:order_id>/', views.process_refund, name='process-refund'),
]

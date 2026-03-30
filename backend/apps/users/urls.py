from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

router = DefaultRouter()
router.register('addresses', views.AddressViewSet, basename='address')

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('me/', views.me, name='me'),
    path('', include(router.urls)),
]

# Admin endpoints
from .admin_views import AdminUserListView, admin_user_detail, admin_stats
urlpatterns += [
    path('admin/users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/users/<int:user_id>/', admin_user_detail, name='admin-user-detail'),
    path('admin/stats/', admin_stats, name='admin-stats'),
]

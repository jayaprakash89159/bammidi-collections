from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from django.urls import re_path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/products/', include('apps.products.urls')),
    path('api/orders/', include('apps.orders.urls')),
    path('api/delivery/', include('apps.delivery.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/bot/', include('apps.bot.urls')),

    # FIX: Serve media files in BOTH debug and production
    # The default static() only works in DEBUG=True, this works always
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]

# Keep this too for development compatibility
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('django-admin/', admin.site.urls), # Django built-in admin panel
    
    # API endpoints
    path('api/auth/', include('users.urls')),
    path('api/departments/', include('departments.urls')),
    path('api/complaints/', include('complaints.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/location/', include('location.urls')),
    path('api/ai/', include('ai_service.urls')),
    path('api/routing/', include('ai_service.urls')),
    path('api/admin/analytics/', include('analytics.urls')),
]

# Serve media files in development mode
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

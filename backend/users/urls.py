from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterView, CustomTokenObtainPairView, UserProfileView, AdminUserManagementView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='auth_login'),
    path('refresh/', TokenRefreshView.as_view(), name='auth_refresh'),
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    
    # Admin User management
    path('admin/users/', AdminUserManagementView.as_view(), name='admin_users_management'),
]

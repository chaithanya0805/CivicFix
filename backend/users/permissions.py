from rest_framework import permissions

class IsAdminUserRole(permissions.BasePermission):
    """
    Allows access only to admin users.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'

class IsDepartmentStaffUserRole(permissions.BasePermission):
    """
    Allows access to department staff and admin users.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['staff', 'admin']

class IsCitizenUserRole(permissions.BasePermission):
    """
    Allows access only to citizen users.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'citizen'

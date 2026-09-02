from rest_framework import generics, permissions
from .models import Department
from .serializers import DepartmentSerializer
from users.permissions import IsAdminUserRole

class DepartmentListCreateView(generics.ListCreateAPIView):
    queryset = Department.objects.all().order_by('name')
    serializer_class = DepartmentSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            # Anyone can list departments (needed during registration or reporting)
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsAdminUserRole()]

    def get_queryset(self):
        # Admin can view all departments, citizens/staff only see active ones
        user = self.request.user
        if user and user.is_authenticated and user.role == 'admin':
            return Department.objects.all().order_by('name')
        return Department.objects.filter(active=True).order_by('name')

class DepartmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsAdminUserRole()]

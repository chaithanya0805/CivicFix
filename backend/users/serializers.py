from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from departments.serializers import DepartmentSerializer
from departments.models import Department

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    department_details = DepartmentSerializer(source='department', read_only=True)

    class Meta:
        model = User
        fields = ('id', 'name', 'email', 'phone', 'role', 'department', 'department_details', 'created_at')
        read_only_fields = ('id', 'created_at', 'department_details')

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6, style={'input_type': 'password'})
    confirm_password = serializers.CharField(write_only=True, min_length=6, style={'input_type': 'password'})
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = User
        fields = ('name', 'email', 'phone', 'password', 'confirm_password', 'role', 'department')
        extra_kwargs = {
            'role': {'required': False} # Default is citizen
        }

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"password": "Passwords must match."})
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        role = validated_data.get('role', 'citizen')
        dept = validated_data.get('department', None)
        
        user = User.objects.create_user(
            email=validated_data['email'],
            name=validated_data['name'],
            phone=validated_data.get('phone', ''),
            role=role,
            department=dept,
            is_staff=(role == 'admin') # If registering as admin, make it django staff
        )
        user.set_password(password)
        user.save()
        return user

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Add extra user profile fields in response alongside tokens
        data['user'] = {
            'id': self.user.id,
            'name': self.user.name,
            'email': self.user.email,
            'role': self.user.role,
        }
        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims into the JWT token itself
        token['name'] = user.name
        token['email'] = user.email
        token['role'] = user.role
        return token

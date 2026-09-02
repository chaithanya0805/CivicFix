from rest_framework import serializers
from .models import Complaint, ComplaintStatusHistory, ComplaintMedia
from users.serializers import UserSerializer
from departments.serializers import DepartmentSerializer
from departments.models import Department

class ComplaintStatusHistorySerializer(serializers.ModelSerializer):
    updated_by_name = serializers.CharField(source='updated_by.name', read_only=True)
    updated_by_role = serializers.CharField(source='updated_by.role', read_only=True)

    class Meta:
        model = ComplaintStatusHistory
        fields = ('id', 'status', 'remark', 'updated_by_name', 'updated_by_role', 'created_at')
        read_only_fields = ('id', 'created_at')

class ComplaintMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplaintMedia
        fields = ('id', 'media_type', 'media_file', 'uploaded_by', 'created_at')
        read_only_fields = ('id', 'created_at', 'uploaded_by')

class ComplaintSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    department_details = DepartmentSerializer(source='department', read_only=True)
    status_history = ComplaintStatusHistorySerializer(many=True, read_only=True)
    media = ComplaintMediaSerializer(many=True, read_only=True)
    
    # Writeable foreign key for departments
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        required=False,
        allow_null=True
    )

    latitude = serializers.CharField(required=False, allow_null=True)
    longitude = serializers.CharField(required=False, allow_null=True)

    class Meta:
        model = Complaint
        fields = (
            'id', 'complaint_id', 'user', 'department', 'department_details',
            'title', 'description', 'issue_type', 'image', 'latitude', 'longitude',
            'address', 'city', 'state', 'pincode', 'ai_confidence',
            'ai_recommended_department', 'priority', 'is_emergency',
            'authority_name', 'contact_email', 'contact_phone', 'official_portal',
            'source_name', 'source_url', 'source_verified', 'routing_confidence',
            'recommended_channel', 'routing_status',
            'status', 'status_history', 'media', 'created_at', 'updated_at'
        )
        read_only_fields = (
            'id', 'complaint_id', 'status', 'ai_confidence', 
            'ai_recommended_department', 'created_at', 'updated_at',
            'authority_name', 'contact_email', 'contact_phone', 'official_portal',
            'source_name', 'source_url', 'source_verified', 'routing_confidence',
            'recommended_channel', 'routing_status'
        )

    def validate_latitude(self, value):
        if value is None:
            return None
        val_str = str(value).strip().lower()
        if val_str in ['', 'null', 'undefined']:
            return None
        try:
            from decimal import Decimal, ROUND_HALF_UP
            val_dec = Decimal(val_str).quantize(Decimal('0.000001'), rounding=ROUND_HALF_UP)
            if val_dec < Decimal('-90.0') or val_dec > Decimal('90.0'):
                raise serializers.ValidationError("Latitude must be between -90 and 90.")
            return val_dec
        except (ValueError, TypeError, ArithmeticError):
            raise serializers.ValidationError("Invalid latitude coordinate.")

    def validate_longitude(self, value):
        if value is None:
            return None
        val_str = str(value).strip().lower()
        if val_str in ['', 'null', 'undefined']:
            return None
        try:
            from decimal import Decimal, ROUND_HALF_UP
            val_dec = Decimal(val_str).quantize(Decimal('0.000001'), rounding=ROUND_HALF_UP)
            if val_dec < Decimal('-180.0') or val_dec > Decimal('180.0'):
                raise serializers.ValidationError("Longitude must be between -180 and 180.")
            return val_dec
        except (ValueError, TypeError, ArithmeticError):
            raise serializers.ValidationError("Invalid longitude coordinate.")

    def validate_image(self, value):
        # Validate file size (e.g. max 5MB)
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Image file size cannot exceed 5MB.")
        
        # Validate format
        ext = value.name.split('.')[-1].lower()
        if ext not in ['jpg', 'jpeg', 'png', 'webp']:
            raise serializers.ValidationError("Unsupported image format. Please upload JPG, JPEG, PNG, or WEBP.")
            
        return value

class PublicComplaintSerializer(serializers.ModelSerializer):
    department_details = DepartmentSerializer(source='department', read_only=True)
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = Complaint
        fields = (
            'id', 'complaint_id', 'department_details', 'title', 'description', 
            'issue_type', 'image', 'latitude', 'longitude', 'address', 'city', 
            'state', 'pincode', 'priority', 'is_emergency', 'status', 'created_at'
        )

    def get_latitude(self, obj):
        return round(float(obj.latitude), 3) if obj.latitude else None

    def get_longitude(self, obj):
        return round(float(obj.longitude), 3) if obj.longitude else None

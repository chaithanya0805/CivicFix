from django.db import models
from django.contrib.auth import get_user_model
from departments.models import Department
import datetime
import uuid

User = get_user_model()

class Complaint(models.Model):
    STATUS_CHOICES = (
        ('submitted', 'Submitted'),
        ('acknowledged', 'Acknowledged'),
        ('assigned', 'Assigned'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('rejected', 'Rejected'),
    )

    PRIORITY_CHOICES = (
        ('normal', 'Normal'),
        ('high', 'High'),
        ('emergency', 'Emergency'),
    )

    complaint_id = models.CharField(max_length=50, unique=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='complaints')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='complaints')
    title = models.CharField(max_length=255)
    description = models.TextField()
    issue_type = models.CharField(max_length=100)
    image = models.ImageField(upload_to='complaints/before/')
    
    # Coordinates (Privacy protected in public views)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    # Geocoded Address Details
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    
    # AI details
    ai_confidence = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    ai_recommended_department = models.CharField(max_length=100, blank=True, null=True)
    
    # Priority details
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='normal')
    is_emergency = models.BooleanField(default=False)
    
    # Smart Routing outcome details
    authority_name = models.CharField(max_length=255, null=True, blank=True)
    contact_email = models.CharField(max_length=100, null=True, blank=True)
    contact_phone = models.CharField(max_length=50, null=True, blank=True)
    official_portal = models.CharField(max_length=500, null=True, blank=True)
    source_name = models.CharField(max_length=255, null=True, blank=True)
    source_url = models.CharField(max_length=500, null=True, blank=True)
    source_verified = models.BooleanField(default=False)
    routing_confidence = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    recommended_channel = models.CharField(max_length=50, default='email')
    routing_status = models.CharField(max_length=20, default='needs_review')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='submitted')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Generate complaint_id if it doesn't exist
        if not self.complaint_id:
            year = datetime.datetime.now().year
            prefix = f"CF-{year}-"
            # Get the highest ID for this year
            last_complaint = Complaint.objects.filter(complaint_id__startswith=prefix).order_by('-id').first()
            if last_complaint and last_complaint.complaint_id:
                last_id = last_complaint.complaint_id
                try:
                    last_num = int(last_id.split('-')[-1])
                    new_num = last_num + 1
                except (ValueError, IndexError, AttributeError):
                    new_num = 1
            else:
                new_num = 1
            self.complaint_id = f"{prefix}{new_num:05d}"
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.complaint_id} - {self.issue_type} ({self.status})"

class ComplaintStatusHistory(models.Model):
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name='status_history')
    status = models.CharField(max_length=20, choices=Complaint.STATUS_CHOICES)
    remark = models.TextField(blank=True, null=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='status_updates')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.complaint.complaint_id} changed to {self.status} on {self.created_at}"

class ComplaintMedia(models.Model):
    MEDIA_TYPE_CHOICES = (
        ('before', 'Before Resolution'),
        ('after', 'After Resolution'),
    )

    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name='media')
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPE_CHOICES)
    media_file = models.FileField(upload_to='complaints/media/')
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.media_type.upper()} image for {self.complaint.complaint_id}"

class RoutingCache(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    location_key = models.CharField(max_length=255, db_index=True)
    issue_type = models.CharField(max_length=100)
    authority_name = models.CharField(max_length=255, null=True, blank=True)
    department_name = models.CharField(max_length=255, null=True, blank=True)
    email = models.CharField(max_length=100, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    official_portal = models.CharField(max_length=500, null=True, blank=True)
    source_name = models.CharField(max_length=255, null=True, blank=True)
    source_url = models.CharField(max_length=500, null=True, blank=True)
    source_verified = models.BooleanField(default=False)
    recommended_channel = models.CharField(max_length=50, default='email')
    confidence = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    last_verified_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["location_key", "issue_type"],
                name="unique_routing_location_issue"
            )
        ]

    def __str__(self):
        return f"{self.location_key} - {self.issue_type} ({self.authority_name})"

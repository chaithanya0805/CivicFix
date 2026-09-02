from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import Complaint, ComplaintStatusHistory, ComplaintMedia
from .serializers import ComplaintSerializer, PublicComplaintSerializer, ComplaintStatusHistorySerializer
from .emails import send_citizen_notification_email, send_department_notification_email
from notifications.models import Notification
from users.permissions import IsAdminUserRole, IsDepartmentStaffUserRole
from departments.models import Department

class ComplaintListCreateView(generics.ListCreateAPIView):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)

    def get_serializer_class(self):
        # Use Public serializer for unauthenticated users, or if map/public param is true
        is_public = self.request.query_params.get('public', 'false') == 'true' or \
                    self.request.query_params.get('map', 'false') == 'true' or \
                    not self.request.user.is_authenticated
                    
        if is_public:
            return PublicComplaintSerializer
        return ComplaintSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Complaint.objects.all().order_by('-created_at')

        # Check if requesting public list
        is_public = self.request.query_params.get('public', 'false') == 'true' or \
                    self.request.query_params.get('map', 'false') == 'true' or \
                    not user.is_authenticated

        if is_public:
            # Public view shows all issues, typically for maps or landing feeds
            queryset = queryset.filter(active=True) if hasattr(Complaint, 'active') else queryset
        else:
            # Role based filtering
            if user.role == 'admin':
                pass # Admin sees all
            elif user.role == 'staff':
                # Staff sees complaints assigned to their department
                if user.department:
                    queryset = queryset.filter(department=user.department)
                else:
                    queryset = Complaint.objects.none() # Staff with no department sees none
            else:
                # Citizen sees their own complaints
                queryset = queryset.filter(user=user)

        # Apply search and filters
        status_filter = self.request.query_params.get('status')
        priority_filter = self.request.query_params.get('priority')
        dept_filter = self.request.query_params.get('department')
        search_query = self.request.query_params.get('search')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)
        if dept_filter:
            queryset = queryset.filter(department_id=dept_filter)
        if search_query:
            queryset = queryset.filter(
                Q(complaint_id__icontains=search_query) |
                Q(title__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(address__icontains=search_query) |
                Q(city__icontains=search_query) |
                Q(pincode__icontains=search_query) |
                Q(issue_type__icontains=search_query)
            )

        return queryset

    def perform_create(self, serializer):
        # Determine local authority and contacts using routing_id
        routing_id = self.request.data.get('routing_id')
        
        # Initialize default routing values
        authority_name = None
        contact_email = None
        contact_phone = None
        official_portal = None
        source_name = None
        source_url = None
        source_verified = False
        routing_confidence = 0.0
        recommended_channel = 'email'
        routing_status = 'needs_review'
        
        department = None
        
        from complaints.models import RoutingCache
        from ai_service.routing_service import DEFAULT_DEPARTMENT_MAPPING
        
        import uuid
        cached_routing = None
        if routing_id and str(routing_id).strip().lower() not in ['null', 'undefined', '']:
            try:
                uuid_val = uuid.UUID(str(routing_id).strip())
                cached_routing = RoutingCache.objects.filter(id=uuid_val).first()
            except Exception as e:
                logger.error(f"Error fetching RoutingCache with id {routing_id}: {str(e)}")

        if cached_routing:
            authority_name = cached_routing.authority_name
            contact_email = cached_routing.email
            contact_phone = cached_routing.phone
            official_portal = cached_routing.official_portal
            source_name = cached_routing.source_name
            source_url = cached_routing.source_url
            source_verified = cached_routing.source_verified
            routing_confidence = cached_routing.confidence
            recommended_channel = cached_routing.recommended_channel
            routing_status = "verified" if cached_routing.source_verified else "needs_review"
            
            # Resolve department based on cache recommendation
            if cached_routing.department_name:
                dept = Department.objects.filter(name__icontains=cached_routing.department_name).first()
                if dept:
                    department = dept
        else:
            # Fallback routing
            issue_type = serializer.validated_data.get('issue_type')
            city = serializer.validated_data.get('city', 'Local')
            
            fallback_dept_name = DEFAULT_DEPARTMENT_MAPPING.get(issue_type, 'Other')
            department = Department.objects.filter(name__icontains=fallback_dept_name).first()
            
            authority_name = f"{city} Local Municipal Authority"
            source_name = "Local Department Fallback Directory"
            routing_confidence = 0.50
            recommended_channel = "other"
            routing_status = "needs_review"

        # Populate AI fields passed from wizard step 3
        ai_recommended_department = self.request.data.get('ai_recommended_department', '')
        ai_confidence_str = self.request.data.get('ai_confidence')
        try:
            ai_confidence = float(ai_confidence_str) if ai_confidence_str else None
        except (ValueError, TypeError):
            ai_confidence = None

        complaint = serializer.save(
            user=self.request.user,
            status='submitted',
            department=department,
            ai_recommended_department=ai_recommended_department,
            ai_confidence=ai_confidence,
            authority_name=authority_name,
            contact_email=contact_email,
            contact_phone=contact_phone,
            official_portal=official_portal,
            source_name=source_name,
            source_url=source_url,
            source_verified=source_verified,
            routing_confidence=routing_confidence,
            recommended_channel=recommended_channel,
            routing_status=routing_status
        )

        # Log Status History 1: Submitted
        ComplaintStatusHistory.objects.create(
            complaint=complaint,
            status='submitted',
            remark="Complaint registered by citizen.",
            updated_by=self.request.user
        )

        # Create Citizen Notification
        Notification.objects.create(
            user=self.request.user,
            complaint=complaint,
            message=f"Your complaint {complaint.complaint_id} has been successfully submitted."
        )

        # Send Citizen Email
        send_citizen_notification_email(complaint, "submitted", "Your complaint has been logged and is pending review.")

        # Log Status History 2: Assigned (if department is resolved)
        if department:
            complaint.status = 'assigned'
            complaint.save()

            ComplaintStatusHistory.objects.create(
                complaint=complaint,
                status='assigned',
                remark=f"Automatically assigned to {department.name} based on smart routing details.",
                updated_by=self.request.user
            )

            # Notification to citizen for assignment
            Notification.objects.create(
                user=self.request.user,
                complaint=complaint,
                message=f"Your complaint {complaint.complaint_id} has been assigned to {department.name}."
            )

            # Send Email alert to Department and Citizen
            send_department_notification_email(complaint)
            send_citizen_notification_email(complaint, "assigned", f"Assigned to {department.name} for resolution.")
            
        elif serializer.validated_data.get('is_emergency', False):
            # If no department but it's an emergency, notify admin immediately
            pass

class ComplaintDetailView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get_complaint(self, pk, user):
        if user.role == 'admin':
            return get_object_or_404(Complaint, pk=pk)
        elif user.role == 'staff':
            # Staff can see if they are assigned to that department
            complaint = get_object_or_404(Complaint, pk=pk)
            if user.department and complaint.department == user.department:
                return complaint
            else:
                # Fallback: public view or deny
                return None
        else:
            # Citizen sees only their own
            return get_object_or_404(Complaint, pk=pk, user=user)

    def get(self, request, pk):
        complaint = self.get_complaint(pk, request.user)
        if not complaint:
            return Response(
                {"error": "You do not have permission to view this complaint."},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = ComplaintSerializer(complaint)
        return Response(serializer.data)

    def patch(self, request, pk):
        complaint = self.get_complaint(pk, request.user)
        if not complaint:
            return Response(
                {"error": "You do not have permission to modify this complaint."},
                status=status.HTTP_403_FORBIDDEN
            )

        user = request.user
        new_status = request.data.get('status')
        remark = request.data.get('remark', '')
        
        # Check permissions and state rules
        if user.role == 'citizen':
            # Citizen can only edit title/description if complaint is still in 'submitted' state
            if complaint.status != 'submitted':
                return Response(
                    {"error": "You can only edit details of complaints in 'Submitted' status."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            serializer = ComplaintSerializer(complaint, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Staff and Admin can update status and assignment details
        old_status = complaint.status
        serializer_data = request.data.copy()

        # Handle file upload for resolution (AFTER image)
        after_image = request.FILES.get('after_image')
        if after_image:
            # Validate size & extension
            if after_image.size > 5 * 1024 * 1024:
                return Response({"error": "Resolution image cannot exceed 5MB."}, status=status.HTTP_400_BAD_REQUEST)
            ext = after_image.name.split('.')[-1].lower()
            if ext not in ['jpg', 'jpeg', 'png', 'webp']:
                return Response({"error": "Invalid file format. Upload JPG, JPEG, PNG, or WEBP."}, status=status.HTTP_400_BAD_REQUEST)

        # Execute serialization update
        serializer = ComplaintSerializer(complaint, data=serializer_data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        updated_complaint = serializer.save()

        # If status changed or a remark is added, create a Status History log
        if new_status and new_status != old_status:
            # Check status sequence permission
            # E.g. staff can change status to acknowledged, assigned, in_progress, resolved, rejected
            
            # If transitioning to resolved, require an after_image
            if new_status == 'resolved' and not after_image:
                # Check if an after image already exists in media
                has_after = ComplaintMedia.objects.filter(complaint=updated_complaint, media_type='after').exists()
                if not has_after:
                    # Rollback status change
                    updated_complaint.status = old_status
                    updated_complaint.save()
                    return Response(
                        {"error": "An after-resolution photo is required to mark the complaint as Resolved."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Log history
            ComplaintStatusHistory.objects.create(
                complaint=updated_complaint,
                status=new_status,
                remark=remark,
                updated_by=user
            )

            # Save uploaded AFTER photo
            if after_image:
                ComplaintMedia.objects.create(
                    complaint=updated_complaint,
                    media_type='after',
                    media_file=after_image,
                    uploaded_by=user
                )

            # Notify Citizen
            Notification.objects.create(
                user=updated_complaint.user,
                complaint=updated_complaint,
                message=f"Your complaint {updated_complaint.complaint_id} status has been updated to '{updated_complaint.get_status_display()}'."
            )

            # Send Email update to Citizen
            send_citizen_notification_email(updated_complaint, new_status, remark)
            
            # If status changed to assigned, send alert to department staff
            if new_status == 'assigned':
                send_department_notification_email(updated_complaint)

        elif remark:
            # If just a remark is added without status change, log it as history with current status
            ComplaintStatusHistory.objects.create(
                complaint=updated_complaint,
                status=updated_complaint.status,
                remark=remark,
                updated_by=user
            )

        return Response(ComplaintSerializer(updated_complaint).data)

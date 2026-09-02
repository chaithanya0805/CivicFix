from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def send_citizen_notification_email(complaint, status_verb, remark=None):
    """
    Sends email notification to the citizen regarding their complaint status change.
    """
    subject = f"CivicFix Alert: Complaint {complaint.complaint_id} is {status_verb.upper()}"
    
    body = (
        f"Dear {complaint.user.name},\n\n"
        f"Your complaint {complaint.complaint_id} regarding '{complaint.issue_type}' "
        f"has been updated. Its status is now: {complaint.get_status_display()}.\n\n"
        f"Details:\n"
        f"- Issue: {complaint.issue_type}\n"
        f"- Description: {complaint.description}\n"
        f"- Location: {complaint.address}, {complaint.city}\n"
        f"- Priority: {complaint.get_priority_display()}\n"
        f"- Status: {complaint.get_status_display()}\n"
    )
    
    if remark:
        body += f"- Department Remark: {remark}\n"
        
    body += (
        f"\nTrack your complaint progress here:\n"
        f"http://localhost:5173/complaint/{complaint.id}\n\n"
        f"Thank you,\n"
        f"CivicFix Team\n"
        f"Report. Track. Resolve.\n"
    )
    
    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[complaint.user.email],
            fail_silently=True
        )
        logger.info(f"Notification email sent to citizen: {complaint.user.email}")
    except Exception as e:
        logger.error(f"Failed to send email to citizen: {str(e)}")


def send_department_notification_email(complaint):
    """
    Sends email notification to the assigned department staff email list.
    """
    if not complaint.department:
        return
        
    dept = complaint.department
    subject = f"[CivicFix Alert] New Complaint Assigned: {complaint.complaint_id} ({complaint.priority.upper()})"
    
    body = (
        f"Hello {dept.name} Team,\n\n"
        f"A civic complaint has been assigned to your department for resolution.\n\n"
        f"Complaint Details:\n"
        f"- ID: {complaint.complaint_id}\n"
        f"- Issue Type: {complaint.issue_type}\n"
        f"- Description: {complaint.description}\n"
        f"- Address: {complaint.address}, {complaint.city}, {complaint.pincode}\n"
        f"- Exact Coordinates: Lat {complaint.latitude}, Lng {complaint.longitude}\n"
        f"- Priority Level: {complaint.get_priority_display()}\n"
        f"- Is Emergency: {'YES' if complaint.is_emergency else 'No'}\n"
        f"- Submitted Date: {complaint.created_at.strftime('%d-%b-%Y %I:%M %p') if complaint.created_at else 'Just now'}\n\n"
        f"Citizen Info:\n"
        f"- Name: {complaint.user.name}\n"
        f"- Email: {complaint.user.email}\n"
        f"- Phone: {complaint.user.phone or 'Not Provided'}\n\n"
        f"Please login to the department dashboard to update work status:\n"
        f"http://localhost:5173/dept/complaint/{complaint.id}\n\n"
        f"CivicFix Platform\n"
    )
    
    recipient_email = complaint.contact_email if complaint.contact_email else dept.email
    if not recipient_email:
        return

    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            fail_silently=True
        )
        logger.info(f"Assignment email sent to department/authority: {recipient_email}")
    except Exception as e:
        logger.error(f"Failed to send email to department/authority: {str(e)}")

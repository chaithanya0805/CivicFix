from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.contrib.auth import get_user_model
from django.utils import timezone
import datetime

from complaints.models import Complaint
from users.permissions import IsAdminUserRole

User = get_user_model()

class AdminAnalyticsView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsAdminUserRole)

    def get(self, request):
        try:
            # 1. Base Counter Stats
            total_complaints = Complaint.objects.count()
            resolved_complaints = Complaint.objects.filter(status='resolved').count()
            in_progress_complaints = Complaint.objects.filter(status='in_progress').count()
            high_priority = Complaint.objects.filter(priority='high').count()
            emergency_complaints = Complaint.objects.filter(priority='emergency').count()
            total_users = User.objects.count()

            # 2. Status Distribution
            status_counts = Complaint.objects.values('status').annotate(count=Count('id'))
            status_dist = {item['status']: item['count'] for item in status_counts}
            # Fill missing statuses with 0
            for choice, _ in Complaint.STATUS_CHOICES:
                status_dist.setdefault(choice, 0)

            # 3. Priority Distribution
            priority_counts = Complaint.objects.values('priority').annotate(count=Count('id'))
            priority_dist = {item['priority']: item['count'] for item in priority_counts}
            for choice, _ in Complaint.PRIORITY_CHOICES:
                priority_dist.setdefault(choice, 0)

            # 4. Department distribution (Join with Department table)
            dept_counts = Complaint.objects.values('department__name').annotate(count=Count('id')).order_by('-count')
            dept_dist = []
            for item in dept_counts:
                name = item['department__name'] or 'Unassigned'
                dept_dist.append({
                    'department': name,
                    'count': item['count']
                })

            # 5. Issue Type distribution
            issue_counts = Complaint.objects.values('issue_type').annotate(count=Count('id')).order_by('-count')
            issue_dist = []
            for item in issue_counts:
                issue_dist.append({
                    'issue_type': item['issue_type'],
                    'count': item['count']
                })

            # 6. Timeline of complaints (Last 30 Days)
            end_date = timezone.now().date()
            start_date = end_date - datetime.timedelta(days=30)
            
            timeline_data = Complaint.objects.filter(
                created_at__date__gte=start_date,
                created_at__date__lte=end_date
            ).annotate(
                day=TruncDate('created_at')
            ).values('day').annotate(
                count=Count('id')
            ).order_by('day')

            # Build a complete calendar array for the last 30 days to avoid timeline gaps
            timeline_map = {item['day'].strftime('%Y-%m-%d'): item['count'] for item in timeline_data if item['day']}
            timeline_dist = []
            for i in range(31):
                day_val = start_date + datetime.timedelta(days=i)
                day_str = day_val.strftime('%Y-%m-%d')
                timeline_dist.append({
                    'date': day_val.strftime('%d %b'),
                    'count': timeline_map.get(day_str, 0)
                })

            payload = {
                'counters': {
                    'total_complaints': total_complaints,
                    'resolved': resolved_complaints,
                    'in_progress': in_progress_complaints,
                    'high_priority': high_priority,
                    'emergency': emergency_complaints,
                    'total_users': total_users
                },
                'status_distribution': status_dist,
                'priority_distribution': priority_dist,
                'department_distribution': dept_dist,
                'issue_distribution': issue_dist,
                'timeline': timeline_dist
            }

            return Response(payload, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": f"Failed to compute analytics: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

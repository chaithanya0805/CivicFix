import datetime
from io import BytesIO
from PIL import Image

from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.contrib.auth import get_user_model
from django.utils import timezone

from departments.models import Department
from complaints.models import Complaint, ComplaintStatusHistory, ComplaintMedia, RoutingCache
from notifications.models import Notification

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds database with default departments, users, and realistic sample complaints'

    def handle(self, *args, **options):
        self.stdout.write('Clearing existing database tables...')
        try:
            Notification.objects.all().delete()
            ComplaintMedia.objects.all().delete()
            ComplaintStatusHistory.objects.all().delete()
            Complaint.objects.all().delete()
            User.objects.all().delete()
            Department.objects.all().delete()
            RoutingCache.objects.all().delete()
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Note: Table clearing bypassed (expected if this is the first migration): {str(e)}"))

        self.stdout.write('Seeding Departments...')
        depts_data = [
            {'name': 'Municipal Corporation', 'email': 'municipal@civicfix.org', 'phone': '080-22221111', 'description': 'Responsible for garbage cleaning, sanitation, pest control, and public health.'},
            {'name': 'Roads & Transport', 'email': 'roads@civicfix.org', 'phone': '080-22222222', 'description': 'Responsible for road laying, repairing potholes, bridge maintenance, and footpaths.'},
            {'name': 'Electricity', 'email': 'electricity@civicfix.org', 'phone': '080-22223333', 'description': 'Responsible for streetlights, electric poles, transformers, and electrical safety.'},
            {'name': 'Water Supply', 'email': 'water@civicfix.org', 'phone': '080-22224444', 'description': 'Responsible for sewage, open manholes, drinking water leakage, and drainage repairs.'},
            {'name': 'Traffic', 'email': 'traffic@civicfix.org', 'phone': '080-22225555', 'description': 'Responsible for traffic signals, zebra crossings, and road signages.'},
            {'name': 'Parks & Public Spaces', 'email': 'parks@civicfix.org', 'phone': '080-22226666', 'description': 'Responsible for tree branch pruning, local parks, and playground maintenance.'},
            {'name': 'Other', 'email': 'support@civicfix.org', 'phone': '080-22227777', 'description': 'Responsible for miscellaneous civic infrastructure reports.'},
        ]
        
        departments = {}
        for item in depts_data:
            dept = Department.objects.create(
                name=item['name'],
                email=item['email'],
                phone=item['phone'],
                description=item['description'],
                active=True
            )
            departments[item['name']] = dept
            self.stdout.write(f"  Created Department: {dept.name}")

        self.stdout.write('Seeding Users...')
        # 1. Admin
        admin_user = User.objects.create_superuser(
            email='admin@civicfix.org',
            password='Password123',
            name='Admin Chief'
        )
        self.stdout.write("  Created Admin: admin@civicfix.org")

        # 2. Staff
        staff_data = [
            {'name': 'Municipal Staff', 'email': 'municipal_staff@civicfix.org', 'dept': 'Municipal Corporation'},
            {'name': 'Road Staff', 'email': 'roads_staff@civicfix.org', 'dept': 'Roads & Transport'},
            {'name': 'Electricity Staff', 'email': 'elec_staff@civicfix.org', 'dept': 'Electricity'},
            {'name': 'Water Staff', 'email': 'water_staff@civicfix.org', 'dept': 'Water Supply'},
        ]
        
        staff_users = {}
        for item in staff_data:
            staff = User.objects.create_user(
                email=item['email'],
                password='Password123',
                name=item['name'],
                role='staff',
                department=departments[item['dept']],
                is_staff=False
            )
            staff_users[item['dept']] = staff
            self.stdout.write(f"  Created Staff User: {staff.email} ({item['dept']})")

        # 3. Citizen
        citizen_user = User.objects.create_user(
            email='citizen@civicfix.org',
            password='Password123',
            name='Chaithanya Citizen',
            phone='9876543210',
            role='citizen'
        )
        self.stdout.write("  Created Citizen: citizen@civicfix.org")

        self.stdout.write('Creating Mock Images...')
        # Helper to make dummy images in memory
        def generate_mock_image(color, label):
            img = Image.new('RGB', (400, 300), color=color)
            img_io = BytesIO()
            img.save(img_io, format='JPEG')
            return ContentFile(img_io.getvalue(), name=f"{label}.jpg")

        img_garbage_before = generate_mock_image((139, 69, 19), 'garbage_before')
        img_pothole_before = generate_mock_image((128, 128, 128), 'pothole_before')
        img_lamp_before = generate_mock_image((30, 30, 30), 'lamp_before')
        img_lamp_after = generate_mock_image((255, 237, 168), 'lamp_after') # Illuminated
        img_manhole_before = generate_mock_image((105, 105, 105), 'manhole_before')

        self.stdout.write('Seeding Complaints...')
        now = timezone.now()

        # Complaint 1: Garbage (Submitted)
        c1 = Complaint.objects.create(
            user=citizen_user,
            department=departments['Municipal Corporation'],
            title='Garbage Accumulation on Outer Ring Road',
            description='A huge dump of organic waste and plastic bags has accumulated beside the main road, causing a terrible smell and attracting stray dogs.',
            issue_type='Garbage Accumulation',
            image=img_garbage_before,
            latitude=12.9562,
            longitude=77.6983,
            address='Outer Ring Rd, Marathahalli',
            city='Bengaluru',
            state='Karnataka',
            pincode='560037',
            ai_confidence=94.0,
            ai_recommended_department='Municipal Corporation',
            priority='normal',
            is_emergency=False,
            status='submitted',
        )
        c1.created_at = now - datetime.timedelta(days=4)
        c1.save()
        
        ComplaintStatusHistory.objects.create(
            complaint=c1,
            status='submitted',
            remark='Complaint submitted by citizen.',
            updated_by=citizen_user,
            created_at=now - datetime.timedelta(days=4)
        )
        Notification.objects.create(
            user=citizen_user,
            complaint=c1,
            message='Your complaint CF-2026-00001 has been registered.',
            created_at=now - datetime.timedelta(days=4)
        )

        # Complaint 2: Pothole (In Progress)
        c2 = Complaint.objects.create(
            user=citizen_user,
            department=departments['Roads & Transport'],
            title='Dangerous Pothole near Whitefield Metro',
            description='There is a very deep pothole right in the middle of the road near the metro station staircase. Multiple two-wheelers have almost crashed trying to avoid it.',
            issue_type='Road Pothole',
            image=img_pothole_before,
            latitude=12.9740,
            longitude=77.7288,
            address='ITPL Main Rd, Whitefield',
            city='Bengaluru',
            state='Karnataka',
            pincode='560066',
            ai_confidence=92.5,
            ai_recommended_department='Roads & Transport',
            priority='high',
            is_emergency=False,
            status='in_progress',
        )
        c2.created_at = now - datetime.timedelta(days=3)
        c2.save()

        ComplaintStatusHistory.objects.create(
            complaint=c2,
            status='submitted',
            remark='Complaint submitted by citizen.',
            updated_by=citizen_user,
            created_at=now - datetime.timedelta(days=3)
        )
        ComplaintStatusHistory.objects.create(
            complaint=c2,
            status='acknowledged',
            remark='Complaint acknowledged by Roads & Transport department.',
            updated_by=staff_users['Roads & Transport'],
            created_at=now - datetime.timedelta(days=2, hours=10)
        )
        ComplaintStatusHistory.objects.create(
            complaint=c2,
            status='in_progress',
            remark='Road repair crew has been dispatched to patch the pothole.',
            updated_by=staff_users['Roads & Transport'],
            created_at=now - datetime.timedelta(days=1, hours=5)
        )

        # Complaint 3: Streetlight (Resolved)
        c3 = Complaint.objects.create(
            user=citizen_user,
            department=departments['Electricity'],
            title='Broken Streetlight on 100 Feet Road',
            description='The street lamp outside the supermarket is completely broken and is not turning on since last week. The street is completely dark and unsafe at night.',
            issue_type='Broken Streetlight',
            image=img_lamp_before,
            latitude=12.9698,
            longitude=77.6415,
            address='100 Feet Rd, Indiranagar',
            city='Bengaluru',
            state='Karnataka',
            pincode='560038',
            ai_confidence=95.0,
            ai_recommended_department='Electricity',
            priority='normal',
            is_emergency=False,
            status='resolved',
        )
        c3.created_at = now - datetime.timedelta(days=6)
        c3.save()

        ComplaintStatusHistory.objects.create(
            complaint=c3,
            status='submitted',
            remark='Complaint registered.',
            updated_by=citizen_user,
            created_at=now - datetime.timedelta(days=6)
        )
        ComplaintStatusHistory.objects.create(
            complaint=c3,
            status='assigned',
            remark='Assigned to Electricity board team.',
            updated_by=admin_user,
            created_at=now - datetime.timedelta(days=5, hours=12)
        )
        ComplaintStatusHistory.objects.create(
            complaint=c3,
            status='in_progress',
            remark='Electrician dispatched to check bulb/wiring.',
            updated_by=staff_users['Electricity'],
            created_at=now - datetime.timedelta(days=4, hours=2)
        )
        ComplaintStatusHistory.objects.create(
            complaint=c3,
            status='resolved',
            remark='The sodium bulb was replaced and the streetlight is fully operational now.',
            updated_by=staff_users['Electricity'],
            created_at=now - datetime.timedelta(days=3)
        )
        
        # Add after resolution photo
        ComplaintMedia.objects.create(
            complaint=c3,
            media_type='after',
            media_file=img_lamp_after,
            uploaded_by=staff_users['Electricity'],
            created_at=now - datetime.timedelta(days=3)
        )

        # Complaint 4: Emergency Manhole (Assigned)
        c4 = Complaint.objects.create(
            user=citizen_user,
            department=departments['Water Supply'],
            title='Danger! Open Sewage Manhole on Road Corner',
            description='An open sewage manhole is left completely exposed on the turn. It is extremely hazardous as it is partially hidden by bushes. This is a severe threat to pedestrians and motorbikes.',
            issue_type='Open Manhole/Drain',
            image=img_manhole_before,
            latitude=12.9352,
            longitude=77.6244,
            address='80 Feet Rd, Koramangala',
            city='Bengaluru',
            state='Karnataka',
            pincode='560095',
            ai_confidence=97.0,
            ai_recommended_department='Water Supply',
            priority='emergency',
            is_emergency=True,
            status='assigned',
        )
        c4.created_at = now - datetime.timedelta(hours=12)
        c4.save()

        ComplaintStatusHistory.objects.create(
            complaint=c4,
            status='submitted',
            remark='Emergency complaint registered.',
            updated_by=citizen_user,
            created_at=now - datetime.timedelta(hours=12)
        )
        ComplaintStatusHistory.objects.create(
            complaint=c4,
            status='assigned',
            remark='High priority routing to Water Supply & Sewerage Board emergency wing.',
            updated_by=citizen_user,
            created_at=now - datetime.timedelta(hours=11)
        )

        self.stdout.write('Seeding Routing Cache...')
        caches_data = [
            {
                'location_key': 'karnataka:bengaluru:marathahalli:560037',
                'issue_type': 'Garbage Accumulation',
                'authority_name': 'Bruhat Bengaluru Mahanagara Palike (BBMP)',
                'department_name': 'Municipal Corporation',
                'email': 'assistance@bbmp.gov.in',
                'phone': '080-22221111',
                'official_portal': 'https://sahaaya.bbmp.gov.in',
                'source_name': 'BBMP Portal',
                'source_url': 'https://bbmp.gov.in',
                'source_verified': True,
                'recommended_channel': 'official_portal',
                'confidence': 0.95
            },
            {
                'location_key': 'karnataka:bengaluru:marathahalli:560037',
                'issue_type': 'Road Pothole',
                'authority_name': 'Bruhat Bengaluru Mahanagara Palike (BBMP)',
                'department_name': 'Roads & Transport',
                'email': 'roads-grievance@bbmp.gov.in',
                'phone': '080-22222222',
                'official_portal': 'https://sahaaya.bbmp.gov.in',
                'source_name': 'BBMP Road Maintenance System',
                'source_url': 'https://bbmp.gov.in',
                'source_verified': True,
                'recommended_channel': 'official_portal',
                'confidence': 0.93
            },
            {
                'location_key': 'karnataka:bengaluru:marathahalli:560037',
                'issue_type': 'Broken Streetlight',
                'authority_name': 'Bangalore Electricity Supply Company (BESCOM)',
                'department_name': 'Electricity',
                'email': 'helpline@bescom.co.in',
                'phone': '1912',
                'official_portal': 'https://bescom.co.in/grievance',
                'source_name': 'BESCOM Helpline Portal',
                'source_url': 'https://bescom.co.in',
                'source_verified': True,
                'recommended_channel': 'official_portal',
                'confidence': 0.96
            }
        ]

        for item in caches_data:
            RoutingCache.objects.create(
                location_key=item['location_key'],
                issue_type=item['issue_type'],
                authority_name=item['authority_name'],
                department_name=item['department_name'],
                email=item['email'],
                phone=item['phone'],
                official_portal=item['official_portal'],
                source_name=item['source_name'],
                source_url=item['source_url'],
                source_verified=item['source_verified'],
                recommended_channel=item['recommended_channel'],
                confidence=item['confidence']
            )
            self.stdout.write(f"  Created RoutingCache: {item['location_key']} - {item['issue_type']}")

        self.stdout.write(self.style.SUCCESS('Successfully seeded database with departments, users, routing caches, and 4 sample complaints!'))

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from io import BytesIO
from PIL import Image
import datetime

from departments.models import Department
from complaints.models import Complaint, ComplaintStatusHistory
from ai_service.services import AIService

User = get_user_model()

class CivicFixAPITests(APITestCase):

    def setUp(self):
        # Create default department
        self.dept = Department.objects.create(
            name="Electricity",
            email="electricity@civicfix.org",
            phone="080-12345678",
            description="Responsible for grids and streetlights."
        )

        # Create Citizens
        self.citizen = User.objects.create_user(
            email="citizen@civicfix.org",
            password="Password123",
            name="Chaithanya Citizen",
            role="citizen"
        )
        self.other_citizen = User.objects.create_user(
            email="other@civicfix.org",
            password="Password123",
            name="Other Citizen",
            role="citizen"
        )

        # Create Staff
        self.staff = User.objects.create_user(
            email="staff@civicfix.org",
            password="Password123",
            name="Electricity Staff",
            role="staff",
            department=self.dept
        )

        # Create Admin
        self.admin = User.objects.create_superuser(
            email="admin@civicfix.org",
            password="Password123",
            name="System Admin"
        )

        # Create mock image file in memory using PIL
        img = Image.new('RGB', (100, 100), color='blue')
        img_io = BytesIO()
        img.save(img_io, format='JPEG')
        self.mock_image = SimpleUploadedFile(
            name='test_image.jpg',
            content=img_io.getvalue(),
            content_type='image/jpeg'
        )

    def get_jwt_token(self, email, password):
        url = reverse('auth_login')
        response = self.client.post(url, {'email': email, 'password': password})
        return response.data['access']

    def test_user_authentication_flow(self):
        """Verify citizen registration and login returns JWT tokens."""
        register_url = reverse('auth_register')
        reg_payload = {
            'name': 'New User',
            'email': 'newuser@civicfix.org',
            'password': 'Password123',
            'confirm_password': 'Password123',
            'phone': '9988776655',
            'role': 'citizen'
        }
        response = self.client.post(register_url, reg_payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Attempt Login
        login_url = reverse('auth_login')
        login_payload = {
            'email': 'newuser@civicfix.org',
            'password': 'Password123'
        }
        login_res = self.client.post(login_url, login_payload)
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_res.data)
        self.assertIn('refresh', login_res.data)

    def test_complaint_creation_and_id_generation(self):
        """Verify complaint registration, ID formatting, and status logs."""
        token = self.get_jwt_token('citizen@civicfix.org', 'Password123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        url = reverse('complaint_list_create')
        payload = {
            'title': 'Broken Streetlight',
            'description': 'Street light outside supermarket is broken.',
            'issue_type': 'Broken Streetlight',
            'image': self.mock_image,
            'latitude': 12.9698,
            'longitude': 77.6415,
            'address': '100 Feet Rd, Indiranagar',
            'city': 'Bengaluru',
            'state': 'Karnataka',
            'pincode': '560038',
            'department': self.dept.id,
            'priority': 'normal',
            'is_emergency': False
        }

        response = self.client.post(url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('complaint_id', response.data)
        
        # Verify custom complaint ID format (e.g. CF-YYYY-00001)
        year = datetime.datetime.now().year
        self.assertTrue(response.data['complaint_id'].startswith(f"CF-{year}-"))

        # Verify initial status logs in history table
        complaint = Complaint.objects.get(id=response.data['id'])
        history = ComplaintStatusHistory.objects.filter(complaint=complaint)
        self.assertTrue(history.filter(status='submitted').exists())
        self.assertTrue(history.filter(status='assigned').exists())

    def test_role_based_permissions(self):
        """Ensure citizens, staff, and admins can only access authorized complaints."""
        # 1. Citizen reports complaint
        c_token = self.get_jwt_token('citizen@civicfix.org', 'Password123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {c_token}')
        
        complaint = Complaint.objects.create(
            user=self.citizen,
            department=self.dept,
            title='Leaking Water Line',
            description='Main line pipe burst.',
            issue_type='Water Leakage',
            image=self.mock_image,
            latitude=12.9352,
            longitude=77.6244,
            address='Koramangala',
            city='Bengaluru',
            state='Karnataka',
            pincode='560095',
            status='submitted'
        )

        # 2. Other citizen attempts to access this complaint details (Expected Forbidden)
        other_token = self.get_jwt_token('other@civicfix.org', 'Password123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {other_token}')
        detail_url = reverse('complaint_detail', kwargs={'pk': complaint.id})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Department staff assigned to this department accesses detail (Expected Success)
        staff_token = self.get_jwt_token('staff@civicfix.org', 'Password123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {staff_token}')
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_analytics_permissions(self):
        """Verify that citizens cannot access admin analytics reports."""
        c_token = self.get_jwt_token('citizen@civicfix.org', 'Password123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {c_token}')
        analytics_url = reverse('admin_analytics')
        response = self.client.get(analytics_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Admin accesses analytics (Expected Success)
        admin_token = self.get_jwt_token('admin@civicfix.org', 'Password123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_token}')
        response = self.client.get(analytics_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_ai_mock_service_rules(self):
        """Test mock AI keyword parser triggers correct mappings."""
        # Test garbage
        res = AIService.analyze_issue(self.mock_image, "Large garbage pile on pavement.")
        self.assertEqual(res['issue_type'], "Garbage Accumulation")
        self.assertEqual(res['recommended_department'], "Municipal Corporation")
        self.assertEqual(res['priority'], "normal")
        self.assertEqual(res['is_emergency'], False)

        # Test emergency electrical wire
        res = AIService.analyze_issue(self.mock_image, "A fallen electrical wire is sparks near water.")
        self.assertTrue("Electrical" in res['issue_type'] or "wire" in res['issue_type'].lower())
        self.assertEqual(res['recommended_department'], "Electricity")
        self.assertEqual(res['priority'], "emergency")
        self.assertEqual(res['is_emergency'], True)

    def test_smart_routing_resolve_cached_match(self):
        """Verify smart routing lookup matching cache key."""
        from complaints.models import RoutingCache
        
        # Create cache entry
        cache_entry = RoutingCache.objects.create(
            location_key="karnataka:bengaluru:marathahalli:560037",
            issue_type="Garbage Accumulation",
            authority_name="BBMP Ward 15",
            department_name="Municipal Corporation",
            email="ward15@bbmp.gov.in",
            phone="080-12345678",
            official_portal="https://bbmp.gov.in/sahaaya",
            source_name="BBMP Official Website",
            source_url="https://bbmp.gov.in/index.html",
            source_verified=True,
            recommended_channel="official_portal",
            confidence=0.98
        )

        c_token = self.get_jwt_token('citizen@civicfix.org', 'Password123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {c_token}')

        url = reverse('smart_routing_resolve')
        payload = {
            "issue_type": "Garbage Accumulation",
            "latitude": 12.9503,
            "longitude": 77.7017,
            "area": "Marathahalli",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560037"
        }

        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["routing_id"], str(cache_entry.id))
        self.assertEqual(response.data["authority_name"], "BBMP Ward 15")
        self.assertEqual(response.data["source_verified"], True)

    def test_smart_routing_fallback_and_creation(self):
        """Verify complaint creation uses fallback default routing when routing_id is absent."""
        c_token = self.get_jwt_token('citizen@civicfix.org', 'Password123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {c_token}')

        url = reverse('complaint_list_create')
        payload = {
            'title': 'Pothole on Main Road',
            'description': 'A very deep pothole causing traffic issues.',
            'issue_type': 'Road Pothole',
            'image': self.mock_image,
            'latitude': 12.9503,
            'longitude': 77.7017,
            'address': 'Marathahalli',
            'city': 'Bengaluru',
            'state': 'Karnataka',
            'pincode': '560037',
            'priority': 'high',
            'is_emergency': False
        }

        response = self.client.post(url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Check fallback values were saved
        self.assertEqual(response.data["authority_name"], "Bengaluru Local Municipal Authority")
        self.assertEqual(response.data["source_verified"], False)
        self.assertEqual(response.data["routing_status"], "needs_review")

    def test_smart_routing_id_creation(self):
        """Verify complaint creation retrieves cache details when routing_id is supplied."""
        from complaints.models import RoutingCache
        cache_entry = RoutingCache.objects.create(
            location_key="karnataka:bengaluru:marathahalli:560037",
            issue_type="Broken Streetlight",
            authority_name="BESCOM Marathahalli Substation",
            department_name="Electricity",
            email="marathahalli@bescom.co.in",
            phone="080-87654321",
            official_portal="https://bescom.co.in/grievances",
            source_name="BESCOM Grievance Portal",
            source_url="https://bescom.co.in/index.html",
            source_verified=True,
            recommended_channel="official_portal",
            confidence=0.99
        )

        c_token = self.get_jwt_token('citizen@civicfix.org', 'Password123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {c_token}')

        url = reverse('complaint_list_create')
        payload = {
            'title': 'Flickering Streetlight',
            'description': 'Light turns on and off continuously.',
            'issue_type': 'Broken Streetlight',
            'image': self.mock_image,
            'latitude': 12.9503,
            'longitude': 77.7017,
            'address': 'Marathahalli',
            'city': 'Bengaluru',
            'state': 'Karnataka',
            'pincode': '560037',
            'priority': 'normal',
            'is_emergency': False,
            'routing_id': str(cache_entry.id)
        }

        response = self.client.post(url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Check cache values were correctly copied
        self.assertEqual(response.data["authority_name"], "BESCOM Marathahalli Substation")
        self.assertEqual(response.data["contact_email"], "marathahalli@bescom.co.in")
        self.assertEqual(response.data["official_portal"], "https://bescom.co.in/grievance")
        self.assertEqual(response.data["source_verified"], True)
        self.assertEqual(response.data["routing_status"], "verified")

    def test_coordinate_precision_normalization(self):
        """Verify high-precision GPS coordinates are accepted, rounded, and saved with 6 decimal places."""
        c_token = self.get_jwt_token('citizen@civicfix.org', 'Password123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {c_token}')

        url = reverse('complaint_list_create')
        payload = {
            'title': 'High Precision Coordinates Pothole',
            'description': 'A pothole reported with raw browser geolocation high accuracy float strings.',
            'issue_type': 'Road Pothole',
            'image': self.mock_image,
            'latitude': '12.9503123456789',
            'longitude': '77.7017123456789',
            'address': 'Marathahalli',
            'city': 'Bengaluru',
            'state': 'Karnataka',
            'pincode': '560037',
            'priority': 'normal',
            'is_emergency': False
        }

        response = self.client.post(url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Verify decimal precision values stored in DB match 12.950312 and 77.701712
        from complaints.models import Complaint
        complaint = Complaint.objects.get(id=response.data["id"])
        from decimal import Decimal
        self.assertEqual(complaint.latitude, Decimal('12.950312'))
        self.assertEqual(complaint.longitude, Decimal('77.701712'))

    def test_coordinate_out_of_bounds_rejection(self):
        """Verify out-of-bounds latitude and longitude are rejected with validation errors."""
        c_token = self.get_jwt_token('citizen@civicfix.org', 'Password123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {c_token}')

        url = reverse('complaint_list_create')
        
        # 1. Invalid Latitude
        payload = {
            'title': 'Out of bounds lat',
            'description': 'Description',
            'issue_type': 'Road Pothole',
            'image': self.mock_image,
            'latitude': '91.000000',
            'longitude': '77.701712',
            'address': 'Marathahalli',
            'city': 'Bengaluru',
            'state': 'Karnataka',
            'pincode': '560037'
        }
        response = self.client.post(url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("latitude", response.data)

        # 2. Invalid Longitude
        payload['latitude'] = '12.950312'
        payload['longitude'] = '181.000000'
        response = self.client.post(url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("longitude", response.data)

        # 3. Invalid negative boundaries
        payload['latitude'] = '-90.000001'
        payload['longitude'] = '77.701712'
        response = self.client.post(url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        payload['latitude'] = '12.950312'
        payload['longitude'] = '-180.000001'
        response = self.client.post(url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_optional_null_coordinates(self):
        """Verify coordinate fields can be omitted or set to null/empty values."""
        c_token = self.get_jwt_token('citizen@civicfix.org', 'Password123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {c_token}')

        url = reverse('complaint_list_create')
        payload = {
            'title': 'Optional Null Coordinates Pothole',
            'description': 'A complaint reported with empty strings for coordinates.',
            'issue_type': 'Road Pothole',
            'image': self.mock_image,
            'latitude': 'null',
            'longitude': 'undefined',
            'address': 'Marathahalli',
            'city': 'Bengaluru',
            'state': 'Karnataka',
            'pincode': '560037',
            'priority': 'normal',
            'is_emergency': False
        }

        response = self.client.post(url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data["latitude"])
        self.assertIsNone(response.data["longitude"])

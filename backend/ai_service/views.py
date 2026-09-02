from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .services import AIService

class AIAnalyzeView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        image_file = request.FILES.get('image')
        description = request.data.get('description', '')

        if not image_file:
            return Response(
                {"error": "An image file is required for AI analysis."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file size (max 5MB)
        if image_file.size > 5 * 1024 * 1024:
            return Response(
                {"error": "Image file size cannot exceed 5MB."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file type
        ext = image_file.name.split('.')[-1].lower()
        if ext not in ['jpg', 'jpeg', 'png', 'webp']:
            return Response(
                {"error": "Unsupported image format. Please upload JPG, JPEG, PNG, or WEBP."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            analysis_result = AIService.analyze_issue(image_file, description)
            return Response(analysis_result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": f"AI service failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

from .routing_service import SmartRoutingService

class SmartRoutingResolveView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        issue_type = request.data.get('issue_type')
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        area = request.data.get('area')
        city = request.data.get('city')
        state = request.data.get('state')
        pincode = request.data.get('pincode')
        ward = request.data.get('ward')
        zone = request.data.get('zone')

        if not issue_type or not city or not state or not pincode:
            return Response(
                {"error": "issue_type, city, state, and pincode parameters are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            routing_result = SmartRoutingService.resolve_authority(
                issue_type=issue_type,
                latitude=latitude,
                longitude=longitude,
                area=area,
                city=city,
                state=state,
                pincode=pincode,
                ward=ward,
                zone=zone
            )
            return Response(routing_result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": f"Smart department routing failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

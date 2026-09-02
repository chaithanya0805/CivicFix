from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .services import reverse_geocode

class ReverseGeocodeView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')

        if latitude is None or longitude is None:
            return Response(
                {"error": "Both latitude and longitude parameters are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            latitude = float(latitude)
            longitude = float(longitude)
        except ValueError:
            return Response(
                {"error": "Latitude and longitude must be valid float numbers."},
                status=status.HTTP_400_BAD_REQUEST
            )

        address_details = reverse_geocode(latitude, longitude)
        return Response(address_details, status=status.HTTP_200_OK)

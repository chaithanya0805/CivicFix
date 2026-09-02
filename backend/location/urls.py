from django.urls import path
from .views import ReverseGeocodeView

urlpatterns = [
    path('reverse-geocode/', ReverseGeocodeView.as_view(), name='reverse_geocode'),
]

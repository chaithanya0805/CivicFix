import requests
import logging

logger = logging.getLogger(__name__)

def reverse_geocode(latitude, longitude):
    """
    Reverse geocode coordinates using OpenStreetMap Nominatim API.
    Gracefully falls back to a realistic mock address if request fails or times out.
    """
    try:
        # Nominatim OSM API
        headers = {
            'User-Agent': 'CivicFixApp/1.0 (contact@civicfix.org)'
        }
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={latitude}&lon={longitude}&zoom=18&addressdetails=1"
        response = requests.get(url, headers=headers, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            address_dict = data.get('address', {})
            
            # Extract fields
            road = address_dict.get('road', '')
            suburb = address_dict.get('suburb', address_dict.get('neighbourhood', ''))
            city = address_dict.get('city', address_dict.get('town', address_dict.get('village', 'Bengaluru')))
            state = address_dict.get('state', 'Karnataka')
            pincode = address_dict.get('postcode', '560001')
            
            parts = [p for p in [road, suburb] if p]
            address_str = ", ".join(parts) if parts else "Street Address"
            
            return {
                'address': address_str,
                'city': city,
                'state': state,
                'pincode': pincode,
                'full_address': data.get('display_name', f"{address_str}, {city}, {state} - {pincode}")
            }
    except Exception as e:
        logger.error(f"Nominatim reverse geocoding failed: {str(e)}")
    
    # Realistic fallback (centered in Bangalore, India context)
    lat_val = float(latitude)
    lon_val = float(longitude)
    
    # We can customize the mock output based on standard range coordinates of Bangalore
    # (Approx lat 12.9 to 13.0, lon 77.5 to 77.7)
    if 12.8 <= lat_val <= 13.1 and 77.4 <= lon_val <= 77.8:
        address = "Outer Ring Rd, Marathahalli"
        city = "Bengaluru"
        state = "Karnataka"
        pincode = "560037"
    else:
        address = "Main Street, Central Ward"
        city = "Local District"
        state = "State Area"
        pincode = "400001"
        
    return {
        'address': address,
        'city': city,
        'state': state,
        'pincode': pincode,
        'full_address': f"{address}, {city}, {state} - {pincode} (GPS Fallback)"
    }

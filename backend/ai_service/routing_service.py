import os
import requests
import json
import logging
import datetime
from django.conf import settings
from django.utils import timezone
from complaints.models import RoutingCache

logger = logging.getLogger(__name__)

# Fallback department mapping based on issue type category
DEFAULT_DEPARTMENT_MAPPING = {
    "Garbage Accumulation": "Municipal Corporation",
    "Road Pothole": "Roads & Transport",
    "Broken Streetlight": "Electricity",
    "Damaged Electrical Pole": "Electricity",
    "Fallen/Exposed Electrical Wire": "Electricity",
    "Water Leakage": "Water Supply",
    "Open Manhole/Drain": "Water Supply",
    "Broken Traffic Signal": "Traffic",
    "Park Maintenance": "Parks & Public Spaces",
    "Other Civic Issue": "Other"
}

class SmartRoutingService:

    @staticmethod
    def resolve_authority(issue_type, latitude, longitude, area, city, state, pincode, ward=None, zone=None):
        """
        Resolves local authority, contacts, and grievance portals based on issue and location.
        First checks RoutingCache. If expired (> 30 days) or missing, resolves via Gemini + search.
        Falls back to default mapping if Gemini/search fails or if mock provider is active.
        """
        # Normalize cache key: state:city:area:pincode (all spaces stripped and lowercase)
        norm_state = str(state).strip().lower().replace(" ", "")
        norm_city = str(city).strip().lower().replace(" ", "")
        norm_area = str(area).strip().lower().replace(" ", "")
        norm_pincode = str(pincode).strip().lower().replace(" ", "")
        location_key = f"{norm_state}:{norm_city}:{norm_area}:{norm_pincode}"

        # 1. Check RoutingCache first
        try:
            cached_record = RoutingCache.objects.filter(location_key=location_key, issue_type=issue_type).first()
            if cached_record:
                # Cache validity: 30 days
                age = timezone.now() - cached_record.last_verified_at
                if age < datetime.timedelta(days=30):
                    logger.info(f"Smart Routing cache HIT for {location_key} and {issue_type}")
                    return {
                        "routing_id": str(cached_record.id),
                        "authority_name": cached_record.authority_name,
                        "department_name": cached_record.department_name,
                        "email": cached_record.email,
                        "phone": cached_record.phone,
                        "official_portal": cached_record.official_portal,
                        "source_name": cached_record.source_name,
                        "source_url": cached_record.source_url,
                        "source_verified": cached_record.source_verified,
                        "recommended_channel": cached_record.recommended_channel,
                        "confidence": float(cached_record.confidence),
                        "routing_status": "verified" if cached_record.source_verified else "needs_review"
                    }
        except Exception as e:
            logger.error(f"RoutingCache database lookup error: {str(e)}")
            cached_record = None

        # 2. If missing or expired, check if Gemini provider is configured
        provider = getattr(settings, 'AI_PROVIDER', 'mock')
        api_key = getattr(settings, 'GEMINI_API_KEY', '')
        gemini_model = getattr(settings, 'GEMINI_MODEL', 'gemini-1.5-flash')

        if provider == 'gemini' and api_key:
            try:
                result = SmartRoutingService._query_gemini_with_search(
                    issue_type, latitude, longitude, area, city, state, pincode, ward, zone, api_key, gemini_model
                )
                if result:
                    # Update or create cached record
                    try:
                        record, created = RoutingCache.objects.update_or_create(
                            location_key=location_key,
                            issue_type=issue_type,
                            defaults={
                                "authority_name": result.get("authority_name"),
                                "department_name": result.get("department_name"),
                                "email": result.get("email"),
                                "phone": result.get("phone"),
                                "official_portal": result.get("official_portal"),
                                "source_name": result.get("source_name"),
                                "source_url": result.get("source_url"),
                                "source_verified": result.get("source_verified", False),
                                "recommended_channel": result.get("recommended_channel", "email"),
                                "confidence": result.get("confidence", 0.90),
                                "last_verified_at": timezone.now()
                            }
                        )
                        result["routing_id"] = str(record.id)
                        return result
                    except Exception as ce:
                        logger.error(f"Failed to save resolved routing to RoutingCache: {str(ce)}")
                        # Return result anyway without cache saving
                        result["routing_id"] = ""
                        return result
            except Exception as ge:
                logger.error(f"Gemini Smart Routing lookup failed: {str(ge)}. Falling back to local default routing.")

        # 3. Fallback routing
        fallback_dept = DEFAULT_DEPARTMENT_MAPPING.get(issue_type, "Other")
        
        # Build local fallback payload
        fallback_result = {
            "routing_id": "", # Omitted routing_id means fallback/default
            "authority_name": f"{city} Local Municipal Authority",
            "department_name": fallback_dept,
            "email": None,
            "phone": None,
            "official_portal": None,
            "source_name": "Local Department Fallback Directory",
            "source_url": None,
            "source_verified": False,
            "recommended_channel": "other",
            "confidence": 0.50,
            "routing_status": "needs_review"
        }
        return fallback_result

    @staticmethod
    def _query_gemini_with_search(issue_type, latitude, longitude, area, city, state, pincode, ward, zone, api_key, model_name):
        """
        Calls Gemini REST API using Google Search Grounding to discover verified municipal contact details.
        """
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        
        prompt = f"""
You are the smart routing assistant for CivicFix, an intelligent civic grievance platform.
Analyze the following civic issue category and geographical location:
Issue Category: {issue_type}
State: {state}
City: {city}
Area/Locality: {area}
Pincode: {pincode}
Ward: {ward or 'N/A'}
Zone: {zone or 'N/A'}

Your task is to identify the CURRENT, RELEVANT, and OFFICIAL local government authority, department, and grievance registration details for this specific category and location.
You MUST search current publicly available sources using your Google Search tool. Search for official municipal and government websites for {city} and {area} related to {issue_type}.

Enforce these strict guidelines:
1. Prefer information from official government domains (ending in .gov.in, .nic.in, or official municipal corporation/state government domains).
2. If you find a verified email, phone, or official portal, check if they are from an official source. If yes, set "source_verified": true. If the sources are unofficial directories, blogs, forums, or social media, set "source_verified": false.
3. NEVER make up or hallucinate phone numbers, emails, department names, or portal URLs. If they cannot be found reliably on official sources, set them to null.
4. Set "recommended_channel" based on availability in priority order:
   - "official_portal" (if an official grievance submission page exists)
   - "email" (if an official email address is available)
   - "phone" (if an official contact number is available)
   - "other"
5. Do not claim the citizen's complaint is registered with the government. State clearly that CivicFix can open the official grievance portal or notify the listed contact.

You MUST respond with a JSON object strictly matching this schema:
{{
  "authority_name": "<The official authority name, e.g. Bruhat Bengaluru Mahanagara Palike (BBMP) or BESCOM>",
  "department_name": "<The specific department, e.g. Solid Waste Management or Electricity Department>",
  "email": "<verified official email address or null>",
  "phone": "<verified official phone number or null>",
  "official_portal": "<URL of the official grievance registration page, portal, or form, or null>",
  "source_name": "<The name of the official source website used to retrieve this info, e.g. BBMP Grievance Portal or BESCOM Official Site>",
  "source_url": "<The URL of the official source page, or null>",
  "source_verified": <boolean: true if retrieved from a government/municipal domain, false otherwise>,
  "recommended_channel": "<one of: official_portal, email, phone, other>",
  "confidence": <float: confidence score between 0.0 and 1.0, representing reliability of information>
}}

Do not include any formatting markdown like ```json or ```, just output the raw JSON object.
"""

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ],
            "tools": [
                {
                    "google_search": {}
                }
            ]
        }

        headers = {
            "Content-Type": "application/json"
        }

        response = requests.post(url, headers=headers, json=payload, timeout=20)
        
        if response.status_code == 200:
            result = response.json()
            text_response = result['candidates'][0]['content']['parts'][0]['text'].strip()
            
            # Cleanup potential backticks markdown wrapper
            if text_response.startswith("```"):
                text_response = text_response.strip("```").strip("json").strip()
            
            parsed_data = json.loads(text_response)
            
            # Additional double check validation on URL structure to prevent hallucinated citations
            source_url = parsed_data.get("source_url")
            source_verified = bool(parsed_data.get("source_verified", False))
            
            if source_url:
                is_official_domain = any(dom in source_url.lower() for dom in ['.gov.in', '.nic.in', 'gov.', 'municipal'])
                if not is_official_domain:
                    source_verified = False
            
            # Verify that we do not present unverified contact numbers
            email = parsed_data.get("email")
            phone = parsed_data.get("phone")
            official_portal = parsed_data.get("official_portal")
            
            if not source_verified:
                email = None
                phone = None
                official_portal = None

            return {
                "authority_name": parsed_data.get("authority_name"),
                "department_name": parsed_data.get("department_name"),
                "email": email,
                "phone": phone,
                "official_portal": official_portal,
                "source_name": parsed_data.get("source_name", "Internet Search Citation"),
                "source_url": source_url,
                "source_verified": source_verified,
                "recommended_channel": parsed_data.get("recommended_channel", "other"),
                "confidence": float(parsed_data.get("confidence", 0.90)),
                "routing_status": "verified" if source_verified else "needs_review"
            }
        
        return None

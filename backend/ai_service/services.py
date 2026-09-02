import os
import base64
import requests
import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

class AIService:
    @staticmethod
    def analyze_issue(image_file, description):
        """
        Analyze issue based on image and description.
        Routes to Gemini or Mock provider based on settings.
        """
        provider = getattr(settings, 'AI_PROVIDER', 'mock')
        
        if provider == 'gemini':
            api_key = getattr(settings, 'GEMINI_API_KEY', '')
            if api_key:
                return AIService._analyze_with_gemini(image_file, description, api_key)
            else:
                logger.warning("Gemini API key is missing. Falling back to Mock AI.")
                
        return AIService._analyze_with_mock(image_file, description)

    @staticmethod
    def _analyze_with_mock(image_file, description):
        """
        Local Mock AI implementation scanning keywords from description
        and setting appropriate priority and departments.
        """
        desc_lower = description.lower() if description else ""
        
        # Issue Detection mapping
        issue_type = "Other Civic Issue"
        recommended_dept = "Other"
        priority = "normal"
        is_emergency = False
        confidence = 88.0

        # Keywords search
        if any(kw in desc_lower for kw in ['garbage', 'waste', 'trash', 'dump', 'litter', 'bin', 'refuse']):
            issue_type = "Garbage Accumulation"
            recommended_dept = "Municipal Corporation"
            priority = "normal"
            confidence = 94.0
        elif any(kw in desc_lower for kw in ['pothole', 'cracked road', 'road damaged', 'damaged road', 'broken road']):
            issue_type = "Road Pothole"
            recommended_dept = "Roads & Transport"
            priority = "high"
            confidence = 92.5
            if any(kw in desc_lower for kw in ['dangerous', 'huge', 'deep', 'accident']):
                priority = "emergency"
                is_emergency = True
        elif any(kw in desc_lower for kw in ['street light', 'streetlight', 'streetlamp', 'street lamp', 'lamp broken']):
            issue_type = "Broken Streetlight"
            recommended_dept = "Electricity"
            priority = "normal"
            confidence = 95.0
        elif any(kw in desc_lower for kw in ['electric pole', 'electrical pole', 'damaged pole', 'fallen pole']):
            issue_type = "Damaged Electrical Pole"
            recommended_dept = "Electricity"
            priority = "high"
            confidence = 91.0
            if 'fallen' in desc_lower or 'crushed' in desc_lower:
                priority = "emergency"
                is_emergency = True
        elif any(kw in desc_lower for kw in ['electric wire', 'electrical wire', 'loose wire', 'fallen wire', 'wire hanging', 'cable hanging']):
            issue_type = "Fallen/Exposed Electrical Wire"
            recommended_dept = "Electricity"
            priority = "emergency"
            is_emergency = True
            confidence = 96.0
        elif any(kw in desc_lower for kw in ['leak', 'leakage', 'water pipe', 'burst pipe', 'flooding', 'water main']):
            issue_type = "Water Leakage"
            recommended_dept = "Water Supply"
            priority = "high"
            confidence = 93.0
            if 'flooding' in desc_lower or 'burst' in desc_lower:
                priority = "emergency"
                is_emergency = True
        elif any(kw in desc_lower for kw in ['manhole', 'open drain', 'sewer open', 'drainage']):
            issue_type = "Open Manhole/Drain"
            recommended_dept = "Water Supply"
            priority = "emergency"
            is_emergency = True
            confidence = 97.0
        elif any(kw in desc_lower for kw in ['traffic signal', 'traffic light', 'junction signal', 'traffic sign']):
            issue_type = "Broken Traffic Signal"
            recommended_dept = "Traffic"
            priority = "high"
            confidence = 90.0
        elif any(kw in desc_lower for kw in ['park', 'public garden', 'playground', 'dead tree', 'tree fallen']):
            issue_type = "Park Maintenance"
            recommended_dept = "Parks & Public Spaces"
            priority = "normal"
            confidence = 89.0
            if 'tree' in desc_lower and ('fallen' in desc_lower or 'blocked' in desc_lower):
                issue_type = "Fallen Tree Obstruction"
                priority = "high"
                if 'road' in desc_lower or 'wire' in desc_lower:
                    priority = "emergency"
                    is_emergency = True

        return {
            "issue_type": issue_type,
            "recommended_department": recommended_dept,
            "confidence_score": confidence,
            "priority": priority,
            "is_emergency": is_emergency
        }

    @staticmethod
    def _analyze_with_gemini(image_file, description, api_key):
        """
        Analyze using Gemini 1.5 Flash API by encoding the image in base64.
        If the API call fails, falls back to the mock classifier.
        """
        try:
            # Read image data
            image_file.seek(0)
            image_bytes = image_file.read()
            # Reset seek position just in case
            image_file.seek(0)
            
            image_b64 = base64.b64encode(image_bytes).decode('utf-8')
            mime_type = "image/jpeg"
            if image_file.name.endswith('.png'):
                mime_type = "image/png"
            elif image_file.name.endswith('.webp'):
                mime_type = "image/webp"

            # Prepare the API request
            # Ref: Gemini REST API structure
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            
            prompt = (
                "You are the AI engine of CivicFix, a smart civic issue reporting platform. "
                "Analyze the uploaded image and the citizen's description of a public infrastructure issue.\n"
                f"Citizen's Description: '{description}'\n\n"
                "You must respond with a JSON object strictly matching this schema:\n"
                "{\n"
                "  \"issue_type\": \"<Detected Civic Issue, e.g. Garbage Accumulation, Pothole, Broken Streetlight, Fallen Electrical Wire, Open Manhole, Water Leakage, Traffic Issue>\",\n"
                "  \"recommended_department\": \"<One of: Municipal Corporation, Roads & Transport, Electricity, Water Supply, Traffic, Parks & Public Spaces, Other>\",\n"
                "  \"confidence_score\": <A float/integer percentage score, e.g. 94.0>,\n"
                "  \"priority\": \"<One of: normal, high, emergency>\",\n"
                "  \"is_emergency\": <boolean: true if there is an active danger like exposed wires, open manholes on main road, or road blocks, else false>\n"
                "}\n"
                "Do not include any formatting markdown like ```json, just output the raw JSON object."
            )

            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt},
                            {
                                "inlineData": {
                                    "mimeType": mime_type,
                                    "data": image_b64
                                }
                            }
                        ]
                    }
                ]
            }

            headers = {
                "Content-Type": "application/json"
            }

            response = requests.post(url, headers=headers, json=payload, timeout=15)
            
            if response.status_code == 200:
                result = response.json()
                text_response = result['candidates'][0]['content']['parts'][0]['text'].strip()
                
                # Cleanup potential backticks markdown wrapper
                if text_response.startswith("```"):
                    text_response = text_response.strip("```").strip("json").strip()
                
                parsed_data = json.loads(text_response)
                
                # Normalize response keys and values
                return {
                    "issue_type": parsed_data.get("issue_type", "Other Civic Issue"),
                    "recommended_department": parsed_data.get("recommended_department", "Other"),
                    "confidence_score": float(parsed_data.get("confidence_score", 90.0)),
                    "priority": parsed_data.get("priority", "normal").lower(),
                    "is_emergency": bool(parsed_data.get("is_emergency", False))
                }
        except Exception as e:
            logger.error(f"Gemini API analysis failed: {str(e)}. Falling back to Mock AI.")
            
        # Fallback to mock on any failures
        return AIService._analyze_with_mock(image_file, description)

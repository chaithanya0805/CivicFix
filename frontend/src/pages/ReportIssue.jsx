import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../hooks/useToast';
import L from 'leaflet';
import { 
  Camera, 
  MapPin, 
  Sparkles, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight, 
  Trash2, 
  AlertTriangle,
  Info,
  Layers,
  MapPinIcon,
  Globe,
  ExternalLink,
  Check
} from 'lucide-react';
import { resolveSmartRouting } from '../services/routingService';

const ReportIssue = () => {
  const [step, setStep] = useState(1);
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Step 1: Details
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [description, setDescription] = useState('');

  // Step 2: Location
  const [latitude, setLatitude] = useState(12.9716); // Default Bangalore
  const [longitude, setLongitude] = useState(77.5946);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Step 3: AI Analysis
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [departments, setDepartments] = useState([]);
  
  // Confirmed/edited fields by citizen
  const [issueType, setIssueType] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [priority, setPriority] = useState('normal');
  const [isEmergency, setIsEmergency] = useState(false);

  // Step 5: Success
  const [submittedComplaint, setSubmittedComplaint] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Step 4 Smart Routing States
  const [routingLoading, setRoutingLoading] = useState(false);
  const [routingStatusMsg, setRoutingStatusMsg] = useState('');
  const [routingResult, setRoutingResult] = useState(null);
  const [routingId, setRoutingId] = useState('');

  // Fetch departments list for AI override select dropdown
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await api.get('/departments/');
        setDepartments(res.data.results || res.data || []);
      } catch (err) {
        console.error("Failed to load departments", err);
      }
    };
    fetchDepts();
  }, []);

  // Handle Photo upload selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast("File size exceeds 5MB limit.", "error");
      return;
    }

    // Validate type
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      showToast("Unsupported file format. Please upload JPG, PNG, or WEBP.", "error");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  // Step 2 Geolocation API
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser.", "warning");
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        
        // Center map marker
        if (mapRef.current && markerRef.current) {
          const latlng = L.latLng(lat, lng);
          markerRef.current.setLatLng(latlng);
          mapRef.current.setView(latlng, 15);
        }

        // Call backend reverse-geocode
        try {
          const res = await api.post('/location/reverse-geocode/', { latitude: lat, longitude: lng });
          setAddress(res.data.address || '');
          setCity(res.data.city || 'Bengaluru');
          setState(res.data.state || 'Karnataka');
          setPincode(res.data.pincode || '');
          showToast("Location resolved successfully.", "success");
        } catch (err) {
          showToast("Failed to reverse geocode coordinates, please enter address details manually.", "warning");
        } finally {
          setGpsLoading(false);
        }
      },
      (error) => {
        setGpsLoading(false);
        showToast("GPS Access Denied or Timed Out. Please fill details manually.", "warning");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Mount Leaflet Map inside Step 2
  useEffect(() => {
    if (step === 2 && mapContainerRef.current && !mapRef.current) {
      // Initialize map centered at current coordinates
      mapRef.current = L.map(mapContainerRef.current).setView([latitude, longitude], 14);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);

      // Add draggable marker
      markerRef.current = L.marker([latitude, longitude], {
        draggable: true
      }).addTo(mapRef.current);

      // Handle marker dragend
      markerRef.current.on('dragend', async () => {
        const position = markerRef.current.getLatLng();
        const lat = Number(position.lat.toFixed(6));
        const lng = Number(position.lng.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);

        // Fetch address for new coordinates
        try {
          const res = await api.post('/location/reverse-geocode/', { latitude: lat, longitude: lng });
          setAddress(res.data.address || '');
          setCity(res.data.city || 'Bengaluru');
          setState(res.data.state || 'Karnataka');
          setPincode(res.data.pincode || '');
        } catch (e) {
          console.error(e);
        }
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [step]);

  // Step 3: Run AI analysis on backend
  const runAIAnalysis = async () => {
    setAiLoading(true);
    setStep(3);
    
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('description', description);

    try {
      const res = await api.post('/ai/analyze/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const result = res.data;
      setAiResult(result);
      
      // Auto-populate edit controls with AI recommendations
      setIssueType(result.issue_type);
      setPriority(result.priority);
      setIsEmergency(result.is_emergency);

      // Find matching department ID in list
      const matchedDept = departments.find(d => d.name.toLowerCase() === result.recommended_department.toLowerCase());
      if (matchedDept) {
        setSelectedDeptId(matchedDept.id);
      } else {
        // Default to Other
        const otherDept = departments.find(d => d.name.includes('Other'));
        setSelectedDeptId(otherDept ? otherDept.id : '');
      }
      
    } catch (err) {
      showToast("AI scanning failed. Please classify the issue details manually.", "warning");
      // Populate defaults in case of failure
      setIssueType("Other Civic Issue");
      setPriority("normal");
      setIsEmergency(false);
      const otherDept = departments.find(d => d.name.includes('Other'));
      setSelectedDeptId(otherDept ? otherDept.id : '');
    } finally {
      setAiLoading(false);
    }
  };

  // Smart Routing Resolution
  const fetchSmartRouting = async () => {
    setRoutingLoading(true);
    setRoutingResult(null);
    setRoutingId('');
    setRoutingStatusMsg("Finding the responsible local authority...");
    
    const t1 = setTimeout(() => {
      setRoutingStatusMsg("Checking official government sources...");
    }, 1500);
    
    const t2 = setTimeout(() => {
      setRoutingStatusMsg("Verifying contact information...");
    }, 3000);

    try {
      const locationData = {
        latitude: (latitude !== null && latitude !== undefined && latitude !== '') ? Number(Number(latitude).toFixed(6)) : null,
        longitude: (longitude !== null && longitude !== undefined && longitude !== '') ? Number(Number(longitude).toFixed(6)) : null,
        area,
        city,
        state,
        pincode,
        ward: '',
        zone: ''
      };
      const data = await resolveSmartRouting(locationData, issueType);
      setRoutingResult(data);
      setRoutingId(data.routing_id);
    } catch (err) {
      console.error("Smart routing failed", err);
      showToast("Smart routing failed. Falling back to default routing.", "warning");
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setRoutingLoading(false);
    }
  };

  const handleProceedToReview = () => {
    setStep(4);
    fetchSmartRouting();
  };

  // Submit Complaint
  const handleSubmission = async () => {
    setSubmitting(true);
    
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('title', issueType);
    formData.append('description', description);
    formData.append('issue_type', issueType);
    if (latitude !== null && latitude !== undefined && latitude !== '') {
      formData.append('latitude', Number(Number(latitude).toFixed(6)));
    }
    if (longitude !== null && longitude !== undefined && longitude !== '') {
      formData.append('longitude', Number(Number(longitude).toFixed(6)));
    }
    formData.append('address', address);
    formData.append('city', city);
    formData.append('state', state);
    formData.append('pincode', pincode);
    
    // AI data
    formData.append('ai_recommended_department', aiResult?.recommended_department || 'Other');
    if (aiResult?.confidence_score) {
      formData.append('ai_confidence', aiResult.confidence_score);
    }
    
    // Edited mappings
    if (selectedDeptId) {
      formData.append('department', selectedDeptId);
    }
    formData.append('priority', priority);
    formData.append('is_emergency', isEmergency);
    if (routingId) {
      formData.append('routing_id', routingId);
    }

    try {
      const res = await api.post('/complaints/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSubmittedComplaint(res.data);
      showToast("Complaint registered successfully!", "success");
      setStep(5);
    } catch (err) {
      let errorMsg = "Failed to register complaint. Try again.";
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          errorMsg = data;
        } else if (data.error) {
          errorMsg = data.error;
        } else if (typeof data === 'object') {
          const details = Object.entries(data)
            .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
            .join(' | ');
          if (details) errorMsg = details;
        }
      }
      showToast(errorMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Wizard Header Progress Bar */}
      {step < 5 && (
        <div className="bg-cream rounded-xl p-5 border border-primary/5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-primary mb-3.5 font-sans">
            <span className={step === 1 ? 'text-primary' : 'text-slate-400'}>1. Details</span>
            <span className={step === 2 ? 'text-primary' : 'text-slate-400'}>2. Location</span>
            <span className={step === 3 ? 'text-primary' : 'text-slate-400'}>3. AI Analysis</span>
            <span className={step === 4 ? 'text-primary' : 'text-slate-400'}>4. Review</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* STEP 1: Details */}
      {step === 1 && (
        <div className="card-cream space-y-6">
          <div>
            <h2 className="font-heading text-2xl font-bold text-primary">Report an Issue — Step 1</h2>
            <p className="text-xs text-slate-500 font-sans mt-0.5">Capture a photo and describe the problem to help local authorities resolve it.</p>
          </div>

          <div className="space-y-4">
            {/* Image Uploader widget */}
            <div>
              <label className="block text-xs font-bold text-primary uppercase tracking-wide mb-2">
                Photo of the Issue <span className="text-rose-500">*</span>
              </label>
              
              {!imagePreview ? (
                <div className="border-2 border-dashed border-slate-200 hover:border-primary rounded-xl h-56 flex flex-col items-center justify-center bg-white cursor-pointer relative group transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Camera className="w-10 h-10 text-slate-400 group-hover:text-primary transition-colors mb-2" />
                  <p className="text-sm font-semibold text-slate-600">Click to Upload / Take Photo</p>
                  <p className="text-[10px] text-slate-400 font-sans mt-1">Supports JPG, PNG, WEBP (Max 5MB)</p>
                </div>
              ) : (
                <div className="relative border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                  <img src={imagePreview} alt="Issue Preview" className="w-full h-64 object-cover" />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute top-3 right-3 p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow transition-colors"
                    title="Remove Image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Description Textarea */}
            <div>
              <label className="block text-xs font-bold text-primary uppercase tracking-wide mb-2" htmlFor="desc">
                Describe the Problem <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="desc"
                rows="4"
                placeholder="E.g., Large amount of garbage has accumulated beside the main road near the bus stop, emitting bad odor."
                className="form-input font-sans resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength="1000"
              />
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold font-sans mt-1">
                <span>Please be specific. Mention landmarks.</span>
                <span>{description.length}/1000 characters</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              disabled={!imageFile || !description.trim()}
              className="btn-primary"
            >
              Continue to Location <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Location */}
      {step === 2 && (
        <div className="card-cream space-y-6">
          <div>
            <h2 className="font-heading text-2xl font-bold text-primary">Map the Location — Step 2</h2>
            <p className="text-xs text-slate-500 font-sans mt-0.5">Provide the address details. Drag the map marker for exact precision.</p>
          </div>

          <button
            onClick={handleGetLocation}
            disabled={gpsLoading}
            className="btn-secondary w-full py-3"
          >
            <MapPin className="w-5 h-5" />
            {gpsLoading ? 'Detecting Coordinates...' : '📍 Use Current GPS Location'}
          </button>

          {/* Leaflet Mounting Map */}
          <div className="h-64 border border-slate-200 rounded-xl overflow-hidden z-10 relative">
            <div ref={mapContainerRef} className="h-full w-full" />
            <div className="absolute bottom-2 left-2 z-20 bg-cream/90 px-3 py-1 border border-primary/10 rounded shadow-sm text-[10px] font-semibold text-primary font-sans flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> Drag map marker to correct pin coordinates
            </div>
          </div>

          {/* Address fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-primary uppercase tracking-wide mb-1.5">Street Address / Area</label>
              <input
                type="text"
                placeholder="Road name, Landmark, Colony"
                className="form-input font-sans"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-primary uppercase tracking-wide mb-1.5">City</label>
              <input
                type="text"
                placeholder="City"
                className="form-input font-sans"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-primary uppercase tracking-wide mb-1.5">State</label>
              <input
                type="text"
                placeholder="State"
                className="form-input font-sans"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-primary uppercase tracking-wide mb-1.5">Pincode</label>
              <input
                type="text"
                placeholder="560037"
                className="form-input font-sans"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                maxLength="6"
                required
              />
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-primary/5 pt-4">
            <button onClick={() => setStep(1)} className="btn-outline font-semibold">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={runAIAnalysis}
              disabled={!address.trim() || !city.trim() || !pincode.trim()}
              className="btn-primary"
            >
              Run AI Assistant <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: AI Analysis */}
      {step === 3 && (
        <div className="card-cream space-y-6">
          {aiLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100 border-t-primary animate-spin"></div>
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-primary animate-pulse">AI Classifier Scanning...</h3>
                <p className="text-slate-500 text-xs font-sans max-w-xs mt-1">Analyzing photo attributes and description context for categorization.</p>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h2 className="font-heading text-2xl font-bold text-primary">AI Recommendation — Step 3</h2>
                <p className="text-xs text-slate-500 font-sans mt-0.5 font-semibold">Our AI assistant has evaluated your report. You can review or manually adjust details below.</p>
              </div>

              {/* AI Details Card */}
              <div className="bg-secondary/15 border border-secondary p-6 rounded-2xl flex flex-col md:flex-row gap-5 items-start">
                <Sparkles className="w-8 h-8 text-primary shrink-0 mt-1" />
                <div className="space-y-4 w-full">
                  <h3 className="font-bold text-primary text-base font-sans">AI Analysis Result</h3>
                  
                  <div className="grid grid-cols-2 gap-4 font-sans text-xs">
                    <div>
                      <p className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Detected Issue</p>
                      <p className="text-sm font-semibold text-primary mt-1">{aiResult?.issue_type}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Confidence Score</p>
                      <p className="text-sm font-semibold text-primary mt-1">{aiResult?.confidence_score}%</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">AI Recommended Department</p>
                      <p className="text-sm font-semibold text-primary mt-1">{aiResult?.recommended_department}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Emergency Flag</p>
                      <p className="text-sm font-semibold text-primary mt-1">{aiResult?.is_emergency ? '⚠️ YES' : 'No'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Editable Fields Override Panel */}
              <div className="border border-slate-100 bg-slate-50/50 p-5 rounded-xl space-y-4">
                <h4 className="font-bold text-primary text-sm font-sans flex items-center gap-1.5"><Info className="w-4 h-4 text-primary" /> Edit Recommendation (If Required)</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Issue Category</label>
                    <input
                      type="text"
                      className="form-input py-2 font-sans text-sm"
                      value={issueType}
                      onChange={(e) => setIssueType(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Target Department</label>
                    <select
                      className="form-select py-2 text-sm"
                      value={selectedDeptId}
                      onChange={(e) => setSelectedDeptId(e.target.value)}
                    >
                      <option value="">-- Select Department --</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Priority</label>
                    <select
                      className="form-select py-2 text-sm"
                      value={priority}
                      onChange={(e) => {
                        setPriority(e.target.value);
                        if (e.target.value === 'emergency') setIsEmergency(true);
                        else setIsEmergency(false);
                      }}
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 text-xs font-bold text-primary cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isEmergency}
                        onChange={(e) => {
                          setIsEmergency(e.target.checked);
                          if (e.target.checked) setPriority('emergency');
                          else setPriority('normal');
                        }}
                        className="h-4.5 w-4.5 rounded text-primary focus:ring-primary border-slate-300"
                      />
                      Is Emergency Issue? (Active danger)
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-primary/5 pt-4">
                <button onClick={() => setStep(2)} className="btn-outline font-semibold">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                 <button onClick={handleProceedToReview} className="btn-primary font-bold">
                  Review & Confirm <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP 4: Confirmation */}
      {step === 4 && (
        <div className="card-cream space-y-6">
          {routingLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100 border-t-primary animate-spin"></div>
                <Globe className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-primary animate-pulse">{routingStatusMsg}</h3>
                <p className="text-slate-500 text-xs font-sans max-w-xs mt-1">Sourcing real-time municipal contacts and jurisdiction authority structures.</p>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h2 className="font-heading text-2xl font-bold text-primary">Confirm Complaint — Step 4</h2>
                <p className="text-xs text-slate-500 font-sans mt-0.5">Please review the details and local authority routing before submission.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 items-start font-sans">
                {/* Left: Image preview */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <img src={imagePreview} alt="Issue" className="w-full h-48 object-cover" />
                  <div className="p-3 bg-slate-50 text-[10px] text-slate-500 font-semibold border-t border-slate-100 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" /> Coordinate pin: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                  </div>
                </div>

                {/* Right: Summary details */}
                <div className="space-y-4 text-xs text-slate-700">
                  <div className="grid grid-cols-2 gap-3 pb-3 border-b border-primary/5">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issue Type</p>
                      <p className="text-sm font-bold text-primary mt-0.5">{issueType}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Priority / Danger</p>
                      <div className="flex items-center gap-2 mt-0.5 font-bold text-sm text-primary">
                        <span className="capitalize">{priority}</span>
                        {isEmergency && <span className="text-rose-600">⚠️</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</p>
                    <p className="text-slate-600 leading-relaxed mt-0.5">{description}</p>
                  </div>
                  
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location Address</p>
                    <p className="text-slate-800 mt-0.5 font-semibold">{address}, {city}, {state} - {pincode}</p>
                  </div>

                  {/* Smart Routing Card */}
                  <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 space-y-3.5">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-primary text-xs font-heading">Responsible Authority</h4>
                      {routingResult?.source_verified ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[9px] font-bold uppercase rounded border border-emerald-100 flex items-center gap-1">✓ Official Source Verified</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 text-[9px] font-bold uppercase rounded border border-amber-100">General Jurisdiction Routing</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-2 text-[11px] font-sans">
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[8px] tracking-wider block">Authority Name</span>
                        <span className="font-bold text-primary">{routingResult?.authority_name || `${city} Local Authority`}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[8px] tracking-wider block">Department Wing</span>
                        <span className="font-bold text-primary">{routingResult?.department_name || departments.find(d => String(d.id) === String(selectedDeptId))?.name || 'Other'}</span>
                      </div>
                      
                      {routingResult?.email && (
                        <div>
                          <span className="text-slate-400 font-bold uppercase text-[8px] tracking-wider block">Official Email</span>
                          <span className="font-semibold text-slate-700">📧 {routingResult.email}</span>
                        </div>
                      )}
                      
                      {routingResult?.phone && (
                        <div>
                          <span className="text-slate-400 font-bold uppercase text-[8px] tracking-wider block">Official Phone</span>
                          <span className="font-semibold text-slate-700">📞 {routingResult.phone}</span>
                        </div>
                      )}

                      {routingResult?.official_portal && (
                        <div className="col-span-2">
                          <span className="text-slate-400 font-bold uppercase text-[8px] tracking-wider block">Official Grievance Portal</span>
                          <a 
                            href={routingResult.official_portal} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 mt-0.5"
                          >
                            Open Official Portal <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}

                      {routingResult?.source_name && (
                        <div className="col-span-2 border-t border-primary/5 pt-2 flex items-center justify-between text-[9px] text-slate-400 font-semibold font-sans">
                          <span>Source: {routingResult.source_name}</span>
                          {routingResult.source_url && (
                            <a href={routingResult.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-0.5">
                              View citation <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="bg-white/60 rounded-lg p-2 flex justify-between items-center text-[10px] font-sans font-bold text-primary border border-primary/5">
                      <span>Recommended Channel:</span>
                      <span className="capitalize text-emerald-800">
                        {routingResult?.recommended_channel === 'official_portal' ? 'Official Grievance Portal' : routingResult?.recommended_channel || 'General Email Routing'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-primary/5 pt-4">
                <button onClick={() => setStep(3)} className="btn-outline font-semibold">
                  Change / Review
                </button>
                <button
                  onClick={handleSubmission}
                  disabled={submitting}
                  className="btn-primary font-bold px-8"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Registering...
                    </span>
                  ) : (
                    'Confirm & Submit'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP 5: Success Screen */}
      {step === 5 && submittedComplaint && (
        <div className="card-cream text-center space-y-6 py-10 flex flex-col items-center">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mb-1">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-heading text-3xl font-bold text-primary">✓ Complaint Submitted Successfully</h2>
            <p className="text-slate-500 text-xs font-sans mt-1.5">Your civic concern has been recorded and routed. Notification alerts have been triggered.</p>
          </div>

          {/* Ticket Receipt Card */}
          <div className="w-full max-w-sm border border-secondary bg-secondary/15 rounded-2xl p-6 font-sans text-left space-y-4">
            <div className="flex justify-between items-center border-b border-primary/10 pb-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Complaint ID</span>
              <span className="text-sm font-extrabold text-primary font-mono">{submittedComplaint.complaint_id}</span>
            </div>

            <div className="grid grid-cols-2 gap-y-3.5 gap-x-2 text-xs">
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Issue</p>
                <p className="font-bold text-primary mt-0.5">{submittedComplaint.title}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Priority</p>
                <p className="font-bold text-primary capitalize mt-0.5">{submittedComplaint.priority}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Department</p>
                <p className="font-bold text-primary mt-0.5">{submittedComplaint.department_details?.name || 'Other'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Location</p>
                <p className="font-semibold text-slate-700 mt-0.5 truncate">{submittedComplaint.address}, {submittedComplaint.city}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3.5 pt-4 w-full justify-center">
            <Link to={`/complaint/${submittedComplaint.id}`} className="btn-primary font-bold">
              Track Complaint Progress
            </Link>
            <Link to="/dashboard" className="btn-outline font-semibold">
              Back to Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportIssue;

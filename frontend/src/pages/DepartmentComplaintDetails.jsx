import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../hooks/useToast';
import L from 'leaflet';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  User, 
  Phone, 
  Mail, 
  Camera, 
  Briefcase,
  Layers
} from 'lucide-react';

const DepartmentComplaintDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Action form state
  const [status, setStatus] = useState('');
  const [remark, setRemark] = useState('');
  const [afterImage, setAfterImage] = useState(null);
  const [afterImagePreview, setAfterImagePreview] = useState('');
  const [updating, setUpdating] = useState(false);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  const fetchDetails = async () => {
    try {
      const res = await api.get(`/complaints/${id}/`);
      setComplaint(res.data);
      setStatus(res.data.status);
    } catch (err) {
      showToast("Failed to load assigned complaint details.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  // Mount Leaflet Map to show exact coordinates (staff can view exact)
  useEffect(() => {
    if (complaint && mapContainerRef.current && !mapRef.current) {
      const lat = parseFloat(complaint.latitude);
      const lng = parseFloat(complaint.longitude);
      
      mapRef.current = L.map(mapContainerRef.current).setView([lat, lng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OSM'
      }).addTo(mapRef.current);

      L.marker([lat, lng]).addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [complaint]);

  const handleAfterImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("File size exceeds 5MB limit.", "error");
      return;
    }

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      showToast("Unsupported file format. Please upload JPG, PNG, or WEBP.", "error");
      return;
    }

    setAfterImage(file);
    setAfterImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveAfterImage = () => {
    setAfterImage(null);
    setAfterImagePreview('');
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    
    if (status === 'resolved' && !afterImage) {
      showToast("A resolution photo (AFTER image) is mandatory to resolve the complaint.", "warning");
      return;
    }

    if (!remark.trim()) {
      showToast("Please add a remark explaining the status change.", "warning");
      return;
    }

    setUpdating(true);
    const formData = new FormData();
    formData.append('status', status);
    formData.append('remark', remark);
    if (afterImage) {
      formData.append('after_image', afterImage);
    }

    try {
      await api.patch(`/complaints/${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast("Complaint updated successfully.", "success");
      setRemark('');
      setAfterImage(null);
      setAfterImagePreview('');
      fetchDetails(); // Reload complaint details
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to update complaint status.";
      showToast(errorMsg, "error");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
        <p className="text-slate-500 text-xs font-sans">Loading complaint details...</p>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="card-cream text-center py-12 space-y-4 max-w-xl mx-auto font-sans">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-heading text-xl font-bold text-primary">Access Denied</h3>
        <p className="text-slate-500 text-sm">You do not have permissions to manage this complaint.</p>
        <Link to="/dept/dashboard" className="btn-primary inline-flex">Back to Portal</Link>
      </div>
    );
  }

  const afterMedia = complaint.media?.find(m => m.media_type === 'after');

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans text-slate-700">
      
      {/* Top row Navigation */}
      <div>
        <Link to="/dept/dashboard" className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5 mb-2">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-3xl font-bold text-primary">Manage Complaint</h2>
          <span className="text-xs font-mono font-bold bg-primary/5 text-primary px-3 py-1 rounded-lg border border-primary/10">{complaint.complaint_id}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left columns: Details & Coordinates (Col-span 2) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Main Info Card */}
          <div className="card-cream space-y-5">
            <div className="flex justify-between items-start border-b border-primary/5 pb-3">
              <div>
                <h3 className="font-heading text-xl font-bold text-primary">{complaint.title || complaint.issue_type}</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">Logged: {new Date(complaint.created_at).toLocaleString()}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {complaint.is_emergency && (
                  <span className="px-2 py-0.5 bg-rose-600 text-white text-[9px] font-extrabold uppercase rounded shadow-sm">Emergency</span>
                )}
                <span className="capitalize text-xs font-bold bg-secondary text-primary px-2.5 py-1 rounded border border-primary/10">{complaint.priority} priority</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Issue Description</h4>
                <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 border border-slate-100 p-3 rounded-lg">{complaint.description}</p>
              </div>

              {/* Exact Location Panel */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Exact Location details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl space-y-1.5 text-xs text-primary font-bold">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" /> Address Location
                    </div>
                    <p className="text-slate-600 font-medium">{complaint.address}, {complaint.city} - {complaint.pincode}</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 text-xs text-slate-500 font-semibold">
                    <div>📍 GPS Coordinates (Staff Access):</div>
                    <p className="text-slate-700 font-bold font-mono">Lat: {complaint.latitude}, Lng: {complaint.longitude}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Citizen Details Panel */}
          <div className="card-cream space-y-4">
            <h3 className="font-heading text-lg font-bold text-primary">Citizen Contact Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
              <div className="flex items-center gap-2 p-3 border border-slate-100 bg-slate-50 rounded-lg">
                <User className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Name</p>
                  <p className="text-slate-700 mt-0.5">{complaint.user?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 border border-slate-100 bg-slate-50 rounded-lg">
                <Mail className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Email</p>
                  <p className="text-slate-700 mt-0.5 truncate">{complaint.user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 border border-slate-100 bg-slate-50 rounded-lg">
                <Phone className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Phone</p>
                  <p className="text-slate-700 mt-0.5">{complaint.user?.phone || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Photos and Maps Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-cream space-y-3">
              <h3 className="font-heading text-base font-bold text-primary">BEFORE Photo</h3>
              <div className="h-56 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <img src={complaint.image} alt="Before" className="w-full h-full object-cover" />
              </div>
            </div>

            <div className="card-cream space-y-3">
              <h3 className="font-heading text-base font-bold text-primary">Exact Map Marker</h3>
              <div className="h-56 border border-slate-200 rounded-xl overflow-hidden shadow-sm relative z-10">
                <div ref={mapContainerRef} className="h-full w-full" />
              </div>
            </div>
          </div>

          {/* Render AFTER Photo if Resolved */}
          {complaint.status === 'resolved' && afterMedia && (
            <div className="card-cream space-y-3 border-emerald-200 bg-emerald-50/[0.15]">
              <h3 className="font-heading text-base font-bold text-emerald-800">AFTER Resolution Photo</h3>
              <div className="h-64 border border-emerald-200 rounded-xl overflow-hidden shadow-sm max-w-md">
                <img src={afterMedia.media_file} alt="After Fix" className="w-full h-full object-cover" />
              </div>
            </div>
          )}
        </div>

        {/* Right column: Action & Status Updates (Col-span 1) */}
        <div className="space-y-6">
          
          {/* Action HUD form */}
          {complaint.status !== 'resolved' && complaint.status !== 'rejected' && (
            <div className="card-cream space-y-4">
              <h3 className="font-heading text-xl font-bold text-primary flex items-center gap-1.5"><Briefcase className="w-5 h-5" /> Take Action</h3>
              
              <form onSubmit={handleStatusUpdate} className="space-y-4 font-sans text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Update Status</label>
                  <select
                    className="form-select py-2 text-sm font-semibold"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="assigned">Assigned</option>
                    <option value="acknowledged">Acknowledged (Reviewing)</option>
                    <option value="in_progress">Start Work (In Progress)</option>
                    <option value="resolved">Resolved (Complete Fix)</option>
                    <option value="rejected">Reject Complaint</option>
                  </select>
                </div>

                {/* Upload AFTER image form (Only when resolved is selected) */}
                {status === 'resolved' && (
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5" /> Upload Resolution Photo *
                    </label>
                    
                    {!afterImagePreview ? (
                      <div className="border border-dashed border-rose-300 hover:border-rose-500 rounded-xl h-36 bg-rose-50/20 cursor-pointer relative flex flex-col items-center justify-center text-rose-800 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAfterImageChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Camera className="w-8 h-8 text-rose-500 mb-1" />
                        <span className="font-bold text-[10px]">Upload AFTER photo</span>
                      </div>
                    ) : (
                      <div className="relative border border-slate-200 rounded-xl overflow-hidden h-36">
                        <img src={afterImagePreview} alt="Resolved Fix" className="w-full h-full object-cover" />
                        <button
                          onClick={handleRemoveAfterImage}
                          className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded hover:bg-rose-700 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Action Remarks *</label>
                  <textarea
                    rows="4"
                    placeholder="E.g., Dispatched road crew with hot-mix tarmac to repair coordinates. Or: Streetlight bulbs replaced."
                    className="form-input font-sans py-2 text-xs resize-none"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={updating}
                  className="btn-primary w-full py-2.5 font-bold"
                >
                  {updating ? 'Updating details...' : 'Submit Action update'}
                </button>
              </form>
            </div>
          )}

          {/* Simple Timeline summary on detail page */}
          <div className="card-cream space-y-4">
            <h3 className="font-heading text-base font-bold text-primary">Status History</h3>
            <div className="relative border-l border-slate-200 ml-1.5 pl-4 space-y-4 text-[10px] font-sans">
              {complaint.status_history?.map((hist, idx) => (
                <div key={idx} className="space-y-1 relative">
                  <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary border border-white" />
                  <div className="flex justify-between items-center text-primary font-bold">
                    <span className="capitalize">{hist.status}</span>
                    <span className="text-[8px] text-slate-400">
                      {new Date(hist.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-500 italic">"{hist.remark || 'Logged.'}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentComplaintDetails;

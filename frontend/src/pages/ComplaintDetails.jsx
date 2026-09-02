import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../hooks/useToast';
import L from 'leaflet';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Building2, 
  AlertTriangle, 
  Calendar,
  CheckCircle,
  FileImage,
  ChevronRight
} from 'lucide-react';

const ComplaintDetails = () => {
  const { id } = useParams();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  const fetchComplaintDetails = async () => {
    try {
      const res = await api.get(`/complaints/${id}/`);
      setComplaint(res.data);
    } catch (err) {
      showToast("Failed to load complaint tracking details.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaintDetails();
  }, [id]);

  // Mount Leaflet Map to show pin (exact pin for citizen's own complaint)
  useEffect(() => {
    if (complaint && mapContainerRef.current && !mapRef.current) {
      const lat = parseFloat(complaint.latitude);
      const lng = parseFloat(complaint.longitude);
      
      mapRef.current = L.map(mapContainerRef.current, {
        dragging: false,
        scrollWheelZoom: false,
        zoomControl: false
      }).setView([lat, lng], 15);

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
        <p className="text-slate-500 text-xs font-sans">Loading tracking status...</p>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="card-cream text-center py-12 space-y-4 max-w-xl mx-auto">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-heading text-xl font-bold text-primary">Complaint Not Found</h3>
        <p className="text-slate-500 text-sm font-sans">You either do not have permissions to view this complaint, or it does not exist.</p>
        <Link to="/dashboard" className="btn-primary inline-flex">Back to Dashboard</Link>
      </div>
    );
  }

  // Define full status list for vertical timeline
  const statusSequence = ['submitted', 'acknowledged', 'assigned', 'in_progress', 'resolved'];
  
  // Find after resolution image if resolved
  const afterMedia = complaint.media?.find(m => m.media_type === 'after');

  const getStatusLabel = (status) => {
    switch (status) {
      case 'submitted': return 'Complaint Submitted';
      case 'acknowledged': return 'Acknowledged Review';
      case 'assigned': return 'Assigned to Department';
      case 'in_progress': return 'Work In Progress';
      case 'resolved': return 'Resolved & Closed';
      case 'rejected': return 'Complaint Rejected';
      default: return status;
    }
  };

  const getStatusColor = (status) => {
    if (complaint.status === 'rejected') return 'bg-rose-600 text-white';
    if (status === 'resolved' && complaint.status === 'resolved') return 'bg-emerald-600 text-white border-emerald-600';
    
    const currentIndex = statusSequence.indexOf(complaint.status);
    const stepIndex = statusSequence.indexOf(status);
    
    if (stepIndex <= currentIndex && currentIndex !== -1) {
      return 'bg-primary text-secondary border-primary';
    }
    return 'bg-white text-slate-300 border-slate-200';
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans text-slate-700">
      {/* Navigation and Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <Link to="/my-complaints" className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5 mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to History
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="font-heading text-3xl font-bold text-primary">Complaint Tracking</h2>
            <span className="text-xs font-mono font-bold bg-primary/5 text-primary px-3 py-1 rounded-lg border border-primary/10">{complaint.complaint_id}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Details vs Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Complaint Details (Col-span 2) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Info Card */}
          <div className="card-cream space-y-6">
            <div className="flex justify-between items-start gap-4 border-b border-primary/5 pb-4">
              <div>
                <h3 className="font-heading text-xl font-bold text-primary">{complaint.title || complaint.issue_type}</h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mt-1">
                  <Calendar className="w-3.5 h-3.5" /> Filed on {new Date(complaint.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {complaint.is_emergency && (
                  <span className="px-2 py-0.5 bg-rose-600 text-white text-[9px] font-extrabold uppercase rounded flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Emergency</span>
                )}
                <span className="capitalize text-xs font-bold bg-secondary text-primary px-2.5 py-1 rounded border border-primary/10 shadow-sm">{complaint.priority} priority</span>
              </div>
            </div>

            <div className="space-y-4 text-sm leading-relaxed">
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Citizen Description</h4>
                <p className="text-slate-600 font-medium">{complaint.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Assigned Department</h4>
                  <div className="flex items-center gap-2 text-primary font-bold text-xs bg-primary/5 border border-primary/10 rounded-xl p-3">
                    <Building2 className="w-5 h-5 shrink-0 text-primary" />
                    <span>{complaint.department_details?.name || 'Under Review / Mapping Department'}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Address Location</h4>
                  <div className="flex items-center gap-2 text-slate-600 text-xs bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <MapPin className="w-5 h-5 shrink-0 text-slate-400" />
                    <span className="truncate">{complaint.address}, {complaint.city} - {complaint.pincode}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BEFORE / AFTER Photo Verification (Renders resolved images) */}
          {complaint.status === 'resolved' && (
            <div className="card-cream border-emerald-200 bg-emerald-50/[0.15] space-y-6">
              <div className="flex items-center gap-2 border-b border-emerald-100 pb-3">
                <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="font-heading text-lg font-bold text-primary">Resolution Evidence</h3>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">Verified before and after comparison proof.</p>
                </div>
              </div>

              {/* Photos comparison slider grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white border border-slate-200 px-2 py-0.5 rounded">BEFORE</span>
                  <div className="h-60 rounded-xl overflow-hidden shadow border border-slate-200">
                    <img src={complaint.image} alt="Before Resolution" className="w-full h-full object-cover" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded">AFTER RESOLUTION</span>
                  <div className="h-60 rounded-xl overflow-hidden shadow border border-emerald-200">
                    {afterMedia ? (
                      <img src={afterMedia.media_file} alt="After Resolution" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-400">
                        <FileImage className="w-8 h-8 mb-1" />
                        <span className="text-xs">No resolved photo uploaded</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Resolution metadata */}
              {complaint.status_history?.find(h => h.status === 'resolved') && (
                <div className="bg-white border border-emerald-100 p-4 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold">
                    <span>DEPARTMENT REPORT</span>
                    <span>
                      {new Date(complaint.status_history.find(h => h.status === 'resolved').created_at).toLocaleDateString(undefined, {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-primary font-bold text-xs italic">
                    "{complaint.status_history.find(h => h.status === 'resolved').remark || 'Resolved successfully.'}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Fallback Before-Only image for unresolved cases */}
          {complaint.status !== 'resolved' && (
            <div className="card-cream space-y-4">
              <h3 className="font-heading text-lg font-bold text-primary">Complaint Photo Proof</h3>
              <div className="grid md:grid-cols-2 gap-6 items-stretch">
                <div className="h-56 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                  <img src={complaint.image} alt="Reported Concern" className="w-full h-full object-cover" />
                </div>
                {/* Pin location display */}
                <div className="h-56 border border-slate-200 rounded-xl overflow-hidden shadow-sm relative">
                  <div ref={mapContainerRef} className="h-full w-full" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Vertical Tracking Timeline */}
        <div className="card-cream h-fit space-y-6">
          <h3 className="font-heading text-xl font-bold text-primary flex items-center gap-1.5"><Clock className="w-5 h-5 text-primary" /> Status Timeline</h3>
          
          <div className="relative border-l border-slate-200 ml-3 pl-6 space-y-8 font-sans text-xs">
            {statusSequence.map((stepStatus, index) => {
              const histList = complaint.status_history?.filter(h => h.status === stepStatus) || [];
              const hasPassed = histList.length > 0;
              const isCurrent = complaint.status === stepStatus;

              return (
                <div key={index} className="relative">
                  {/* Circle Pin node */}
                  <span className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${getStatusColor(stepStatus)}`}>
                    {hasPassed && <span className="w-1.5 h-1.5 bg-current rounded-full" />}
                  </span>

                  {/* Status Box */}
                  <div className="space-y-1.5">
                    <h4 className={`text-sm font-bold flex items-center gap-2 ${hasPassed ? 'text-primary' : 'text-slate-400'}`}>
                      {getStatusLabel(stepStatus)}
                      {isCurrent && <span className="text-[9px] font-extrabold uppercase bg-secondary text-primary px-1.5 py-0.5 rounded animate-pulse">Active</span>}
                    </h4>

                    {hasPassed ? (
                      histList.map((hist, hidx) => (
                        <div key={hidx} className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-xs leading-relaxed space-y-1">
                          <p className="text-slate-600 font-medium">{hist.remark || 'Processed successfully.'}</p>
                          <div className="flex justify-between items-center text-[9px] text-slate-400 pt-1 font-bold border-t border-slate-100/50">
                            <span>By {hist.updated_by_role === 'staff' ? 'Department staff' : hist.updated_by_role}</span>
                            <span>
                              {new Date(hist.created_at).toLocaleDateString(undefined, {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-300 text-[11px]">Pending action</p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Handle Rejected case on timeline */}
            {complaint.status === 'rejected' && (
              <div className="relative">
                <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 bg-rose-600 border-rose-600 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-white rounded-full" />
                </span>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-rose-600 flex items-center gap-2">Complaint Rejected</h4>
                  {complaint.status_history?.filter(h => h.status === 'rejected').map((hist, hidx) => (
                    <div key={hidx} className="bg-rose-50 border border-rose-100 p-2.5 rounded-lg text-xs leading-relaxed text-rose-900 space-y-1">
                      <p className="font-semibold italic">"{hist.remark || 'Rejected as duplicate or invalid.'}"</p>
                      <div className="flex justify-between items-center text-[9px] text-rose-400 pt-1 font-bold">
                        <span>Updated on</span>
                        <span>{new Date(hist.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetails;

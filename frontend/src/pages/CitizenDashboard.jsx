import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  AlertTriangle, 
  ArrowRight, 
  PlusCircle 
} from 'lucide-react';

const CitizenDashboard = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const res = await api.get('/complaints/');
        setComplaints(res.data.results || res.data || []);
      } catch (err) {
        console.error("Failed to fetch citizen complaints", err);
      } finally {
        setLoading(false);
      }
    };
    fetchComplaints();
  }, []);

  // Compute stats dynamically
  const total = complaints.length;
  const submitted = complaints.filter(c => c.status === 'submitted').length;
  const inProgress = complaints.filter(c => ['acknowledged', 'assigned', 'in_progress'].includes(c.status)).length;
  const resolved = complaints.filter(c => c.status === 'resolved').length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase tracking-wider rounded-full border border-emerald-200">Resolved</span>;
      case 'rejected':
        return <span className="px-2.5 py-1 bg-rose-50 text-rose-800 text-[10px] font-bold uppercase tracking-wider rounded-full border border-rose-200">Rejected</span>;
      case 'in_progress':
        return <span className="px-2.5 py-1 bg-sky-50 text-sky-800 text-[10px] font-bold uppercase tracking-wider rounded-full border border-sky-200">In Progress</span>;
      case 'acknowledged':
        return <span className="px-2.5 py-1 bg-amber-50 text-amber-800 text-[10px] font-bold uppercase tracking-wider rounded-full border border-amber-200">Acknowledged</span>;
      case 'assigned':
        return <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 text-[10px] font-bold uppercase tracking-wider rounded-full border border-indigo-200">Assigned</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-50 text-slate-800 text-[10px] font-bold uppercase tracking-wider rounded-full border border-slate-200">Submitted</span>;
    }
  };

  const getPriorityBadge = (priority, isEmergency) => {
    if (isEmergency || priority === 'emergency') {
      return <span className="px-2 py-0.5 bg-rose-600 text-white text-[9px] font-extrabold uppercase tracking-widest rounded flex items-center gap-1 shadow-sm"><AlertTriangle className="w-3 h-3" /> Emergency</span>;
    }
    if (priority === 'high') {
      return <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-extrabold uppercase tracking-widest rounded flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> High Priority</span>;
    }
    return <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[9px] font-bold uppercase tracking-widest rounded">Normal Priority</span>;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
        <p className="text-slate-500 text-sm font-sans">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-3xl font-bold text-primary">Citizen Dashboard</h2>
          <p className="text-slate-500 text-sm font-sans mt-1">Submit new concerns or monitor resolution progress on your previous complaints.</p>
        </div>
        <Link to="/report" className="btn-primary">
          <PlusCircle className="w-5 h-5" /> Report a New Issue
        </Link>
      </div>

      {/* Counters Stats Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Complaints', value: total, icon: <ClipboardList className="w-5 h-5 text-primary" />, color: 'bg-primary/5 border-primary/10' },
          { label: 'Submitted', value: submitted, icon: <Clock className="w-5 h-5 text-amber-600" />, color: 'bg-amber-50 border-amber-100' },
          { label: 'In Progress', value: inProgress, icon: <Clock className="w-5 h-5 text-sky-600 animate-pulse" />, color: 'bg-sky-50 border-sky-100' },
          { label: 'Resolved Issues', value: resolved, icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />, color: 'bg-emerald-50 border-emerald-100' },
        ].map((item, idx) => (
          <div key={idx} className={`border rounded-xl p-5 flex items-center justify-between shadow-sm bg-cream ${item.color}`}>
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide font-sans">{item.label}</span>
              <p className="text-3xl font-extrabold text-primary">{item.value}</p>
            </div>
            <div className="p-3 bg-white rounded-lg shadow-sm border border-slate-100">{item.icon}</div>
          </div>
        ))}
      </div>

      {/* Recent Complaints Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-xl font-bold text-primary">Recent Issues Reported</h3>
          {total > 0 && (
            <Link to="/my-complaints" className="text-xs font-bold text-primary hover:underline flex items-center gap-1 font-sans">
              View all reported issues <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {total === 0 ? (
          <div className="card-cream text-center py-16 flex flex-col items-center">
            <ClipboardList className="w-12 h-12 text-slate-300 mb-3" />
            <h4 className="font-bold text-primary text-lg mb-1">No Complaints Logged</h4>
            <p className="text-slate-500 text-xs font-sans max-w-sm mb-6 leading-relaxed">
              You haven't reported any public infrastructure issues yet. Help improve your community by submitting your first report.
            </p>
            <Link to="/report" className="btn-primary">
              <PlusCircle className="w-5 h-5" /> Report Issue
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {complaints.slice(0, 4).map((c) => (
              <div key={c.id} className="card-cream flex flex-col justify-between hover:shadow-md transition-shadow relative">
                
                {/* ID and Badge */}
                <div className="flex items-center justify-between mb-4 border-b border-primary/5 pb-3">
                  <span className="text-[11px] font-extrabold text-primary font-mono">{c.complaint_id}</span>
                  {getStatusBadge(c.status)}
                </div>

                {/* Main Details */}
                <div className="space-y-3 flex-1 mb-5">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-bold text-base text-primary font-heading line-clamp-1">{c.title || c.issue_type}</h4>
                    {getPriorityBadge(c.priority, c.is_emergency)}
                  </div>
                  <p className="text-slate-500 text-xs font-sans line-clamp-2 leading-relaxed">{c.description}</p>
                  
                  {/* Metadata Row */}
                  <div className="space-y-1.5 pt-2 text-[10px] text-slate-500 font-semibold font-sans">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{c.address}, {c.city} - {c.pincode}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 shrink-0 font-bold uppercase tracking-wider">Dept:</span>
                      <span className="text-slate-600 truncate">{c.department_details?.name || 'Under Review / AI Recommending'}</span>
                    </div>
                  </div>
                </div>

                {/* Action Row */}
                <div className="flex items-center justify-between border-t border-primary/5 pt-4">
                  <span className="text-[9px] text-slate-400 font-sans">
                    Logged: {new Date(c.created_at).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                  <Link to={`/complaint/${c.id}`} className="btn-secondary text-[11px] px-3.5 py-1.5 flex items-center gap-1 font-bold">
                    Track Complaint <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CitizenDashboard;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { 
  Building2, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert,
  Search,
  Eye,
  Briefcase
} from 'lucide-react';

const DepartmentDashboard = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAssignedComplaints = async () => {
    setLoading(true);
    try {
      // Query backend complaints (role-based filter: staff sees department complaints)
      const params = {
        status: statusFilter,
        priority: priorityFilter,
        search: searchQuery
      };
      const res = await api.get('/complaints/', { params });
      setComplaints(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedComplaints();
  }, [statusFilter, priorityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAssignedComplaints();
  };

  // Compute Stats
  const total = complaints.length;
  const pending = complaints.filter(c => c.status === 'assigned' || c.status === 'submitted').length;
  const inProgress = complaints.filter(c => ['acknowledged', 'in_progress'].includes(c.status)).length;
  const resolved = complaints.filter(c => c.status === 'resolved').length;
  const emergencies = complaints.filter(c => c.is_emergency || c.priority === 'emergency').length;
  const highPriority = complaints.filter(c => c.priority === 'high').length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase rounded border border-emerald-100">Resolved</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 bg-rose-50 text-rose-800 text-[10px] font-bold uppercase rounded border border-rose-100">Rejected</span>;
      case 'in_progress':
        return <span className="px-2 py-0.5 bg-sky-50 text-sky-800 text-[10px] font-bold uppercase rounded border border-sky-100">In Progress</span>;
      case 'acknowledged':
        return <span className="px-2 py-0.5 bg-amber-50 text-amber-800 text-[10px] font-bold uppercase rounded border border-amber-100">Acknowledged</span>;
      case 'assigned':
        return <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 text-[10px] font-bold uppercase rounded border border-indigo-100">Assigned</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-50 text-slate-800 text-[10px] font-bold uppercase rounded border border-slate-100">Submitted</span>;
    }
  };

  const getPriorityBadge = (priority, isEmergency) => {
    if (isEmergency || priority === 'emergency') {
      return <span className="px-2 py-0.5 bg-rose-600 text-white text-[9px] font-extrabold uppercase rounded flex items-center gap-1 shadow-sm"><AlertTriangle className="w-3.5 h-3.5" /> Emergency</span>;
    }
    if (priority === 'high') {
      return <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-extrabold uppercase rounded flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> High</span>;
    }
    return <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[9px] font-bold uppercase rounded">Normal</span>;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans text-slate-700">
      {/* Header banner */}
      <div>
        <h2 className="font-heading text-3xl font-bold text-primary">Department Portal</h2>
        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-slate-500 text-sm">
          <Building2 className="w-4 h-4 text-primary" />
          <span>Assigned Department:</span>
          <span className="font-bold text-primary bg-primary/5 px-2.5 py-0.5 rounded border border-primary/10">{user?.department_details?.name || 'Unassigned'}</span>
        </div>
      </div>

      {/* Stats Counter HUD */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Assigned Issues', value: total, icon: <Briefcase className="w-5 h-5 text-primary" />, color: 'bg-primary/5 border-primary/10' },
          { label: 'Pending Action', value: pending, icon: <Clock className="w-5 h-5 text-amber-600" />, color: 'bg-amber-50 border-amber-100' },
          { label: 'In Progress', value: inProgress, icon: <Clock className="w-5 h-5 text-sky-600 animate-pulse" />, color: 'bg-sky-50 border-sky-100' },
          { label: 'Emergencies', value: emergencies, icon: <ShieldAlert className="w-5 h-5 text-rose-600" />, color: 'bg-rose-50 border-rose-100' },
        ].map((item, idx) => (
          <div key={idx} className={`border rounded-xl p-5 flex items-center justify-between shadow-sm bg-cream ${item.color}`}>
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{item.label}</span>
              <p className="text-3xl font-extrabold text-primary">{item.value}</p>
            </div>
            <div className="p-3 bg-white rounded-lg shadow-sm border border-slate-100">{item.icon}</div>
          </div>
        ))}
      </div>

      {/* Filter Options */}
      <div className="card-cream p-4 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-grow">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Complaint ID, Keyword, Landmark..."
              className="form-input pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary">
            Filter
          </button>
        </form>

        <div className="flex flex-wrap gap-4 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs"
            >
              <option value="">All Statuses</option>
              <option value="assigned">Assigned</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs"
            >
              <option value="">All Priorities</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
        </div>
      </div>

      {/* Complaints list */}
      <div className="card-cream p-0 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
            <span className="text-xs text-slate-400">Loading assigned complaints...</span>
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-16 text-center text-slate-500 font-sans">
            No complaints currently assigned to your department.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-primary text-secondary border-b border-primary-dark/20 font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Complaint ID</th>
                  <th className="py-4 px-6">Civic Concern</th>
                  <th className="py-4 px-6">Priority</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Submitted Date</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5 font-medium text-slate-700 bg-cream">
                {complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-primary/[0.02] transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-primary">{c.complaint_id}</td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-primary font-heading text-sm line-clamp-1">{c.title || c.issue_type}</p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{c.address}, {c.city}</p>
                    </td>
                    <td className="py-4 px-6">{getPriorityBadge(c.priority, c.is_emergency)}</td>
                    <td className="py-4 px-6">{getStatusBadge(c.status)}</td>
                    <td className="py-4 px-6 text-slate-400">
                      {new Date(c.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Link
                        to={`/dept/complaint/${c.id}`}
                        className="btn-secondary py-1.5 px-3 inline-flex items-center gap-1.5 text-[11px] font-bold mx-auto"
                      >
                        <Briefcase className="w-3.5 h-3.5" /> Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentDashboard;

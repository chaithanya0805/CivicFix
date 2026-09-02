import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../hooks/useToast';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Eye, 
  AlertTriangle, 
  Building2, 
  X, 
  Clock, 
  MapPin, 
  User,
  Settings
} from 'lucide-react';

const ComplaintsManagement = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState([]);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Selected Detail Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  
  // Modal Edit fields
  const [editStatus, setEditStatus] = useState('');
  const [editDeptId, setEditDeptId] = useState('');
  const [editPriority, setEditPriority] = useState('normal');
  const [editRemark, setEditRemark] = useState('');
  const [editRoutingStatus, setEditRoutingStatus] = useState('needs_review');
  const [updating, setUpdating] = useState(false);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments/');
      setDepartments(res.data.results || res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        search,
        status,
        priority,
        department: departmentId
      };
      const res = await api.get('/complaints/', { params });
      if (res.data.results) {
        setComplaints(res.data.results);
        setTotalCount(res.data.count);
      } else {
        setComplaints(res.data);
        setTotalCount(res.data.length);
      }
    } catch (err) {
      showToast("Failed to load complaints registry.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [page, status, priority, departmentId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchComplaints();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setPriority('');
    setDepartmentId('');
    setPage(1);
  };

  const openManageModal = (complaint) => {
    setSelectedComplaint(complaint);
    setEditStatus(complaint.status);
    setEditDeptId(complaint.department || '');
    setEditPriority(complaint.priority);
    setEditRemark('');
    setEditRoutingStatus(complaint.routing_status || 'needs_review');
    setIsModalOpen(true);
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    if (!editRemark.trim()) {
      showToast("Please provide action remarks.", "warning");
      return;
    }

    setUpdating(true);
    const payload = {
      status: editStatus,
      priority: editPriority,
      remark: editRemark,
      is_emergency: editPriority === 'emergency',
      routing_status: editRoutingStatus
    };

    if (editDeptId) {
      payload.department = editDeptId;
    } else {
      payload.department = null;
    }

    try {
      const res = await api.patch(`/complaints/${selectedComplaint.id}/`, payload);
      showToast("Complaint updated successfully.", "success");
      
      // Update local list
      setComplaints(prev => prev.map(c => c.id === selectedComplaint.id ? res.data : c));
      setIsModalOpen(false);
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to save updates.";
      showToast(errorMsg, "error");
    } finally {
      setUpdating(false);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

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
      return <span className="text-rose-600 font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Emergency</span>;
    }
    if (priority === 'high') {
      return <span className="text-amber-500 font-semibold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> High</span>;
    }
    return <span className="text-slate-500">Normal</span>;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans text-slate-700">
      <div>
        <h2 className="font-heading text-3xl font-bold text-primary">Manage Complaints</h2>
        <p className="text-slate-500 text-sm mt-1">Audit, prioritize, and assign civic issues to responsible municipal departments.</p>
      </div>

      {/* Filter and Search Panel */}
      <div className="card-cream space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID, citizen, landmark, pincode..."
              className="form-input pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary py-2.5 px-6">
            Search
          </button>
          <button
            type="button"
            onClick={handleResetFilters}
            className="btn-outline py-2.5"
            title="Reset Filters"
          >
            <RefreshCw className="w-4 h-4" /> Reset
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
            <select
              className="form-select py-2 text-xs"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Priority</label>
            <select
              className="form-select py-2 text-xs"
              value={priority}
              onChange={(e) => { setPriority(e.target.value); setPage(1); }}
            >
              <option value="">All Priorities</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Department</label>
            <select
              className="form-select py-2 text-xs"
              value={departmentId}
              onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="card-cream p-0 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
            <span className="text-xs text-slate-400">Loading complaints register...</span>
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            No complaints found matching the criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-primary text-secondary border-b border-primary-dark/20 font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Complaint ID</th>
                  <th className="py-4 px-6">Civic Issue Details</th>
                  <th className="py-4 px-6">Citizen</th>
                  <th className="py-4 px-6">Assigned Department</th>
                  <th className="py-4 px-6">Priority</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-center">Action</th>
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
                    <td className="py-4 px-6">
                      <p className="font-semibold text-slate-800">{c.user?.name}</p>
                      <p className="text-[10px] text-slate-400">{c.user?.phone || 'No phone'}</p>
                    </td>
                    <td className="py-4 px-6 truncate max-w-[150px]">{c.department_details?.name || 'Unassigned'}</td>
                    <td className="py-4 px-6">{getPriorityBadge(c.priority, c.is_emergency)}</td>
                    <td className="py-4 px-6">{getStatusBadge(c.status)}</td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => openManageModal(c)}
                        className="btn-secondary py-1.5 px-3 inline-flex items-center gap-1.5 text-[11px] font-bold"
                      >
                        <Settings className="w-3.5 h-3.5" /> Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalCount > itemsPerPage && (
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
          <span>
            Showing Page {page} of {totalPages} ({totalCount} total cases)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="btn-outline py-1.5 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="btn-outline py-1.5 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detailed Management Overlay Modal */}
      {isModalOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-cream rounded-2xl shadow-xl overflow-hidden border border-primary/10 flex flex-col max-h-[90vh] animate-slide-in">
            {/* Header */}
            <div className="bg-primary px-6 py-4 text-white flex justify-between items-center shrink-0">
              <h3 className="font-heading text-lg font-bold text-secondary">
                Manage Ticket: {selectedComplaint.complaint_id}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
              {/* Complaint Overview */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="h-44 rounded-xl overflow-hidden border border-slate-200">
                  <img src={selectedComplaint.image} alt="Reported issue" className="w-full h-full object-cover" />
                </div>
                <div className="space-y-3 font-sans leading-relaxed text-xs">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Category / Title</span>
                    <p className="font-bold text-primary">{selectedComplaint.title || selectedComplaint.issue_type}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Description</span>
                    <p className="text-slate-500 font-medium line-clamp-3">{selectedComplaint.description}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Geocoded Address</span>
                    <p className="font-semibold text-slate-700 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" /> {selectedComplaint.address}</p>
                  </div>
                </div>
              </div>

              {/* Citizen Information */}
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-6 font-semibold">
                <div className="flex items-center gap-1.5"><User className="w-4 h-4 text-slate-400" /> {selectedComplaint.user?.name}</div>
                <div className="text-slate-400">|</div>
                <div>{selectedComplaint.user?.email}</div>
                <div className="text-slate-400">|</div>
                <div>{selectedComplaint.user?.phone || 'No phone'}</div>
              </div>

              {/* Administrative overrides form */}
              <form onSubmit={handleSaveChanges} className="space-y-4 pt-3 border-t border-primary/5">
                <h4 className="font-bold text-primary text-sm font-sans flex items-center gap-1.5"><Settings className="w-4 h-4" /> Administrative Controls</h4>
                
                {/* Smart Routing Outcome Details */}
                <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-primary text-xs font-heading">Smart Routing Audit Details</h4>
                    {selectedComplaint.source_verified ? (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[9px] font-bold uppercase rounded border border-emerald-100">✓ Official Source Verified</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-800 text-[9px] font-bold uppercase rounded border border-amber-100">Fallback/Unverified Routing</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] font-sans">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[8px] tracking-wider block">Authority</span>
                      <span className="font-semibold text-slate-700">{selectedComplaint.authority_name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[8px] tracking-wider block">Grievance Portal</span>
                      {selectedComplaint.official_portal ? (
                        <a href={selectedComplaint.official_portal} target="_blank" rel="noopener noreferrer" className="text-sky-600 font-bold hover:underline">Link</a>
                      ) : 'N/A'}
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[8px] tracking-wider block">Email / Phone</span>
                      <span className="font-semibold text-slate-700">{selectedComplaint.contact_email || 'No email'} / {selectedComplaint.contact_phone || 'No phone'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[8px] tracking-wider block">Source Citation</span>
                      {selectedComplaint.source_url ? (
                        <a href={selectedComplaint.source_url} target="_blank" rel="noopener noreferrer" className="text-primary font-bold hover:underline">{selectedComplaint.source_name || 'View'}</a>
                      ) : (selectedComplaint.source_name || 'N/A')}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Re-assign Department</label>
                    <select
                      className="form-select py-2 text-xs font-semibold"
                      value={editDeptId}
                      onChange={(e) => setEditDeptId(e.target.value)}
                    >
                      <option value="">-- Unassigned --</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Priority Level</label>
                    <select
                      className="form-select py-2 text-xs font-semibold"
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Workflow Status</label>
                    <select
                      className="form-select py-2 text-xs font-semibold"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      disabled={selectedComplaint.status === 'resolved' && editStatus === 'resolved'} // resolved needs resolution photos via department portal
                    >
                      <option value="submitted">Submitted</option>
                      <option value="acknowledged">Acknowledged</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Routing Audit Status</label>
                    <select
                      className="form-select py-2 text-xs font-semibold"
                      value={editRoutingStatus}
                      onChange={(e) => setEditRoutingStatus(e.target.value)}
                    >
                      <option value="verified">Verified</option>
                      <option value="needs_review">Needs Review</option>
                      <option value="invalid">Invalid</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Action Remarks *</label>
                  <textarea
                    rows="3"
                    placeholder="Provide administrative reasons for re-routing, updating status, or re-prioritizing..."
                    className="form-input py-2 text-xs resize-none"
                    value={editRemark}
                    onChange={(e) => setEditRemark(e.target.value)}
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-primary/5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn-outline py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="btn-primary py-2 px-6 font-bold"
                  >
                    {updating ? 'Saving changes...' : 'Apply Overrides'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintsManagement;

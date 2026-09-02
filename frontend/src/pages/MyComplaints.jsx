import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Search, Filter, RefreshCw, ArrowRight, Eye, AlertTriangle } from 'lucide-react';

const MyComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState([]);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

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
        department: departmentId,
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
      console.error("Failed to load complaints history", err);
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
      return <span className="text-rose-600 font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Emergency</span>;
    }
    if (priority === 'high') {
      return <span className="text-amber-500 font-semibold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> High</span>;
    }
    return <span className="text-slate-500">Normal</span>;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      <div>
        <h2 className="font-heading text-3xl font-bold text-primary">My Complaints</h2>
        <p className="text-slate-500 text-sm mt-1">Review the history and complete log of all civic issues you have reported.</p>
      </div>

      {/* Filter and Search Panel */}
      <div className="card-cream space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID, Address, Issue type..."
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

      {/* Complaints List Table Container */}
      <div className="card-cream p-0 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
            <span className="text-xs text-slate-400">Loading complaints history...</span>
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No complaints found matching the criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-primary text-secondary border-b border-primary-dark/20 font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Complaint ID</th>
                  <th className="py-4 px-6">Issue</th>
                  <th className="py-4 px-6">Department</th>
                  <th className="py-4 px-6">Priority</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Date</th>
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
                    <td className="py-4 px-6 truncate max-w-[150px]">{c.department_details?.name || 'Under Review'}</td>
                    <td className="py-4 px-6">{getPriorityBadge(c.priority, c.is_emergency)}</td>
                    <td className="py-4 px-6">{getStatusBadge(c.status)}</td>
                    <td className="py-4 px-6 text-slate-400">
                      {new Date(c.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Link
                        to={`/complaint/${c.id}`}
                        className="btn-secondary py-1.5 px-3 inline-flex items-center gap-1.5 text-[11px] font-bold mx-auto"
                      >
                        <Eye className="w-3.5 h-3.5" /> Track
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {!loading && totalCount > itemsPerPage && (
        <div className="flex items-center justify-between font-medium text-slate-500 text-xs">
          <span>
            Showing Page {page} of {totalPages} ({totalCount} total issues)
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
    </div>
  );
};

export default MyComplaints;

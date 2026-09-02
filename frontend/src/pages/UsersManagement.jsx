import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../hooks/useToast';
import { Search, ShieldAlert, UserX, UserCheck, Shield } from 'lucide-react';

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {
        search,
        role: roleFilter
      };
      const res = await api.get('/auth/admin/users/', { params });
      setUsers(res.data.results || res.data || []);
    } catch (err) {
      showToast("Failed to load user accounts database.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleToggleActive = async (userId, currentStatus) => {
    setUpdatingId(userId);
    try {
      await api.patch('/auth/admin/users/', {
        user_id: userId,
        is_active: !currentStatus
      });
      showToast("User account status updated successfully.", "success");
      // Update locally
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to update user status.";
      showToast(errorMsg, "error");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans text-slate-700">
      <div>
        <h2 className="font-heading text-3xl font-bold text-primary">Manage Users</h2>
        <p className="text-slate-500 text-sm mt-1">Audit user profiles and toggle active permissions for citizen and staff accounts.</p>
      </div>

      {/* Filter panel */}
      <div className="card-cream space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-grow">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              className="form-input pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary">
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Filter by Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs"
          >
            <option value="">All Roles</option>
            <option value="citizen">Citizen</option>
            <option value="staff">Department Staff</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
      </div>

      {/* User table */}
      <div className="card-cream p-0 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
            <span className="text-xs text-slate-400">Loading user list...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            No registered users found matching the query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-primary text-secondary border-b border-primary-dark/20 font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">User Details</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Assigned Department</th>
                  <th className="py-4 px-6">Created On</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5 font-medium text-slate-700 bg-cream">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-primary/[0.02] transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-bold text-primary font-heading text-sm">{u.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{u.email}</p>
                      <p className="text-[10px] text-slate-400">{u.phone || 'No phone'}</p>
                    </td>
                    <td className="py-4 px-6 capitalize">
                      <span className="inline-flex items-center gap-1">
                        {u.role === 'admin' && <Shield className="w-3.5 h-3.5 text-primary shrink-0" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 truncate max-w-[150px]">
                      {u.role === 'staff' ? (u.department_details?.name || 'Unassigned') : 'N/A (Citizen)'}
                    </td>
                    <td className="py-4 px-6 text-slate-400">
                      {new Date(u.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {u.is_active ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase rounded border border-emerald-100">Active</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-800 text-[10px] font-bold uppercase rounded border border-rose-100">Suspended</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {u.role === 'admin' ? (
                        <span className="text-[10px] text-slate-400 font-semibold italic">System Owner</span>
                      ) : (
                        <button
                          onClick={() => handleToggleActive(u.id, u.is_active)}
                          disabled={updatingId === u.id}
                          className={`py-1.5 px-3 rounded text-[11px] font-bold transition-all shadow-sm border ${
                            u.is_active 
                              ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100' 
                              : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {updatingId === u.id ? (
                            'Processing...'
                          ) : u.is_active ? (
                            <span className="flex items-center gap-1 justify-center"><UserX className="w-3.5 h-3.5" /> Suspend</span>
                          ) : (
                            <span className="flex items-center gap-1 justify-center"><UserCheck className="w-3.5 h-3.5" /> Activate</span>
                          )}
                        </button>
                      )}
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

export default UsersManagement;

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../hooks/useToast';
import { PlusCircle, Edit, Trash2, CheckCircle2, AlertTriangle, X, Building2 } from 'lucide-react';

const DepartmentsManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  
  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      // Query backend departments list (includes inactive ones for admin)
      const res = await api.get('/departments/');
      setDepartments(res.data.results || res.data || []);
    } catch (err) {
      showToast("Failed to load departments list.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const openCreateModal = () => {
    setEditingDept(null);
    setName('');
    setDescription('');
    setEmail('');
    setPhone('');
    setActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (dept) => {
    setEditingDept(dept);
    setName(dept.name);
    setDescription(dept.description || '');
    setEmail(dept.email);
    setPhone(dept.phone);
    setActive(dept.active);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      showToast("Please fill in all required fields.", "warning");
      return;
    }

    setSaving(true);
    const payload = { name, description, email, phone, active };

    try {
      if (editingDept) {
        // Edit Existing
        const res = await api.put(`/departments/${editingDept.id}/`, payload);
        showToast("Department updated successfully.", "success");
        setDepartments(prev => prev.map(d => d.id === editingDept.id ? res.data : d));
      } else {
        // Create New
        const res = await api.post('/departments/', payload);
        showToast("New department created successfully.", "success");
        setDepartments(prev => [...prev, res.data]);
      }
      setIsModalOpen(false);
    } catch (err) {
      showToast("Failed to save department details.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans text-slate-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-heading text-3xl font-bold text-primary">Manage Departments</h2>
          <p className="text-slate-500 text-sm mt-1">Configure service wings, phone directories, and emails for routing complaint assignments.</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          <PlusCircle className="w-5 h-5" /> Add New Department
        </button>
      </div>

      {/* Grid of departments */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
          <span className="text-xs text-slate-400">Loading department listings...</span>
        </div>
      ) : departments.length === 0 ? (
        <div className="card-cream text-center py-16 text-slate-500">
          No departments configured in the platform.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((d) => (
            <div key={d.id} className="card-cream flex flex-col justify-between hover:shadow-md transition-shadow relative">
              <div className="space-y-4">
                {/* Header title */}
                <div className="flex justify-between items-start gap-3 border-b border-primary/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary shrink-0" />
                    <h3 className="font-heading font-bold text-lg text-primary">{d.name}</h3>
                  </div>
                  {d.active ? (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[9px] font-extrabold uppercase rounded border border-emerald-100">Active</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold uppercase rounded border border-slate-200">Inactive</span>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  <p className="text-slate-500 line-clamp-2 leading-relaxed">{d.description || 'No description provided.'}</p>
                  
                  <div className="pt-2 space-y-1 text-slate-600 font-semibold font-sans">
                    <p className="flex items-center gap-1.5"><span className="text-slate-400 text-[10px] font-bold uppercase w-12">Email:</span> {d.email}</p>
                    <p className="flex items-center gap-1.5"><span className="text-slate-400 text-[10px] font-bold uppercase w-12">Phone:</span> {d.phone}</p>
                  </div>
                </div>
              </div>

              {/* Edit button */}
              <div className="border-t border-primary/5 mt-4 pt-3 flex justify-end">
                <button
                  onClick={() => openEditModal(d)}
                  className="btn-secondary py-1.5 px-3 flex items-center gap-1 text-[11px] font-bold"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create Department Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-cream rounded-2xl shadow-xl overflow-hidden border border-primary/10 animate-slide-in">
            {/* Modal Header */}
            <div className="bg-primary px-6 py-4 text-white flex justify-between items-center">
              <h3 className="font-heading text-lg font-bold text-secondary">
                {editingDept ? 'Edit Department details' : 'Configure New Department'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[10px] font-bold text-primary uppercase tracking-wider mb-1.5">Department Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Roads & Transport"
                  className="form-input py-2 text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-primary uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  rows="3"
                  placeholder="Brief summary of department responsibilities..."
                  className="form-input py-2 text-xs resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-primary uppercase tracking-wider mb-1.5">Contact Email Address *</label>
                <input
                  type="email"
                  placeholder="roads@civicfix.org"
                  className="form-input py-2 text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-primary uppercase tracking-wider mb-1.5">Contact Phone Number *</label>
                <input
                  type="tel"
                  placeholder="080-22222222"
                  className="form-input py-2 text-sm"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center py-2">
                <label className="flex items-center gap-2 text-xs font-bold text-primary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="h-4.5 w-4.5 rounded text-primary border-slate-300 focus:ring-primary"
                  />
                  Active Status (Visible to citizens)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-primary/5 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-outline py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary py-2 px-6 font-bold"
                >
                  {saving ? 'Saving...' : 'Save Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentsManagement;

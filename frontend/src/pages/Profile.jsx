import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { User as UserIcon, Mail, Phone, Shield, Building } from 'lucide-react';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();
  
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [updating, setUpdating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Name field is required.", "warning");
      return;
    }

    setUpdating(true);
    const res = await updateProfile({ name, phone });
    setUpdating(false);

    if (res.success) {
      showToast("Profile details updated successfully.", "success");
    } else {
      showToast("Failed to update profile details.", "error");
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 font-sans text-slate-700">
      <div>
        <h2 className="font-heading text-3xl font-bold text-primary">My Profile</h2>
        <p className="text-slate-500 text-sm mt-1">Manage your account information and contact numbers.</p>
      </div>

      <div className="card-cream space-y-6">
        {/* Role card indicator */}
        <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Account Role</p>
              <p className="text-sm font-bold text-primary capitalize mt-0.5">{user?.role}</p>
            </div>
          </div>
          {user?.role === 'staff' && (
            <div className="flex items-center gap-2 text-primary font-bold text-xs bg-white border border-primary/15 rounded-lg py-1 px-3">
              <Building className="w-4 h-4" />
              <span>{user?.department_details?.name}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-primary uppercase tracking-wide mb-1.5" htmlFor="name">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="name"
                type="text"
                className="form-input pl-11"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-primary uppercase tracking-wide mb-1.5" htmlFor="email">
              Email Address (Cannot change)
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input
                id="email"
                type="email"
                className="form-input pl-11 bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed select-none"
                value={user?.email || ''}
                disabled
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-primary uppercase tracking-wide mb-1.5" htmlFor="phone">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="phone"
                type="tel"
                className="form-input pl-11"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={updating}
            className="btn-primary w-full mt-6"
          >
            {updating ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Updating details...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;

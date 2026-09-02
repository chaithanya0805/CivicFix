import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  PlusCircle, 
  Search, 
  ArrowRight, 
  Sparkles, 
  MapPin, 
  ShieldAlert, 
  CheckCircle2, 
  Eye, 
  Users, 
  CheckSquare 
} from 'lucide-react';

const LandingPage = () => {
  const [complaintIdQuery, setComplaintIdQuery] = useState('');
  const navigate = useNavigate();

  const handleSearchComplaint = (e) => {
    e.preventDefault();
    if (!complaintIdQuery.trim()) return;
    // Redirect to login or details depending on auth
    navigate(`/login?search_complaint=${complaintIdQuery}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-cream-soft">
      {/* Landing Navbar */}
      <nav className="h-20 bg-primary border-b border-primary-dark/30 px-6 sm:px-12 flex items-center justify-between text-white shadow-sm z-30">
        <div className="flex items-center gap-2.5">
          <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <div>
            <h1 className="font-heading font-extrabold text-xl leading-none text-secondary tracking-tight">CivicFix</h1>
            <p className="text-[9px] text-slate-300 font-bold uppercase tracking-wider mt-0.5">Report. Track. Resolve.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-semibold text-secondary hover:text-white transition-colors">
            Sign In
          </Link>
          <Link to="/signup" className="btn-secondary text-xs px-4 py-2">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-primary text-white py-16 px-6 sm:px-12 relative overflow-hidden">
        {/* Abstract shapes for premium feel */}
        <div className="absolute right-0 bottom-0 w-80 h-80 bg-secondary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute left-1/3 top-10 w-96 h-96 bg-primary-light/10 rounded-full blur-3xl -z-10" />

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary/15 text-secondary text-xs font-bold uppercase tracking-widest rounded-full">
              <Sparkles className="w-3.5 h-3.5" /> AI-Powered Civic Platform
            </span>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none text-secondary">
              Make Your City Better.
            </h1>
            <p className="text-lg text-slate-300 font-sans max-w-lg leading-relaxed">
              Report civic problems like potholes, garbage dumpings, and leaking water lines. Track their repair status in real-time, and view before/after transparency proofs.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link to="/login?action=report" className="btn-secondary text-sm px-6 py-3 font-bold flex items-center gap-2">
                <PlusCircle className="w-5 h-5" /> Report an Issue
              </Link>
              <Link to="/login" className="btn-outline text-sm px-6 py-3 font-bold text-white border-white/20 hover:bg-white/5 flex items-center gap-2">
                Track a Complaint <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Quick Tracking Widget on Landing Page */}
          <div className="bg-cream border border-primary/10 p-8 rounded-2xl shadow-2xl text-slate-800 self-center">
            <h3 className="font-heading text-xl font-bold text-primary mb-2">Track Complaint Status</h3>
            <p className="text-slate-500 text-xs font-sans mb-5">Enter your unique tracking ID (e.g. CF-2026-00003) to check immediate status updates.</p>
            
            <form onSubmit={handleSearchComplaint} className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter Complaint ID"
                  className="form-input pl-11 uppercase"
                  value={complaintIdQuery}
                  onChange={(e) => setComplaintIdQuery(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
                Find Complaint
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 sm:px-12 max-w-6xl mx-auto">
        <h2 className="font-heading text-3xl font-bold text-primary text-center mb-2">How CivicFix Works</h2>
        <p className="text-slate-500 text-sm text-center max-w-md mx-auto mb-16 font-sans">
          Four simple steps from locating the problem to witnessing its permanent fix.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { step: '1', title: 'Upload Photo & Location', desc: 'Snap a picture of the issue. Use GPS to map its exact address coordinates automatically.', icon: <MapPin className="w-5 h-5 text-secondary" /> },
            { step: '2', title: 'AI Categorization', desc: 'Our AI model classifies the issue type, recommends the department, and flags emergencies.', icon: <Sparkles className="w-5 h-5 text-secondary" /> },
            { step: '3', title: 'Status Tracking', desc: 'Watch progress live as the assigned department acknowledges, dispatches crew, and works.', icon: <ShieldAlert className="w-5 h-5 text-secondary" /> },
            { step: '4', title: 'Transparent Fix', desc: 'Review the verified BEFORE and AFTER photo proof once the team resolves the complaint.', icon: <CheckCircle2 className="w-5 h-5 text-secondary" /> },
          ].map((item, index) => (
            <div key={index} className="bg-cream border border-primary/5 p-6 rounded-xl shadow-sm text-slate-800 relative hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center mb-4">
                {item.icon}
              </div>
              <h3 className="font-bold text-base text-primary mb-2">{item.title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed font-sans">{item.desc}</p>
              <div className="absolute top-4 right-4 text-primary/10 font-heading text-4xl font-black">
                {item.step}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BEFORE / AFTER Demonstration */}
      <section className="bg-secondary/15 py-20 px-6 sm:px-12 border-y border-secondary/35">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-xs font-bold text-primary uppercase tracking-widest bg-secondary/30 px-3 py-1 rounded-full">
              Transparency First
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-primary">
              Verify Resolutions with Before & After Proof
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed font-sans">
              Departments are required to upload a photographic evidence showing the cleared area before marking a complaint as resolved. Citizens see side-by-side evidence to verify real-world progress.
            </p>
            <div className="space-y-3 font-sans">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-primary">
                <CheckSquare className="w-4 h-4 text-emerald-600" /> Complete Accountability
              </div>
              <div className="flex items-center gap-2.5 text-sm font-semibold text-primary">
                <CheckSquare className="w-4 h-4 text-emerald-600" /> Geographic Verification
              </div>
              <div className="flex items-center gap-2.5 text-sm font-semibold text-primary">
                <CheckSquare className="w-4 h-4 text-emerald-600" /> Citizens Rate the Fix
              </div>
            </div>
          </div>

          {/* Photo slider mockup */}
          <div className="bg-cream border border-primary/10 p-4 rounded-2xl shadow-xl">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="text-xs font-bold text-primary text-center">BEFORE</p>
                <div className="h-48 bg-slate-200 rounded-lg overflow-hidden relative border border-slate-300">
                  <div className="absolute inset-0 bg-neutral-900/40 flex items-center justify-center p-2 text-center text-xs font-bold text-white uppercase">
                    Garbage Accumulation
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-primary text-center">AFTER</p>
                <div className="h-48 bg-emerald-100 rounded-lg overflow-hidden relative border border-emerald-300">
                  <div className="absolute inset-0 bg-emerald-950/40 flex items-center justify-center p-2 text-center text-xs font-bold text-white uppercase">
                    Cleared & Swept Clean
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-secondary/10 border border-secondary rounded-lg text-[10px] text-slate-500 font-sans text-center">
              "Municipal Department remarks: Cleared all plastic waste and garbage. Sanitized area."
            </div>
          </div>
        </div>
      </section>

      {/* Live Civic Stats */}
      <section className="py-20 px-6 sm:px-12 max-w-6xl mx-auto w-full text-center">
        <h2 className="font-heading text-3xl font-bold text-primary mb-2">Platform Performance Metrics</h2>
        <p className="text-slate-500 text-sm max-w-sm mx-auto mb-16 font-sans">
          Track real-time platform statistics showing government responsiveness.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Total Complaints', value: '42,910', sub: 'Logged by citizens' },
            { label: 'Issues Resolved', value: '38,124', sub: '88.8% fix rate' },
            { label: 'Avg Resolution Time', value: '28 hrs', sub: 'Fast turnaround' },
            { label: 'Active Citizens', value: '18,500+', sub: 'Community members' },
          ].map((stat, idx) => (
            <div key={idx} className="card-cream text-center">
              <p className="text-slate-500 text-xs font-semibold mb-1 font-sans">{stat.label}</p>
              <h3 className="font-heading text-3xl sm:text-4xl font-extrabold text-primary mb-1">{stat.value}</h3>
              <p className="text-[10px] text-slate-400 font-sans">{stat.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Landing Footer */}
      <footer className="mt-auto bg-primary text-slate-300 py-12 px-6 sm:px-12 border-t border-primary-dark">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="font-heading text-lg font-bold text-secondary">CivicFix</span>
            <span className="text-xs text-slate-400">© 2026. All rights reserved.</span>
          </div>

          <div className="flex gap-6 text-xs font-sans">
            <Link to="/login" className="hover:text-secondary transition-colors">Sign In</Link>
            <Link to="/signup" className="hover:text-secondary transition-colors">Sign Up</Link>
            <a href="#how" className="hover:text-secondary transition-colors">How It Works</a>
            <a href="#privacy" className="hover:text-secondary transition-colors">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

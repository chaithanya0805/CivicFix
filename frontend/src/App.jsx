import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import { CitizenLayout, DepartmentLayout, AdminLayout } from './layouts/Layouts';

// Public Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';

// Citizen Pages
import CitizenDashboard from './pages/CitizenDashboard';
import ReportIssue from './pages/ReportIssue';
import MyComplaint from './pages/MyComplaints';
import ComplaintDetails from './pages/ComplaintDetails';
import CitizenMapView from './pages/CitizenMapView';
import Profile from './pages/Profile';

// Department Pages
import DepartmentDashboard from './pages/DepartmentDashboard';
import DepartmentComplaintDetails from './pages/DepartmentComplaintDetails';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import UsersManagement from './pages/UsersManagement';
import DepartmentsManagement from './pages/DepartmentsManagement';
import ComplaintsManagement from './pages/ComplaintsManagement';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Citizen protected routes */}
        <Route element={<CitizenLayout />}>
          <Route path="/dashboard" element={<CitizenDashboard />} />
          <Route path="/report" element={<ReportIssue />} />
          <Route path="/my-complaints" element={<MyComplaints />} />
          <Route path="/complaint/:id" element={<ComplaintDetails />} />
          <Route path="/map" element={<CitizenMapView />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Department protected routes */}
        <Route element={<DepartmentLayout />}>
          <Route path="/dept/dashboard" element={<DepartmentDashboard />} />
          <Route path="/dept/complaints" element={<DepartmentDashboard />} />
          <Route path="/dept/complaint/:id" element={<DepartmentComplaintDetails />} />
          {/* Reuse profile inside dept layout */}
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Admin protected routes */}
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UsersManagement />} />
          <Route path="/admin/departments" element={<DepartmentsManagement />} />
          <Route path="/admin/complaints" element={<ComplaintsManagement />} />
          {/* Reuse profile inside admin layout */}
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Catch-all redirection */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

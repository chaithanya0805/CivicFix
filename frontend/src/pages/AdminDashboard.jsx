import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../hooks/useToast';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  ArcElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { 
  Users, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  BarChart 
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/admin/analytics/');
        setData(res.data);
      } catch (err) {
        showToast("Failed to load platform analytics.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
        <p className="text-slate-500 text-xs font-sans">Loading system metrics...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card-cream text-center py-12 text-slate-500 font-sans">
        Analytics could not be loaded. Please ensure you are logged in as an Administrator.
      </div>
    );
  }

  const { counters, status_distribution, priority_distribution, department_distribution, timeline } = data;

  // 1. Timeline Chart Data
  const timelineChartData = {
    labels: timeline.map(t => t.date),
    datasets: [
      {
        label: 'Issues Logged',
        data: timeline.map(t => t.count),
        borderColor: '#003631',
        backgroundColor: 'rgba(0, 54, 49, 0.1)',
        tension: 0.3,
        fill: true,
      }
    ]
  };

  // 2. Department Chart Data
  const deptChartData = {
    labels: department_distribution.map(d => d.department),
    datasets: [
      {
        label: 'Complaints',
        data: department_distribution.map(d => d.count),
        backgroundColor: '#003631',
        hoverBackgroundColor: '#07524A',
        borderRadius: 6
      }
    ]
  };

  // 3. Status Chart Data
  const statusLabels = Object.keys(status_distribution);
  const statusValues = Object.values(status_distribution);
  const statusChartData = {
    labels: statusLabels.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
    datasets: [
      {
        data: statusValues,
        backgroundColor: [
          '#EFEAD8', // submitted
          '#FFEDA8', // acknowledged
          '#DFCD82', // assigned
          '#38bdf8', // in_progress
          '#10b981', // resolved
          '#f43f5e'  // rejected
        ],
        borderWidth: 1
      }
    ]
  };

  // 4. Priority Chart Data
  const priorityLabels = Object.keys(priority_distribution);
  const priorityValues = Object.values(priority_distribution);
  const priorityChartData = {
    labels: priorityLabels.map(p => p.charAt(0).toUpperCase() + p.slice(1)),
    datasets: [
      {
        data: priorityValues,
        backgroundColor: [
          '#ECE7D5', // normal
          '#f59e0b', // high
          '#ef4444'  // emergency
        ],
        borderWidth: 1
      }
    ]
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans text-slate-700">
      
      {/* Title Header */}
      <div className="flex items-center gap-3">
        <BarChart className="w-8 h-8 text-primary shrink-0" />
        <div>
          <h2 className="font-heading text-3xl font-bold text-primary">System Analytics</h2>
          <p className="text-slate-500 text-sm mt-0.5">Global platforms analytics, routing distributions, and performance graphs.</p>
        </div>
      </div>

      {/* Counters Metrics panel */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-5">
        {[
          { label: 'Total Complaints', value: counters.total_complaints, icon: <FileText className="w-4 h-4 text-primary" />, color: 'bg-primary/5' },
          { label: 'Total Resolved', value: counters.resolved, icon: <CheckCircle className="w-4 h-4 text-emerald-600" />, color: 'bg-emerald-50' },
          { label: 'In Progress', value: counters.in_progress, icon: <Clock className="w-4 h-4 text-sky-500" />, color: 'bg-sky-50' },
          { label: 'High Priority', value: counters.high_priority, icon: <AlertTriangle className="w-4 h-4 text-amber-500" />, color: 'bg-amber-50' },
          { label: 'Emergencies', value: counters.emergency, icon: <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />, color: 'bg-rose-50' },
          { label: 'Total Users', value: counters.total_users, icon: <Users className="w-4 h-4 text-slate-600" />, color: 'bg-slate-50' },
        ].map((item, idx) => (
          <div key={idx} className={`border border-primary/5 rounded-xl p-4 space-y-2 shadow-sm bg-cream ${item.color}`}>
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
              {item.icon}
            </div>
            <p className="text-2xl font-extrabold text-primary">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Line Timeline (Col-span 2) */}
        <div className="card-cream lg:col-span-2 space-y-4">
          <h3 className="font-heading text-lg font-bold text-primary">Logged Complaints (Last 30 Days)</h3>
          <div className="h-64 flex items-center justify-center">
            <Line 
              data={timelineChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
              }} 
            />
          </div>
        </div>

        {/* Status Share (Col-span 1) */}
        <div className="card-cream space-y-4">
          <h3 className="font-heading text-lg font-bold text-primary">Status Distribution</h3>
          <div className="h-56 flex items-center justify-center">
            <Doughnut 
              data={statusChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } } }
              }}
            />
          </div>
        </div>

        {/* Department Share (Col-span 2) */}
        <div className="card-cream lg:col-span-2 space-y-4">
          <h3 className="font-heading text-lg font-bold text-primary">Complaints by Department</h3>
          <div className="h-64 flex items-center justify-center">
            <Bar 
              data={deptChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
              }} 
            />
          </div>
        </div>

        {/* Priority Share (Col-span 1) */}
        <div className="card-cream space-y-4">
          <h3 className="font-heading text-lg font-bold text-primary">Priority Breakdown</h3>
          <div className="h-56 flex items-center justify-center">
            <Doughnut 
              data={priorityChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } } }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

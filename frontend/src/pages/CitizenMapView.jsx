import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../hooks/useToast';
import L from 'leaflet';
import { Search, Filter, Layers, MapPin, Eye } from 'lucide-react';

const CitizenMapView = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Map state
  const [issueFilter, setIssueFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchLocationQuery, setSearchLocationQuery] = useState('');
  
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(L.layerGroup());

  // Fetch public complaints (privacy safe, rounded coordinates)
  const fetchPublicComplaints = async () => {
    try {
      const res = await api.get('/complaints/?public=true');
      setComplaints(res.data.results || res.data || []);
    } catch (err) {
      showToast("Failed to load map data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicComplaints();
  }, []);

  // Initialize Map
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([12.9716, 77.5946], 12);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);

      markersLayerRef.current.addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Custom categoric emoji div markers
  const getEmojiIcon = (issueType) => {
    let emoji = '📍';
    const lower = issueType.toLowerCase();
    
    if (lower.includes('garbage') || lower.includes('waste')) emoji = '🗑️';
    else if (lower.includes('pothole') || lower.includes('road')) emoji = '🕳️';
    else if (lower.includes('light') || lower.includes('pole') || lower.includes('wire')) emoji = '💡';
    else if (lower.includes('water') || lower.includes('leak') || lower.includes('pipe')) emoji = '💧';
    else if (lower.includes('traffic') || lower.includes('signal')) emoji = '🚦';
    else if (lower.includes('park') || lower.includes('garden') || lower.includes('tree')) emoji = '🌳';
    else if (lower.includes('manhole') || lower.includes('drain')) emoji = '🕳️';

    return L.divIcon({
      html: `<div class="flex items-center justify-center bg-white border border-primary/20 w-8 h-8 rounded-full shadow-md text-base hover:scale-110 transition-transform">${emoji}</div>`,
      className: 'custom-div-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });
  };

  // Re-draw markers when filters or complaints list change
  useEffect(() => {
    if (!mapRef.current) return;
    
    // Clear old markers
    markersLayerRef.current.clearLayers();

    // Filter complaints
    const filtered = complaints.filter(c => {
      const matchIssue = issueFilter ? c.issue_type === issueFilter : true;
      const matchPriority = priorityFilter ? c.priority === priorityFilter : true;
      const matchStatus = statusFilter ? c.status === statusFilter : true;
      return matchIssue && matchPriority && matchStatus;
    });

    // Populate new markers
    filtered.forEach(c => {
      if (c.latitude && c.longitude) {
        const marker = L.marker([c.latitude, c.longitude], {
          icon: getEmojiIcon(c.issue_type)
        });

        // Set popup content
        const statusBadgeClass = c.status === 'resolved' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800';
        
        const popupContent = `
          <div class="p-1 font-sans text-slate-800 space-y-2">
            <div class="flex justify-between items-center gap-2 border-b border-primary/5 pb-1.5">
              <span class="text-[10px] font-bold text-slate-400 font-mono">${c.complaint_id}</span>
              <span class="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${statusBadgeClass}">${c.status}</span>
            </div>
            <h4 class="font-bold text-primary font-heading text-xs mt-1.5">${c.title || c.issue_type}</h4>
            <p className="text-[10px] text-slate-500 line-clamp-2">${c.description}</p>
            <div class="text-[9px] text-slate-500 font-semibold flex items-center gap-1 mt-1">
              <span>📍 Approximate Address:</span>
              <span class="truncate max-w-[150px]">${c.address}, ${c.city}</span>
            </div>
            <div class="pt-2 border-t border-primary/5 text-right">
              <a href="/complaint/${c.id}" class="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline">
                Track Issue Details →
              </a>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        markersLayerRef.current.addLayer(marker);
      }
    });

  }, [complaints, issueFilter, priorityFilter, statusFilter]);

  // Center map on location search (using OSM free Nominatim Search API)
  const handleLocationSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchLocationQuery.trim()) return;

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchLocationQuery)}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'CivicFixApp/1.0' } });
      const data = await res.json();

      if (data && data.length > 0) {
        const topResult = data[0];
        const lat = parseFloat(topResult.lat);
        const lon = parseFloat(topResult.lon);
        
        mapRef.current.setView([lat, lon], 14);
        showToast(`Centered map on: ${topResult.display_name.split(',')[0]}`, "success");
      } else {
        showToast("Location not found. Try adding city details.", "warning");
      }
    } catch (err) {
      showToast("Location lookup failed.", "error");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans h-full flex flex-col">
      <div className="shrink-0">
        <h2 className="font-heading text-3xl font-bold text-primary">Public Issue Map</h2>
        <p className="text-slate-500 text-sm mt-1">
          Explore civic issues reported nearby. Coordinates are approximated to protect citizen privacy.
        </p>
      </div>

      {/* Map Search and Filter HUD */}
      <div className="card-cream space-y-4 shrink-0">
        <form onSubmit={handleLocationSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search area or landmark (e.g. Marathahalli, Bengaluru)..."
              className="form-input pl-10"
              value={searchLocationQuery}
              onChange={(e) => setSearchLocationQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary">
            Go to Area
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <select
              className="form-select py-1.5 text-xs"
              value={issueFilter}
              onChange={(e) => setIssueFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="Garbage Accumulation">Garbage Accumulation</option>
              <option value="Road Pothole">Road Pothole</option>
              <option value="Broken Streetlight">Broken Streetlight</option>
              <option value="Water Leakage">Water Leakage</option>
              <option value="Broken Traffic Signal">Broken Traffic Signal</option>
              <option value="Open Manhole/Drain">Open Manhole</option>
              <option value="Other Civic Issue">Other Issues</option>
            </select>
          </div>

          <div>
            <select
              className="form-select py-1.5 text-xs"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>

          <div>
            <select
              className="form-select py-1.5 text-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="grow h-[450px] border border-primary/5 rounded-2xl overflow-hidden shadow-md relative z-10">
        {loading && (
          <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center gap-2 z-20">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
            <span className="text-xs text-slate-400">Loading map markers...</span>
          </div>
        )}
        <div ref={mapContainerRef} className="h-full w-full" />
      </div>
    </div>
  );
};

export default CitizenMapView;

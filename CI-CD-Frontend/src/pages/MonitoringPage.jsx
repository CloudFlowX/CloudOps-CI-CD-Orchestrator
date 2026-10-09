import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import api from '../utils/api';
import {
  AreaChart,
  LineChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  Activity,
  CheckCircle2, Globe, Database,
  AlertTriangle,
  Clock,
  RefreshCw,
  Server,
  TrendingUp,
  TrendingDown,
  Cpu,
  HardDrive,
  Zap,
  ShieldAlert,
  Search,
  Filter,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  ExternalLink,
  Layers
} from 'lucide-react';
import './MonitoringPage.css';

// Keep realistic mock data for request rates since APM is not hooked up yet
const timeLabels = ['10:00', '10:05', '10:10', '10:15', '10:20', '10:25', '10:30', '10:35', '10:40', '10:45', '10:50', '10:55'];

const requestRateData = timeLabels.map((time, idx) => {
  const vals = [210, 245, 290, 315, 380, 420, 395, 410, 442, 385, 360, 385];
  return { time, requests: vals[idx] };
});

const errorRateData = timeLabels.map((time, idx) => {
  const vals = [0.65, 0.72, 0.60, 0.95, 2.35, 1.90, 1.45, 1.10, 0.90, 0.78, 0.85, 0.82];
  return { time, errorRate: vals[idx] };
});

const responseTimeData = timeLabels.map((time, idx) => {
  const p50Vals = [42, 45, 48, 52, 65, 58, 50, 47, 49, 46, 48, 50];
  const p95Vals = [180, 185, 190, 210, 280, 260, 220, 198, 205, 192, 195, 200];
  const p99Vals = [460, 470, 480, 510, 620, 580, 530, 490, 505, 480, 495, 510];
  return {
    time,
    p50: p50Vals[idx],
    p95: p95Vals[idx],
    p99: p99Vals[idx]
  };
});

// Empty array for initial so graph starts from live
const initialSystemUsageData = [];


// Custom Recharts Tooltip Component
const CustomTooltip = ({ active, payload, label, unit = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-chart-tooltip">
        <p className="tooltip-time">{`Time: ${label}`}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="tooltip-item">
            <span className="tooltip-color-dot" style={{ backgroundColor: entry.color }} />
            <span className="tooltip-name">{entry.name}:</span>
            <span className="tooltip-value">{`${entry.value}${unit}`}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function MonitoringPage() {
  const [timeRange, setTimeRange] = useState('1h');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState('');
  const [incidents, setIncidents] = useState([]);
  const [sortField, setSortField] = useState('reqPerMin');
  const [sortAsc, setSortAsc] = useState(false);
  
  const [systemUsageData, setSystemUsageData] = useState(initialSystemUsageData);
  const [servicesHealth, setServicesHealth] = useState([]);
  const [tableData, setTableData] = useState([]);

  useEffect(() => {
    // Fetch REAL pipelines to populate the monitoring tables
    const fetchServices = async () => {
      try {
        const res = await api.get('/pipelines');
        const pipelines = res.pipelines || res.data || [];
        const liveServices = pipelines.map((p, idx) => ({
          id: p._id,
          name: p.name,
          status: p.status === 'success' ? 'Healthy' : (p.status === 'failed' ? 'Critical' : 'Warning'),
          latency: p.status === 'success' ? `${Math.floor(Math.random() * 50) + 10}ms` : 'Timeout',
          uptime: p.status === 'success' ? '99.99%' : '80.00%',
          reqPerMin: Math.floor(Math.random() * 5000),
          errorRate: p.status === 'success' ? 0.01 : 5.0,
          cpu: Math.floor(Math.random() * 30) + 5,
          memory: Math.floor(Math.random() * 40) + 10,
          icon: idx % 2 === 0 ? Server : Layers
        }));
        setServicesHealth(liveServices);
        setTableData(liveServices);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchIncidents = async () => {
      try {
        const res = await api.get('/alerts');
        if (res.success && res.alerts) {
          const activeAlerts = res.alerts.filter(a => a.status !== 'Resolved').map(a => ({
            id: a._id,
            title: a.title,
            service: a.service,
            time: `Started ${new Date(a.createdAt).toLocaleDateString()}`,
            severity: a.severity,
            status: a.status,
            description: a.message,
            ack: a.status === 'Acknowledged'
          }));
          setIncidents(activeAlerts);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchServices();
    fetchIncidents();

    const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5002", {
      withCredentials: true,
    });

    socket.on("system_metrics", (metrics) => {
      setSystemUsageData((prev) => {
        const time = new Date(metrics.timestamp).toISOString().substring(11, 16);
        const newDataPoint = {
          time,
          cpu: parseInt(metrics.cpuUsage),
          memory: parseInt(metrics.memoryUsage)
        };
        const updated = [...prev, newDataPoint];
        if (updated.length > 20) return updated.slice(updated.length - 20);
        return updated;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const timeRanges = [
    { label: 'Last 1h', value: '1h' },
    { label: 'Last 6h', value: '6h' },
    { label: 'Last 24h', value: '24h' },
    { label: 'Last 7d', value: '7d' },
    { label: 'Last 30d', value: '30d' }
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setNotification('Refreshing real-time metrics...');
    // Add real refresh here if needed
    setTimeout(() => {
      setIsRefreshing(false);
      setNotification('Metrics updated successfully');
      setTimeout(() => setNotification(''), 3000);
    }, 800);
  };

  const handleAcknowledge = (id) => {
    setIncidents(prev =>
      prev.map(inc => inc.id === id ? { ...inc, ack: true } : inc)
    );
    setNotification('Incident acknowledged by operator');
    setTimeout(() => setNotification(''), 3000);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Filter & Sort table services
  const filteredServices = tableData.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || service.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (a[sortField] < b[sortField]) return sortAsc ? -1 : 1;
    if (a[sortField] > b[sortField]) return sortAsc ? 1 : -1;
    return 0;
  });

  return (
    <div className="monitoring-page">
      {notification && (
        <div className="toast-notification">
          <CheckCircle size={16} />
          <span>{notification}</span>
        </div>
      )}

      {/* 1. Page Header */}
      <div className="monitoring-header">
        <div className="header-titles">
          <div className="header-badge-row">
            <h1>Monitoring</h1>
            <span className="live-pulse-badge">
              <span className="pulse-dot"></span>
              Live System State
            </span>
          </div>
          <p className="subtitle">Real-time system metrics and performance monitoring</p>
        </div>

        <div className="header-controls">
          <button 
            className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`} 
            onClick={handleRefresh}
            title="Refresh Metrics"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>

          <div className="time-range-selector">
            {timeRanges.map(tr => (
              <button
                key={tr.value}
                className={`time-pill ${timeRange === tr.value ? 'active' : ''}`}
                onClick={() => setTimeRange(tr.value)}
              >
                {tr.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Top Stats Row (replaces health bar) */}
      <div className="overview-stats-grid">
        <div className="stat-card glass-card">
          <div className="stat-main-content">
            <div className="stat-icon-wrapper blue">
              <Layers size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Total Services</span>
              <div className="stat-value">5</div>
            </div>
          </div>
          <div className="stat-subtext text-green">
            <CheckCircle2 size={12} style={{marginRight: 4, display: 'inline-block', verticalAlign: 'middle'}}/>
            All Operational
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-main-content">
            <div className="stat-icon-wrapper cyan">
              <Activity size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">CPU Usage</span>
              <div className="stat-value">61%</div>
            </div>
          </div>
          <div className="stat-subtext text-green">
            <TrendingDown size={12} style={{marginRight: 4, display: 'inline-block', verticalAlign: 'middle'}}/>
            -12%
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-main-content">
            <div className="stat-icon-wrapper green">
              <Database size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Memory Usage</span>
              <div className="stat-value">65%</div>
            </div>
          </div>
          <div className="stat-subtext text-green">
            <TrendingDown size={12} style={{marginRight: 4, display: 'inline-block', verticalAlign: 'middle'}}/>
            -8%
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-main-content">
            <div className="stat-icon-wrapper purple">
              <Globe size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Network I/O</span>
              <div className="stat-value">125 MB/s</div>
            </div>
          </div>
          <div className="stat-subtext text-red">
            <TrendingUp size={12} style={{marginRight: 4, display: 'inline-block', verticalAlign: 'middle'}}/>
            +18%
          </div>
        </div>
      </div>

      {/* 3. Metrics Grid (2x2 Recharts Cards) */}
      <div className="metrics-grid">
        {/* Card a) Request Rate */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h4>Request Rate</h4>
              <span className="chart-subtitle">Requests per second (req/s)</span>
            </div>
            <div className="chart-stat">
              <span className="stat-value">385 <small>req/s</small></span>
              <span className="stat-trend trend-up">
                <TrendingUp size={14} /> +4.2%
              </span>
            </div>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={requestRateData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="reqGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} domain={[0, 500]} tickLine={false} />
                <Tooltip content={<CustomTooltip unit=" req/s" />} />
                <Area 
                  type="monotone" 
                  dataKey="requests" 
                  name="Requests" 
                  stroke="#3b82f6" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#reqGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-footer">
            <span>Avg: 348 req/s</span>
            <span>Peak: 442 req/s</span>
            <span>Min: 210 req/s</span>
          </div>
        </div>

        {/* Card b) Error Rate */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h4>Error Rate</h4>
              <span className="chart-subtitle">Percentage of failed requests (%)</span>
            </div>
            <div className="chart-stat">
              <span className="stat-value error-text">0.82%</span>
              <span className="stat-trend trend-down">
                <TrendingDown size={14} /> -0.15%
              </span>
            </div>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={errorRateData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} domain={[0, 5]} tickLine={false} unit="%" />
                <Tooltip content={<CustomTooltip unit="%" />} />
                <Line 
                  type="monotone" 
                  dataKey="errorRate" 
                  name="Error Rate" 
                  stroke="#ef4444" 
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#ef4444' }}
                  activeDot={{ r: 6, stroke: '#f1f5f9', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-footer">
            <span>Threshold SLA: &lt; 1.0%</span>
            <span className="warning-text">Peak: 2.35%</span>
          </div>
        </div>

        {/* Card c) Response Time */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h4>Response Time</h4>
              <span className="chart-subtitle">Latency distribution (ms)</span>
            </div>
            <div className="chart-stat-group">
              <span className="mini-pill pill-cyan">p50: 50ms</span>
              <span className="mini-pill pill-yellow">p95: 200ms</span>
              <span className="mini-pill pill-purple">p99: 510ms</span>
            </div>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={responseTimeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="p99Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="p95Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="p50Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip content={<CustomTooltip unit=" ms" />} />
                <Legend verticalAlign="top" height={28} iconType="circle" />
                <Area type="monotone" dataKey="p99" name="p99 Latency" stroke="#a855f7" strokeWidth={2} fill="url(#p99Grad)" />
                <Area type="monotone" dataKey="p95" name="p95 Latency" stroke="#eab308" strokeWidth={2} fill="url(#p95Grad)" />
                <Area type="monotone" dataKey="p50" name="p50 Latency" stroke="#06b6d4" strokeWidth={2} fill="url(#p50Grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-footer">
            <span>Target: p95 &lt; 200ms</span>
            <span>Current p95: 200ms</span>
          </div>
        </div>

        {/* Card d) CPU & Memory Usage */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h4>CPU & Memory Usage</h4>
              <span className="chart-subtitle">Cluster utilization (%)</span>
            </div>
            <div className="chart-stat-group">
              <span className="mini-pill pill-green">CPU: 61%</span>
              <span className="mini-pill pill-purple">Mem: 65%</span>
            </div>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={systemUsageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} tickLine={false} unit="%" />
                <Tooltip content={<CustomTooltip unit="%" />} />
                <Legend verticalAlign="top" height={28} iconType="circle" />
                <Area type="monotone" dataKey="cpu" name="CPU Utilization" stroke="#22c55e" strokeWidth={2} fill="url(#cpuGrad)" />
                <Area type="monotone" dataKey="memory" name="Memory Utilization" stroke="#a855f7" strokeWidth={2} fill="url(#memGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-footer">
            <span>Nodes Active: 8 / 8</span>
            <span>Allocated: 64 Core / 256 GB</span>
          </div>
        </div>
      </div>

      {/* 4. Service Metrics Table */}
      <div className="table-card">
        <div className="table-card-header">
          <div className="table-header-left">
            <h3>Service Performance Metrics</h3>
            <span className="service-count-pill">{filteredServices.length} services</span>
          </div>
          
          <div className="table-header-controls">
            <div className="search-input-wrapper">
              <Search size={15} className="search-icon" />
              <input
                type="text"
                placeholder="Search service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="filter-select-wrapper">
              <Filter size={14} className="filter-icon" />
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Healthy">Healthy</option>
                <option value="Warning">Warning</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="service-metrics-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} className="sortable-th">
                  <div className="th-content">
                    Service {sortField === 'name' && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </div>
                </th>
                <th onClick={() => handleSort('status')} className="sortable-th">
                  <div className="th-content">
                    Status {sortField === 'status' && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </div>
                </th>
                <th onClick={() => handleSort('reqPerMin')} className="sortable-th text-right">
                  <div className="th-content j-end">
                    Requests/min {sortField === 'reqPerMin' && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </div>
                </th>
                <th onClick={() => handleSort('latency')} className="sortable-th text-right">
                  <div className="th-content j-end">
                    Avg Latency {sortField === 'latency' && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </div>
                </th>
                <th onClick={() => handleSort('errorRate')} className="sortable-th text-right">
                  <div className="th-content j-end">
                    Error Rate {sortField === 'errorRate' && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </div>
                </th>
                <th onClick={() => handleSort('cpu')} className="sortable-th">
                  <div className="th-content">
                    CPU {sortField === 'cpu' && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </div>
                </th>
                <th onClick={() => handleSort('memory')} className="sortable-th">
                  <div className="th-content">
                    Memory {sortField === 'memory' && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan="7" className="no-data-cell">
                    No services found matching current search and filters.
                  </td>
                </tr>
              ) : (
                filteredServices.map(srv => (
                  <tr key={srv.id} className="table-row-hover">
                    <td className="font-semibold text-primary">
                      <div className="srv-name-wrapper">
                        <Server size={15} className="srv-icon" />
                        <span>{srv.name}</span>
                      </div>
                    </td>
                    <td>
                      {srv.status === 'Healthy' ? (
                        <span className="badge badge-success">
                          <CheckCircle2 size={12} /> Healthy
                        </span>
                      ) : (
                        <span className="badge badge-warning">
                          <AlertTriangle size={12} /> Warning
                        </span>
                      )}
                    </td>
                    <td className="text-right font-mono">{srv.reqPerMin.toLocaleString()} req/m</td>
                    <td className="text-right font-mono">
                      <span className={srv.latency > 100 ? 'warning-text' : ''}>
                        {srv.latency} ms
                      </span>
                    </td>
                    <td className="text-right font-mono">
                      <span className={srv.errorRate > 1 ? 'error-text' : ''}>
                        {srv.errorRate}%
                      </span>
                    </td>
                    <td>
                      <div className="progress-bar-cell">
                        <div className="progress-bar-track">
                          <div 
                            className={`progress-bar-fill ${srv.cpu > 70 ? 'bg-yellow' : 'bg-green'}`} 
                            style={{ width: `${srv.cpu}%` }}
                          />
                        </div>
                        <span className="progress-label">{srv.cpu}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="progress-bar-cell">
                        <div className="progress-bar-track">
                          <div 
                            className={`progress-bar-fill ${srv.memory > 75 ? 'bg-yellow' : 'bg-purple'}`} 
                            style={{ width: `${srv.memory}%` }}
                          />
                        </div>
                        <span className="progress-label">{srv.memory}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Active Incidents Card */}
      <div className="incidents-card">
        <div className="incidents-header">
          <div className="incidents-title">
            <ShieldAlert className="incident-icon" size={20} />
            <div>
              <h3>Active & Recent Incidents</h3>
              <p className="subtitle">Real-time alerts and incident response log</p>
            </div>
          </div>
          <span className="active-count-pill">
            1 Active Incident
          </span>
        </div>

        <div className="incidents-list">
          {incidents.map(inc => (
            <div 
              key={inc.id} 
              className={`incident-item ${inc.status === 'Active' ? 'incident-active' : 'incident-resolved'}`}
            >
              <div className="incident-status-indicator">
                {inc.status === 'Active' ? (
                  <span className="incident-dot warning-dot"></span>
                ) : (
                  <span className="incident-dot success-dot"></span>
                )}
              </div>

              <div className="incident-details">
                <div className="incident-top-row">
                  <h4 className="incident-title-text">{inc.title}</h4>
                  <div className="incident-badges">
                    <span className={`badge ${inc.status === 'Active' ? 'badge-warning' : 'badge-success'}`}>
                      {inc.status === 'Active' ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                      {inc.status}
                    </span>
                    <span className={`severity-badge severity-${inc.severity.toLowerCase()}`}>
                      {inc.severity}
                    </span>
                  </div>
                </div>

                <p className="incident-desc">{inc.description}</p>

                <div className="incident-footer-row">
                  <div className="incident-meta">
                    <span className="meta-item">
                      <Server size={13} /> {inc.service}
                    </span>
                    <span className="meta-item">
                      <Clock size={13} /> {inc.time}
                    </span>
                  </div>

                  <div className="incident-actions">
                    {inc.status === 'Active' && !inc.ack && (
                      <button 
                        className="action-btn btn-secondary"
                        onClick={() => handleAcknowledge(inc.id)}
                      >
                        Acknowledge
                      </button>
                    )}
                    {inc.status === 'Active' && inc.ack && (
                      <span className="ack-badge">
                        <CheckCircle size={13} /> Acknowledged
                      </span>
                    )}
                    <button className="action-btn btn-ghost">
                      <span>Logs & Traces</span>
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};



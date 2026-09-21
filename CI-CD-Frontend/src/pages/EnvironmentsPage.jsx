import React, { useState, useEffect } from 'react';
import {
  Server,
  Plus,
  Activity,
  Globe,
  Cpu,
  HardDrive,
  Clock,
  Layers,
  Settings,
  Terminal,
  Sliders,
  Eye,
  EyeOff,
  Copy,
  Check,
  Edit,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  TrendingUp,
  X,
  Key,
  Database,
  Lock,
  Cloud,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import './EnvironmentsPage.css';

import api from '../utils/api';

export default function EnvironmentsPage() {
  const [environments, setEnvironments] = useState([]);
  const [envVars, setEnvVars] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Forms state
  const [envFormData, setEnvFormData] = useState({ name: '', provider: 'AWS', region: 'us-east-1', clusterName: '' });
  const [varFormData, setVarFormData] = useState({ key: '', value: '', scope: 'Local', masked: false, environmentId: '' });
  const [submitting, setSubmitting] = useState(false);
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [providerFilter, setProviderFilter] = useState('All');
  const [varSearchQuery, setVarSearchQuery] = useState('');
  const [selectedEnvFilter, setSelectedEnvFilter] = useState('All');

  // Secret visibility & copying
  const [visibleVars, setVisibleVars] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'createEnv', 'configure', 'logs', 'scale', 'editVar', 'createVar'
  const [selectedModalData, setSelectedModalData] = useState(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    // Basic toast, currently using just message, but can be expanded
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleCreateEnvironment = async () => {
    if (!envFormData.name || !envFormData.region) {
      showToast('Name and Region are required', 'error');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/environments', envFormData);
      showToast('Environment created successfully');
      fetchEnvironments();
      closeModal();
    } catch (err) {
      showToast(err.message || 'Failed to create environment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateVariable = async () => {
    if (!varFormData.key || !varFormData.value || !varFormData.environmentId) {
      showToast('Environment, Key, and Value are required', 'error');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/environments/vars', varFormData);
      showToast('Secret created successfully');
      fetchEnvironments();
      closeModal();
    } catch (err) {
      showToast(err.message || 'Failed to add secret', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchEnvironments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/environments');
      const realEnvs = res.environments || [];
      
      const pipeRes = await api.get('/pipelines');
      const pipelines = pipeRes.pipelines || [];
      
      const livePipelinesAsEnvs = pipelines
        .filter(p => p.deployedUrl)
        .map(p => ({
          _id: p._id,
          name: p.name,
          provider: 'AWS',
          region: p.cloudAccount?.region || 'ap-south-1',
          status: p.status === 'success' ? 'Healthy' : 'Offline',
          servicesCount: 1,
          cpuUsage: Math.floor(Math.random() * 20) + 1,
          memUsage: Math.floor(Math.random() * 40) + 20,
          lastDeployment: new Date(p.updatedAt).toLocaleString(),
          deploymentStatus: p.status,
          clusterName: p.deployedUrl,
          instances: p.ec2InstanceId || '1 node',
          deployedUrl: p.deployedUrl
        }));

      setEnvironments([...realEnvs, ...livePipelinesAsEnvs]);
      
      const varsRes = await api.get('/environments/vars');
      setEnvVars(varsRes.envVars || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load environments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnvironments();
  }, []);

  // Filtered environments
  const filteredEnvironments = environments.filter((env) => {
    const matchesSearch = env.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          env.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          env.provider.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || env.status === statusFilter;
    const matchesProvider = providerFilter === 'All' || env.provider === providerFilter;
    return matchesSearch && matchesStatus && matchesProvider;
  });

  // Filtered env vars
  const filteredEnvVars = envVars.filter((v) => {
    const matchesQuery = v.key.toLowerCase().includes(varSearchQuery.toLowerCase()) ||
                         v.scope.toLowerCase().includes(varSearchQuery.toLowerCase());
    const matchesEnv = selectedEnvFilter === 'All' || 
                       v.scope.toLowerCase().includes(selectedEnvFilter.toLowerCase()) || 
                       v.scope === 'Global' || 
                       v.scope === 'All Environments';
    return matchesQuery && matchesEnv;
  });

  // Env stats summary
  const totalEnvs = environments.length;
  const healthyCount = environments.filter(e => e.status === 'Healthy').length;
  const degradedCount = environments.filter(e => e.status === 'Degraded').length;
  const offlineCount = environments.filter(e => e.status === 'Offline').length;
  const totalServices = environments.reduce((sum, e) => sum + e.servicesCount, 0);

  // Toggle secret visibility
  const toggleVisibility = (id) => {
    setVisibleVars(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Copy to clipboard helper
  const handleCopyValue = (key, value) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    showToast(`Copied ${key} to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Handle Action Modals
  const openModal = (type, data = null) => {
    setActiveModal(type);
    setSelectedModalData(data);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedModalData(null);
    // Reset forms
    setEnvFormData({ name: '', provider: 'AWS', region: 'us-east-1', clusterName: '' });
    setVarFormData({ key: '', value: '', scope: 'Local', masked: false, environmentId: '' });
  };

  // Helper for provider badges
  const renderProviderBadge = (provider) => {
    let colorClass = 'provider-aws';
    if (provider === 'Azure') colorClass = 'provider-azure';
    if (provider === 'GCP') colorClass = 'provider-gcp';
    return (
      <span className={`provider-badge ${colorClass}`}>
        <Cloud className="provider-icon" size={12} />
        {provider}
      </span>
    );
  };

  // Helper for status badge
  const renderStatusBadge = (status) => {
    let icon = <CheckCircle2 size={13} className="status-icon green" />;
    let statusClass = 'status-healthy';
    if (status === 'Degraded') {
      icon = <AlertTriangle size={13} className="status-icon yellow" />;
      statusClass = 'status-degraded';
    } else if (status === 'Offline') {
      icon = <XCircle size={13} className="status-icon gray" />;
      statusClass = 'status-offline';
    }

    return (
      <div className={`status-pill ${statusClass}`}>
        <span className="status-dot"></span>
        {icon}
        <span className="status-text">{status}</span>
      </div>
    );
  };

  return (
    <div className="environments-container">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="toast-notification">
          <CheckCircle2 size={16} className="toast-icon" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div className="header-title-group">
          <div className="header-icon-wrapper">
            <Server size={26} className="header-main-icon" />
          </div>
          <div>
            <h1 className="page-title">Environments</h1>
            <p className="page-subtitle">Configure, scale and manage infrastructure deployment targets</p>
          </div>
        </div>

        <div className="header-actions">
          <button 
            className="btn btn-primary btn-create"
            onClick={() => openModal('createEnv')}
          >
            <Plus size={18} />
            <span>Create Environment</span>
          </button>
        </div>
      </div>

      {/* Stats Quick Overview Bar */}
      <div className="overview-stats-grid">
        <div className="stat-card glass-card">
          <div className="stat-card-header">
            <span className="stat-label">Total Environments</span>
            <div className="stat-icon-wrapper blue">
              <Server size={20} />
            </div>
          </div>
          <div className="stat-value">{totalEnvs}</div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-card-header">
            <span className="stat-label">Healthy Systems</span>
            <div className="stat-icon-wrapper green">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="stat-value text-green">{healthyCount}</div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-card-header">
            <span className="stat-label">Degraded</span>
            <div className="stat-icon-wrapper yellow">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="stat-value">{degradedCount}</div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-card-header">
            <span className="stat-label">Offline</span>
            <div className="stat-icon-wrapper gray">
              <XCircle size={20} />
            </div>
          </div>
          <div className="stat-value">{offlineCount}</div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-card-header">
            <span className="stat-label">Active Microservices</span>
            <div className="stat-icon-wrapper purple">
              <Layers size={20} />
            </div>
          </div>
          <div className="stat-value">{totalServices}</div>
        </div>
      </div>

      {/* Filter and Search Section */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search environments by name, provider or region..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-group">
          <div className="filter-item">
            <Filter size={14} className="env-filter-icon" />
            <span className="filter-label">STATUS:</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Statuses</option>
              <option value="Healthy">Healthy</option>
              <option value="Degraded">Degraded</option>
              <option value="Offline">Offline</option>
            </select>
          </div>

          <div className="filter-item">
            <Cloud size={14} className="env-filter-icon" />
            <span className="filter-label">CLOUD:</span>
            <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)}>
              <option value="All">All Cloud Providers</option>
              <option value="AWS">AWS</option>
              <option value="Azure">Azure</option>
              <option value="GCP">GCP</option>
            </select>
          </div>
        </div>
      </div>

      {/* Environment Cards Grid (3 Columns) */}
      <div className="section-title-wrapper">
        <h2 className="section-title">
          <Server size={18} className="section-icon" />
          Active Environments ({filteredEnvironments.length})
        </h2>
      </div>

      <div className="environments-grid">
        {loading ? (
          <div className="empty-state">
            <div className="spin" style={{ color: 'var(--accent-blue)', marginBottom: '10px' }}>
              <RefreshCw size={24} />
            </div>
            <h3>Loading Environments...</h3>
          </div>
        ) : filteredEnvironments.length === 0 ? (
          <div className="empty-state">
            <Server size={40} className="empty-icon" />
            <h3>No environments found</h3>
            <p>Try clearing your search query or filters to view environments.</p>
            <button 
              className="btn btn-secondary"
              onClick={() => { setSearchQuery(''); setStatusFilter('All'); setProviderFilter('All'); }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredEnvironments.map((env) => {
            const statusBorderClass = `border-${env.status.toLowerCase()}`;
            return (
              <div key={env._id || env.id} className={`env-card ${statusBorderClass}`}>
                {/* Header of Environment Card */}
                <div className="card-header">
                  <div className="env-title-row">
                    <h3 className="env-name">{env.name}</h3>
                    {renderStatusBadge(env.status)}
                  </div>
                  
                  <div className="env-meta-tags">
                    {renderProviderBadge(env.provider)}
                    <span className="region-tag">
                      <Globe size={12} />
                      {env.region}
                    </span>
                  </div>
                </div>

                {/* Card Main Metrics */}
                <div className="card-body">
                  <div className="metric-row">
                    <div className="metric-item">
                      <span className="metric-label">
                        <Layers size={13} />
                        Services
                      </span>
                      <span className="metric-value">{env.servicesCount} Running</span>
                    </div>

                    <div className="metric-item">
                      <span className="metric-label">
                        <Clock size={13} />
                        Last Deploy
                      </span>
                      <span className="metric-value highlight">{env.lastDeployment}</span>
                    </div>
                  </div>

                  {/* Resource Usage Bars */}
                  <div className="resource-bars">
                    {/* CPU Usage */}
                    <div className="progress-group">
                      <div className="progress-header">
                        <span className="progress-label">
                          <Cpu size={13} /> CPU Usage
                        </span>
                        <span className={`progress-percentage ${env.cpuUsage > 80 ? 'high-load' : ''}`}>
                          {env.cpuUsage}%
                        </span>
                      </div>
                      <div className="progress-track">
                        <div
                          className={`progress-fill ${env.cpuUsage > 80 ? 'warning' : 'normal'}`}
                          style={{ width: `${env.cpuUsage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Memory Usage */}
                    <div className="progress-group">
                      <div className="progress-header">
                        <span className="progress-label">
                          <HardDrive size={13} /> Memory Usage
                        </span>
                        <span className={`progress-percentage ${env.memUsage > 80 ? 'high-load' : ''}`}>
                          {env.memUsage}%
                        </span>
                      </div>
                      <div className="progress-track">
                        <div
                          className={`progress-fill ${env.memUsage > 80 ? 'warning' : 'normal-cyan'}`}
                          style={{ width: `${env.memUsage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Additional info badge */}
                  <div className="env-cluster-info">
                    <span className="cluster-name">{env.clusterName}</span>
                    <span className="instances-count">{env.instances}</span>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="card-actions">
                  <button 
                    className="action-btn"
                    title="Configure environment settings"
                    onClick={() => openModal('configure', env)}
                  >
                    <Settings size={14} />
                    <span>Configure</span>
                  </button>

                  <button 
                    className="action-btn"
                    title="View live console logs"
                    onClick={() => openModal('logs', env)}
                  >
                    <Terminal size={14} />
                    <span>View Logs</span>
                  </button>

                  <button 
                    className="action-btn action-btn-accent"
                    title="Scale cluster instances"
                    onClick={() => openModal('scale', env)}
                  >
                    <Sliders size={14} />
                    <span>Scale</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Environment Variables Section */}
      <div className="env-variables-section">
        <div className="section-header-row">
          <div>
            <h2 className="section-title">
              <Lock size={18} className="section-icon" />
              Environment Variables & Secrets
            </h2>
            <p className="section-description">
              Securely store and share environment secrets across deployment targets
            </p>
          </div>

          <div className="env-var-header-actions">
            <div className="var-search-box">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search variables..."
                value={varSearchQuery}
                onChange={(e) => setVarSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="var-scope-select"
              value={selectedEnvFilter}
              onChange={(e) => setSelectedEnvFilter(e.target.value)}
            >
              <option value="All">All Scope Targets</option>
              <option value="Production">Production</option>
              <option value="Staging">Staging</option>
              <option value="Development">Development</option>
              <option value="QA">QA</option>
            </select>

            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => openModal('createVar')}
            >
              <Plus size={14} />
              <span>Add Variable</span>
            </button>
          </div>
        </div>

        {/* Variables Table */}
        <div className="table-wrapper">
          <table className="variables-table">
            <thead>
              <tr>
                <th>Variable Key</th>
                <th>Masked Secret Value</th>
                <th>Target Scope</th>
                <th>Last Modified</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEnvVars.length === 0 ? (
                <tr>
                  <td colSpan="5" className="table-empty">
                    No secrets match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredEnvVars.map((v) => {
                  const isVisible = visibleVars[v.id];
                  const isCopied = copiedKey === v.key;

                  return (
                    <tr key={v._id || v.id}>
                      <td className="var-key-cell">
                        <Key size={14} className="key-icon" />
                        <code>{v.key}</code>
                      </td>

                      <td className="var-value-cell">
                        <div className="secret-display">
                          <code className={`secret-code ${isVisible ? 'revealed' : ''}`}>
                            {isVisible ? v.value : v.masked}
                          </code>
                          <button
                            className="btn-icon-ghost"
                            onClick={() => toggleVisibility(v._id || v.id)}
                            title={isVisible ? "Hide value" : "Reveal value"}
                          >
                            {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </td>

                      <td>
                        <span className="scope-pill">
                          {v.scope}
                        </span>
                      </td>

                      <td className="updated-cell">
                        <Clock size={12} />
                        {v.updatedAt}
                      </td>

                      <td className="text-right">
                        <div className="table-action-group">
                          <button
                            className={`btn-table-action ${isCopied ? 'copied' : ''}`}
                            onClick={() => handleCopyValue(v.key, v.value)}
                            title="Copy to clipboard"
                          >
                            {isCopied ? <Check size={14} /> : <Copy size={14} />}
                            <span>{isCopied ? 'Copied' : 'Copy'}</span>
                          </button>

                          <button
                            className="btn-table-action"
                            onClick={() => openModal('editVar', v)}
                            title="Edit environment variable"
                          >
                            <Edit size={14} />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Modals */}
      {activeModal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {activeModal === 'createEnv' && 'Create New Environment'}
                {activeModal === 'configure' && `Configure ${selectedModalData?.name}`}
                {activeModal === 'logs' && `Console Logs: ${selectedModalData?.name}`}
                {activeModal === 'scale' && `Scale Cluster: ${selectedModalData?.name}`}
                {activeModal === 'editVar' && `Edit Variable: ${selectedModalData?.key}`}
                {activeModal === 'createVar' && 'Add New Secret / Variable'}
              </h3>
              <button className="close-btn" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* CREATE ENVIRONMENT MODAL */}
              {activeModal === 'createEnv' && (
                <div className="form-grid">
                  <div className="form-group">
                    <label>Environment Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Sandbox, Pre-prod" 
                      value={envFormData.name}
                      onChange={(e) => setEnvFormData({...envFormData, name: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Cloud Provider</label>
                    <select 
                      value={envFormData.provider}
                      onChange={(e) => setEnvFormData({...envFormData, provider: e.target.value})}
                    >
                      <option value="AWS">Amazon Web Services (AWS)</option>
                      <option value="Azure">Microsoft Azure</option>
                      <option value="GCP">Google Cloud Platform (GCP)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Region</label>
                    <input 
                      type="text" 
                      placeholder="e.g. us-east-1, westeurope" 
                      value={envFormData.region}
                      onChange={(e) => setEnvFormData({...envFormData, region: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Cluster Name (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. eks-cluster-01" 
                      value={envFormData.clusterName}
                      onChange={(e) => setEnvFormData({...envFormData, clusterName: e.target.value})}
                    />
                  </div>
                </div>
              )}

              {/* CONFIGURE MODAL */}
              {activeModal === 'configure' && (
                <div className="form-grid">
                  <div className="form-group">
                    <label>Cluster ID / Name</label>
                    <input type="text" defaultValue={selectedModalData?.clusterName} />
                  </div>
                  <div className="form-group">
                    <label>Target Region</label>
                    <input type="text" defaultValue={selectedModalData?.region} />
                  </div>
                  <div className="form-group">
                    <label>Auto-Scaling Minimum Nodes</label>
                    <input type="number" defaultValue="2" />
                  </div>
                  <div className="form-group">
                    <label>Auto-Scaling Maximum Nodes</label>
                    <input type="number" defaultValue="10" />
                  </div>
                </div>
              )}

              {/* VIEW LOGS MODAL */}
              {activeModal === 'logs' && (
                <div className="logs-viewer-box">
                  <div className="log-line text-muted">[2026-07-29 21:20:01] INFO [cluster-manager] Initializing node pool sync...</div>
                  <div className="log-line">[2026-07-29 21:20:04] INFO [ingress-controller] Routing rule refreshed for {selectedModalData?.name}</div>
                  <div className="log-line text-success">[2026-07-29 21:21:10] SUCCESS [health-check] All {selectedModalData?.servicesCount} microservices responding with status 200 OK.</div>
                  <div className="log-line">[2026-07-29 21:23:45] METRICS [telemetry] Current CPU: {selectedModalData?.cpuUsage}%, Memory: {selectedModalData?.memUsage}%</div>
                  <div className="log-line text-cyan">[2026-07-29 21:25:12] STREAM [live-tail] Listening for incoming traffic...</div>
                </div>
              )}

              {/* SCALE MODAL */}
              {activeModal === 'scale' && (
                <div className="scale-modal-content">
                  <p className="scale-desc">
                    Adjust the active instance node count for <strong>{selectedModalData?.name}</strong> across {selectedModalData?.region}.
                  </p>
                  <div className="scale-control-box">
                    <label>Replica Service Count</label>
                    <div className="scale-slider-row">
                      <input type="range" min="0" max="30" defaultValue={selectedModalData?.servicesCount} />
                      <span className="scale-num">{selectedModalData?.servicesCount} replicas</span>
                    </div>
                  </div>
                </div>
              )}

              {/* EDIT OR CREATE VAR MODAL */}
              {(activeModal === 'editVar' || activeModal === 'createVar') && (
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Select Environment</label>
                    <select
                      value={varFormData.environmentId}
                      onChange={(e) => setVarFormData({...varFormData, environmentId: e.target.value})}
                    >
                      <option value="">-- Choose Environment --</option>
                      {environments.map(env => (
                        <option key={env._id} value={env._id}>{env.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Variable Key</label>
                    <input 
                      type="text" 
                      placeholder="e.g. DATABASE_URL" 
                      value={varFormData.key} 
                      onChange={(e) => setVarFormData({...varFormData, key: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Scope / Tag</label>
                    <select
                      value={varFormData.scope}
                      onChange={(e) => setVarFormData({...varFormData, scope: e.target.value})}
                    >
                      <option value="Local">Local</option>
                      <option value="Global">Global</option>
                      <option value="Production">Production</option>
                      <option value="Staging">Staging</option>
                    </select>
                  </div>
                  <div className="form-group full-width">
                    <label>Variable Value</label>
                    <input 
                      type="text" 
                      className="font-mono" 
                      placeholder="Enter secret value..."
                      value={varFormData.value}
                      onChange={(e) => setVarFormData({...varFormData, value: e.target.value})}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={varFormData.masked}
                        onChange={(e) => setVarFormData({...varFormData, masked: e.target.checked})}
                      />
                      Mask this value in the dashboard (Sensitive Secret)
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal} disabled={submitting}>Cancel</button>
              {activeModal === 'createEnv' && (
                <button className="btn btn-primary" onClick={handleCreateEnvironment} disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Environment'}
                </button>
              )}
              {activeModal === 'createVar' && (
                <button className="btn btn-primary" onClick={handleCreateVariable} disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Secret'}
                </button>
              )}
              {(activeModal !== 'createEnv' && activeModal !== 'createVar') && (
                <button className="btn btn-primary" onClick={closeModal}>Save Changes</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

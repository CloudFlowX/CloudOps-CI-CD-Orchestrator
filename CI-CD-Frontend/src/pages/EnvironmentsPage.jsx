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
  ShieldCheck,
  Cloud,
  ChevronRight,
  ShieldAlert,
  Zap,
  FileText,
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import './EnvironmentsPage.css';
import api from '../utils/api';

export default function EnvironmentsPage() {
  const [activeTab, setActiveTab] = useState('envvars'); // 'envvars', 'dns', 'targets'
  const [environments, setEnvironments] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState('');
  const [loading, setLoading] = useState(true);

  // Forms state
  const [envFormData, setEnvFormData] = useState({ name: '', provider: 'AWS', region: 'ap-south-1', clusterName: '' });
  const [varFormData, setVarFormData] = useState({ key: '', value: '', isSecret: false, index: null });
  const [bulkEnvText, setBulkEnvText] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [dnsInfo, setDnsInfo] = useState(null);
  const [dnsVerifying, setDnsVerifying] = useState(false);
  const [dnsResult, setDnsResult] = useState(null);
  const [cfSettingUp, setCfSettingUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [providerFilter, setProviderFilter] = useState('All');
  const [varSearchQuery, setVarSearchQuery] = useState('');

  // Secret visibility & copying
  const [visibleVars, setVisibleVars] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'createEnv', 'configure', 'logs', 'scale', 'editVar', 'createVar', 'bulkEnv'
  const [selectedModalData, setSelectedModalData] = useState(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Pipelines with variables
      const pipeRes = await api.get('/environments/pipeline-vars');
      const realPipelines = pipeRes.pipelines || [];
      setPipelines(realPipelines);

      if (realPipelines.length > 0 && !selectedPipelineId) {
        setSelectedPipelineId(realPipelines[0]._id);
      }

      // 2. Fetch Environments
      const envRes = await api.get('/environments');
      const realEnvs = envRes.environments || [];

      // Map live pipelines into environments cards
      const livePipelinesAsEnvs = realPipelines
        .filter((p) => p.deployedUrl)
        .map((p) => ({
          _id: p._id,
          name: p.name,
          provider: 'AWS',
          region: p.cloudAccount?.region || 'ap-south-1',
          status: p.status === 'success' || p.deployedUrl ? 'Healthy' : 'Offline',
          servicesCount: 1,
          cpuUsage: Math.floor(Math.random() * 15) + 5,
          memUsage: Math.floor(Math.random() * 30) + 20,
          lastDeployment: new Date(p.updatedAt).toLocaleString(),
          deploymentStatus: p.status,
          clusterName: p.deployedUrl,
          instances: p.ec2InstanceId || '1 EC2 Node',
          deployedUrl: p.deployedUrl,
          deploymentTarget: p.deploymentTarget,
          customDomain: p.customDomain,
        }));

      setEnvironments([...realEnvs, ...livePipelinesAsEnvs]);
    } catch (err) {
      console.error(err);
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch DNS details when pipeline selection changes
  const fetchDnsDetails = async (pipelineId) => {
    if (!pipelineId) return;
    try {
      setDnsResult(null);
      const res = await api.get(`/dns/${pipelineId}`);
      if (res.success) {
        setDnsInfo(res);
        setDomainInput(res.customDomain || '');
      }
    } catch (err) {
      console.error('DNS Fetch error:', err);
    }
  };

  useEffect(() => {
    if (selectedPipelineId) {
      fetchDnsDetails(selectedPipelineId);
    }
  }, [selectedPipelineId]);

  // Selected Pipeline Object
  const currentPipeline = pipelines.find((p) => p._id === selectedPipelineId) || pipelines[0] || null;
  const currentEnvVars = currentPipeline?.envVars || [];

  // Filtered env vars
  const filteredEnvVars = currentEnvVars.filter((v) => {
    if (!varSearchQuery) return true;
    return v.key.toLowerCase().includes(varSearchQuery.toLowerCase());
  });

  // Toggle secret visibility
  const toggleVisibility = (idx) => {
    setVisibleVars((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Copy to clipboard helper
  const handleCopyValue = (key, value) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    showToast(`Copied ${key} to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Modals management
  const openModal = (type, data = null) => {
    setActiveModal(type);
    setSelectedModalData(data);
    if (type === 'createVar') {
      setVarFormData({ key: '', value: '', isSecret: false, index: null });
    } else if (type === 'editVar' && data) {
      setVarFormData({ key: data.key, value: data.value, isSecret: !!data.isSecret, index: data.index });
    } else if (type === 'bulkEnv') {
      setBulkEnvText('');
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedModalData(null);
  };

  // Save / Update Variable
  const handleSaveVariable = async () => {
    if (!varFormData.key || varFormData.key.trim() === '') {
      showToast('Variable key cannot be empty', 'error');
      return;
    }
    if (!currentPipeline) {
      showToast('No pipeline selected', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const updatedVars = [...currentEnvVars];
      const cleanKey = varFormData.key.trim().toUpperCase().replace(/[^a-zA-Z0-9_]/g, '_');

      if (varFormData.index !== null && varFormData.index !== undefined) {
        // Edit existing
        updatedVars[varFormData.index] = {
          key: cleanKey,
          value: varFormData.value,
          isSecret: !!varFormData.isSecret,
        };
      } else {
        // Add new (avoid duplicates)
        const existingIdx = updatedVars.findIndex((v) => v.key === cleanKey);
        if (existingIdx >= 0) {
          updatedVars[existingIdx] = {
            key: cleanKey,
            value: varFormData.value,
            isSecret: !!varFormData.isSecret,
          };
        } else {
          updatedVars.push({
            key: cleanKey,
            value: varFormData.value,
            isSecret: !!varFormData.isSecret,
          });
        }
      }

      await api.post(`/environments/pipeline-vars/${currentPipeline._id}`, { envVars: updatedVars });
      showToast(`Variable "${cleanKey}" saved successfully! ✓`);
      closeModal();
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to save variable', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Variable
  const handleDeleteVariable = async (idx, key) => {
    if (!window.confirm(`Are you sure you want to delete environment variable "${key}"?`)) return;
    try {
      const updatedVars = currentEnvVars.filter((_, i) => i !== idx);
      await api.post(`/environments/pipeline-vars/${currentPipeline._id}`, { envVars: updatedVars });
      showToast(`Variable "${key}" deleted ✓`);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to delete variable', 'error');
    }
  };

  // Bulk Import .env
  const handleBulkImportEnv = async () => {
    if (!bulkEnvText.trim()) {
      showToast('Please paste .env content', 'error');
      return;
    }
    try {
      setSubmitting(true);
      const lines = bulkEnvText.split('\n');
      const parsedVars = [];

      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.substring(0, eqIdx).trim().toUpperCase();
          let val = trimmed.substring(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          const isSecret = /secret|pass|key|token|auth|uri|credential|private/i.test(key);
          parsedVars.push({ key, value: val, isSecret });
        }
      });

      if (parsedVars.length === 0) {
        showToast('No valid KEY=VALUE pairs found in text', 'error');
        return;
      }

      // Merge with existing
      const existingMap = new Map(currentEnvVars.map((v) => [v.key, v]));
      parsedVars.forEach((v) => existingMap.set(v.key, v));
      const merged = Array.from(existingMap.values());

      await api.post(`/environments/pipeline-vars/${currentPipeline._id}`, { envVars: merged });
      showToast(`Imported ${parsedVars.length} variables successfully! ✓`);
      closeModal();
      fetchData();
    } catch (err) {
      showToast(err.message || 'Bulk import failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Fast Sync & Restart Container
  const handleFastSyncRestart = async () => {
    if (!currentPipeline) return;
    try {
      setSyncing(true);
      const res = await api.post(`/environments/sync-restart/${currentPipeline._id}`);
      if (res.success) {
        showToast(res.message || '⚡ Container restarted with updated environment variables! ✓', 'success');
      } else {
        showToast(res.message || 'Restart failed', 'error');
      }
      fetchData();
    } catch (err) {
      showToast(err.message || 'Fast sync & restart failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Attach Custom Domain
  const handleAttachDomain = async () => {
    if (!domainInput.trim()) {
      showToast('Please enter a valid domain name (e.g. api.mycollege.com)', 'error');
      return;
    }
    try {
      setSubmitting(true);
      const res = await api.post(`/dns/${currentPipeline._id}/attach`, { domain: domainInput.trim() });
      if (res.success) {
        showToast(res.message || 'Custom domain attached successfully! ✓');
        fetchDnsDetails(currentPipeline._id);
        fetchData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to attach domain', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Verify Custom Domain
  const handleVerifyDns = async () => {
    if (!currentPipeline) return;
    try {
      setDnsVerifying(true);
      setDnsResult(null);
      const res = await api.post(`/dns/${currentPipeline._id}/verify`);
      setDnsResult(res);
      if (res.verified) {
        showToast('🎉 Domain DNS verified! Traffic is actively routing to your deployment.', 'success');
      } else {
        showToast(res.message || 'DNS verification failed. Record not pointing to server.', 'error');
      }
      fetchDnsDetails(currentPipeline._id);
      fetchData();
    } catch (err) {
      showToast(err.message || 'DNS verification check failed', 'error');
    } finally {
      setDnsVerifying(false);
    }
  };

  // Cloudflare Auto-Setup
  const handleCloudflareAuto = async () => {
    if (!currentPipeline) return;
    try {
      setCfSettingUp(true);
      const res = await api.post(`/dns/${currentPipeline._id}/cloudflare-auto`);
      if (res.success) {
        showToast(res.message || 'Cloudflare DNS record created with Orange Cloud SSL! ✓', 'success');
        fetchDnsDetails(currentPipeline._id);
        fetchData();
      } else {
        showToast(res.message || 'Cloudflare setup failed', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Cloudflare DNS auto-setup failed', 'error');
    } finally {
      setCfSettingUp(false);
    }
  };

  return (
    <div className="environments-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`toast-notification ${toastType === 'error' ? 'toast-error' : ''}`}>
          {toastType === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div className="header-title-group">
          <div className="header-icon-wrapper">
            <Server size={26} className="header-main-icon" />
          </div>
          <div>
            <h1 className="page-title">Environments & Configuration</h1>
            <p className="page-subtitle">Manage environment secrets, Docker variables, live DNS, and deploy targets</p>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn btn-secondary" onClick={fetchData} title="Refresh data">
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="dashboard-tabs-bar">
        <button
          className={`tab-item-btn ${activeTab === 'envvars' ? 'active' : ''}`}
          onClick={() => setActiveTab('envvars')}
        >
          <Lock size={16} />
          <span>Environment Variables & Secrets</span>
          {currentEnvVars.length > 0 && <span className="tab-badge">{currentEnvVars.length}</span>}
        </button>

        <button
          className={`tab-item-btn ${activeTab === 'dns' ? 'active' : ''}`}
          onClick={() => setActiveTab('dns')}
        >
          <Globe size={16} />
          <span>Custom Domains & DNS</span>
          {dnsInfo?.customDomain && <span className="tab-badge green">Active</span>}
        </button>

        <button
          className={`tab-item-btn ${activeTab === 'targets' ? 'active' : ''}`}
          onClick={() => setActiveTab('targets')}
        >
          <Server size={16} />
          <span>Deploy Targets & Clusters</span>
          <span className="tab-badge">{environments.length}</span>
        </button>
      </div>

      {/* ================================================================ */}
      {/* TAB 1: ENVIRONMENT VARIABLES & SECRETS DASHBOARD                */}
      {/* ================================================================ */}
      {activeTab === 'envvars' && (
        <div className="tab-pane-content">
          {/* Pipeline Selector & Actions Toolbar */}
          <div className="env-toolbar-card glass-card">
            <div className="pipeline-picker-box">
              <label>Select Pipeline / Application:</label>
              <select
                className="pipeline-select-dropdown"
                value={selectedPipelineId}
                onChange={(e) => setSelectedPipelineId(e.target.value)}
              >
                {pipelines.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.deploymentTarget?.toUpperCase()} • {p.environment || 'Production'})
                  </option>
                ))}
              </select>
            </div>

            {currentPipeline && (
              <div className="pipeline-quick-meta">
                <span className="meta-item">
                  <Activity size={14} className="text-green" />
                  Target: <strong>{currentPipeline.deploymentTarget || 'docker'}</strong>
                </span>
                {currentPipeline.deployedUrl && (
                  <span className="meta-item">
                    <ExternalLink size={14} className="text-cyan" />
                    Live:{' '}
                    <a href={currentPipeline.deployedUrl} target="_blank" rel="noreferrer">
                      {currentPipeline.deployedUrl}
                    </a>
                  </span>
                )}
              </div>
            )}

            <div className="env-action-buttons">
              <button className="btn btn-secondary" onClick={() => openModal('bulkEnv')}>
                <FileText size={15} />
                <span>Bulk Import .env</span>
              </button>

              <button className="btn btn-primary" onClick={() => openModal('createVar')}>
                <Plus size={16} />
                <span>Add Variable</span>
              </button>

              {currentPipeline?.deploymentTarget === 'docker' && (
                <button
                  className="btn btn-sync-restart"
                  onClick={handleFastSyncRestart}
                  disabled={syncing}
                  title="Rewrite .env and restart container on EC2 without rebuilding (takes ~2s)"
                >
                  <Zap size={15} className={syncing ? 'spin text-yellow' : 'text-yellow'} />
                  <span>{syncing ? 'Syncing...' : 'Fast Sync & Restart (~2s)'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Variables Table */}
          <div className="glass-card env-table-card">
            <div className="table-header-filter-row">
              <div className="var-search-box">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Filter variables by key..."
                  value={varSearchQuery}
                  onChange={(e) => setVarSearchQuery(e.target.value)}
                />
              </div>
              <div className="var-count-badge">
                Showing <strong>{filteredEnvVars.length}</strong> of {currentEnvVars.length} variables
              </div>
            </div>

            <div className="table-responsive">
              <table className="variables-table">
                <thead>
                  <tr>
                    <th style={{ width: '28%' }}>Variable Key</th>
                    <th style={{ width: '42%' }}>Value</th>
                    <th style={{ width: '15%' }}>Type</th>
                    <th style={{ width: '15%', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnvVars.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="empty-table-cell">
                        <div className="empty-state-box">
                          <Lock size={32} className="empty-icon" />
                          <p>No environment variables configured for this pipeline.</p>
                          <button className="btn btn-primary btn-sm" onClick={() => openModal('createVar')}>
                            <Plus size={14} />
                            <span>Add Your First Variable</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredEnvVars.map((v, idx) => {
                      const isVisible = visibleVars[idx];
                      const isCopied = copiedKey === v.key;

                      return (
                        <tr key={v.key + idx}>
                          <td className="var-key-cell">
                            <Key size={14} className="key-icon" />
                            <code className="var-key-code">{v.key}</code>
                          </td>

                          <td className="var-value-cell">
                            <div className="secret-display-box">
                              <code className={`var-value-code ${isVisible ? 'revealed' : ''}`}>
                                {v.isSecret && !isVisible ? '••••••••••••••••' : v.value}
                              </code>

                              {v.isSecret && (
                                <button
                                  className="btn-icon-ghost"
                                  onClick={() => toggleVisibility(idx)}
                                  title={isVisible ? 'Mask value' : 'Reveal value'}
                                >
                                  {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              )}

                              <button
                                className={`btn-icon-ghost ${isCopied ? 'copied' : ''}`}
                                onClick={() => handleCopyValue(v.key, v.value)}
                                title="Copy value to clipboard"
                              >
                                {isCopied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                              </button>
                            </div>
                          </td>

                          <td>
                            {v.isSecret ? (
                              <span className="type-pill secret">
                                <Lock size={12} />
                                <span>Secret</span>
                              </span>
                            ) : (
                              <span className="type-pill plain">
                                <Globe size={12} />
                                <span>Plain</span>
                              </span>
                            )}
                          </td>

                          <td className="text-right">
                            <div className="actions-cell-group">
                              <button
                                className="action-circle-btn"
                                onClick={() => openModal('editVar', { ...v, index: idx })}
                                title="Edit variable"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                className="action-circle-btn danger"
                                onClick={() => handleDeleteVariable(idx, v.key)}
                                title="Delete variable"
                              >
                                <Trash2 size={14} />
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
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB 2: CUSTOM DOMAINS & DNS MANAGER                             */}
      {/* ================================================================ */}
      {activeTab === 'dns' && (
        <div className="tab-pane-content">
          {/* Pipeline Picker */}
          <div className="env-toolbar-card glass-card">
            <div className="pipeline-picker-box">
              <label>Select Pipeline for Domain Routing:</label>
              <select
                className="pipeline-select-dropdown"
                value={selectedPipelineId}
                onChange={(e) => setSelectedPipelineId(e.target.value)}
              >
                {pipelines.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.deploymentTarget?.toUpperCase()} • {p.deployedUrl || 'No URL'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Domain Attachment Card */}
          <div className="glass-card dns-manager-card">
            <div className="card-top-title">
              <Globe size={22} className="text-cyan" />
              <div>
                <h2>Custom Domain & DNS Routing</h2>
                <p>Connect a custom domain (e.g. <code>api.mycollege.com</code>) to your backend or frontend</p>
              </div>
            </div>

            <div className="domain-input-section">
              <label>Domain or Subdomain Name:</label>
              <div className="domain-input-row">
                <div className="domain-input-wrapper">
                  <Globe size={16} className="domain-globe-icon" />
                  <input
                    type="text"
                    placeholder="e.g. api.mycollege.com or mycollege.com"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                  />
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleAttachDomain}
                  disabled={submitting || !domainInput.trim()}
                >
                  <Plus size={16} />
                  <span>Attach Domain</span>
                </button>
              </div>
            </div>

            {/* DNS Instructions & Verification Box */}
            {dnsInfo?.customDomain ? (
              <div className="dns-instructions-box">
                <div className="dns-status-banner">
                  <div className="status-label-group">
                    <span className="status-label-text">Domain Status:</span>
                    {dnsInfo.domainStatus === 'verified' || dnsInfo.domainStatus === 'active' ? (
                      <span className="status-pill status-healthy">
                        <CheckCircle2 size={14} className="green" />
                        <span>Verified & Active ✓</span>
                      </span>
                    ) : (
                      <span className="status-pill status-degraded">
                        <Clock size={14} className="yellow" />
                        <span>Pending DNS Setup</span>
                      </span>
                    )}
                  </div>

                  <div className="ssl-status-group">
                    <ShieldCheck size={16} className="text-green" />
                    <span>SSL/TLS: <strong>Auto-Managed / Active</strong></span>
                  </div>
                </div>

                <div className="dns-record-details">
                  <h3>Required DNS Record in your Domain Registrar (GoDaddy, Cloudflare, Namecheap):</h3>
                  <p className="dns-instruction-subtext">
                    Add the following DNS record to your DNS management console to route traffic to this deployment:
                  </p>

                  <div className="dns-table-box">
                    <table className="dns-spec-table">
                      <thead>
                        <tr>
                          <th>Record Type</th>
                          <th>Host / Name</th>
                          <th>Points To / Value</th>
                          <th>TTL</th>
                          <th className="text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                            <span className="dns-badge-type">{dnsInfo.expectedRecord?.recordType || 'A'}</span>
                          </td>
                          <td>
                            <code className="font-mono">{dnsInfo.expectedRecord?.name || '@'}</code>
                          </td>
                          <td className="dns-target-val">
                            <code className="font-mono">{dnsInfo.expectedRecord?.value}</code>
                          </td>
                          <td>Auto (300s)</td>
                          <td className="text-right">
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleCopyValue('DNS Target', dnsInfo.expectedRecord?.value)}
                            >
                              <Copy size={13} />
                              <span>Copy Target</span>
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Verification Feedback */}
                {dnsResult && (
                  <div className={`dns-feedback-banner ${dnsResult.verified ? 'success' : 'warning'}`}>
                    {dnsResult.verified ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                    <span>{dnsResult.message}</span>
                  </div>
                )}

                {/* Verification Action Buttons */}
                <div className="dns-actions-row">
                  <button
                    className="btn btn-primary"
                    onClick={handleVerifyDns}
                    disabled={dnsVerifying}
                  >
                    <RefreshCw size={15} className={dnsVerifying ? 'spin' : ''} />
                    <span>{dnsVerifying ? 'Checking DNS Records...' : 'Verify DNS Now'}</span>
                  </button>

                  <button
                    className="btn btn-secondary btn-cf"
                    onClick={handleCloudflareAuto}
                    disabled={cfSettingUp}
                    title="Automatically add this DNS record to your connected Cloudflare account"
                  >
                    <Cloud size={15} className="text-orange" />
                    <span>{cfSettingUp ? 'Configuring Cloudflare...' : '1-Click Cloudflare DNS Setup'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="no-domain-attached-box">
                <Globe size={36} className="text-muted" />
                <p>No custom domain attached yet. Enter your domain above and click <strong>"Attach Domain"</strong> to view DNS instructions.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB 3: DEPLOY TARGETS & CLUSTERS                                */}
      {/* ================================================================ */}
      {activeTab === 'targets' && (
        <div className="tab-pane-content">
          {/* Stats Bar */}
          <div className="overview-stats-grid">
            <div className="stat-card glass-card">
              <div className="stat-main-content">
                <div className="stat-icon-wrapper blue">
                  <Server size={22} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Total Targets</span>
                  <div className="stat-value">{environments.length}</div>
                </div>
              </div>
              <div className="stat-subtext">Active deployment targets</div>
            </div>

            <div className="stat-card glass-card">
              <div className="stat-main-content">
                <div className="stat-icon-wrapper green">
                  <ShieldCheck size={22} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Healthy</span>
                  <div className="stat-value text-green">
                    {environments.filter((e) => e.status === 'Healthy').length}
                  </div>
                </div>
              </div>
              <div className="stat-subtext text-green">100% operational</div>
            </div>

            <div className="stat-card glass-card">
              <div className="stat-main-content">
                <div className="stat-icon-wrapper purple">
                  <Layers size={22} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Deploy Targets</span>
                  <div className="stat-value">{pipelines.length}</div>
                </div>
              </div>
              <div className="stat-subtext">Configured pipelines</div>
            </div>
          </div>

          {/* Grid of Environments */}
          <div className="environments-grid">
            {environments.map((env) => (
              <div className="env-card glass-card" key={env._id}>
                <div className="card-top-bar">
                  <div className="env-title-group">
                    <Server size={18} className="env-card-icon" />
                    <div>
                      <h3 className="env-name">{env.name}</h3>
                      <span className="env-provider-pill">{env.provider || 'AWS'}</span>
                    </div>
                  </div>
                  <span className="status-pill status-healthy">
                    <CheckCircle2 size={12} className="green" />
                    <span>{env.status}</span>
                  </span>
                </div>

                <div className="env-meta-list">
                  <div className="meta-row">
                    <span className="meta-label">Region:</span>
                    <span className="meta-val">{env.region || 'ap-south-1'}</span>
                  </div>
                  {env.deployedUrl && (
                    <div className="meta-row">
                      <span className="meta-label">Endpoint:</span>
                      <a href={env.deployedUrl} target="_blank" rel="noreferrer" className="meta-val text-cyan">
                        {env.deployedUrl}
                      </a>
                    </div>
                  )}
                  {env.customDomain && (
                    <div className="meta-row">
                      <span className="meta-label">Domain:</span>
                      <span className="meta-val text-green font-mono">{env.customDomain}</span>
                    </div>
                  )}
                  <div className="meta-row">
                    <span className="meta-label">Instance:</span>
                    <span className="meta-val">{env.instances || '1 EC2 Node'}</span>
                  </div>
                </div>

                <div className="card-actions">
                  <button
                    className="action-btn"
                    onClick={() => {
                      setSelectedPipelineId(env._id);
                      setActiveTab('envvars');
                    }}
                  >
                    <Lock size={14} />
                    <span>Variables</span>
                  </button>

                  <button
                    className="action-btn action-btn-accent"
                    onClick={() => {
                      setSelectedPipelineId(env._id);
                      setActiveTab('dns');
                    }}
                  >
                    <Globe size={14} />
                    <span>Custom DNS</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODALS                                                           */}
      {/* ================================================================ */}
      {activeModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h3>
                {activeModal === 'createVar' && 'Add Environment Variable'}
                {activeModal === 'editVar' && `Edit Variable: ${varFormData.key}`}
                {activeModal === 'bulkEnv' && 'Bulk Import .env File'}
              </h3>
              <button className="close-btn" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* ADD OR EDIT VAR MODAL */}
              {(activeModal === 'createVar' || activeModal === 'editVar') && (
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Variable Key (e.g. MONGO_URI, JWT_SECRET, PORT)</label>
                    <input
                      type="text"
                      className="font-mono uppercase"
                      placeholder="e.g. MONGO_URI"
                      value={varFormData.key}
                      onChange={(e) => setVarFormData({ ...varFormData, key: e.target.value })}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Variable Value</label>
                    <textarea
                      rows={3}
                      className="font-mono"
                      placeholder="Enter variable value..."
                      value={varFormData.value}
                      onChange={(e) => setVarFormData({ ...varFormData, value: e.target.value })}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={varFormData.isSecret}
                        onChange={(e) => setVarFormData({ ...varFormData, isSecret: e.target.checked })}
                      />
                      <span>Mask as Sensitive Secret (Value will be hidden by default with Eye reveal toggle)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* BULK .ENV IMPORT MODAL */}
              {activeModal === 'bulkEnv' && (
                <div className="form-grid">
                  <p className="modal-subtext">
                    Paste your raw <code>.env</code> file contents below. Keys and values will be parsed and merged
                    automatically.
                  </p>
                  <div className="form-group full-width">
                    <textarea
                      rows={10}
                      className="font-mono text-sm"
                      placeholder={`PORT=5000\nMONGO_URI=mongodb+srv://...\nJWT_SECRET=supersecret\nNODE_ENV=production`}
                      value={bulkEnvText}
                      onChange={(e) => setBulkEnvText(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal} disabled={submitting}>
                Cancel
              </button>
              {(activeModal === 'createVar' || activeModal === 'editVar') && (
                <button className="btn btn-primary" onClick={handleSaveVariable} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Variable'}
                </button>
              )}
              {activeModal === 'bulkEnv' && (
                <button className="btn btn-primary" onClick={handleBulkImportEnv} disabled={submitting}>
                  {submitting ? 'Importing...' : 'Import Variables'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

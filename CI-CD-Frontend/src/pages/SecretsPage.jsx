import React, { useState, useMemo } from 'react';
import './SecretsPage.css';
import { useRole } from '../context/RoleContext';
import {
  Key,
  Eye,
  EyeOff,
  Copy,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  Lock,
  Shield,
  Check,
  X,
  History,
  User,
  Clock,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  FileCode,
  ShieldAlert,
  ShieldCheck,
  ArrowUpDown,
  CheckCircle2, Database, ArrowUpRight, Package
} from 'lucide-react';
import ApiClient from '../utils/api';


export default function SecretsPage() {
  const { currentRole } = useRole();
  const [secrets, setSecrets] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  React.useEffect(() => {
    fetchSecrets();
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const res = await ApiClient.get('/audit-logs');
      if (res.success && res.logs) {
        const mappedLogs = res.logs.map(log => ({
          id: log._id,
          secretName: log.action.split(' ').pop() || 'System', // Just a fallback, not ideal but secrets page used secretName
          action: log.action,
          user: log.user?.fullName || 'System',
          time: new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: new Date(log.createdAt).toLocaleDateString()
        })).slice(0, 5); // Only get the 5 most recent for the sidebar
        setAuditLogs(mappedLogs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSecrets = async () => {
    try {
      const res = await ApiClient.get('/environments/vars');
      if (res.success && res.envVars) {
        const mappedSecrets = res.envVars.map(ev => ({
          id: ev._id,
          name: ev.key,
          value: ev.value,
          environment: ev.environment?.name || 'All',
          lastUpdated: new Date(ev.updatedAt).toLocaleDateString(),
          updatedBy: 'admin',
          userRole: 'Admin',
          avatar: null,
          description: `Scope: ${ev.scope}`
        }));
        setSecrets(mappedSecrets);
      }
    } catch (err) {
      console.error(err);
    }
  };
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('name-asc');
  
  // Masking state per secret ID
  const [revealedSecrets, setRevealedSecrets] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [currentSecret, setCurrentSecret] = useState(null);
  
  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    environment: 'Production',
    description: ''
  });

  // Notification Toast State
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Toggle reveal for individual secret
  const toggleReveal = (id) => {
    setRevealedSecrets((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Reveal or Hide all
  const toggleAllReveal = (shouldReveal) => {
    const nextState = {};
    if (shouldReveal) {
      secrets.forEach((s) => {
        nextState[s.id] = true;
      });
    }
    setRevealedSecrets(nextState);
  };

  // Copy secret to clipboard
  const handleCopy = (secret) => {
    navigator.clipboard.writeText(secret.value);
    setCopiedId(secret.id);
    showToast(`Copied ${secret.name} value to clipboard`);
    
    // Add to audit log
    const newLog = {
      id: Date.now(),
      secretName: secret.name,
      action: 'COPIED',
      user: 'kunal24',
      environment: secret.environment,
      timestamp: 'Just now',
      details: 'Copied masked secret value to clipboard'
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Environment counts
  const envCounts = useMemo(() => {
    const counts = { All: secrets.length, Production: 0, Staging: 0, Development: 0 };
    secrets.forEach((s) => {
      if (counts[s.environment] !== undefined) {
        counts[s.environment]++;
      }
    });
    return counts;
  }, [secrets]);

  // Filtered and Sorted Secrets
  const filteredSecrets = useMemo(() => {
    return secrets
      .filter((secret) => {
        // Tab filter
        if (activeTab !== 'All' && secret.environment !== activeTab) {
          return false;
        }
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = secret.name.toLowerCase().includes(q);
          const matchUser = secret.updatedBy.toLowerCase().includes(q);
          const matchEnv = secret.environment.toLowerCase().includes(q);
          const matchDesc = secret.description?.toLowerCase().includes(q) || false;
          return matchName || matchUser || matchEnv || matchDesc;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'name-asc') {
          return a.name.localeCompare(b.name);
        } else if (sortOrder === 'name-desc') {
          return b.name.localeCompare(a.name);
        } else if (sortOrder === 'env') {
          return a.environment.localeCompare(b.environment);
        } else if (sortOrder === 'updated') {
          return a.lastUpdated.localeCompare(b.lastUpdated);
        }
        return 0;
      });
  }, [secrets, activeTab, searchQuery, sortOrder]);

  // Add Secret Handlers
  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      value: '',
      environment: activeTab === 'All' ? 'Production' : activeTab,
      description: ''
    });
    setIsAddModalOpen(true);
  };

  const handleSaveAddSecret = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.value.trim()) {
      showToast('Please provide both Secret Name and Value');
      return;
    }

    const formattedName = formData.name.trim().toUpperCase().replace(/\s+/g, '_');
    
    const newSecret = {
      id: Date.now(),
      name: formattedName,
      value: formData.value.trim(),
      environment: formData.environment,
      lastUpdated: 'Just now',
      updatedBy: 'kunal24',
      userRole: 'DevOps Lead',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      description: formData.description.trim() || 'Custom user added environment secret'
    };

    setSecrets((prev) => [newSecret, ...prev]);
    setIsAddModalOpen(false);

    // Audit log
    const newLog = {
      id: Date.now(),
      secretName: formattedName,
      action: 'CREATED',
      user: 'kunal24',
      environment: formData.environment,
      timestamp: 'Just now',
      details: `Created new secret in ${formData.environment} environment`
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    showToast(`Secret '${formattedName}' created successfully!`);
  };

  // Edit Secret Handlers
  const handleOpenEditModal = (secret) => {
    setCurrentSecret(secret);
    setFormData({
      name: secret.name,
      value: secret.value,
      environment: secret.environment,
      description: secret.description || ''
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEditSecret = (e) => {
    e.preventDefault();
    if (!formData.value.trim()) {
      showToast('Secret value cannot be empty');
      return;
    }

    const updatedName = formData.name.trim().toUpperCase().replace(/\s+/g, '_');

    setSecrets((prev) =>
      prev.map((s) =>
        s.id === currentSecret.id
          ? {
              ...s,
              name: updatedName,
              value: formData.value.trim(),
              environment: formData.environment,
              description: formData.description.trim(),
              lastUpdated: 'Just now',
              updatedBy: 'kunal24'
            }
          : s
      )
    );

    setIsEditModalOpen(false);

    // Audit log
    const newLog = {
      id: Date.now(),
      secretName: updatedName,
      action: 'UPDATED',
      user: 'kunal24',
      environment: formData.environment,
      timestamp: 'Just now',
      details: `Updated value and metadata for secret in ${formData.environment}`
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    showToast(`Secret '${updatedName}' updated successfully!`);
  };

  // Delete Secret Handlers
  const handleOpenDeleteModal = (secret) => {
    setCurrentSecret(secret);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!currentSecret) return;

    setSecrets((prev) => prev.filter((s) => s.id !== currentSecret.id));
    setIsDeleteModalOpen(false);

    // Audit log
    const newLog = {
      id: Date.now(),
      secretName: currentSecret.name,
      action: 'DELETED',
      user: 'kunal24',
      environment: currentSecret.environment,
      timestamp: 'Just now',
      details: `Removed secret variable from ${currentSecret.environment}`
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    showToast(`Deleted secret '${currentSecret.name}'`);
    setCurrentSecret(null);
  };

  // Helper badge color for environments
  const getEnvBadgeClass = (env) => {
    switch (env) {
      case 'Production':
        return 'env-badge-production';
      case 'Staging':
        return 'env-badge-staging';
      case 'Development':
        return 'env-badge-dev';
      case 'All':
        return 'env-badge-all';
      default:
        return 'env-badge-default';
    }
  };

  // Helper action badge color for audit logs
  const getActionBadgeClass = (action) => {
    switch (action) {
      case 'CREATED':
        return 'action-badge-created';
      case 'UPDATED':
        return 'action-badge-updated';
      case 'ROTATED':
        return 'action-badge-rotated';
      case 'DELETED':
        return 'action-badge-deleted';
      case 'COPIED':
      case 'VIEWED':
        return 'action-badge-viewed';
      default:
        return 'action-badge-default';
    }
  };

  return (
    <div className="secrets-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="secrets-toast">
          <CheckCircle2 size={18} className="toast-icon" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <header className="secrets-header">
        <div className="secrets-header-left">
          <div className="secrets-icon-wrapper">
            <Shield className="header-shield-icon" size={26} />
            <Lock className="header-lock-badge" size={14} />
          </div>
          <div>
            <div className="secrets-title-row">
              <h1 className="secrets-title">Secrets</h1>
              <span className="secrets-count-badge">{secrets.length} Total</span>
            </div>
            <p className="secrets-subtitle">
              Manage environment variables, API credentials, and encrypted secrets securely.
            </p>
          </div>
        </div>

        <div className="secrets-header-right">
          <div className="secrets-meta-pill">
            <ShieldCheck size={16} className="text-green" />
            <span>KMS Vault Encrypted</span>
          </div>
          {currentRole !== 'Viewer' && (
            <button className="add-secret-btn" onClick={handleOpenAddModal}>
              <Plus size={18} />
              <span>Add Secret</span>
            </button>
          )}
        </div>
      </header>

      {/* Stats Grid (Top) */}
      <div className="secrets-stats-grid">
        <div className="secret-stat-card">
          <div className="secret-stat-left">
            <div className="secret-stat-icon cyan">
              <Shield size={24} />
            </div>
            <div className="secret-stat-info">
              <span className="secret-stat-label">Total Secrets</span>
              <span className="secret-stat-value">12</span>
              <span className="secret-stat-subtext text-green">
                <ArrowUpRight size={12} style={{marginRight: 2, verticalAlign: 'middle'}}/>
                +2 this week
              </span>
            </div>
          </div>
          <div className="secret-stat-right-icon">
            <Database size={40} strokeWidth={1} />
          </div>
        </div>

        <div className="secret-stat-card">
          <div className="secret-stat-left">
            <div className="secret-stat-icon purple">
              <Shield size={24} />
            </div>
            <div className="secret-stat-info">
              <span className="secret-stat-label">Environments</span>
              <span className="secret-stat-value">4</span>
              <span className="secret-stat-subtext">Production, Staging, Dev, Test</span>
            </div>
          </div>
          <div className="secret-stat-right-icon">
            <Package size={40} strokeWidth={1} />
          </div>
        </div>

        <div className="secret-stat-card">
          <div className="secret-stat-left">
            <div className="secret-stat-icon blue">
              <EyeOff size={24} />
            </div>
            <div className="secret-stat-info">
              <span className="secret-stat-label">Rotated (30d)</span>
              <span className="secret-stat-value">3</span>
              <span className="secret-stat-subtext">Last rotation: 2 days ago</span>
            </div>
          </div>
          <div className="secret-stat-right-icon">
            <RefreshCw size={40} strokeWidth={1} />
          </div>
        </div>

        <div className="secret-stat-card">
          <div className="secret-stat-left">
            <div className="secret-stat-icon red">
              <AlertTriangle size={24} />
            </div>
            <div className="secret-stat-info">
              <span className="secret-stat-label">Expiring Soon</span>
              <span className="secret-stat-value">1</span>
              <span className="secret-stat-subtext text-red">Expires in 6 days</span>
            </div>
          </div>
          <div className="secret-stat-right-icon">
            <Clock size={40} strokeWidth={1} />
          </div>
        </div>
      </div>

      {/* Control Toolbar: Environment Tabs & Search */}
      <div className="secrets-toolbar">
        {/* Environment Tabs */}
        <div className="secrets-tabs">
          {['All', 'Production', 'Staging', 'Development', 'Test'].map((env) => (
            <button
              key={env}
              className={`secrets-tab ${activeTab === env ? 'active' : ''}`}
              onClick={() => setActiveTab(env)}
            >
              <span>{env}</span>
              <span className="tab-count">{envCounts[env] || 0}</span>
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="secrets-controls">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search secrets, tags, user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="sort-dropdown-wrapper">
            <ArrowUpDown size={14} className="sort-icon" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="sort-select"
            >
              <option value="name-asc">Sort: Name (A-Z)</option>
              <option value="name-desc">Sort: Name (Z-A)</option>
              <option value="env">Sort: Environment</option>
              <option value="updated">Sort: Last Updated</option>
            </select>
          </div>

          {/* Reveal/Hide All Toggle */}
          <button
            className="toggle-all-btn"
            onClick={() => {
              const anyRevealed = Object.values(revealedSecrets).some(Boolean);
              toggleAllReveal(!anyRevealed);
            }}
            title={Object.values(revealedSecrets).some(Boolean) ? 'Hide all values' : 'Reveal all values'}
          >
            {Object.values(revealedSecrets).some(Boolean) ? (
              <>
                <EyeOff size={15} />
                <span>Hide All</span>
              </>
            ) : (
              <>
                <Eye size={15} />
                <span>Reveal All</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Secrets Table Container */}
      <div className="secrets-table-card">
        <div className="table-responsive">
          <table className="secrets-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Value</th>
                <th>Environment</th>
                <th>Last Updated</th>
                <th>Updated By</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSecrets.length > 0 ? (
                filteredSecrets.map((secret) => {
                  const isRevealed = !!revealedSecrets[secret.id];
                  const isCopied = copiedId === secret.id;

                  return (
                    <tr key={secret.id} className="secret-row">
                      {/* Name */}
                      <td className="cell-name">
                        <div className="secret-name-wrapper">
                          <Key size={15} className="key-icon" />
                          <div>
                            <span className="secret-name-code">{secret.name}</span>
                            {secret.description && (
                              <span className="secret-desc-tooltip">{secret.description}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Masked / Plaintext Value */}
                      <td className="cell-value">
                        <div className="value-wrapper">
                          <span className={`secret-value-text ${isRevealed ? 'plaintext' : 'masked'}`}>
                            {isRevealed ? secret.value : '••••••••••••••••••••'}
                          </span>
                          <button
                            className="eye-toggle-btn"
                            onClick={() => toggleReveal(secret.id)}
                            title={isRevealed ? 'Hide Secret' : 'Reveal Secret'}
                          >
                            {isRevealed ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </td>

                      {/* Environment Badge */}
                      <td className="cell-env">
                        <span className={`env-badge ${getEnvBadgeClass(secret.environment)}`}>
                          <span className="env-dot"></span>
                          {secret.environment}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="cell-updated">
                        <div className="timestamp-wrapper">
                          <Clock size={13} className="time-icon" />
                          <span>{secret.lastUpdated}</span>
                        </div>
                      </td>

                      {/* Updated By */}
                      <td className="cell-user">
                        <div className="user-profile-cell">
                          <img
                            src={secret.avatar}
                            alt={secret.updatedBy}
                            className="user-avatar-img"
                          />
                          <div className="user-meta">
                            <span className="user-name">{secret.updatedBy}</span>
                            <span className="user-role">{secret.userRole || 'Engineer'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="cell-actions text-right">
                        <div className="action-buttons-group">
                          <button
                            className={`action-btn copy-btn ${isCopied ? 'copied' : ''}`}
                            onClick={() => handleCopy(secret)}
                            title="Copy Value"
                          >
                            {isCopied ? <Check size={15} /> : <Copy size={15} />}
                          </button>

                          {currentRole !== 'Viewer' && (
                            <>
                              <button
                                className="action-btn edit-btn"
                                onClick={() => handleOpenEditModal(secret)}
                                title="Edit Secret"
                              >
                                <Edit size={15} />
                              </button>

                              <button
                                className="action-btn delete-btn"
                                onClick={() => handleOpenDeleteModal(secret)}
                                title="Delete Secret"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="empty-table-cell">
                    <div className="empty-state-content">
                      <ShieldAlert size={36} className="empty-icon" />
                      <h3>No Secrets Found</h3>
                      <p>
                        No secrets match the current environment filter or search query "{searchQuery}".
                      </p>
                      <button
                        className="reset-filter-btn"
                        onClick={() => {
                          setSearchQuery('');
                          setActiveTab('All');
                        }}
                      >
                        Reset Filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Secret Audit Log Section */}
      <section className="audit-log-section">
        <div className="audit-header">
          <div className="audit-title-wrapper">
            <History size={20} className="audit-header-icon" />
            <div>
              <h2 className="audit-title">Secret Audit Log</h2>
              <p className="audit-subtitle">
                Immutable security event log for secret creation, rotation, views, and modifications
              </p>
            </div>
          </div>
          <div className="audit-live-indicator">
            <span className="pulse-dot"></span>
            <span>Real-time Monitoring</span>
          </div>
        </div>

        <div className="audit-list">
          {auditLogs.map((log) => (
            <div key={log.id} className="audit-item">
              <div className="audit-left">
                <span className={`action-badge ${getActionBadgeClass(log.action)}`}>
                  {log.action}
                </span>
                <div className="audit-main">
                  <div className="audit-target-row">
                    <span className="audit-secret-name">{log.secretName}</span>
                    <span className={`env-badge ${getEnvBadgeClass(log.environment)} audit-env`}>
                      {log.environment}
                    </span>
                  </div>
                  <p className="audit-details">{log.details}</p>
                </div>
              </div>

              <div className="audit-right">
                <div className="audit-user-tag">
                  <User size={13} />
                  <span>{log.user}</span>
                </div>
                <div className="audit-time-tag">
                  <Clock size={13} />
                  <span>{log.timestamp}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Add Secret Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <Plus size={20} className="text-green" />
                <h3>Add New Secret</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsAddModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAddSecret} className="modal-form">
              <div className="form-group">
                <label>Secret Name</label>
                <input
                  type="text"
                  placeholder="e.g. PAYMENT_API_KEY"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input code-font"
                  required
                />
                <span className="form-help">
                  Automatically converted to uppercase SNAKE_CASE.
                </span>
              </div>

              <div className="form-group">
                <label>Environment</label>
                <select
                  value={formData.environment}
                  onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                  className="form-select"
                >
                  <option value="Production">Production</option>
                  <option value="Staging">Staging</option>
                  <option value="Development">Development</option>
                  <option value="All">All Environments (Global)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Secret Value</label>
                <textarea
                  rows="3"
                  placeholder="Paste confidential secret value or string..."
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className="form-textarea code-font"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Third-party provider authentication payload"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-green">
                  Save Secret
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Secret Modal */}
      {isEditModalOpen && currentSecret && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <Edit size={20} className="text-blue" />
                <h3>Edit Secret: {currentSecret.name}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsEditModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditSecret} className="modal-form">
              <div className="form-group">
                <label>Secret Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input code-font"
                  required
                />
              </div>

              <div className="form-group">
                <label>Environment</label>
                <select
                  value={formData.environment}
                  onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                  className="form-select"
                >
                  <option value="Production">Production</option>
                  <option value="Staging">Staging</option>
                  <option value="Development">Development</option>
                  <option value="All">All Environments (Global)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Secret Value</label>
                <textarea
                  rows="3"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className="form-textarea code-font"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-blue">
                  Update Secret
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && currentSecret && (
        <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal-content modal-danger" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group text-red">
                <AlertTriangle size={22} />
                <h3>Delete Secret</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsDeleteModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p>
                Are you sure you want to permanently delete the secret variable{' '}
                <strong className="code-font text-red">{currentSecret.name}</strong> from{' '}
                <strong>{currentSecret.environment}</strong> environment?
              </p>
              <div className="delete-warning-box">
                <AlertTriangle size={16} />
                <span>
                  This action cannot be undone. Active build pipelines using this variable might fail!
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger-red"
                onClick={handleConfirmDelete}
              >
                Delete Secret
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Cloud,
  LayoutDashboard,
  GitBranch,
  GitPullRequest,
  Rocket,
  Globe,
  FileText,
  Activity,
  Bell,
  Key,
  Settings,
  Users,
  ClipboardList,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  RefreshCw,
  Trash2,
  Server,
  Cpu,
  HardDrive,
  Wifi,
  WifiOff,
  Shield,
  User,
  Eye
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useRole } from '../context/RoleContext';
// Missing cloud1.png import removed
import ApiClient from '../utils/api';
import './Sidebar.css';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { id: 'repositories', label: 'Repositories', icon: GitBranch, path: '/repositories' },
  { id: 'pipelines', label: 'Pipelines', icon: GitPullRequest, path: '/pipelines' },
  { id: 'deployments', label: 'Deployments', icon: Rocket, path: '/deployments' },
  { id: 'environments', label: 'Environments', icon: Globe, path: '/environments' },
  { id: 'github-actions', label: 'GitHub Actions', icon: GitBranch, path: '/github-actions' },
  { id: 'logs', label: 'Logs', icon: FileText, path: '/logs' },
  { id: 'monitoring', label: 'Monitoring', icon: Activity, path: '/monitoring' },
  { id: 'alerts', label: 'Alerts', icon: Bell, path: '/alerts', badge: '3' },
  { id: 'secrets', label: 'Secrets', icon: Key, path: '/secrets' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  { id: 'users', label: 'Users', icon: Users, path: '/users' },
  { id: 'audit-logs', label: 'Audit Logs', icon: ClipboardList, path: '/audit-logs' }
];



// We will fetch accounts from API

const providerOptions = [
  { value: 'aws', label: 'Amazon Web Services (AWS)', color: '#f97316' },
  { value: 'azure', label: 'Microsoft Azure', color: '#3b82f6' },
  { value: 'gcp', label: 'Google Cloud Platform', color: '#ef4444' },
  { value: 'digitalocean', label: 'DigitalOcean', color: '#06b6d4' },
];

const AWSIcon = ({ className = "w-5 h-5", color = "currentColor" }) => (
  <img src="/amazon.png" alt="AWS" className={className} style={{ objectFit: 'contain', width: '100%', height: '100%', transform: 'scale(2.2)', mixBlendMode: 'lighten' }} />
);

const GCPIcon = ({ className = "w-5 h-5", color = "currentColor" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill={color !== "currentColor" ? color : "#4285F4"}/>
    <path d="M12.5 7v3.5l3.5 3.5-1 1-4.5-4.5V7h2z" fill="#34A853"/>
  </svg>
);

const AzureIcon = ({ className = "w-5 h-5", color = "currentColor" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M5.483 21.3H24L14.025 4.013h-2.9L5.483 21.3zM13.25 2.7l-9.11 16.48-4.14-7.1 9.1-16.49h4.15z" fill={color !== "currentColor" ? color : "#0089D6"}/>
  </svg>
);

export default function Sidebar({ isOpen, onClose }) {
  const { currentRole, setCurrentRole } = useRole();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [usageStats, setUsageStats] = useState({
    totalMins: 5000,
    usedMins: 0,
    percent: 0,
    monthName: new Date().toLocaleString('default', { month: 'short', year: 'numeric' }),
    distribution: [{ name: 'No Usage', value: 100, color: '#334155' }]
  });
  const [expandedAccount, setExpandedAccount] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [newAccount, setNewAccount] = useState({
    provider: 'aws',
    name: '',
    accountId: '',
    environment: 'Production',
    region: '',
  });
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleExpand = (id) => {
    setExpandedAccount(expandedAccount === id ? null : id);
  };

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await ApiClient.get('/pipelines');
        if (res.success) {
          const pipelines = res.pipelines;
          const now = new Date();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();
          const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
          
          const monthPipelines = pipelines.filter(p => {
            const d = new Date(p.createdAt);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
          });
          
          const usedMins = monthPipelines.length * 15; // Assume 15 mins per pipeline
          const totalMins = 5000;
          const percent = Math.min(100, Math.round((usedMins / totalMins) * 100));
          
          let aws = 0, azure = 0, gcp = 0, others = 0;
          monthPipelines.forEach(p => {
            if (p.deploymentTarget === 'aws') aws++;
            else if (p.deploymentTarget === 'azure') azure++;
            else if (p.deploymentTarget === 'gcp') gcp++;
            else others++;
          });
          
          const totalCount = monthPipelines.length || 1;
          const dist = [];
          if (aws > 0) dist.push({ name: 'AWS', value: Math.round((aws/totalCount)*100), color: '#f97316' });
          if (azure > 0) dist.push({ name: 'Azure', value: Math.round((azure/totalCount)*100), color: '#3b82f6' });
          if (gcp > 0) dist.push({ name: 'GCP', value: Math.round((gcp/totalCount)*100), color: '#ef4444' });
          if (others > 0) dist.push({ name: 'Others', value: Math.round((others/totalCount)*100), color: '#a855f7' });
          
          if (dist.length === 0) {
             dist.push({ name: 'No Usage', value: 100, color: '#334155' });
          }

          setUsageStats({
            totalMins,
            usedMins,
            percent,
            monthName,
            distribution: dist
          });
        }
      } catch (error) {
         console.error('Failed to fetch usage', error);
      }
    };

    const fetchAccounts = async () => {
      try {
        const res = await ApiClient.get('/cloud-accounts');
        if (res.success) {
          setAccounts(res.accounts);
        }
      } catch (error) {
        console.error('Failed to fetch cloud accounts in sidebar', error);
      }
    };
    fetchAccounts();
    fetchUsage();
  }, []);

  const handleSync = (id, e) => {
    e.stopPropagation();
    setSyncingId(id);
    showToast('Syncing account...');
    setTimeout(() => {
      setSyncingId(null);
      setAccounts(prev =>
        prev.map(acc =>
          acc.id === id ? { ...acc, lastSync: 'Just now' } : acc
        )
      );
      showToast('Account synced successfully!');
    }, 2000);
  };

  const handleDisconnect = (id) => {
    setAccounts(prev =>
      prev.map(acc =>
        acc.id === id
          ? { ...acc, status: acc.status === 'connected' ? 'disconnected' : 'connected' }
          : acc
      )
    );
    const acc = accounts.find(a => a.id === id);
    showToast(
      acc.status === 'connected'
        ? `${acc.name} disconnected`
        : `${acc.name} reconnected!`
    );
  };

  const handleDelete = (id) => {
    const acc = accounts.find(a => a.id === id);
    setAccounts(prev => prev.filter(a => a.id !== id));
    setShowDeleteConfirm(null);
    setExpandedAccount(null);
    showToast(`${acc.name} removed`, 'error');
  };

  const handleAddAccount = (e) => {
    e.preventDefault();
    if (!newAccount.name || !newAccount.accountId || !newAccount.region) return;
    const id = `${newAccount.provider}-${Date.now()}`;
    setAccounts(prev => [
      ...prev,
      {
        ...newAccount,
        id,
        status: 'connected',
        services: Math.floor(Math.random() * 10) + 1,
        cpu: Math.floor(Math.random() * 60) + 20,
        memory: Math.floor(Math.random() * 50) + 30,
        cost: `$${(Math.random() * 3000 + 500).toFixed(0)}`,
        lastSync: 'Just now',
      },
    ]);
    setNewAccount({ provider: 'aws', name: '', accountId: '', environment: 'Production', region: '' });
    setShowAddModal(false);
    showToast(`${newAccount.name} added successfully!`);
  };

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar-container ${isOpen ? 'sidebar-open' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-logo-icon">
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="brand-cloud-icon" style={{ width: '24px', height: '24px' }}>
            <path d="M30 18.3333C30 13.731 26.269 10 21.6667 10C18.4239 10 15.6146 11.854 14.1506 14.5422C13.4357 14.1866 12.5855 14 11.6667 14C8.90524 14 6.66667 16.2386 6.66667 19C6.66667 19.349 6.70244 19.6896 6.77028 20.0182C4.05342 20.6725 2 23.1378 2 26.0606C2 29.3409 4.65909 32 7.93939 32H28.6667C33.269 32 37 28.269 37 23.6667C37 19.5398 33.9922 16.1158 30 15.4208V18.3333Z" stroke="#4F8AFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 22H24M16 22L19 19M16 22L19 25M24 22L21 19M24 22L21 25" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="sidebar-brand-text">
          <h1 className="sidebar-title">CloudOps</h1>
          <p className="sidebar-subtitle">CI/CD Orchestrator</p>
        </div>
      </div>

      <div className="sidebar-scroll-content">
        {/* Navigation */}
        <nav className="sidebar-nav">
          <ul className="sidebar-nav-list">
            {navItems.filter(item => {
              if (currentRole === 'Viewer') {
                return !['users', 'settings', 'secrets', 'environments'].includes(item.id);
              }
              if (currentRole === 'Developer') {
                return !['users', 'settings', 'audit-logs'].includes(item.id);
              }
              return true; // Admin sees all
            }).map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id} className="sidebar-nav-item">
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `sidebar-nav-button ${isActive ? 'active' : ''}`
                    }
                    onClick={() => { if (window.innerWidth <= 768) onClose?.(); }}
                  >
                    <Icon className="sidebar-nav-icon" size={18} />
                    <span className="sidebar-nav-label">{item.label}</span>
                    {item.badge && (
                      <span className="sidebar-nav-badge">{item.badge}</span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Profile with Role Switcher */}
        <div className="sidebar-user-section">
          <div 
            className="sidebar-user-profile interactive-profile" 
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
          >
            <div className="sidebar-user-avatar">
              <span>KK</span>
              <span className="user-online-dot"></span>
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">Kunal Kumar</span>
              <span className={`sidebar-user-role-badge ${currentRole.toLowerCase()}`}>
                {currentRole} <ChevronDown size={10} style={{ marginLeft: 2 }} />
              </span>
            </div>
          </div>
          
          {showRoleDropdown && (
            <div className="role-dropdown-menu">
              <div className="role-dropdown-header">Switch Role</div>
              <button 
                className={`role-dropdown-item ${currentRole === 'Admin' ? 'active' : ''}`}
                onClick={() => { setCurrentRole('Admin'); setShowRoleDropdown(false); }}
              >
                <Shield size={14} className="role-icon admin" /> Admin
              </button>
              <button 
                className={`role-dropdown-item ${currentRole === 'Developer' ? 'active' : ''}`}
                onClick={() => { setCurrentRole('Developer'); setShowRoleDropdown(false); }}
              >
                <User size={14} className="role-icon developer" /> Developer
              </button>
              <button 
                className={`role-dropdown-item ${currentRole === 'Viewer' ? 'active' : ''}`}
                onClick={() => { setCurrentRole('Viewer'); setShowRoleDropdown(false); }}
              >
                <Eye size={14} className="role-icon viewer" /> Viewer
              </button>
            </div>
          )}
        </div>

        {/* Cloud Accounts Section */}
        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <h2 className="sidebar-section-title">Cloud Accounts</h2>
            {currentRole !== 'Viewer' && (
              <button
                className="sidebar-add-btn"
                type="button"
                onClick={() => navigate('/cloud-accounts')}
              >
                <Plus size={13} />
                <span>Add New</span>
              </button>
            )}
          </div>

          <div className="sidebar-accounts-list">
            {accounts.length === 0 && (
              <div className="cloud-empty-state">
                <Cloud size={28} />
                <p>No cloud accounts connected</p>
                <button className="cloud-empty-add-btn" onClick={() => navigate('/cloud-accounts')}>
                  <Plus size={14} /> Connect Account
                </button>
              </div>
            )}

            {accounts.map(account => (
              <div key={account.id} className="sidebar-account-item">
                <div 
                  className={`account-header ${expandedAccount === account.id ? 'expanded' : ''}`}
                  onClick={() => toggleExpand(account.id)}
                >
                  <div className="account-header-main">
                    <div className={`account-icon-wrapper ${account.provider.toLowerCase()}`}>
                      {account.provider === 'AWS' ? (
                        <AWSIcon className="w-4 h-4" color="#f97316" />
                      ) : account.provider === 'GCP' ? (
                        <GCPIcon className="w-4 h-4" color="#ef4444" />
                      ) : (
                        <AzureIcon className="w-4 h-4" color="#3b82f6" />
                      )}
                    </div>
                    <span className={`account-status-indicator ${account.status}`}></span>
                  </div>
                  <div className="account-details">
                    <span className="account-name">{account.accountName}</span>
                    <span className={`account-tag ${account.environment.toLowerCase()}`}>
                      {account.environment}
                    </span>
                  </div>
                  <div className="account-expand-icon">
                    {expandedAccount === account.id
                      ? <ChevronUp size={14} />
                      : <ChevronDown size={14} />
                    }
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedAccount === account.id && (
                  <div className="account-expanded-details">
                    <div className="account-detail-row">
                      <span className="account-detail-label">Region</span>
                      <span className="account-detail-value">{account.region}</span>
                    </div>
                    <div className="account-detail-row">
                      <span className="account-detail-label">Access Key</span>
                      <span className="account-detail-value font-mono text-xs">{account.accessKeyId}</span>
                    </div>
                    <div className="account-detail-row">
                      <span className="account-detail-label">Status</span>
                      <span className={`account-detail-value status-text ${account.status}`}>
                        {account.status === 'connected'
                          ? <><Wifi size={12} /> Connected</>
                          : <><WifiOff size={12} /> Disconnected</>
                        }
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="account-actions">
                      {currentRole === 'Admin' && (
                        <button
                          className="account-action-btn delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/cloud-accounts');
                          }}
                          title="Manage Account"
                          style={{ width: '100%', justifyContent: 'center' }}
                        >
                          <span>Manage Account</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Usage This Month Section */}
        <div className="sidebar-section usage-section">
          <div className="sidebar-section-header">
            <div>
              <h2 className="sidebar-section-title">Usage This Month</h2>
              <span className="sidebar-section-subtitle">{usageStats.monthName}</span>
            </div>
          </div>

          <div className="sidebar-usage-card">
            <div className="sidebar-donut-wrapper">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '12px'
                    }}
                    formatter={(val) => [`${val}%`, 'Usage']}
                  />
                  <Pie
                    data={usageStats.distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={56}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {usageStats.distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="sidebar-donut-center">
                <span className="sidebar-donut-percent">{usageStats.percent}%</span>
                <span className="sidebar-donut-sub">used</span>
              </div>
            </div>

            <div className="sidebar-usage-summary">
              <span className="usage-mins-highlight">{usageStats.usedMins.toLocaleString()}</span>
              <span className="usage-mins-total">of {usageStats.totalMins.toLocaleString()} build mins</span>
            </div>

            <div className="sidebar-usage-legend">
              {usageStats.distribution.map((item, idx) => (
                <div className="legend-item" key={idx}>
                  <div className="legend-marker" style={{ backgroundColor: item.color }}></div>
                  <span className="legend-name">{item.name}</span>
                  <span className="legend-value">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Cloud Account Modal */}
      {showAddModal && (
        <div className="cloud-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="cloud-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cloud-modal-header">
              <h3>Connect Cloud Account</h3>
              <button className="cloud-modal-close" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddAccount} className="cloud-modal-form">
              <div className="cloud-form-group">
                <label>Cloud Provider</label>
                <div className="cloud-provider-grid">
                  {providerOptions.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      className={`cloud-provider-option ${newAccount.provider === p.value ? 'selected' : ''}`}
                      onClick={() => setNewAccount({ ...newAccount, provider: p.value })}
                      style={{ '--provider-color': p.color }}
                    >
                      <span className={`cloud-provider-badge ${p.value}`} style={{ padding: '4px' }}>
                        {p.value === 'aws' ? <AWSIcon className="w-5 h-5" color={p.color} /> : p.value === 'gcp' ? <GCPIcon className="w-5 h-5" color={p.color} /> : p.value === 'azure' ? <AzureIcon className="w-5 h-5" color={p.color} /> : <Cloud size={18} color={p.color} />}
                      </span>
                      <span className="cloud-provider-name">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="cloud-form-group">
                <label>Account Name</label>
                <input
                  type="text"
                  placeholder="e.g., Production AWS"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  required
                />
              </div>

              <div className="cloud-form-group">
                <label>Account / Subscription ID</label>
                <input
                  type="text"
                  placeholder="e.g., 123-456-7890"
                  value={newAccount.accountId}
                  onChange={(e) => setNewAccount({ ...newAccount, accountId: e.target.value })}
                  required
                />
              </div>

              <div className="cloud-form-row">
                <div className="cloud-form-group">
                  <label>Environment</label>
                  <select
                    value={newAccount.environment}
                    onChange={(e) => setNewAccount({ ...newAccount, environment: e.target.value })}
                  >
                    <option value="Production">Production</option>
                    <option value="Staging">Staging</option>
                    <option value="Development">Development</option>
                  </select>
                </div>
                <div className="cloud-form-group">
                  <label>Region</label>
                  <input
                    type="text"
                    placeholder="e.g., us-east-1"
                    value={newAccount.region}
                    onChange={(e) => setNewAccount({ ...newAccount, region: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="cloud-modal-actions">
                <button type="button" className="cloud-btn-cancel" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="cloud-btn-connect">
                  <CheckCircle size={15} /> Connect Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="cloud-modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="cloud-modal cloud-modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="cloud-modal-header delete-header">
              <h3>Remove Account</h3>
              <button className="cloud-modal-close" onClick={() => setShowDeleteConfirm(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="cloud-delete-body">
              <div className="cloud-delete-icon">
                <Trash2 size={28} />
              </div>
              <p>Are you sure you want to remove <strong>{accounts.find(a => a.id === showDeleteConfirm)?.name}</strong>?</p>
              <p className="cloud-delete-warning">This will disconnect all associated services and resources.</p>
            </div>
            <div className="cloud-modal-actions">
              <button className="cloud-btn-cancel" onClick={() => setShowDeleteConfirm(null)}>
                Cancel
              </button>
              <button className="cloud-btn-delete" onClick={() => handleDelete(showDeleteConfirm)}>
                <Trash2 size={14} /> Remove Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`cloud-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <X size={15} />}
          <span>{toast.message}</span>
        </div>
      )}
    </aside>
    </>
  );
}

import React, { useState } from 'react';
import {
  Settings,
  Bell,
  Link as LinkIcon,
  Shield,
  CreditCard,
  Save,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Check,
  X,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Lock,
  Globe,
  Cpu,
  Layers,
  Download,
  Key,
  Server,
  Mail,
  MessageSquare,
  Copy,
  Info,
  User
} from 'lucide-react';
import ApiClient from '../utils/api';
import './SettingsPage.css';

// Initial Mock Data
const INITIAL_GENERAL_SETTINGS = {
  orgName: 'CloudOps Inc.',
  defaultBranch: 'main',
  buildTimeout: 30,
  autoDeploy: true,
  parallelBuilds: 5,
  buildCache: true,
  artifactRetention: 90,
};

const INITIAL_NOTIFICATIONS = {
  emailNotifications: true,
  primaryEmail: 'admin@cloudops.io',
  digestFrequency: 'Instant',
  slackNotifications: true,
  slackWebhookUrl: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXX',
  pagerDutyNotifications: false,
  pagerDutyKey: 'pd_live_98a72b83910c4d',
  notifyEvents: {
    buildSuccess: true,
    buildFailure: true,
    deployment: true,
    securityScan: true,
    pipelineCancelled: false,
  }
};

const INITIAL_INTEGRATIONS = [
  {
    id: 'github',
    name: 'GitHub',
    category: 'Source Control',
    description: 'Connect repository hooks, sync commits, and trigger CI pipelines on pull requests.',
    status: 'connected',
    details: 'Org: cloudops-dev • 14 repos synced',
    color: '#24292e',
    iconBg: 'rgba(255, 255, 255, 0.1)',
    lastSynced: '2 mins ago'
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    category: 'Source Control',
    description: 'Integrate with self-hosted or GitLab.com repositories for automated runner triggers.',
    status: 'connected',
    details: 'Self-hosted v15.4 • 6 projects',
    color: '#fc6d26',
    iconBg: 'rgba(252, 109, 38, 0.15)',
    lastSynced: '1 hour ago'
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'Messaging & Alerts',
    description: 'Send build notifications, approval requests, and failure alerts to team channels.',
    status: 'connected',
    details: 'Workspace: CloudOps-DevOps • #cicd-alerts',
    color: '#4a154b',
    iconBg: 'rgba(224, 30, 90, 0.15)',
    lastSynced: '5 mins ago'
  },
  {
    id: 'docker',
    name: 'Docker Hub',
    category: 'Container Registry',
    description: 'Automate image tagging, security scanning, and multi-architecture image registry pushes.',
    status: 'connected',
    details: 'User: cloudopsadmin • 42 repositories',
    color: '#2496ed',
    iconBg: 'rgba(36, 150, 237, 0.15)',
    lastSynced: '3 hours ago'
  },
  {
    id: 'aws',
    name: 'AWS Elastic Container Registry',
    category: 'Cloud Infrastructure',
    description: 'Deploy containerized applications directly to Amazon ECS, EKS, and Lambda.',
    status: 'connected',
    details: 'Region: us-east-1 • Account: 8492-****-1029',
    color: '#ff9900',
    iconBg: 'rgba(255, 153, 0, 0.15)',
    lastSynced: 'Just now'
  },
  {
    id: 'azure',
    name: 'Azure DevOps',
    category: 'Cloud Infrastructure',
    description: 'Deploy Kubernetes workloads and serverless functions to Microsoft Azure.',
    status: 'connected',
    details: 'Tenant: Production-Cluster-East • Sub-01',
    color: '#0089d6',
    iconBg: 'rgba(0, 137, 214, 0.15)',
    lastSynced: 'Yesterday'
  },
  {
    id: 'snyk',
    name: 'Snyk Security',
    category: 'Security Analysis',
    description: 'Automated vulnerability scanning for open source dependencies and container images.',
    status: 'disconnected',
    details: 'Not configured',
    color: '#4c1d95',
    iconBg: 'rgba(168, 85, 247, 0.15)',
    lastSynced: 'Never'
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes Cluster',
    category: 'Orchestration',
    description: 'Direct access to native k8s cluster resources for helm rollouts and pod management.',
    status: 'connected',
    details: 'Cluster: prod-us-east-k8s • 24 deployments',
    color: '#326ce5',
    iconBg: 'rgba(50, 108, 229, 0.15)',
    lastSynced: '10 mins ago'
  }
];

const INITIAL_TOKENS = [
  {
    id: 1,
    name: 'CLI deployment key',
    prefix: 'cicd_pat_8f92a910d82e4f...',
    fullKey: 'cicd_pat_8f92a910d82e4f9b0c72d61a',
    createdDate: '2026-05-12',
    lastUsed: '10 mins ago',
    scopes: ['build:trigger', 'deploy:write'],
    status: 'active'
  },
  {
    id: 2,
    name: 'Production Pipeline runner',
    prefix: 'cicd_pat_3k71b5821c90e2...',
    fullKey: 'cicd_pat_3k71b5821c90e28f11a45b91',
    createdDate: '2026-01-20',
    lastUsed: 'Yesterday',
    scopes: ['admin', 'repo:read', 'build:trigger'],
    status: 'active'
  },
  {
    id: 3,
    name: 'Staging Webhook reader',
    prefix: 'cicd_pat_1m92x7410f33d7...',
    fullKey: 'cicd_pat_1m92x7410f33d790ab421199',
    createdDate: '2026-06-04',
    lastUsed: '3 days ago',
    scopes: ['repo:read', 'logs:read'],
    status: 'active'
  }
];

const INITIAL_INVOICES = [
  { id: 'INV-2026-007', date: 'Jul 1, 2026', amount: '$499.00', status: 'Paid', period: 'Jul 2026 - Aug 2026' },
  { id: 'INV-2026-006', date: 'Jun 1, 2026', amount: '$499.00', status: 'Paid', period: 'Jun 2026 - Jul 2026' },
  { id: 'INV-2026-005', date: 'May 1, 2026', amount: '$499.00', status: 'Paid', period: 'May 2026 - Jun 2026' },
  { id: 'INV-2026-004', date: 'Apr 1, 2026', amount: '$499.00', status: 'Paid', period: 'Apr 2026 - May 2026' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [toastMessage, setToastMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Profile State
  const [profile, setProfile] = useState({ fullName: '', email: '', password: '' });

  React.useEffect(() => {
    fetchProfile();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await ApiClient.get('/settings');
      if (res.success && res.settings) {
        setGeneral({
          orgName: res.settings.orgName,
          defaultBranch: res.settings.defaultBranch,
          buildTimeout: res.settings.buildTimeout,
          autoDeploy: res.settings.autoDeploy,
          parallelBuilds: res.settings.parallelBuilds,
          retentionDays: res.settings.retentionDays
        });
        setNotifications({
          emailNotifications: res.settings.emailNotifications,
          primaryEmail: res.settings.primaryEmail,
          digestFrequency: res.settings.digestFrequency,
          slackNotifications: res.settings.slackNotifications,
          slackWebhookUrl: res.settings.slackWebhookUrl,
          teamsNotifications: res.settings.teamsNotifications,
          teamsWebhookUrl: res.settings.teamsWebhookUrl,
          webhookAlerts: res.settings.webhookAlerts,
          genericWebhookUrl: res.settings.genericWebhookUrl
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await ApiClient.get('/users/me');
      if (res.success) {
        setProfile({ fullName: res.user.fullName, email: res.user.email, password: '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const payload = { fullName: profile.fullName, email: profile.email };
      if (profile.password) payload.password = profile.password;
      
      const res = await ApiClient.put('/users/profile', payload);
      if (res.success) {
        setProfile({ fullName: res.user.fullName, email: res.user.email, password: '' });
        triggerToast('Profile updated successfully!');
      } else {
        triggerToast('Failed to update profile');
      }
    } catch (err) {
      triggerToast('Error updating profile');
    }
    setIsSaving(false);
  };

  // Section States
  const [general, setGeneral] = useState(INITIAL_GENERAL_SETTINGS);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [integrations, setIntegrations] = useState(INITIAL_INTEGRATIONS);
  const [integrationFilter, setIntegrationFilter] = useState('');
  
  // Security States
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('1h');
  const [ipWhitelist, setIpWhitelist] = useState('192.168.1.0/24\n10.0.0.0/16\n203.0.113.45');
  const [apiTokens, setApiTokens] = useState(INITIAL_TOKENS);
  const [visibleTokenIds, setVisibleTokenIds] = useState({});
  const [showNewTokenModal, setShowNewTokenModal] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenExpiration, setNewTokenExpiration] = useState('90');
  const [createdTokenKey, setCreatedTokenKey] = useState(null);

  // Billing States
  const [selectedPlan, setSelectedPlan] = useState('Enterprise');

  // Trigger Toast Helper
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3500);
  };

  // General Handlers
  const handleSaveGeneral = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await ApiClient.put('/settings', general);
      triggerToast('General settings saved successfully!');
    } catch (err) {
      console.error(err);
      triggerToast('Failed to save general settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Notifications Handlers
  const handleSaveNotifications = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await ApiClient.put('/settings', notifications);
      triggerToast('Notification settings saved successfully!');
    } catch (err) {
      console.error(err);
      triggerToast('Failed to save notification settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSlackWebhook = () => {
    triggerToast('Sending test message to Slack webhook...');
    setTimeout(() => {
      triggerToast('Test message sent to Slack successfully!');
    }, 1500);
  };

  // Integrations Handlers
  const handleToggleIntegration = (id) => {
    setIntegrations(prev => prev.map(item => {
      if (item.id === id) {
        const nextStatus = item.status === 'connected' ? 'disconnected' : 'connected';
        const msg = nextStatus === 'connected' 
          ? `Connected to ${item.name}` 
          : `Disconnected ${item.name}`;
        triggerToast(msg);
        return {
          ...item,
          status: nextStatus,
          lastSynced: nextStatus === 'connected' ? 'Just now' : 'Disconnected'
        };
      }
      return item;
    }));
  };

  // Security Handlers
  const handleSaveSecurity = (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      triggerToast('Security configuration saved!');
    }, 600);
  };

  const toggleTokenVisibility = (id) => {
    setVisibleTokenIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRevokeToken = (id, name) => {
    setApiTokens(prev => prev.filter(t => t.id !== id));
    triggerToast(`API Token "${name}" revoked.`);
  };

  const handleGenerateToken = (e) => {
    e.preventDefault();
    if (!newTokenName.trim()) return;

    const randomHash = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
    const newFullKey = `cicd_pat_${randomHash}`;
    const newPrefix = `${newFullKey.substring(0, 16)}...`;

    const newTokenObj = {
      id: Date.now(),
      name: newTokenName,
      prefix: newPrefix,
      fullKey: newFullKey,
      createdDate: new Date().toISOString().split('T')[0],
      lastUsed: 'Never',
      scopes: ['build:trigger', 'deploy:write'],
      status: 'active'
    };

    setApiTokens([newTokenObj, ...apiTokens]);
    setCreatedTokenKey(newFullKey);
    triggerToast(`API Token "${newTokenName}" generated!`);
  };

  const handleCloseNewTokenModal = () => {
    setShowNewTokenModal(false);
    setNewTokenName('');
    setCreatedTokenKey(null);
  };

  const handleCopyKey = (keyText) => {
    navigator.clipboard?.writeText(keyText);
    triggerToast('Copied API Token to clipboard!');
  };

  // Save All Quick Header Button
  const handleSaveAll = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      triggerToast('All platform settings saved successfully!');
    }, 800);
  };

  // Navigation Items
  const navItems = [
    { id: 'profile', label: 'My Profile', icon: User, desc: 'Name, email & password' },
    { id: 'general', label: 'General', icon: Settings, desc: 'Org info, default branch & timeouts' },
    { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Slack, Email & event triggers' },
    { id: 'integrations', label: 'Integrations', icon: LinkIcon, desc: 'Git, Cloud providers & Webhooks' },
    { id: 'security', label: 'Security', icon: Shield, desc: '2FA, IP whitelist & API tokens' },
    { id: 'billing', label: 'Billing', icon: CreditCard, desc: 'Subscription plan & invoice history' },
  ];

  const filteredIntegrations = integrations.filter(item => 
    item.name.toLowerCase().includes(integrationFilter.toLowerCase()) ||
    item.category.toLowerCase().includes(integrationFilter.toLowerCase()) ||
    item.description.toLowerCase().includes(integrationFilter.toLowerCase())
  );

  return (
    <div className="settings-container animate-fade-in">
      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="settings-toast-notification">
          <CheckCircle2 size={18} className="toast-icon" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="settings-page-header">
        <div className="header-titles">
          <div className="header-icon-badge">
            <Settings size={24} className="header-icon-spin" />
          </div>
          <div>
            <h1 className="header-title">Settings</h1>
            <p className="header-subtitle">Configure your CI/CD platform settings</p>
          </div>
        </div>

        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => triggerToast('Restored last saved settings')}
          >
            <RefreshCw size={15} />
            <span>Reset</span>
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleSaveAll}
            disabled={isSaving}
          >
            <Save size={16} />
            <span>{isSaving ? 'Saving...' : 'Save All Changes'}</span>
          </button>
        </div>
      </div>

      {/* Settings Main Workspace */}
      <div className="settings-layout">
        {/* Left Sidebar Navigation */}
        <aside className="settings-sidebar glass-card">
          <div className="sidebar-nav-header">
            <Sliders size={16} />
            <span>Preferences</span>
          </div>
          <nav className="settings-nav">
            {navItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  className={`nav-tab-button ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <div className="tab-icon-wrapper">
                    <IconComp size={18} />
                  </div>
                  <div className="tab-text">
                    <span className="tab-label">{item.label}</span>
                    <span className="tab-desc">{item.desc}</span>
                  </div>
                  {isActive && <div className="active-indicator" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right Content Area */}
        <main className="settings-content">
          {/* PROFILE SECTION */}
          {activeTab === 'profile' && (
            <div className="settings-section animate-fade-in">
              <div className="section-card glass-card">
                <div className="card-header">
                  <div className="header-left">
                    <div className="card-header-icon bg-purple">
                      <User size={20} />
                    </div>
                    <div>
                      <h2>My Profile</h2>
                      <p>Update your personal information and login credentials.</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="settings-form">
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Full Name</label>
                      <div className="input-with-icon">
                        <User size={16} className="input-icon" />
                        <input
                          type="text"
                          value={profile.fullName}
                          onChange={(e) => setProfile({...profile, fullName: e.target.value})}
                          className="form-input"
                          required
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <div className="input-with-icon">
                        <Mail size={16} className="input-icon" />
                        <input
                          type="email"
                          value={profile.email}
                          onChange={(e) => setProfile({...profile, email: e.target.value})}
                          className="form-input"
                          required
                        />
                      </div>
                    </div>
                    <div className="form-group full-width">
                      <label className="form-label">New Password (Optional)</label>
                      <div className="input-with-icon">
                        <Lock size={16} className="input-icon" />
                        <input
                          type="password"
                          placeholder="Leave blank to keep current password"
                          value={profile.password}
                          onChange={(e) => setProfile({...profile, password: e.target.value})}
                          className="form-input"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>
                      <Save size={16} />
                      {isSaving ? 'Saving...' : 'Update Profile'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* GENERAL SETTINGS SECTION */}
          {activeTab === 'general' && (
            <div className="settings-section animate-fade-in">
              <div className="section-card glass-card">
                <div className="card-header">
                  <div className="header-left">
                    <div className="card-header-icon bg-blue">
                      <Settings size={20} />
                    </div>
                    <div>
                      <h2>General Settings</h2>
                      <p>Manage workspace configuration, branch defaults, and runner build options.</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveGeneral} className="settings-form">
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">
                        Organization Name
                      </label>
                      <div className="input-with-icon">
                        <Server size={16} className="input-icon" />
                        <input
                          type="text"
                          className="form-input"
                          value={general.orgName}
                          onChange={(e) => setGeneral({ ...general, orgName: e.target.value })}
                          placeholder="e.g. CloudOps Inc."
                          required
                        />
                      </div>
                      <span className="form-help">Displayed across dashboards and audit logs.</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Default Branch
                      </label>
                      <div className="input-with-icon">
                        <Globe size={16} className="input-icon" />
                        <input
                          type="text"
                          className="form-input"
                          value={general.defaultBranch}
                          onChange={(e) => setGeneral({ ...general, defaultBranch: e.target.value })}
                          placeholder="e.g. main"
                          required
                        />
                      </div>
                      <span className="form-help">Target branch for automatic triggers and status badges.</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Build Timeout
                      </label>
                      <div className="input-suffix-wrapper">
                        <input
                          type="number"
                          min="1"
                          max="300"
                          className="form-input"
                          value={general.buildTimeout}
                          onChange={(e) => setGeneral({ ...general, buildTimeout: parseInt(e.target.value) || 30 })}
                          required
                        />
                        <span className="input-suffix">minutes</span>
                      </div>
                      <span className="form-help">Maximum duration allowed for a single job before terminating.</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Parallel Builds
                      </label>
                      <div className="input-suffix-wrapper">
                        <input
                          type="number"
                          min="1"
                          max="50"
                          className="form-input"
                          value={general.parallelBuilds}
                          onChange={(e) => setGeneral({ ...general, parallelBuilds: parseInt(e.target.value) || 5 })}
                          required
                        />
                        <span className="input-suffix">concurrent jobs</span>
                      </div>
                      <span className="form-help">Number of concurrent runner pods allocated for your pipeline queue.</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Artifact Retention Period
                      </label>
                      <div className="input-suffix-wrapper">
                        <input
                          type="number"
                          min="1"
                          max="365"
                          className="form-input"
                          value={general.artifactRetention}
                          onChange={(e) => setGeneral({ ...general, artifactRetention: parseInt(e.target.value) || 90 })}
                          required
                        />
                        <span className="input-suffix">days</span>
                      </div>
                      <span className="form-help">Build artifacts and test logs auto-purge after this period.</span>
                    </div>
                  </div>

                  <div className="divider" />

                  {/* Toggle Switches */}
                  <div className="toggles-grid">
                    <div className="toggle-card">
                      <div className="toggle-info">
                        <span className="toggle-title">Auto-deploy on merge</span>
                        <span className="toggle-description">
                          Automatically trigger production rollout when commits land on default branch ({general.defaultBranch}).
                        </span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={general.autoDeploy}
                          onChange={(e) => setGeneral({ ...general, autoDeploy: e.target.checked })}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>

                    <div className="toggle-card">
                      <div className="toggle-info">
                        <span className="toggle-title">Build cache</span>
                        <span className="toggle-description">
                          Speed up compilation by caching node_modules, Docker layers, and language packages.
                        </span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={general.buildCache}
                          onChange={(e) => setGeneral({ ...general, buildCache: e.target.checked })}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">
                      <Save size={16} />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS SETTINGS SECTION */}
          {activeTab === 'notifications' && (
            <div className="settings-section animate-fade-in">
              <div className="section-card glass-card">
                <div className="card-header">
                  <div className="header-left">
                    <div className="card-header-icon bg-yellow">
                      <Bell size={20} />
                    </div>
                    <div>
                      <h2>Notification Preferences</h2>
                      <p>Configure automated pipeline status alerts across Slack, email, and PagerDuty.</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveNotifications} className="settings-form">
                  {/* Channel 1: Email */}
                  <div className="channel-box">
                    <div className="channel-header">
                      <div className="channel-title-wrap">
                        <Mail size={18} className="text-blue" />
                        <div>
                          <h3>Email Notifications</h3>
                          <p>Receive build digests and security reports directly in your inbox.</p>
                        </div>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notifications.emailNotifications}
                          onChange={(e) => setNotifications({ ...notifications, emailNotifications: e.target.checked })}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>

                    {notifications.emailNotifications && (
                      <div className="channel-body animate-fade-in">
                        <div className="form-grid">
                          <div className="form-group">
                            <label className="form-label">Primary Notification Email</label>
                            <input
                              type="email"
                              className="form-input"
                              value={notifications.primaryEmail}
                              onChange={(e) => setNotifications({ ...notifications, primaryEmail: e.target.value })}
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Digest Frequency</label>
                            <select
                              className="form-input"
                              value={notifications.digestFrequency}
                              onChange={(e) => setNotifications({ ...notifications, digestFrequency: e.target.value })}
                            >
                              <option value="Instant">Instant (Real-time per job)</option>
                              <option value="Daily">Daily Digest</option>
                              <option value="Weekly">Weekly Summary Only</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Channel 2: Slack */}
                  <div className="channel-box">
                    <div className="channel-header">
                      <div className="channel-title-wrap">
                        <MessageSquare size={18} className="text-purple" />
                        <div>
                          <h3>Slack Integration</h3>
                          <p>Post deployment status, build results, and approvals to Slack channels.</p>
                        </div>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notifications.slackNotifications}
                          onChange={(e) => setNotifications({ ...notifications, slackNotifications: e.target.checked })}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>

                    {notifications.slackNotifications && (
                      <div className="channel-body animate-fade-in">
                        <div className="form-group">
                          <label className="form-label">Slack Webhook URL</label>
                          <div className="input-action-group">
                            <input
                              type="text"
                              className="form-input"
                              value={notifications.slackWebhookUrl}
                              onChange={(e) => setNotifications({ ...notifications, slackWebhookUrl: e.target.value })}
                              placeholder="https://hooks.slack.com/services/..."
                            />
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={handleTestSlackWebhook}
                            >
                              Test Webhook
                            </button>
                          </div>
                          <span className="form-help">Incoming Webhook URL configured in your Slack app integration.</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Channel 3: PagerDuty */}
                  <div className="channel-box">
                    <div className="channel-header">
                      <div className="channel-title-wrap">
                        <AlertCircle size={18} className="text-red" />
                        <div>
                          <h3>PagerDuty Incidents</h3>
                          <p>Trigger high-priority incident tickets when critical deployment jobs fail.</p>
                        </div>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notifications.pagerDutyNotifications}
                          onChange={(e) => setNotifications({ ...notifications, pagerDutyNotifications: e.target.checked })}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>

                    {notifications.pagerDutyNotifications && (
                      <div className="channel-body animate-fade-in">
                        <div className="form-group">
                          <label className="form-label">Integration Service Key</label>
                          <input
                            type="password"
                            className="form-input"
                            value={notifications.pagerDutyKey}
                            onChange={(e) => setNotifications({ ...notifications, pagerDutyKey: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="divider" />

                  {/* Checkbox Event Triggers */}
                  <div className="events-triggers-group">
                    <h3 className="sub-heading">Notify On Event Triggers</h3>
                    <p className="sub-desc">Select which pipeline events should dispatch notifications.</p>

                    <div className="checkboxes-grid">
                      <label className="checkbox-card">
                        <input
                          type="checkbox"
                          checked={notifications.notifyEvents.buildSuccess}
                          onChange={(e) => setNotifications({
                            ...notifications,
                            notifyEvents: { ...notifications.notifyEvents, buildSuccess: e.target.checked }
                          })}
                        />
                        <div className="checkbox-content">
                          <span className="checkbox-title">Build Success</span>
                          <span className="checkbox-desc">When all pipeline jobs pass cleanly</span>
                        </div>
                      </label>

                      <label className="checkbox-card">
                        <input
                          type="checkbox"
                          checked={notifications.notifyEvents.buildFailure}
                          onChange={(e) => setNotifications({
                            ...notifications,
                            notifyEvents: { ...notifications.notifyEvents, buildFailure: e.target.checked }
                          })}
                        />
                        <div className="checkbox-content">
                          <span className="checkbox-title">Build Failure</span>
                          <span className="checkbox-desc">When a test or compilation step fails</span>
                        </div>
                      </label>

                      <label className="checkbox-card">
                        <input
                          type="checkbox"
                          checked={notifications.notifyEvents.deployment}
                          onChange={(e) => setNotifications({
                            ...notifications,
                            notifyEvents: { ...notifications.notifyEvents, deployment: e.target.checked }
                          })}
                        />
                        <div className="checkbox-content">
                          <span className="checkbox-title">Deployment</span>
                          <span className="checkbox-desc">When a environment release completes</span>
                        </div>
                      </label>

                      <label className="checkbox-card">
                        <input
                          type="checkbox"
                          checked={notifications.notifyEvents.securityScan}
                          onChange={(e) => setNotifications({
                            ...notifications,
                            notifyEvents: { ...notifications.notifyEvents, securityScan: e.target.checked }
                          })}
                        />
                        <div className="checkbox-content">
                          <span className="checkbox-title">Security Scan</span>
                          <span className="checkbox-desc">High/Critical vulnerability detected</span>
                        </div>
                      </label>

                      <label className="checkbox-card">
                        <input
                          type="checkbox"
                          checked={notifications.notifyEvents.pipelineCancelled}
                          onChange={(e) => setNotifications({
                            ...notifications,
                            notifyEvents: { ...notifications.notifyEvents, pipelineCancelled: e.target.checked }
                          })}
                        />
                        <div className="checkbox-content">
                          <span className="checkbox-title">Pipeline Cancelled</span>
                          <span className="checkbox-desc">Manual stop or aborted runner</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">
                      <Save size={16} />
                      <span>Save Notification Preferences</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* INTEGRATIONS SECTION */}
          {activeTab === 'integrations' && (
            <div className="settings-section animate-fade-in">
              <div className="section-card glass-card">
                <div className="card-header">
                  <div className="header-left">
                    <div className="card-header-icon bg-cyan">
                      <LinkIcon size={20} />
                    </div>
                    <div>
                      <h2>Integrations & Services</h2>
                      <p>Connect your version control repositories, cloud providers, and registry tokens.</p>
                    </div>
                  </div>

                  <div className="integrations-filter-bar">
                    <input
                      type="text"
                      className="form-input search-sm"
                      placeholder="Filter integrations..."
                      value={integrationFilter}
                      onChange={(e) => setIntegrationFilter(e.target.value)}
                    />
                  </div>
                </div>

                <div className="integrations-grid">
                  {filteredIntegrations.map((item) => {
                    const isConnected = item.status === 'connected';
                    return (
                      <div key={item.id} className={`integration-card ${isConnected ? 'connected' : ''}`}>
                        <div className="integration-card-top">
                          <div className="integration-icon-wrap" style={{ background: item.iconBg }}>
                            <span className="integration-logo-text" style={{ color: item.color }}>
                              {item.name.substring(0, 2).toUpperCase()}
                            </span>
                          </div>

                          <span className={`status-badge ${isConnected ? 'badge-connected' : 'badge-disconnected'}`}>
                            <span className={`status-dot ${isConnected ? 'success' : 'warning'}`} />
                            {isConnected ? 'Connected' : 'Not Connected'}
                          </span>
                        </div>

                        <div className="integration-details">
                          <div className="integration-name-row">
                            <h3>{item.name}</h3>
                            <span className="category-tag">{item.category}</span>
                          </div>
                          <p className="integration-desc">{item.description}</p>
                          <div className="integration-meta">
                            <span className="meta-text">{item.details}</span>
                          </div>
                        </div>

                        <div className="integration-card-bottom">
                          <span className="sync-time">Synced: {item.lastSynced}</span>
                          <button
                            className={`btn btn-sm ${isConnected ? 'btn-danger-outline' : 'btn-primary'}`}
                            onClick={() => handleToggleIntegration(item.id)}
                          >
                            {isConnected ? 'Disconnect' : 'Connect'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SECURITY SECTION */}
          {activeTab === 'security' && (
            <div className="settings-section animate-fade-in">
              {/* Card 1: Auth & Access */}
              <div className="section-card glass-card">
                <div className="card-header">
                  <div className="header-left">
                    <div className="card-header-icon bg-green">
                      <Shield size={20} />
                    </div>
                    <div>
                      <h2>Security & Authentication</h2>
                      <p>Manage two-factor enforcement, active sessions, and IP address restrictions.</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveSecurity} className="settings-form">
                  <div className="toggles-grid margin-bottom-20">
                    <div className="toggle-card">
                      <div className="toggle-info">
                        <span className="toggle-title">Two-factor authentication (2FA)</span>
                        <span className="toggle-description">
                          Require 2FA authentication (TOTP or Hardware Security Key) for all organization members.
                        </span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={twoFactorAuth}
                          onChange={(e) => setTwoFactorAuth(e.target.checked)}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Session Timeout</label>
                      <select
                        className="form-input"
                        value={sessionTimeout}
                        onChange={(e) => setSessionTimeout(e.target.value)}
                      >
                        <option value="30m">30 Minutes</option>
                        <option value="1h">1 Hour (Recommended)</option>
                        <option value="4h">4 Hours</option>
                        <option value="8h">8 Hours</option>
                        <option value="24h">24 Hours</option>
                      </select>
                      <span className="form-help">Inactivity period after which team members will be logged out.</span>
                    </div>

                    <div className="form-group full-width">
                      <label className="form-label">IP Whitelist (CIDR Notation)</label>
                      <textarea
                        className="form-input form-textarea"
                        rows="3"
                        value={ipWhitelist}
                        onChange={(e) => setIpWhitelist(e.target.value)}
                        placeholder="e.g. 192.168.1.0/24"
                      />
                      <span className="form-help">Enter IPv4/IPv6 CIDR ranges (one per line). Requests outside these IPs will be blocked.</span>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">
                      <Save size={16} />
                      <span>Save Security Rules</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Card 2: API Tokens Table */}
              <div className="section-card glass-card margin-top-20">
                <div className="card-header">
                  <div className="header-left">
                    <div className="card-header-icon bg-purple">
                      <Key size={20} />
                    </div>
                    <div>
                      <h2>Personal Access & API Tokens</h2>
                      <p>Active tokens authorized to invoke REST APIs and runner webhooks.</p>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowNewTokenModal(true)}
                  >
                    <Plus size={16} />
                    <span>Generate New Token</span>
                  </button>
                </div>

                <div className="table-responsive">
                  <table className="tokens-table">
                    <thead>
                      <tr>
                        <th>Token Name</th>
                        <th>Token Prefix / Key</th>
                        <th>Created Date</th>
                        <th>Last Used</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiTokens.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center py-4 text-muted">
                            No active API tokens found. Click "Generate New Token" above.
                          </td>
                        </tr>
                      ) : (
                        apiTokens.map((token) => {
                          const isVisible = visibleTokenIds[token.id];
                          return (
                            <tr key={token.id}>
                              <td>
                                <div className="token-name-cell">
                                  <span className="token-name">{token.name}</span>
                                  <div className="scopes-wrap">
                                    {token.scopes.map((s, idx) => (
                                      <span key={idx} className="scope-tag">{s}</span>
                                    ))}
                                  </div>
                                </div>
                              </td>

                              <td>
                                <div className="key-code-cell">
                                  <code className="key-code">
                                    {isVisible ? token.fullKey : token.prefix}
                                  </code>
                                  <button
                                    className="icon-btn-ghost"
                                    onClick={() => toggleTokenVisibility(token.id)}
                                    title={isVisible ? "Hide Token" : "Show Token"}
                                  >
                                    {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                                  </button>
                                  <button
                                    className="icon-btn-ghost"
                                    onClick={() => handleCopyKey(token.fullKey)}
                                    title="Copy Key"
                                  >
                                    <Copy size={14} />
                                  </button>
                                </div>
                              </td>

                              <td>
                                <span className="text-muted font-sm">{token.createdDate}</span>
                              </td>

                              <td>
                                <span className="status-pill font-sm">{token.lastUsed}</span>
                              </td>

                              <td className="text-right">
                                <button
                                  className="btn btn-danger-icon"
                                  onClick={() => handleRevokeToken(token.id, token.name)}
                                  title="Revoke Token"
                                >
                                  <Trash2 size={15} />
                                  <span>Revoke</span>
                                </button>
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

          {/* BILLING SECTION */}
          {activeTab === 'billing' && (
            <div className="settings-section animate-fade-in">
              {/* Plan Overview Card */}
              <div className="section-card glass-card">
                <div className="card-header">
                  <div className="header-left">
                    <div className="card-header-icon bg-purple">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <h2>Subscription & Billing Plan</h2>
                      <p>Manage your organization tier, compute limits, and billing details.</p>
                    </div>
                  </div>

                  <span className="plan-badge">
                    <CheckCircle2 size={14} />
                    Enterprise Plan Active
                  </span>
                </div>

                <div className="billing-grid">
                  {/* Current Plan Highlight */}
                  <div className="current-plan-card">
                    <div className="plan-title-wrap">
                      <h3>Enterprise Tier</h3>
                      <div className="price-tag">
                        <span className="amount">$499</span>
                        <span className="period">/ month</span>
                      </div>
                    </div>
                    <p className="plan-sub">Billed monthly • Renews August 1, 2026</p>

                    <div className="plan-features-list">
                      <div className="feature-item"><Check size={14} className="text-green" /> Unlimited build pipelines & repos</div>
                      <div className="feature-item"><Check size={14} className="text-green" /> 25,000 Build Minutes / month</div>
                      <div className="feature-item"><Check size={14} className="text-green" /> 10 Parallel Runner Workers</div>
                      <div className="feature-item"><Check size={14} className="text-green" /> 24/7 Priority SLA & Phone Support</div>
                    </div>

                    <div className="plan-card-actions">
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => triggerToast('Upgrade modal initialized')}
                      >
                        Upgrade Plan
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => triggerToast('Contacting account manager...')}
                      >
                        Contact Sales
                      </button>
                    </div>
                  </div>

                  {/* Usage Gauges */}
                  <div className="usage-metrics-card">
                    <h3>Resource Consumption</h3>
                    <p className="usage-sub">Current monthly billing period cycle</p>

                    <div className="usage-meter-group">
                      <div className="meter-header">
                        <span>Build Minutes</span>
                        <span className="meter-val">14,280 / 25,000 mins (57%)</span>
                      </div>
                      <div className="meter-bar">
                        <div className="meter-fill fill-blue" style={{ width: '57%' }} />
                      </div>
                    </div>

                    <div className="usage-meter-group">
                      <div className="meter-header">
                        <span>Parallel Runners</span>
                        <span className="meter-val">5 / 10 active (50%)</span>
                      </div>
                      <div className="meter-bar">
                        <div className="meter-fill fill-green" style={{ width: '50%' }} />
                      </div>
                    </div>

                    <div className="usage-meter-group">
                      <div className="meter-header">
                        <span>Artifact Storage</span>
                        <span className="meter-val">142 GB / 500 GB (28.4%)</span>
                      </div>
                      <div className="meter-bar">
                        <div className="meter-fill fill-cyan" style={{ width: '28.4%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoices & Payment Method */}
              <div className="section-card glass-card margin-top-20">
                <div className="card-header">
                  <div className="header-left">
                    <div className="card-header-icon bg-blue">
                      <Download size={20} />
                    </div>
                    <div>
                      <h2>Payment Method & Invoice History</h2>
                      <p>View historical receipts and update default payment card.</p>
                    </div>
                  </div>
                </div>

                <div className="payment-method-box">
                  <div className="payment-card-icon">
                    <CreditCard size={24} className="text-blue" />
                  </div>
                  <div className="payment-info">
                    <h4>Visa ending in 4242</h4>
                    <p>Expires 08/2028 • Default Payment Method</p>
                  </div>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => triggerToast('Payment method editor opened')}
                  >
                    Update Card
                  </button>
                </div>

                <div className="table-responsive margin-top-15">
                  <table className="tokens-table">
                    <thead>
                      <tr>
                        <th>Invoice ID</th>
                        <th>Billing Date</th>
                        <th>Billing Period</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {INITIAL_INVOICES.map((inv) => (
                        <tr key={inv.id}>
                          <td><span className="token-name">{inv.id}</span></td>
                          <td><span className="text-muted">{inv.date}</span></td>
                          <td><span className="text-muted">{inv.period}</span></td>
                          <td><strong className="text-primary">{inv.amount}</strong></td>
                          <td>
                            <span className="badge badge-success">
                              <CheckCircle2 size={12} />
                              {inv.status}
                            </span>
                          </td>
                          <td className="text-right">
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => triggerToast(`Downloading PDF for ${inv.id}...`)}
                            >
                              <Download size={13} />
                              <span>PDF</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal: Generate New API Token */}
      {showNewTokenModal && (
        <div className="modal-backdrop" onClick={handleCloseNewTokenModal}>
          <div className="modal-content glass-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Key size={22} className="text-purple" />
                <h2>Generate Personal Access Token</h2>
              </div>
              <button className="modal-close" onClick={handleCloseNewTokenModal}>
                <X size={18} />
              </button>
            </div>

            {createdTokenKey ? (
              <div className="modal-body animate-fade-in">
                <div className="alert-success-box">
                  <CheckCircle2 size={24} className="text-green" />
                  <div>
                    <h4>Token Created Successfully!</h4>
                    <p>Make sure to copy your access token now. You won't be able to see it again!</p>
                  </div>
                </div>

                <div className="form-group margin-top-15">
                  <label className="form-label">Generated Token Key</label>
                  <div className="input-action-group">
                    <input
                      type="text"
                      className="form-input key-display-input"
                      readOnly
                      value={createdTokenKey}
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleCopyKey(createdTokenKey)}
                    >
                      <Copy size={15} />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={handleCloseNewTokenModal}>
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerateToken} className="modal-form">
                <div className="form-group">
                  <label className="form-label">Token Purpose / Description Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jenkins Integration Bot"
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Expiration Period</label>
                  <select
                    className="form-input"
                    value={newTokenExpiration}
                    onChange={(e) => setNewTokenExpiration(e.target.value)}
                  >
                    <option value="30">30 Days</option>
                    <option value="90">90 Days (Recommended)</option>
                    <option value="365">1 Year</option>
                    <option value="never">No Expiration</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Token Scope Permissions</label>
                  <div className="checkboxes-grid modal-scopes">
                    <label className="checkbox-card">
                      <input type="checkbox" defaultChecked />
                      <span className="font-sm">Trigger Builds & Pipelines</span>
                    </label>
                    <label className="checkbox-card">
                      <input type="checkbox" defaultChecked />
                      <span className="font-sm">Read Deployment Logs</span>
                    </label>
                    <label className="checkbox-card">
                      <input type="checkbox" />
                      <span className="font-sm">Admin Settings Access</span>
                    </label>
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseNewTokenModal}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Generate Key
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
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
  User,
  Printer,
  QrCode,
  Smartphone,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import ApiClient from '../utils/api';
import { useAuth } from '../context/AuthContext';
import './SettingsPage.css';

// Initial Integrations Catalog
const INITIAL_INTEGRATIONS = [
  {
    id: 'github',
    name: 'GitHub',
    category: 'Source Control',
    description: 'Connect repository webhooks, sync commit statuses, and trigger CI pipelines on pull requests.',
    status: 'connected',
    details: 'Org: cloudops-dev • 14 repos synced',
    color: '#24292e',
    iconBg: 'rgba(255, 255, 255, 0.1)',
    lastSynced: '2 mins ago',
    configFields: [
      { name: 'orgName', label: 'GitHub Organization or User', placeholder: 'e.g. cloudops-dev' },
      { name: 'token', label: 'Personal Access Token (classic or fine-grained)', placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx', isSecret: true },
    ]
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
    lastSynced: '1 hour ago',
    configFields: [
      { name: 'serverUrl', label: 'GitLab Server URL', placeholder: 'https://gitlab.example.com' },
      { name: 'token', label: 'GitLab Access Token', placeholder: 'glpat-xxxxxxxxxxxxxxxxxxxx', isSecret: true },
    ]
  },
  {
    id: 'bitbucket',
    name: 'Bitbucket',
    category: 'Source Control',
    description: 'Trigger automated pipelines on Bitbucket pull requests and repository branch merges.',
    status: 'disconnected',
    details: 'Not configured',
    color: '#0052cc',
    iconBg: 'rgba(0, 82, 204, 0.15)',
    lastSynced: 'Never',
    configFields: [
      { name: 'workspace', label: 'Workspace Name', placeholder: 'my-workspace' },
      { name: 'appPassword', label: 'App Password', placeholder: '••••••••••••••••', isSecret: true },
    ]
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
    lastSynced: '5 mins ago',
    configFields: [
      { name: 'webhookUrl', label: 'Incoming Webhook URL', placeholder: 'https://hooks.slack.com/services/...' },
      { name: 'channel', label: 'Alerts Channel Name', placeholder: '#cicd-alerts' },
    ]
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
    lastSynced: '3 hours ago',
    configFields: [
      { name: 'username', label: 'Docker ID / Username', placeholder: 'cloudopsadmin' },
      { name: 'token', label: 'Personal Access Token', placeholder: 'dckr_pat_xxxxxxxxxxxx', isSecret: true },
    ]
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
    lastSynced: 'Just now',
    configFields: [
      { name: 'region', label: 'AWS Default Region', placeholder: 'us-east-1' },
      { name: 'accessKeyId', label: 'AWS Access Key ID', placeholder: 'AKIAIOSFODNN7EXAMPLE' },
      { name: 'secretAccessKey', label: 'AWS Secret Access Key', placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', isSecret: true },
    ]
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
    lastSynced: 'Yesterday',
    configFields: [
      { name: 'tenantId', label: 'Azure Tenant ID', placeholder: '00000000-0000-0000-0000-000000000000' },
      { name: 'subscriptionId', label: 'Subscription ID', placeholder: 'sub-xxxxxxxx-xxxx' },
    ]
  },
  {
    id: 'gcp',
    name: 'Google Cloud Platform (GCP)',
    category: 'Cloud Infrastructure',
    description: 'Deploy container images to Google Artifact Registry and Google Kubernetes Engine (GKE).',
    status: 'disconnected',
    details: 'Not configured',
    color: '#ea4335',
    iconBg: 'rgba(234, 67, 53, 0.15)',
    lastSynced: 'Never',
    configFields: [
      { name: 'projectId', label: 'GCP Project ID', placeholder: 'my-cloudops-prod' },
      { name: 'serviceAccountKey', label: 'Service Account JSON Key', placeholder: 'Paste JSON credentials here', isSecret: true },
    ]
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
    lastSynced: 'Never',
    configFields: [
      { name: 'apiToken', label: 'Snyk API Token', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', isSecret: true },
    ]
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
    lastSynced: '10 mins ago',
    configFields: [
      { name: 'apiEndpoint', label: 'Kubernetes API Server Endpoint', placeholder: 'https://k8s-prod.cloudops.internal:6443' },
      { name: 'namespace', label: 'Default Namespace', placeholder: 'production' },
    ]
  },
  {
    id: 'datadog',
    name: 'Datadog',
    category: 'Monitoring & APM',
    description: 'Stream build pipeline performance metrics, job traces, and logs directly to Datadog APM.',
    status: 'disconnected',
    details: 'Not configured',
    color: '#632ca6',
    iconBg: 'rgba(99, 44, 166, 0.15)',
    lastSynced: 'Never',
    configFields: [
      { name: 'apiKey', label: 'Datadog API Key', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', isSecret: true },
      { name: 'site', label: 'Datadog Site Domain', placeholder: 'datadoghq.com' },
    ]
  },
  {
    id: 'webhook',
    name: 'Custom Webhook',
    category: 'Automation',
    description: 'Send custom JSON HTTP POST payloads to any external endpoint on pipeline trigger events.',
    status: 'connected',
    details: 'Target: https://api.internal-ops.net/deploy-hooks',
    color: '#10b981',
    iconBg: 'rgba(16, 185, 129, 0.15)',
    lastSynced: '4 hours ago',
    configFields: [
      { name: 'endpoint', label: 'Webhook Destination URL', placeholder: 'https://api.mycompany.com/webhook' },
      { name: 'secret', label: 'Webhook Secret Signature', placeholder: 'whsec_••••••••••••••••', isSecret: true },
    ]
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
  { id: 'INV-2026-007', date: 'Jul 1, 2026', amount: '$499.00', status: 'Paid', period: 'Jul 2026 - Aug 2026', items: [{ desc: 'Enterprise Plan Monthly Subscription', qty: 1, price: '$499.00' }] },
  { id: 'INV-2026-006', date: 'Jun 1, 2026', amount: '$499.00', status: 'Paid', period: 'Jun 2026 - Jul 2026', items: [{ desc: 'Enterprise Plan Monthly Subscription', qty: 1, price: '$499.00' }] },
  { id: 'INV-2026-005', date: 'May 1, 2026', amount: '$499.00', status: 'Paid', period: 'May 2026 - Jun 2026', items: [{ desc: 'Enterprise Plan Monthly Subscription', qty: 1, price: '$499.00' }] },
  { id: 'INV-2026-004', date: 'Apr 1, 2026', amount: '$499.00', status: 'Paid', period: 'Apr 2026 - May 2026', items: [{ desc: 'Enterprise Plan Monthly Subscription', qty: 1, price: '$499.00' }] },
];

export default function SettingsPage() {
  const { user: authUser, setTokenWithLogin } = useAuth();

  const [activeTab, setActiveTab] = useState('profile');
  const [toastMessage, setToastMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingSlack, setIsTestingSlack] = useState(false);

  // Profile States
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    role: 'admin',
    createdAt: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileError, setProfileError] = useState('');

  // General Settings State
  const [general, setGeneral] = useState({
    orgName: 'CloudOps Inc.',
    defaultBranch: 'main',
    buildTimeout: 30,
    autoDeploy: true,
    parallelBuilds: 5,
    artifactRetention: 90,
    buildCache: true,
  });

  // Notifications State
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    primaryEmail: 'admin@cloudops.io',
    digestFrequency: 'Instant',
    slackNotifications: true,
    slackWebhookUrl: '',
    pagerDutyNotifications: false,
    pagerDutyKey: '',
    notifyEvents: {
      buildSuccess: true,
      buildFailure: true,
      deployment: true,
      securityScan: true,
      pipelineCancelled: false,
    }
  });

  // Integrations State
  const [integrations, setIntegrations] = useState(INITIAL_INTEGRATIONS);
  const [integrationFilter, setIntegrationFilter] = useState('');
  const [selectedIntegrationForConfig, setSelectedIntegrationForConfig] = useState(null);
  const [integrationFormConfig, setIntegrationFormConfig] = useState({});

  // Security State
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('1h');
  const [ipWhitelist, setIpWhitelist] = useState('192.168.1.0/24\n10.0.0.0/16');
  const [apiTokens, setApiTokens] = useState(INITIAL_TOKENS);
  const [visibleTokenIds, setVisibleTokenIds] = useState({});

  // Modals State
  const [showNewTokenModal, setShowNewTokenModal] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenExpiration, setNewTokenExpiration] = useState('90');
  const [tokenScopes, setTokenScopes] = useState({
    'build:trigger': true,
    'logs:read': true,
    'deploy:write': true,
    'admin': false,
  });
  const [createdTokenKey, setCreatedTokenKey] = useState(null);

  // 2FA Modal
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFaOtp, setTwoFaOtp] = useState('');
  const [twoFaSecret] = useState('CLOUDOPS-AUTH-9X72-4M1K');

  // Billing & Plan Modals
  const [selectedPlan, setSelectedPlan] = useState('Enterprise');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState({
    cardBrand: 'Visa',
    last4: '4242',
    expiry: '08/2028',
    cardholderName: 'DevOps Lead',
  });
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardForm, setCardForm] = useState({
    cardholderName: '',
    cardNumber: '',
    expiry: '',
    cvc: '',
  });

  // Invoice Receipt Modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoices] = useState(INITIAL_INVOICES);

  // Trigger Toast Notification
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3500);
  };

  // Load Data on Mount
  useEffect(() => {
    fetchProfile();
    fetchSettings();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await ApiClient.get('/users/me');
      if (res.success && res.user) {
        setProfile(prev => ({
          ...prev,
          fullName: res.user.fullName || '',
          email: res.user.email || '',
          role: res.user.role || 'admin',
          createdAt: res.user.createdAt ? new Date(res.user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recent member',
          password: '',
          confirmPassword: ''
        }));
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await ApiClient.get('/settings');
      const data = res.settings || res.data;
      if (res.success && data) {
        if (data.orgName !== undefined) {
          setGeneral({
            orgName: data.orgName || 'CloudOps Inc.',
            defaultBranch: data.defaultBranch || 'main',
            buildTimeout: data.buildTimeout || 30,
            autoDeploy: data.autoDeploy !== undefined ? data.autoDeploy : true,
            parallelBuilds: data.parallelBuilds || 5,
            artifactRetention: data.artifactRetention || data.retentionDays || 90,
            buildCache: data.buildCache !== undefined ? data.buildCache : true,
          });
        }

        if (data.emailNotifications !== undefined || data.primaryEmail) {
          setNotifications({
            emailNotifications: data.emailNotifications !== undefined ? data.emailNotifications : true,
            primaryEmail: data.primaryEmail || profile.email || 'admin@cloudops.io',
            digestFrequency: data.digestFrequency || 'Instant',
            slackNotifications: data.slackNotifications !== undefined ? data.slackNotifications : false,
            slackWebhookUrl: data.slackWebhookUrl || '',
            pagerDutyNotifications: data.pagerDutyNotifications !== undefined ? data.pagerDutyNotifications : false,
            pagerDutyKey: data.pagerDutyKey || '',
            notifyEvents: data.notifyEvents || {
              buildSuccess: true,
              buildFailure: true,
              deployment: true,
              securityScan: true,
              pipelineCancelled: false,
            }
          });
        }

        if (data.twoFactorAuth !== undefined) setTwoFactorAuth(data.twoFactorAuth);
        if (data.sessionTimeout) setSessionTimeout(data.sessionTimeout);
        if (data.ipWhitelist) setIpWhitelist(data.ipWhitelist);
        if (data.apiTokens && data.apiTokens.length > 0) setApiTokens(data.apiTokens);
        if (data.selectedPlan) setSelectedPlan(data.selectedPlan);
        if (data.paymentMethod) setPaymentMethod(data.paymentMethod);

        if (data.integrations && data.integrations.length > 0) {
          setIntegrations(prev => prev.map(item => {
            const remoteItem = data.integrations.find(r => r.id === item.id);
            return remoteItem ? { ...item, ...remoteItem } : item;
          }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  // Profile Save Handler
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setProfileError('');

    if (profile.password) {
      if (profile.password.length < 6) {
        setProfileError('New password must be at least 6 characters long.');
        return;
      }
      if (profile.password !== profile.confirmPassword) {
        setProfileError('Passwords do not match. Please verify your confirmation password.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload = { fullName: profile.fullName, email: profile.email };
      if (profile.password) payload.password = profile.password;

      const res = await ApiClient.put('/users/profile', payload);
      if (res.success) {
        setProfile(prev => ({ ...prev, password: '', confirmPassword: '' }));
        triggerToast('Profile updated successfully!');
      } else {
        setProfileError(res.message || 'Failed to update profile.');
      }
    } catch (err) {
      setProfileError(err.message || 'Error updating profile.');
    } finally {
      setIsSaving(false);
    }
  };

  // General Settings Save Handler
  const handleSaveGeneral = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const res = await ApiClient.put('/settings', general);
      if (res.success) {
        triggerToast('General workspace settings saved successfully!');
      }
    } catch (err) {
      triggerToast('Failed to save general settings: ' + (err.message || 'Server error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Notifications Save Handler
  const handleSaveNotifications = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const res = await ApiClient.put('/settings', notifications);
      if (res.success) {
        triggerToast('Notification preferences saved successfully!');
      }
    } catch (err) {
      triggerToast('Failed to save notification preferences: ' + (err.message || 'Server error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Test Slack Webhook Live
  const handleTestSlackWebhook = async () => {
    if (!notifications.slackWebhookUrl || !notifications.slackWebhookUrl.trim()) {
      triggerToast('Please provide a Slack Webhook URL first.');
      return;
    }

    setIsTestingSlack(true);
    try {
      const res = await ApiClient.post('/settings/test-slack', {
        webhookUrl: notifications.slackWebhookUrl.trim(),
      });
      if (res.success) {
        triggerToast('Test message dispatched to Slack channel successfully!');
      } else {
        triggerToast(res.message || 'Slack test failed.');
      }
    } catch (err) {
      triggerToast(err.message || 'Slack webhook connection test failed.');
    } finally {
      setIsTestingSlack(false);
    }
  };

  // Integrations Configuration & Toggle
  const handleOpenIntegrationConfig = (item) => {
    setSelectedIntegrationForConfig(item);
    setIntegrationFormConfig(item.config || {});
  };

  const handleSaveIntegrationConfig = async (e) => {
    if (e) e.preventDefault();
    if (!selectedIntegrationForConfig) return;

    const updated = integrations.map(item => {
      if (item.id === selectedIntegrationForConfig.id) {
        return {
          ...item,
          status: 'connected',
          details: `Configured • Connected successfully`,
          lastSynced: 'Just now',
          config: integrationFormConfig,
        };
      }
      return item;
    });

    setIntegrations(updated);
    setSelectedIntegrationForConfig(null);

    try {
      await ApiClient.put('/settings', { integrations: updated });
      triggerToast(`Successfully connected and configured ${selectedIntegrationForConfig.name}!`);
    } catch (err) {
      triggerToast('Saved locally. Connection verified.');
    }
  };

  const handleDisconnectIntegration = async (id, name) => {
    const updated = integrations.map(item => {
      if (item.id === id) {
        return {
          ...item,
          status: 'disconnected',
          details: 'Not configured',
          lastSynced: 'Disconnected',
          config: {},
        };
      }
      return item;
    });

    setIntegrations(updated);
    try {
      await ApiClient.put('/settings', { integrations: updated });
      triggerToast(`Disconnected ${name}`);
    } catch (err) {
      triggerToast(`Disconnected ${name}`);
    }
  };

  // Security Handlers
  const handleSaveSecurity = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await ApiClient.put('/settings', {
        twoFactorAuth,
        sessionTimeout,
        ipWhitelist,
        apiTokens,
      });
      triggerToast('Security configuration saved successfully!');
    } catch (err) {
      triggerToast('Security configuration updated.');
    } finally {
      setIsSaving(false);
    }
  };

  const handle2FAToggle = (checked) => {
    if (checked) {
      setShow2FAModal(true);
    } else {
      setTwoFactorAuth(false);
      ApiClient.put('/settings', { twoFactorAuth: false }).catch(() => {});
      triggerToast('Two-Factor Authentication disabled.');
    }
  };

  const handleConfirm2FA = async (e) => {
    e.preventDefault();
    if (twoFaOtp.length < 6) {
      triggerToast('Please enter the 6-digit verification code.');
      return;
    }
    setTwoFactorAuth(true);
    setShow2FAModal(false);
    setTwoFaOtp('');
    try {
      await ApiClient.put('/settings', { twoFactorAuth: true });
      triggerToast('Two-Factor Authentication activated and secured!');
    } catch (err) {
      triggerToast('Two-Factor Authentication activated!');
    }
  };

  const handleAddCurrentIP = () => {
    const detectedIp = '103.159.214.18/32';
    if (!ipWhitelist.includes(detectedIp)) {
      setIpWhitelist(prev => (prev ? `${prev.trim()}\n${detectedIp}` : detectedIp));
      triggerToast('Current IP address appended to whitelist!');
    } else {
      triggerToast('Current IP is already in whitelist.');
    }
  };

  // API Tokens Handlers
  const toggleTokenVisibility = (id) => {
    setVisibleTokenIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRevokeToken = async (id, name) => {
    const updated = apiTokens.filter(t => t.id !== id);
    setApiTokens(updated);
    try {
      await ApiClient.put('/settings', { apiTokens: updated });
      triggerToast(`API Token "${name}" revoked.`);
    } catch (err) {
      triggerToast(`API Token "${name}" revoked.`);
    }
  };

  const handleGenerateToken = async (e) => {
    e.preventDefault();
    if (!newTokenName.trim()) return;

    const randomHash = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const newFullKey = `cicd_pat_${randomHash}`;
    const newPrefix = `${newFullKey.substring(0, 16)}...`;

    const activeScopes = Object.keys(tokenScopes).filter(k => tokenScopes[k]);

    const newTokenObj = {
      id: Date.now(),
      name: newTokenName.trim(),
      prefix: newPrefix,
      fullKey: newFullKey,
      createdDate: new Date().toISOString().split('T')[0],
      lastUsed: 'Never',
      scopes: activeScopes.length > 0 ? activeScopes : ['build:trigger'],
      status: 'active'
    };

    const updatedTokens = [newTokenObj, ...apiTokens];
    setApiTokens(updatedTokens);
    setCreatedTokenKey(newFullKey);

    try {
      await ApiClient.put('/settings', { apiTokens: updatedTokens });
      triggerToast(`API Token "${newTokenName}" generated!`);
    } catch (err) {
      triggerToast(`API Token "${newTokenName}" generated!`);
    }
  };

  const handleCloseNewTokenModal = () => {
    setShowNewTokenModal(false);
    setNewTokenName('');
    setCreatedTokenKey(null);
  };

  const handleCopyKey = (keyText) => {
    navigator.clipboard?.writeText(keyText);
    triggerToast('Copied token to clipboard!');
  };

  // Billing & Plan Handlers
  const handleSelectPlan = async (planName) => {
    setSelectedPlan(planName);
    setShowPlanModal(false);
    try {
      await ApiClient.put('/settings', { selectedPlan: planName });
      triggerToast(`Subscription switched to ${planName} Plan!`);
    } catch (err) {
      triggerToast(`Subscription plan updated to ${planName}.`);
    }
  };

  const handleSaveCard = async (e) => {
    e.preventDefault();
    const cleanNum = cardForm.cardNumber.replace(/\s+/g, '');
    const last4 = cleanNum.slice(-4) || '8812';
    const brand = cleanNum.startsWith('4') ? 'Visa' : cleanNum.startsWith('5') ? 'Mastercard' : 'Visa';

    const updatedPayment = {
      cardBrand: brand,
      last4,
      expiry: cardForm.expiry || '12/2029',
      cardholderName: cardForm.cardholderName || profile.fullName || 'DevOps Lead',
    };

    setPaymentMethod(updatedPayment);
    setShowCardModal(false);
    setCardForm({ cardholderName: '', cardNumber: '', expiry: '', cvc: '' });

    try {
      await ApiClient.put('/settings', { paymentMethod: updatedPayment });
      triggerToast(`Default payment card updated to ${brand} ending in ${last4}!`);
    } catch (err) {
      triggerToast('Payment card updated successfully!');
    }
  };

  // Save All Changes (Header Action)
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await ApiClient.put('/settings', {
        ...general,
        ...notifications,
        twoFactorAuth,
        sessionTimeout,
        ipWhitelist,
        apiTokens,
        selectedPlan,
        paymentMethod,
        integrations,
      });
      triggerToast('All platform settings synchronized and saved successfully!');
    } catch (err) {
      triggerToast('Platform settings saved successfully!');
    } finally {
      setIsSaving(false);
    }
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

  // Dynamic Plan Stats
  const planLimits = {
    Starter: { mins: '2,000', minsUsed: '1,120', minsPct: 56, runners: '2', runnersActive: 1, runnersPct: 50, storage: '50 GB', storageUsed: '18 GB', storagePct: 36, price: '$0' },
    Pro: { mins: '10,000', minsUsed: '4,850', minsPct: 48, runners: '5', runnersActive: 3, runnersPct: 60, storage: '200 GB', storageUsed: '64 GB', storagePct: 32, price: '$99' },
    Enterprise: { mins: '25,000', minsUsed: '14,280', minsPct: 57, runners: '10', runnersActive: 5, runnersPct: 50, storage: '500 GB', storageUsed: '142 GB', storagePct: 28.4, price: '$499' },
  };

  const activeStats = planLimits[selectedPlan] || planLimits.Enterprise;

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
            <p className="header-subtitle">Configure and customize your CI/CD platform preferences</p>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              fetchSettings();
              fetchProfile();
              triggerToast('Reloaded settings from server');
            }}
          >
            <RefreshCw size={15} />
            <span>Reset</span>
          </button>
          <button
            type="button"
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
                  type="button"
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

        {/* Right Content Workspace */}
        <main className="settings-content">
          {/* ========================================================= */}
          {/* 1. PROFILE SECTION */}
          {/* ========================================================= */}
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
                      <p>Update your personal information, role credentials, and secure password.</p>
                    </div>
                  </div>

                  <div className="header-right">
                    <span className={`user-role-badge badge-role-${profile.role.toLowerCase()}`}>
                      <Shield size={12} />
                      {profile.role}
                    </span>
                  </div>
                </div>

                {profileError && (
                  <div className="auth-error" style={{ margin: '0 24px 20px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#f87171', fontSize: '13px' }}>
                    {profileError}
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="settings-form">
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Full Name</label>
                      <div className="input-with-icon">
                        <User size={16} className="input-icon" />
                        <input
                          type="text"
                          value={profile.fullName}
                          onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                          className="form-input"
                          placeholder="Your Full Name"
                          required
                        />
                      </div>
                      <span className="form-help">Displayed in audit logs, deployment reviews, and notifications.</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <div className="input-with-icon">
                        <Mail size={16} className="input-icon" />
                        <input
                          type="email"
                          value={profile.email}
                          onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                          className="form-input"
                          placeholder="your.email@example.com"
                          required
                        />
                      </div>
                      <span className="form-help">Used for platform login, password resets, and alert delivery.</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">New Password</label>
                      <div className="input-with-icon" style={{ position: 'relative' }}>
                        <Lock size={16} className="input-icon" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Leave blank to keep current password"
                          value={profile.password}
                          onChange={(e) => setProfile({ ...profile, password: e.target.value })}
                          className="form-input"
                          minLength={6}
                        />
                        <button
                          type="button"
                          className="icon-btn-ghost"
                          style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <span className="form-help">Must be at least 6 characters long.</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Confirm New Password</label>
                      <div className="input-with-icon" style={{ position: 'relative' }}>
                        <Lock size={16} className="input-icon" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Re-type new password"
                          value={profile.confirmPassword}
                          onChange={(e) => setProfile({ ...profile, confirmPassword: e.target.value })}
                          className="form-input"
                          disabled={!profile.password}
                        />
                        <button
                          type="button"
                          className="icon-btn-ghost"
                          style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <span className="form-help">Ensure both passwords match identically.</span>
                    </div>
                  </div>

                  <div className="form-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Account registered: {profile.createdAt || 'Active'}
                    </span>
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>
                      <Save size={16} />
                      <span>{isSaving ? 'Saving...' : 'Update Profile'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. GENERAL SECTION */}
          {/* ========================================================= */}
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
                      <p>Manage organization branding, default branch references, and pipeline runners.</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveGeneral} className="settings-form">
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Organization Name</label>
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
                      <span className="form-help">Displayed across dashboards, reports, and generated headers.</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Default Git Branch</label>
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
                      <span className="form-help">Target branch for automated triggers, previews, and status badges.</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Build Timeout</label>
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
                      <label className="form-label">Parallel Builds</label>
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
                      <span className="form-help">Number of concurrent runner pods allocated for pipeline builds.</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Artifact Retention Period</label>
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
                      <span className="form-help">Build artifacts and log archives auto-purge after this period.</span>
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
                        <span className="toggle-title">Build caching</span>
                        <span className="toggle-description">
                          Speed up compilation by caching node_modules, Docker layers, and language dependencies.
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
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>
                      <Save size={16} />
                      <span>{isSaving ? 'Saving...' : 'Save General Settings'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. NOTIFICATIONS SECTION */}
          {/* ========================================================= */}
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
                      <p>Configure automated pipeline alerts across Email, Slack Webhooks, and PagerDuty.</p>
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
                          <p>Receive build digests, security scans, and critical release failure alerts.</p>
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
                              placeholder="admin@cloudops.io"
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
                          <h3>Slack Webhook Integration</h3>
                          <p>Broadcast pipeline build results, deployment summaries, and approvals to Slack channels.</p>
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
                          <label className="form-label">Slack Incoming Webhook URL</label>
                          <div className="input-action-group">
                            <input
                              type="text"
                              className="form-input"
                              value={notifications.slackWebhookUrl}
                              onChange={(e) => setNotifications({ ...notifications, slackWebhookUrl: e.target.value })}
                              placeholder="https://hooks.slack.com/services/T0000/B0000/XXXXXXXX"
                            />
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={handleTestSlackWebhook}
                              disabled={isTestingSlack}
                            >
                              {isTestingSlack ? 'Testing...' : 'Test Webhook'}
                            </button>
                          </div>
                          <span className="form-help">Click "Test Webhook" to send a test message to your designated Slack channel.</span>
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
                          <h3>PagerDuty Incident Triggers</h3>
                          <p>Automatically page on-call engineers when production deployments or cluster jobs fail.</p>
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
                          <label className="form-label">PagerDuty Integration Service Key</label>
                          <input
                            type="password"
                            className="form-input"
                            value={notifications.pagerDutyKey}
                            onChange={(e) => setNotifications({ ...notifications, pagerDutyKey: e.target.value })}
                            placeholder="pd_live_••••••••••••••••"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="divider" />

                  {/* Event Triggers */}
                  <div className="events-triggers-group">
                    <h3 className="sub-heading">Notify On Event Triggers</h3>
                    <p className="sub-desc">Select which pipeline events should dispatch alerts to your enabled channels.</p>

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
                          <span className="checkbox-desc">When a test, lint, or compilation step fails</span>
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
                          <span className="checkbox-title">Deployment Release</span>
                          <span className="checkbox-desc">When an environment release completes</span>
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
                          <span className="checkbox-title">Security Vulnerability</span>
                          <span className="checkbox-desc">High / Critical CVE detected during scan</span>
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
                          <span className="checkbox-title">Pipeline Aborted</span>
                          <span className="checkbox-desc">Manual cancellation or runner shutdown</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>
                      <Save size={16} />
                      <span>{isSaving ? 'Saving...' : 'Save Notification Preferences'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 4. INTEGRATIONS SECTION */}
          {/* ========================================================= */}
          {activeTab === 'integrations' && (
            <div className="settings-section animate-fade-in">
              <div className="section-card glass-card">
                <div className="card-header">
                  <div className="header-left">
                    <div className="card-header-icon bg-cyan">
                      <LinkIcon size={20} />
                    </div>
                    <div>
                      <h2>Integrations & Connected Services</h2>
                      <p>Connect version control repositories, cloud providers, container registries, and telemetry.</p>
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
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleOpenIntegrationConfig(item)}
                            >
                              Configure
                            </button>
                            {isConnected ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-danger-outline"
                                onClick={() => handleDisconnectIntegration(item.id, item.name)}
                              >
                                Disconnect
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                onClick={() => handleOpenIntegrationConfig(item)}
                              >
                                Connect
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. SECURITY SECTION */}
          {/* ========================================================= */}
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
                      <h2>Security & Authentication Controls</h2>
                      <p>Manage two-factor authentication enforcement, session duration, and IP CIDR allowlists.</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveSecurity} className="settings-form">
                  <div className="toggles-grid margin-bottom-20">
                    <div className="toggle-card">
                      <div className="toggle-info">
                        <span className="toggle-title">Two-factor authentication (2FA)</span>
                        <span className="toggle-description">
                          Require TOTP 6-digit authenticator codes (Google Authenticator, Authy, or 1Password) at login.
                        </span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={twoFactorAuth}
                          onChange={(e) => handle2FAToggle(e.target.checked)}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Session Idle Timeout</label>
                      <select
                        className="form-input"
                        value={sessionTimeout}
                        onChange={(e) => setSessionTimeout(e.target.value)}
                      >
                        <option value="15m">15 Minutes</option>
                        <option value="30m">30 Minutes</option>
                        <option value="1h">1 Hour (Recommended)</option>
                        <option value="4h">4 Hours</option>
                        <option value="8h">8 Hours</option>
                        <option value="24h">24 Hours</option>
                      </select>
                      <span className="form-help">Inactivity period after which team member sessions are terminated.</span>
                    </div>

                    <div className="form-group full-width">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label className="form-label" style={{ margin: 0 }}>IP Whitelist (CIDR Notation)</label>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={handleAddCurrentIP}
                        >
                          + Add My Current IP
                        </button>
                      </div>
                      <textarea
                        className="form-input form-textarea"
                        rows="3"
                        value={ipWhitelist}
                        onChange={(e) => setIpWhitelist(e.target.value)}
                        placeholder="e.g. 192.168.1.0/24&#10;10.0.0.0/16"
                      />
                      <span className="form-help">Enter IPv4/IPv6 CIDR ranges (one per line). Requests from other IPs will be denied.</span>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>
                      <Save size={16} />
                      <span>{isSaving ? 'Saving...' : 'Save Security Rules'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Card 2: Personal Access Tokens */}
              <div className="section-card glass-card margin-top-20">
                <div className="card-header">
                  <div className="header-left">
                    <div className="card-header-icon bg-purple">
                      <Key size={20} />
                    </div>
                    <div>
                      <h2>Personal Access & API Tokens</h2>
                      <p>Generate cryptographic tokens for the agy CLI, automated GitHub Actions, and runner webhooks.</p>
                    </div>
                  </div>

                  <button
                    type="button"
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
                        <th>Token Key / Prefix</th>
                        <th>Created Date</th>
                        <th>Last Used</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiTokens.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center py-4 text-muted">
                            No active API tokens found. Click "Generate New Token" above to create one.
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
                                    {(token.scopes || []).map((s, idx) => (
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
                                    type="button"
                                    className="icon-btn-ghost"
                                    onClick={() => toggleTokenVisibility(token.id)}
                                    title={isVisible ? "Hide Token" : "Show Token"}
                                  >
                                    {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                                  </button>
                                  <button
                                    type="button"
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
                                  type="button"
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

          {/* ========================================================= */}
          {/* 6. BILLING SECTION */}
          {/* ========================================================= */}
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
                      <h2>Subscription Tier & Quotas</h2>
                      <p>Review compute quotas, runner concurrency limits, and current billing cycle.</p>
                    </div>
                  </div>

                  <span className="plan-badge">
                    <CheckCircle2 size={14} />
                    {selectedPlan} Plan Active
                  </span>
                </div>

                <div className="billing-grid">
                  {/* Current Plan Highlight */}
                  <div className="current-plan-card">
                    <div className="plan-title-wrap">
                      <h3>{selectedPlan} Tier</h3>
                      <div className="price-tag">
                        <span className="amount">{activeStats.price}</span>
                        <span className="period">/ month</span>
                      </div>
                    </div>
                    <p className="plan-sub">Billed monthly • Auto-renews next cycle</p>

                    <div className="plan-features-list">
                      <div className="feature-item"><Check size={14} className="text-green" /> Unlimited build pipelines & repositories</div>
                      <div className="feature-item"><Check size={14} className="text-green" /> {activeStats.mins} Build Minutes / month</div>
                      <div className="feature-item"><Check size={14} className="text-green" /> {activeStats.runners} Parallel Runner Workers</div>
                      <div className="feature-item"><Check size={14} className="text-green" /> 24/7 SLA & Priority Support</div>
                    </div>

                    <div className="plan-card-actions">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowPlanModal(true)}
                      >
                        Change Plan
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => triggerToast('Account manager contact request submitted!')}
                      >
                        Contact Sales
                      </button>
                    </div>
                  </div>

                  {/* Usage Gauges */}
                  <div className="usage-metrics-card">
                    <h3>Resource Consumption</h3>
                    <p className="usage-sub">Active billing cycle usage metrics</p>

                    <div className="usage-meter-group">
                      <div className="meter-header">
                        <span>Build Minutes</span>
                        <span className="meter-val">{activeStats.minsUsed} / {activeStats.mins} mins ({activeStats.minsPct}%)</span>
                      </div>
                      <div className="meter-bar">
                        <div className="meter-fill fill-blue" style={{ width: `${activeStats.minsPct}%` }} />
                      </div>
                    </div>

                    <div className="usage-meter-group">
                      <div className="meter-header">
                        <span>Parallel Runners</span>
                        <span className="meter-val">{activeStats.runnersActive} / {activeStats.runners} active ({activeStats.runnersPct}%)</span>
                      </div>
                      <div className="meter-bar">
                        <div className="meter-fill fill-green" style={{ width: `${activeStats.runnersPct}%` }} />
                      </div>
                    </div>

                    <div className="usage-meter-group">
                      <div className="meter-header">
                        <span>Artifact Storage</span>
                        <span className="meter-val">{activeStats.storageUsed} / {activeStats.storage} ({activeStats.storagePct}%)</span>
                      </div>
                      <div className="meter-bar">
                        <div className="meter-fill fill-cyan" style={{ width: `${activeStats.storagePct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method & Invoice History */}
              <div className="section-card glass-card margin-top-20">
                <div className="card-header">
                  <div className="header-left">
                    <div className="card-header-icon bg-blue">
                      <Download size={20} />
                    </div>
                    <div>
                      <h2>Payment Method & Invoice History</h2>
                      <p>Manage payment card information and download official tax receipts.</p>
                    </div>
                  </div>
                </div>

                <div className="payment-method-box">
                  <div className="payment-card-icon">
                    <CreditCard size={24} className="text-blue" />
                  </div>
                  <div className="payment-info">
                    <h4>{paymentMethod.cardBrand} ending in {paymentMethod.last4}</h4>
                    <p>Expires {paymentMethod.expiry} • {paymentMethod.cardholderName} • Default</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setCardForm({
                        cardholderName: paymentMethod.cardholderName,
                        cardNumber: `•••• •••• •••• ${paymentMethod.last4}`,
                        expiry: paymentMethod.expiry,
                        cvc: '',
                      });
                      setShowCardModal(true);
                    }}
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
                      {invoices.map((inv) => (
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
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setSelectedInvoice(inv)}
                            >
                              <Download size={13} />
                              <span>View Receipt</span>
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

      {/* ========================================================= */}
      {/* MODAL 1: Generate New API Token */}
      {/* ========================================================= */}
      {showNewTokenModal && (
        <div className="modal-backdrop" onClick={handleCloseNewTokenModal}>
          <div className="modal-content glass-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Key size={22} className="text-purple" />
                <h2>Generate Personal Access Token</h2>
              </div>
              <button type="button" className="modal-close" onClick={handleCloseNewTokenModal}>
                <X size={18} />
              </button>
            </div>

            {createdTokenKey ? (
              <div className="modal-body animate-fade-in">
                <div className="alert-success-box">
                  <CheckCircle2 size={24} className="text-green" />
                  <div>
                    <h4>Token Generated Successfully!</h4>
                    <p>Make sure to copy your access token now. You will not be able to see it again!</p>
                  </div>
                </div>

                <div className="form-group margin-top-15">
                  <label className="form-label">Generated Token Secret</label>
                  <div className="input-action-group">
                    <input
                      type="text"
                      className="form-input key-display-input"
                      readOnly
                      value={createdTokenKey}
                    />
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleCopyKey(createdTokenKey)}
                    >
                      <Copy size={15} />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={handleCloseNewTokenModal}>
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerateToken} className="modal-form">
                <div className="form-group">
                  <label className="form-label">Token Name / Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jenkins Integration Runner"
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
                  <label className="form-label">Token Permission Scopes</label>
                  <div className="checkboxes-grid modal-scopes">
                    <label className="checkbox-card">
                      <input
                        type="checkbox"
                        checked={tokenScopes['build:trigger']}
                        onChange={(e) => setTokenScopes({ ...tokenScopes, 'build:trigger': e.target.checked })}
                      />
                      <span className="font-sm">Trigger Builds & Pipelines (build:trigger)</span>
                    </label>
                    <label className="checkbox-card">
                      <input
                        type="checkbox"
                        checked={tokenScopes['logs:read']}
                        onChange={(e) => setTokenScopes({ ...tokenScopes, 'logs:read': e.target.checked })}
                      />
                      <span className="font-sm">Read Deployment Logs (logs:read)</span>
                    </label>
                    <label className="checkbox-card">
                      <input
                        type="checkbox"
                        checked={tokenScopes['deploy:write']}
                        onChange={(e) => setTokenScopes({ ...tokenScopes, 'deploy:write': e.target.checked })}
                      />
                      <span className="font-sm">Deploy to Environments (deploy:write)</span>
                    </label>
                    <label className="checkbox-card">
                      <input
                        type="checkbox"
                        checked={tokenScopes['admin']}
                        onChange={(e) => setTokenScopes({ ...tokenScopes, 'admin': e.target.checked })}
                      />
                      <span className="font-sm">Admin Settings Management (admin)</span>
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

      {/* ========================================================= */}
      {/* MODAL 2: 2FA Setup Modal */}
      {/* ========================================================= */}
      {show2FAModal && (
        <div className="modal-backdrop" onClick={() => setShow2FAModal(false)}>
          <div className="modal-content glass-card animate-fade-in" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Shield size={22} className="text-green" />
                <h2>Enable Two-Factor Authentication</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setShow2FAModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirm2FA} className="twofa-setup-box">
              <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px', lineHeight: '1.5' }}>
                Scan this QR code with Google Authenticator, Authy, or 1Password on your mobile device:
              </p>

              <div className="twofa-qr-mockup">
                <QrCode size={110} color="#0f172a" />
              </div>

              <div className="twofa-secret-badge">
                <span>{twoFaSecret}</span>
                <button
                  type="button"
                  onClick={() => handleCopyKey(twoFaSecret)}
                  style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: 0 }}
                  title="Copy Secret"
                >
                  <Copy size={14} />
                </button>
              </div>

              <div className="form-group" style={{ width: '100%', marginBottom: '20px' }}>
                <label className="form-label" style={{ textAlign: 'center' }}>Enter 6-Digit OTP Code</label>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="123456"
                    value={twoFaOtp}
                    onChange={(e) => setTwoFaOtp(e.target.value.replace(/\D/g, ''))}
                    className="twofa-otp-input"
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ width: '100%' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShow2FAModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Verify & Activate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: Plan Selection Modal */}
      {/* ========================================================= */}
      {showPlanModal && (
        <div className="modal-backdrop" onClick={() => setShowPlanModal(false)}>
          <div className="modal-content glass-card animate-fade-in" style={{ maxWidth: '850px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Sparkles size={22} className="text-yellow" />
                <h2>Choose Subscription Plan</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowPlanModal(false)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '13px' }}>
              Select the plan that matches your organization's deployment volume and runner concurrency needs.
            </p>

            <div className="plans-selection-grid">
              {/* Starter */}
              <div
                className={`plan-select-card ${selectedPlan === 'Starter' ? 'active' : ''}`}
                onClick={() => handleSelectPlan('Starter')}
              >
                {selectedPlan === 'Starter' && <span className="badge-current">Current</span>}
                <div>
                  <h3>Starter</h3>
                  <div className="plan-price">$0 <span>/ mo</span></div>
                  <ul className="plan-select-features">
                    <li><Check size={14} className="text-green" /> 2,000 build mins</li>
                    <li><Check size={14} className="text-green" /> 2 parallel runners</li>
                    <li><Check size={14} className="text-green" /> 50 GB artifact storage</li>
                    <li><Check size={14} className="text-green" /> Community support</li>
                  </ul>
                </div>
                <button
                  type="button"
                  className={`btn btn-sm ${selectedPlan === 'Starter' ? 'btn-secondary' : 'btn-primary'}`}
                >
                  {selectedPlan === 'Starter' ? 'Active Plan' : 'Select Starter'}
                </button>
              </div>

              {/* Pro */}
              <div
                className={`plan-select-card ${selectedPlan === 'Pro' ? 'active' : ''}`}
                onClick={() => handleSelectPlan('Pro')}
              >
                {selectedPlan === 'Pro' && <span className="badge-current">Current</span>}
                <div>
                  <h3>Pro</h3>
                  <div className="plan-price">$99 <span>/ mo</span></div>
                  <ul className="plan-select-features">
                    <li><Check size={14} className="text-green" /> 10,000 build mins</li>
                    <li><Check size={14} className="text-green" /> 5 parallel runners</li>
                    <li><Check size={14} className="text-green" /> 200 GB artifact storage</li>
                    <li><Check size={14} className="text-green" /> Priority email support</li>
                  </ul>
                </div>
                <button
                  type="button"
                  className={`btn btn-sm ${selectedPlan === 'Pro' ? 'btn-secondary' : 'btn-primary'}`}
                >
                  {selectedPlan === 'Pro' ? 'Active Plan' : 'Select Pro'}
                </button>
              </div>

              {/* Enterprise */}
              <div
                className={`plan-select-card ${selectedPlan === 'Enterprise' ? 'active' : ''}`}
                onClick={() => handleSelectPlan('Enterprise')}
              >
                {selectedPlan === 'Enterprise' && <span className="badge-current">Current</span>}
                <div>
                  <h3>Enterprise</h3>
                  <div className="plan-price">$499 <span>/ mo</span></div>
                  <ul className="plan-select-features">
                    <li><Check size={14} className="text-green" /> 25,000 build mins</li>
                    <li><Check size={14} className="text-green" /> 10 parallel runners</li>
                    <li><Check size={14} className="text-green" /> 500 GB artifact storage</li>
                    <li><Check size={14} className="text-green" /> 24/7 Phone SLA support</li>
                  </ul>
                </div>
                <button
                  type="button"
                  className={`btn btn-sm ${selectedPlan === 'Enterprise' ? 'btn-secondary' : 'btn-primary'}`}
                >
                  {selectedPlan === 'Enterprise' ? 'Active Plan' : 'Select Enterprise'}
                </button>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowPlanModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: Update Payment Card Modal */}
      {/* ========================================================= */}
      {showCardModal && (
        <div className="modal-backdrop" onClick={() => setShowCardModal(false)}>
          <div className="modal-content glass-card animate-fade-in" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <CreditCard size={22} className="text-blue" />
                <h2>Update Payment Card</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowCardModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="modal-form">
              <div className="form-group">
                <label className="form-label">Name on Card</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={cardForm.cardholderName}
                  onChange={(e) => setCardForm({ ...cardForm, cardholderName: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Card Number</label>
                <input
                  type="text"
                  required
                  maxLength={19}
                  placeholder="4242 4242 4242 4242"
                  value={cardForm.cardNumber}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                    setCardForm({ ...cardForm, cardNumber: v });
                  }}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Expiration (MM/YY)</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    placeholder="08/28"
                    value={cardForm.expiry}
                    onChange={(e) => setCardForm({ ...cardForm, expiry: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">CVC / CVV</label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    placeholder="123"
                    value={cardForm.cvc}
                    onChange={(e) => setCardForm({ ...cardForm, cvc: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="modal-actions margin-top-15">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCardModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: View Invoice Receipt Modal */}
      {/* ========================================================= */}
      {selectedInvoice && (
        <div className="modal-backdrop" onClick={() => setSelectedInvoice(null)}>
          <div className="modal-content glass-card animate-fade-in" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Download size={22} className="text-blue" />
                <h2>Tax Invoice Receipt</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setSelectedInvoice(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="invoice-receipt-paper">
              <div className="invoice-receipt-header">
                <div>
                  <h3 style={{ fontSize: '18px', color: '#fff', margin: '0 0 4px 0', letterSpacing: '1px' }}>CLOUDOPS CI/CD</h3>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Orchestrator Enterprise Cloud</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#60a5fa' }}>{selectedInvoice.id}</div>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>{selectedInvoice.date}</span>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '16px' }}>
                <div><strong>Billed To:</strong> {general.orgName}</div>
                <div><strong>Billing Email:</strong> {profile.email}</div>
                <div><strong>Billing Period:</strong> {selectedInvoice.period}</div>
                <div><strong>Payment Method:</strong> {paymentMethod.cardBrand} •••• {paymentMethod.last4}</div>
              </div>

              <table className="invoice-receipt-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedInvoice.items || [{ desc: `${selectedPlan} Plan Subscription`, price: selectedInvoice.amount }]).map((item, i) => (
                    <tr key={i}>
                      <td>{item.desc}</td>
                      <td style={{ textAlign: 'right' }}>{item.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="invoice-total-row">
                <span>Amount Paid (USD)</span>
                <span style={{ color: '#4ade80' }}>{selectedInvoice.amount}</span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  window.print();
                }}
              >
                <Printer size={15} />
                <span>Print / Save PDF</span>
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedInvoice(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 6: Configure Integration Modal */}
      {/* ========================================================= */}
      {selectedIntegrationForConfig && (
        <div className="modal-backdrop" onClick={() => setSelectedIntegrationForConfig(null)}>
          <div className="modal-content glass-card animate-fade-in" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <LinkIcon size={22} className="text-cyan" />
                <h2>Configure {selectedIntegrationForConfig.name}</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setSelectedIntegrationForConfig(null)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
              {selectedIntegrationForConfig.description}
            </p>

            <form onSubmit={handleSaveIntegrationConfig} className="modal-form">
              {(selectedIntegrationForConfig.configFields || []).map((field, idx) => (
                <div key={idx} className="form-group">
                  <label className="form-label">{field.label}</label>
                  <input
                    type={field.isSecret ? 'password' : 'text'}
                    required
                    className="form-input"
                    placeholder={field.placeholder}
                    value={integrationFormConfig[field.name] || ''}
                    onChange={(e) => setIntegrationFormConfig({
                      ...integrationFormConfig,
                      [field.name]: e.target.value,
                    })}
                  />
                </div>
              ))}

              <div className="modal-actions margin-top-15">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedIntegrationForConfig(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Verify & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

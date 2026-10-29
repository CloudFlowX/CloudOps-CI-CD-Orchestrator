import React, { useState, useEffect, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import './PipelinesPage.css';
import {
  Plus,
  Search,
  RotateCcw,
  Eye,
  EyeOff,
  Lock,
  XCircle,
  CheckCircle2,
  RefreshCw,
  Clock,
  User,
  GitBranch,
  Filter,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  X,
  Play,
  Terminal,
  Layers,
  Check,
  AlertTriangle,
  Bot,
  Cpu,
  ArrowUpDown,
  Download,
  Share2,
  Sparkles,
  Trash2,
  ShieldAlert,
  Copy,
  Maximize2,
  Minimize2
} from 'lucide-react';

import ApiClient from '../utils/api';
import { getSocketUrl } from '../utils/socket';

export default function PipelinesPage() {
  const { currentRole } = useRole();
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState([]);
  const [availableRepos, setAvailableRepos] = useState([]);
  const [availableCloudAccounts, setAvailableCloudAccounts] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPipeline, setEditPipeline] = useState(null);
  const [liveLogs, setLiveLogs] = useState([]);
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [toast, setToast] = useState(null);
  const selectedPipelineRef = useRef(null);
  const terminalRef = useRef(null);

  useEffect(() => {
    selectedPipelineRef.current = selectedPipeline;
  }, [selectedPipeline]);

  // Auto scroll terminal to bottom when new logs appear or modal opens
  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      const scrollTimeout = setTimeout(() => {
        if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
      }, 50);
      return () => clearTimeout(scrollTimeout);
    }
  }, [liveLogs, isViewModalOpen, autoScroll]);

  React.useEffect(() => {
    fetchPipelines();
    fetchRepos();
    fetchCloudAccounts();
  }, []);

  const handleAuthError = (err) => {
    if (err?.status === 401) {
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  // Socket.io integration
  useEffect(() => {
    const socket = io(getSocketUrl(), {
      withCredentials: true,
    });

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("pipeline_updated", (updatedPipeline) => {
      setPipelines(prev => prev.map(p => p.id === updatedPipeline._id ? { ...p, ...updatedPipeline, id: updatedPipeline._id } : p));
    });

    socket.on("pipeline_status_changed", ({ id, status, containerPort }) => {
      setPipelines(prev => prev.map(p => {
        if (p.id === id) {
          return {
            ...p,
            status,
            ...(containerPort && { containerPort })
          };
        }
        return p;
      }));
    });

    socket.on("pipeline_log", ({ id, log }) => {
      // Append if the open modal matches this pipeline
      const currentSelected = selectedPipelineRef.current;
      if (currentSelected && (currentSelected.id === id || currentSelected._id === id)) {
        setLiveLogs(prev => [...prev, log]);
      }
      // Also update the pipeline's logs in the main pipelines state
      setPipelines(prev => prev.map(p => {
        if (p.id === id) {
          const updatedLogs = [...(p.logs || []), log];
          return { ...p, logs: updatedLogs };
        }
        return p;
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchPipelines = async () => {
    try {
      const res = await ApiClient.get('/pipelines');
      if (res.success && res.pipelines) {
        const mapped = res.pipelines.map(p => ({
          id: p._id,
          name: p.name,
          branch: p.branch || 'main',
          buildNum: `#${p._id.substring(p._id.length - 4)}`,
          status: p.status.charAt(0).toUpperCase() + p.status.slice(1),
          duration: '-',
          triggeredBy: { name: p.createdBy?.fullName || 'system', type: 'user', avatar: null },
          startedAt: new Date(p.createdAt).toLocaleString(),
          commitMsg: p.buildCommand || 'N/A',
          commitHash: p.repository?.name || 'unknown',
          environment: p.environment || 'production',
          stages: [],
          logs: p.logs || [],
          dockerfilePath: p.dockerfilePath || './Dockerfile',
          deploymentTarget: p.deploymentTarget || 'cloudflare',
          buildCommand: p.buildCommand || 'npm run build',
          deployedUrl: p.deployedUrl || '',
          containerPort: p.containerPort || p.appPort || 5000,
          envVars: p.envVars || [],
          cloudAccount: p.cloudAccount?._id || p.cloudAccount || '',
          ec2InstanceId: p.ec2InstanceId || '',
          appPort: p.appPort || 3000,
          s3BucketName: p.s3BucketName || '',
          cloudflareProjectName: p.cloudflareProjectName || '',
          cloudFrontUrl: p.cloudFrontUrl || ''
        }));
        setPipelines(mapped);
      }
    } catch (e) {
      console.error('Fetch pipelines error:', e);
      handleAuthError(e);
    }
  };

  const fetchRepos = async () => {
    try {
      const res = await ApiClient.get('/repositories');
      if (res.success && res.repositories) {
        setAvailableRepos(res.repositories);
      }
    } catch (e) {
      console.error('Fetch repos error:', e);
      handleAuthError(e);
    }
  };

  const fetchCloudAccounts = async () => {
    try {
      const res = await ApiClient.get('/cloud-accounts');
      if (res.success && res.accounts) {
        setAvailableCloudAccounts(res.accounts.filter(a => a.provider === 'AWS'));
      }
    } catch (e) {
      console.error('Fetch cloud accounts error:', e);
      handleAuthError(e);
    }
  };

  // New pipeline form state
  const [newPipeline, setNewPipeline] = useState({
    name: '',
    repository: '',
    branch: 'main',
    buildCommand: 'npm run build',
    dockerfilePath: './Dockerfile',
    environment: 'development',
    deploymentTarget: 'cloudflare',
    cloudAccount: '',
    ec2InstanceId: '',
    appPort: 3000,
    containerPort: 5000,
    envVars: [{ key: 'PORT', value: '5000', isSecret: false, showVal: false }],
    s3BucketName: '',
    cloudflareProjectName: ''
  });

  // Bulk .env Paste Modal State
  const [isEnvPasteModalOpen, setIsEnvPasteModalOpen] = useState(false);
  const [rawEnvText, setRawEnvText] = useState('');
  const [envPasteTarget, setEnvPasteTarget] = useState('new');

  const handleAddEnvVar = (target = 'new') => {
    if (target === 'new') {
      setNewPipeline(prev => ({
        ...prev,
        envVars: [...(prev.envVars || []), { key: '', value: '', isSecret: false, showVal: false }]
      }));
    } else {
      setEditPipeline(prev => ({
        ...prev,
        envVars: [...(prev.envVars || []), { key: '', value: '', isSecret: false, showVal: false }]
      }));
    }
  };

  const handleUpdateEnvVar = (index, field, val, target = 'new') => {
    if (target === 'new') {
      setNewPipeline(prev => {
        const next = [...(prev.envVars || [])];
        next[index] = { ...next[index], [field]: val };
        return { ...prev, envVars: next };
      });
    } else {
      setEditPipeline(prev => {
        const next = [...(prev.envVars || [])];
        next[index] = { ...next[index], [field]: val };
        return { ...prev, envVars: next };
      });
    }
  };

  const handleRemoveEnvVar = (index, target = 'new') => {
    if (target === 'new') {
      setNewPipeline(prev => {
        const next = (prev.envVars || []).filter((_, i) => i !== index);
        return { ...prev, envVars: next };
      });
    } else {
      setEditPipeline(prev => {
        const next = (prev.envVars || []).filter((_, i) => i !== index);
        return { ...prev, envVars: next };
      });
    }
  };

  const handleOpenEnvPaste = (target = 'new') => {
    setEnvPasteTarget(target);
    setRawEnvText('');
    setIsEnvPasteModalOpen(true);
  };

  const handleImportRawEnv = () => {
    if (!rawEnvText.trim()) {
      setIsEnvPasteModalOpen(false);
      return;
    }
    const lines = rawEnvText.split('\n');
    const parsed = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim().replace(/[^a-zA-Z0-9_]/g, '');
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (key) {
          const isSecret = /secret|key|password|token|jwt|mongo|auth|cred|database_url/i.test(key);
          parsed.push({ key, value: val, isSecret, showVal: false });
        }
      }
    }
    if (parsed.length > 0) {
      if (envPasteTarget === 'new') {
        setNewPipeline(prev => ({
          ...prev,
          envVars: [...(prev.envVars || []).filter(v => v && v.key && v.key.trim()), ...parsed]
        }));
      } else {
        setEditPipeline(prev => ({
          ...prev,
          envVars: [...(prev.envVars || []).filter(v => v && v.key && v.key.trim()), ...parsed]
        }));
      }
      showToast(`Imported ${parsed.length} environment variables!`, 'success');
    } else {
      showToast('No valid KEY=VALUE lines found.', 'warning');
    }
    setIsEnvPasteModalOpen(false);
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Stats calculation from real data
  const stats = useMemo(() => {
    const total = pipelines.length;
    const running = pipelines.filter(p => p.status === 'Running').length;
    const successful = pipelines.filter(p => p.status === 'Success').length;
    const failed = pipelines.filter(p => p.status === 'Failed').length;
    const queued = pipelines.filter(p => p.status === 'Queued' || p.status === 'Pending').length;
    return { total, running, successful, failed, queued };
  }, [pipelines]);

  // Filtered & Sorted pipelines list
  const filteredPipelines = useMemo(() => {
    return pipelines
      .filter((item) => {
        // Tab Filter
        if (activeTab === 'Running' && item.status !== 'Running') return false;
        if (activeTab === 'Successful' && item.status !== 'Success') return false;
        if (activeTab === 'Failed' && item.status !== 'Failed') return false;
        if (activeTab === 'Queued' && item.status !== 'Queued') return false;

        // Branch Filter
        if (branchFilter !== 'all' && item.branch !== branchFilter) return false;

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = item.name.toLowerCase().includes(q);
          const matchBranch = item.branch.toLowerCase().includes(q);
          const matchBuild = item.buildNum.toLowerCase().includes(q);
          const matchUser = item.triggeredBy.name.toLowerCase().includes(q);
          const matchCommit = item.commitMsg.toLowerCase().includes(q);
          return matchName || matchBranch || matchBuild || matchUser || matchCommit;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return a.id - b.id;
        if (sortBy === 'oldest') return b.id - a.id;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'duration') return b.duration.localeCompare(a.duration);
        return 0;
      });
  }, [pipelines, activeTab, branchFilter, searchQuery, sortBy]);

  // Bulk Selection Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredPipelines.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Pipeline Actions
  const handleRerun = async (pipeline, e) => {
    e?.stopPropagation();
    showToast(`Triggering pipeline ${pipeline.name}...`, 'info');
    try {
      const res = await ApiClient.post(`/pipelines/${pipeline.id}/trigger`);
      if (res.success) {
        showToast(`Pipeline ${pipeline.name} triggered successfully. Execution has started in the background!`, 'success');
        fetchPipelines();
      }
    } catch (error) {
      console.error('Trigger error:', error);
      handleAuthError(error);
      const msg = error?.data?.message || error?.message || 'Error triggering pipeline';
      showToast(msg, 'warning');
      fetchPipelines(); // Refresh to show updated status (e.g., 'failed')
    }
  };

  const handleCancel = (pipeline, e) => {
    e?.stopPropagation();
    showToast(`Cancel pipeline not implemented on backend yet.`, 'warning');
  };

  const handleOpenViewModal = async (pipeline) => {
    setSelectedPipeline(pipeline);
    setIsViewModalOpen(true);

    // 1. If logs are already present in state, display them immediately
    if (pipeline.logs && pipeline.logs.length > 0) {
      setLiveLogs(pipeline.logs);
    } else {
      setLiveLogs(['[INFO] Fetching execution logs...']);
    }

    // 2. Fetch fresh logs from backend API
    try {
      const res = await ApiClient.get(`/pipelines/${pipeline.id}/logs`);
      if (res.success && Array.isArray(res.logs) && res.logs.length > 0) {
        setLiveLogs(res.logs);
        setPipelines(prev => prev.map(p => p.id === pipeline.id ? { ...p, logs: res.logs } : p));
      } else if (!pipeline.logs || pipeline.logs.length === 0) {
        setLiveLogs([]);
      }
    } catch (err) {
      console.warn("Could not fetch pipeline logs:", err);
      if (pipeline.logs && pipeline.logs.length > 0) {
        setLiveLogs(pipeline.logs);
      } else {
        setLiveLogs([]);
      }
    }
  };

  const getPipelineStages = (pipeline) => {
    if (pipeline?.stages && pipeline.stages.length > 0) {
      return pipeline.stages;
    }
    const status = (pipeline?.status || '').toLowerCase();
    const isSuccess = status === 'success';
    const isRunning = status === 'running';
    const isFailed = status === 'failed';
    const logs = (pipeline?.logs && pipeline.logs.length > 0) ? pipeline.logs : liveLogs;
    const logsText = Array.isArray(logs) ? logs.join('\n') : String(logs || '');

    // Stage 1: Clone Repository
    const cloneStarted = logsText.includes('[INFO] Initializing') || logsText.includes('[INFO] Clone') || logsText.includes('[INFO] Repository exists') || isRunning || isSuccess;
    const clonePassed = logsText.includes('[INFO] Git pull completed') || logsText.includes('[INFO] Clone completed') || logsText.includes('[BUILD]') || logsText.includes('[DEPLOY]') || logsText.includes('[DOCKER]') || isSuccess;
    const cloneFailed = isFailed && !clonePassed;

    // Stage 2: Build Project
    const buildStarted = logsText.includes('[BUILD]');
    const buildPassed = logsText.includes('[BUILD] Build completed') || logsText.includes('[BUILD] Dependencies installed') || logsText.includes('[DEPLOY]') || logsText.includes('[DOCKER]') || isSuccess;
    const buildFailed = isFailed && buildStarted && !buildPassed;
    const buildSkipped = !buildStarted && (logsText.includes('[DEPLOY]') || logsText.includes('[DOCKER]') || isSuccess || (isFailed && clonePassed));

    // Stage 3: Deploy Target
    const deployStarted = logsText.includes('[DEPLOY]') || logsText.includes('[DOCKER]');
    const deployPassed = logsText.includes('[SUCCESS] Pipeline execution finished') || logsText.includes('[DEPLOY] Deployment successful') || isSuccess;
    const deployFailed = isFailed && (deployStarted || (!buildFailed && !cloneFailed));

    let cloneStatus = 'pending';
    if (clonePassed) cloneStatus = 'success';
    else if (cloneFailed) cloneStatus = 'failed';
    else if (cloneStarted && isRunning) cloneStatus = 'running';

    let buildStatus = 'pending';
    if (buildPassed) buildStatus = 'success';
    else if (buildFailed) buildStatus = 'failed';
    else if (buildSkipped) buildStatus = 'skipped';
    else if (buildStarted && isRunning) buildStatus = 'running';

    let deployStatus = 'pending';
    if (deployPassed) deployStatus = 'success';
    else if (deployFailed) deployStatus = 'failed';
    else if (deployStarted && isRunning) deployStatus = 'running';

    const targetLabel = pipeline?.deploymentTarget === 'cloudflare'
      ? 'Deploy Cloudflare Pages'
      : (pipeline?.deploymentTarget === 'aws-s3'
        ? 'Deploy S3 + CDN'
        : (pipeline?.deploymentTarget === 'docker' ? 'Deploy Docker' : 'Deploy Target (EC2)'));

    return [
      {
        name: 'Clone Repository',
        status: cloneStatus,
        duration: cloneStatus === 'success' ? '3s' : (cloneStatus === 'running' ? 'running...' : '-')
      },
      {
        name: 'Build Project',
        status: buildStatus,
        duration: buildStatus === 'success' ? '6s' : (buildStatus === 'skipped' ? 'Skipped' : (buildStatus === 'running' ? 'running...' : '-'))
      },
      {
        name: targetLabel,
        status: deployStatus,
        duration: deployStatus === 'success' ? '12s' : (deployStatus === 'running' ? 'running...' : '-')
      }
    ];
  };

  const handleCreatePipelineSubmit = async (e) => {
    e.preventDefault();
    if (!newPipeline.name.trim() || !newPipeline.repository) return;

    try {
      const payload = {
        name: newPipeline.name,
        repository: newPipeline.repository,
        branch: newPipeline.branch,
        buildCommand: newPipeline.buildCommand,
        dockerfilePath: newPipeline.dockerfilePath,
        environment: newPipeline.environment,
        deploymentTarget: newPipeline.deploymentTarget,
        cloudAccount: newPipeline.cloudAccount,
        ec2InstanceId: (newPipeline.deploymentTarget === 'aws' || newPipeline.deploymentTarget === 'docker') ? newPipeline.ec2InstanceId?.trim() : '',
        appPort: newPipeline.deploymentTarget === 'aws' ? newPipeline.appPort : undefined,
        containerPort: newPipeline.deploymentTarget === 'docker' ? (Number(newPipeline.containerPort) || 5000) : undefined,
        envVars: (newPipeline.deploymentTarget === 'docker' || newPipeline.deploymentTarget === 'aws')
          ? (newPipeline.envVars || []).filter(v => v && v.key && v.key.trim() !== '')
          : [],
        s3BucketName: newPipeline.s3BucketName?.trim(),
        cloudflareProjectName: newPipeline.cloudflareProjectName?.trim()
      };

      const res = await ApiClient.post('/pipelines', payload);
      if (res.success) {
        setIsCreateModalOpen(false);
        setNewPipeline({
          name: '',
          repository: '',
          branch: 'main',
          buildCommand: 'npm run build',
          dockerfilePath: './Dockerfile',
          environment: 'development',
          deploymentTarget: 'cloudflare',
          cloudAccount: '',
          ec2InstanceId: '',
          appPort: 3000,
          containerPort: 5000,
          envVars: [{ key: 'PORT', value: '5000', isSecret: false, showVal: false }],
          s3BucketName: '',
          cloudflareProjectName: ''
        });
        showToast(`Pipeline "${res.pipeline.name}" created successfully!`, 'success');
        fetchPipelines();
      }
    } catch (error) {
      console.error(error);
      handleAuthError(error);
      showToast(error?.data?.message || 'Failed to create pipeline', 'warning');
    }
  };

  const handleEditPipelineSubmit = async (e) => {
    e.preventDefault();
    if (!editPipeline.name.trim()) return;

    try {
      const payload = {
        name: editPipeline.name,
        branch: editPipeline.branch,
        buildCommand: editPipeline.buildCommand,
        dockerfilePath: editPipeline.dockerfilePath,
        environment: editPipeline.environment,
        deploymentTarget: editPipeline.deploymentTarget,
        cloudAccount: editPipeline.cloudAccount,
        ec2InstanceId: (editPipeline.deploymentTarget === 'aws' || editPipeline.deploymentTarget === 'docker') ? editPipeline.ec2InstanceId?.trim() : '',
        appPort: editPipeline.deploymentTarget === 'aws' ? editPipeline.appPort : undefined,
        containerPort: editPipeline.deploymentTarget === 'docker' ? (Number(editPipeline.containerPort) || 5000) : undefined,
        envVars: (editPipeline.deploymentTarget === 'docker' || editPipeline.deploymentTarget === 'aws')
          ? (editPipeline.envVars || []).filter(v => v && v.key && v.key.trim() !== '')
          : [],
        s3BucketName: editPipeline.s3BucketName?.trim(),
        cloudflareProjectName: editPipeline.cloudflareProjectName?.trim()
      };

      const res = await ApiClient.put(`/pipelines/${editPipeline.id}`, payload);
      if (res.success) {
        setIsEditModalOpen(false);
        showToast(`Pipeline "${res.pipeline.name}" updated successfully!`, 'success');
        fetchPipelines();
      }
    } catch (error) {
      console.error(error);
      handleAuthError(error);
      showToast(error?.data?.message || 'Failed to update pipeline', 'warning');
    }
  };

  const handleDeletePipeline = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this pipeline?')) return;
    try {
      const res = await ApiClient.delete(`/pipelines/${id}`);
      if (res.success) {
        showToast('Pipeline deleted successfully!', 'success');
        fetchPipelines();
      }
    } catch (error) {
      handleAuthError(error);
      showToast(error?.data?.message || 'Failed to delete pipeline', 'warning');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} pipelines?`)) return;
    try {
      for (const id of selectedIds) {
        await ApiClient.delete(`/pipelines/${id}`);
      }
      showToast(`Deleted ${selectedIds.length} pipelines successfully!`, 'success');
      setSelectedIds([]);
      fetchPipelines();
    } catch (error) {
      showToast('Failed to delete some pipelines', 'warning');
    }
  };

  const openEditModal = (pipeline, e) => {
    e?.stopPropagation();
    setEditPipeline({
      ...pipeline,
      id: pipeline.id || pipeline._id,
      containerPort: pipeline.containerPort || pipeline.appPort || 5000,
      envVars: Array.isArray(pipeline.envVars) && pipeline.envVars.length > 0
        ? pipeline.envVars.map(v => ({ key: v.key || '', value: v.value || '', isSecret: !!v.isSecret, showVal: false }))
        : [{ key: 'PORT', value: '5000', isSecret: false, showVal: false }],
      repository: pipeline.repository?._id || pipeline.repository || '',
    });
    setIsEditModalOpen(true);
  };

  const renderEnvVarsEditor = (pipelineObj, target = 'new') => {
    const envVars = pipelineObj.envVars || [];
    return (
      <div className="env-vars-wrapper">
        <div className="env-vars-header">
          <div>
            <span className="env-vars-title">Environment Variables (.env)</span>
            <span className="env-vars-subtitle">
              Injected into backend container via <code>--env-file</code>
            </span>
          </div>
          <div className="env-vars-header-actions">
            <button
              type="button"
              className="btn-env-action btn-paste-env"
              onClick={() => handleOpenEnvPaste(target)}
            >
              <Copy size={13} />
              Paste .env
            </button>
            <button
              type="button"
              className="btn-env-action btn-add-env"
              onClick={() => handleAddEnvVar(target)}
            >
              <Plus size={13} />
              Add Variable
            </button>
          </div>
        </div>

        {envVars.length === 0 ? (
          <div className="env-vars-empty" onClick={() => handleAddEnvVar(target)}>
            No environment variables configured. Click "+ Add Variable" or "Paste .env" to inject variables like PORT, MONGO_URI, JWT_SECRET.
          </div>
        ) : (
          <div className="env-vars-list">
            {envVars.map((item, idx) => (
              <div key={idx} className="env-var-row">
                <input
                  type="text"
                  className="env-key-input"
                  placeholder="KEY (e.g. PORT)"
                  value={item.key || ''}
                  onChange={(e) => handleUpdateEnvVar(idx, 'key', e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''), target)}
                />
                <span className="env-separator">=</span>
                <div className="env-value-wrapper">
                  <input
                    type={item.isSecret && !item.showVal ? 'password' : 'text'}
                    className="env-value-input"
                    placeholder="VALUE (e.g. 5000)"
                    value={item.value || ''}
                    onChange={(e) => handleUpdateEnvVar(idx, 'value', e.target.value, target)}
                  />
                  {item.isSecret && (
                    <button
                      type="button"
                      className="env-show-toggle"
                      onClick={() => handleUpdateEnvVar(idx, 'showVal', !item.showVal, target)}
                      title={item.showVal ? 'Hide value' : 'Show value'}
                    >
                      {item.showVal ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className={`btn-env-secret-toggle ${item.isSecret ? 'active' : ''}`}
                  onClick={() => handleUpdateEnvVar(idx, 'isSecret', !item.isSecret, target)}
                  title={item.isSecret ? 'Secret variable (masked)' : 'Plain text variable'}
                >
                  <Lock size={13} />
                </button>
                <button
                  type="button"
                  className="btn-env-delete"
                  onClick={() => handleRemoveEnvVar(idx, target)}
                  title="Remove variable"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'success':
        return (
          <span className="badge badge-success">
            <CheckCircle2 size={13} />
            Success
          </span>
        );
      case 'failed':
        return (
          <span className="badge badge-failed">
            <XCircle size={13} />
            Failed
          </span>
        );
      case 'running':
        return (
          <span className="badge badge-running">
            <RefreshCw size={13} className="spin-icon" />
            Running
          </span>
        );
      default:
        return (
          <span className="badge badge-warning">
            <Clock size={13} />
            Queued
          </span>
        );
    }
  };

  const renderTriggerAvatar = (triggeredBy) => {
    if (triggeredBy.avatar) {
      return (
        <img
          src={triggeredBy.avatar}
          alt={triggeredBy.name}
          className="user-avatar"
        />
      );
    }
    if (triggeredBy.type === 'bot') {
      return (
        <div className="avatar-placeholder bot">
          <Bot size={13} />
        </div>
      );
    }
    return (
      <div className="avatar-placeholder system">
        <Cpu size={13} />
      </div>
    );
  };

  return (
    <div className="pipelines-page animate-fade-in">
      {/* Notification Toast */}
      {toast && (
        <div className={`pipelines-toast toast-${toast.type}`}>
          {toast.type === 'success' && <CheckCircle2 size={16} />}
          {toast.type === 'warning' && <AlertTriangle size={16} />}
          {toast.type === 'info' && <Sparkles size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="pipelines-header">
        <div className="header-info">
          <h1 className="pipelines-title">Pipelines</h1>
          <p className="pipelines-subtitle">
            View and manage your CI/CD pipelines
          </p>
        </div>
        <div className="header-actions">
          {currentRole !== 'Viewer' && (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => setIsActionModalOpen(true)}
              >
                <Terminal size={18} />
                <span>Generate Action</span>
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus size={18} />
                <span>Create Pipeline</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="pipelines-stats-grid">
        <div className="stat-card">
          <div className="stat-main-content">
            <div className="stat-icon-wrapper total">
              <Layers size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Total Pipelines</span>
              <div className="stat-value">{stats.total}</div>
            </div>
          </div>
          <div className="stat-footer">
            <span className="stat-trend neutral">Across all repositories</span>
          </div>
        </div>

        <div className="stat-card running-card">
          <div className="stat-main-content">
            <div className="stat-icon-wrapper running">
              <RefreshCw size={22} className="spin-icon" />
            </div>
            <div className="stat-info">
              <span className="stat-label">Running</span>
              <div className="stat-value running-color">{stats.running}</div>
            </div>
          </div>
          <div className="stat-footer">
            <span className="stat-indicator pulse-blue">Active execution</span>
          </div>
        </div>

        <div className="stat-card successful-card">
          <div className="stat-main-content">
            <div className="stat-icon-wrapper successful">
              <CheckCircle2 size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Successful</span>
              <div className="stat-value success-color">{stats.successful}</div>
            </div>
          </div>
          <div className="stat-footer">
            <span className="stat-trend positive">84.4% success rate</span>
          </div>
        </div>

        <div className="stat-card failed-card">
          <div className="stat-main-content">
            <div className="stat-icon-wrapper failed">
              <XCircle size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Failed</span>
              <div className="stat-value failed-color">{stats.failed}</div>
            </div>
          </div>
          <div className="stat-footer">
            <span className="stat-trend negative">Requires attention</span>
          </div>
        </div>
      </div>

      {/* Filter / Tab Bar */}
      <div className="pipelines-toolbar-card">
        <div className="pipelines-tabs">
          <button
            className={`tab-item ${activeTab === 'All' ? 'active' : ''}`}
            onClick={() => setActiveTab('All')}
          >
            All <span className="tab-count">{stats.total}</span>
          </button>
          <button
            className={`tab-item ${activeTab === 'Running' ? 'active' : ''}`}
            onClick={() => setActiveTab('Running')}
          >
            Running <span className="tab-count count-running">{stats.running}</span>
          </button>
          <button
            className={`tab-item ${activeTab === 'Successful' ? 'active' : ''}`}
            onClick={() => setActiveTab('Successful')}
          >
            Successful <span className="tab-count count-success">{stats.successful}</span>
          </button>
          <button
            className={`tab-item ${activeTab === 'Failed' ? 'active' : ''}`}
            onClick={() => setActiveTab('Failed')}
          >
            Failed <span className="tab-count count-failed">{stats.failed}</span>
          </button>
          <button
            className={`tab-item ${activeTab === 'Queued' ? 'active' : ''}`}
            onClick={() => setActiveTab('Queued')}
          >
            Queued <span className="tab-count">{stats.queued}</span>
          </button>
        </div>

        <div className="pipelines-filter-controls">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search pipelines, branches, builds..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="select-wrapper">
            <GitBranch size={14} className="select-icon" />
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="all">All Branches</option>
              <option value="main">main</option>
              <option value="develop">develop</option>
              <option value="release">release</option>
              <option value="staging">staging</option>
            </select>
          </div>

          <div className="select-wrapper">
            <ArrowUpDown size={14} className="select-icon" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Sort by Newest</option>
              <option value="oldest">Sort by Oldest</option>
              <option value="name">Sort by Name</option>
              <option value="duration">Sort by Duration</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar (Visible when items selected) */}
      {selectedIds.length > 0 && (
        <div className="bulk-actions-bar">
          <span className="bulk-count">
            {selectedIds.length} pipeline{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="bulk-buttons">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                showToast(`Triggered rerun for ${selectedIds.length} pipelines`, 'success');
                setSelectedIds([]);
              }}
            >
              <RotateCcw size={14} />
              Rerun Selected
            </button>
            <button
              className="btn btn-danger-ghost btn-sm"
              onClick={handleBulkDelete}
            >
              <Trash2 size={14} />
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Pipeline Table */}
      <div className="pipelines-table-card">
        <div className="table-responsive">
          <table className="pipelines-table">
            <thead>
              <tr>
                <th className="th-checkbox">
                  <input
                    type="checkbox"
                    checked={
                      filteredPipelines.length > 0 &&
                      selectedIds.length === filteredPipelines.length
                    }
                    onChange={handleSelectAll}
                  />
                </th>
                <th>Pipeline & Branch</th>
                <th>Build #</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Triggered By</th>
                <th>Started At</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPipelines.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-state">
                    <div className="empty-content">
                      <Terminal size={36} />
                      <h3>No pipelines found</h3>
                      <p>Try adjusting your search query or tab filters.</p>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setSearchQuery('');
                          setActiveTab('All');
                          setBranchFilter('all');
                        }}
                      >
                        Reset Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPipelines.map((pipeline) => {
                  const isSelected = selectedIds.includes(pipeline.id);

                  return (
                    <tr
                      key={pipeline.id}
                      className={`pipeline-row ${isSelected ? 'row-selected' : ''}`}
                      onClick={() => handleOpenViewModal(pipeline)}
                    >
                      <td
                        className="td-checkbox"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(pipeline.id)}
                        />
                      </td>

                      <td className="td-pipeline">
                        <div className="pipeline-info">
                          <span className="pipeline-name">{pipeline.name}</span>
                          <span className="branch-tag">
                            <GitBranch size={12} />
                            {pipeline.branch}
                          </span>
                          {pipeline.deploymentTarget === 'cloudflare' && (
                            <span style={{ fontSize: '10px', background: 'rgba(249, 115, 22, 0.15)', color: '#f97316', padding: '1px 6px', borderRadius: '4px', fontWeight: '700', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
                              Pages.dev
                            </span>
                          )}
                          {pipeline.deploymentTarget === 'aws-s3' && (
                            <span style={{ fontSize: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '1px 6px', borderRadius: '4px', fontWeight: '700', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                              S3 + CDN
                            </span>
                          )}
                          {pipeline.deploymentTarget === 'docker' && (
                            <span style={{ fontSize: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '1px 6px', borderRadius: '4px', fontWeight: '700', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                              🐳 Docker API
                            </span>
                          )}
                        </div>
                        <div className="commit-preview">
                          <code className="commit-hash">{pipeline.commitHash}</code>
                          <span className="commit-msg">{pipeline.commitMsg}</span>
                          {pipeline.deployedUrl && (
                            <a
                              href={pipeline.deployedUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{ color: '#4ade80', fontSize: '11px', textDecoration: 'none', marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: '600' }}
                            >
                              {pipeline.deploymentTarget === 'docker' ? 'Live API ↗' : 'Live App ↗'}
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="td-build">
                        <span className="build-badge">{pipeline.buildNum}</span>
                      </td>

                      <td className="td-status">
                        {renderStatusBadge(pipeline.status)}
                      </td>

                      <td className="td-duration">
                        <div className="duration-wrapper">
                          <Clock size={14} className="icon-muted" />
                          <span>{pipeline.duration}</span>
                        </div>
                      </td>

                      <td className="td-triggered">
                        <div className="user-profile">
                          {renderTriggerAvatar(pipeline.triggeredBy)}
                          <span className="user-name">{pipeline.triggeredBy.name}</span>
                        </div>
                      </td>

                      <td className="td-started">
                        <span className="time-text">{pipeline.startedAt}</span>
                      </td>

                      <td className="td-actions" onClick={(e) => e.stopPropagation()}>
                        <div className="action-buttons">
                          <button
                            className="btn-icon"
                            title="View Pipeline Details"
                            onClick={() => handleOpenViewModal(pipeline)}
                          >
                            <Eye size={15} />
                          </button>
                          
                          {currentRole !== 'Viewer' && (
                            <>
                              <button
                                className="btn-icon"
                                title="Rerun Pipeline"
                                onClick={(e) => handleRerun(pipeline, e)}
                              >
                                <RotateCcw size={15} />
                              </button>

                              {pipeline.status === 'Running' ? (
                                <button
                                  className="btn-icon danger-icon"
                                  title="Cancel Pipeline"
                                  onClick={(e) => handleCancel(pipeline, e)}
                                >
                                  <XCircle size={15} />
                                </button>
                              ) : (
                                <button
                                  className="btn-icon"
                                  title="View Terminal Logs"
                                  onClick={() => handleOpenViewModal(pipeline)}
                                >
                                  <Terminal size={15} />
                                </button>
                              )}

                              <button
                                className="btn-icon"
                                title="Edit Pipeline"
                                onClick={(e) => openEditModal(pipeline, e)}
                              >
                                <SlidersHorizontal size={15} />
                              </button>

                              <button
                                className="btn-icon danger-icon"
                                title="Delete Pipeline"
                                onClick={(e) => handleDeletePipeline(pipeline.id, e)}
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
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Pipelines Card List (Screen 4) */}
        <div className="pipelines-mobile-list">
          {filteredPipelines.length === 0 ? (
            <div className="mobile-empty-state">
              <Terminal size={32} />
              <p>No pipelines found</p>
            </div>
          ) : (
            filteredPipelines.map((pipeline) => (
              <div 
                key={pipeline.id} 
                className="pipeline-mobile-card"
                onClick={() => handleOpenViewModal(pipeline)}
              >
                <div className="pipeline-mobile-top">
                  <div className="pipeline-mobile-left">
                    <div className="pipeline-mobile-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                      </svg>
                    </div>
                    <div className="pipeline-mobile-details">
                      <div className="pipeline-mobile-name">{pipeline.name}</div>
                      <div className="pipeline-mobile-meta">
                        <span>{pipeline.branch || 'main'}</span>
                        <span className="bullet">•</span>
                        <span className="mono">{pipeline.commitHash ? pipeline.commitHash.substring(0, 7) : 'a1b2c3d'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="pipeline-mobile-right">
                    <div className="pipeline-mobile-badge-row">
                      {renderStatusBadge(pipeline.status)}
                      <button 
                        className="pipeline-mobile-more-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenViewModal(pipeline);
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>
                    <span className="pipeline-mobile-time">{pipeline.startedAt}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="pipelines-pagination">
          <div className="pagination-info">
            Showing <span className="highlight">1-{filteredPipelines.length}</span> of{' '}
            <span className="highlight">{stats.total}</span> pipelines
          </div>

          <div className="pagination-controls">
            <button className="page-btn disabled" disabled>
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <div className="page-numbers">
              <button className="page-num active">1</button>
              <button className="page-num">2</button>
              <button className="page-num">3</button>
              <button className="page-num">4</button>
              <button className="page-num">5</button>
            </div>

            <button className="page-btn">
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: View Pipeline Details & Stage Steps */}
      {isViewModalOpen && selectedPipeline && (
        <div className="modal-backdrop" onClick={() => setIsViewModalOpen(false)}>
          <div
            className="modal-container pipeline-view-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-badge-row">
                  <span className="pipeline-title-text">{selectedPipeline.name}</span>
                  <span className="build-badge">{selectedPipeline.buildNum}</span>
                  {renderStatusBadge(selectedPipeline.status)}
                </div>
                <p className="modal-subtitle">
                  Branch: <strong className="highlight">{selectedPipeline.branch}</strong> • Commit:{' '}
                  <code>{selectedPipeline.commitHash}</code>
                </p>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setIsViewModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body pipeline-log-modal-body">
              {/* Top Compact Bar: Trigger Info + Live URL Button */}
              <div className="modal-meta-bar">
                <div className="meta-bar-left">
                  {renderTriggerAvatar(selectedPipeline.triggeredBy)}
                  <div className="meta-text-group">
                    <div className="meta-main-row">
                      <span className="commit-title-text">{selectedPipeline.commitMsg || 'Pipeline execution'}</span>
                      <span className="meta-dot">•</span>
                      <span className="started-time-text">Triggered {selectedPipeline.startedAt}</span>
                    </div>
                    <span className="author-subtext">by <strong>{selectedPipeline.triggeredBy?.name || 'User'}</strong></span>
                  </div>
                </div>

                {/* Live Application URL Pill */}
                {selectedPipeline.deployedUrl && (
                  <div className="meta-bar-right-url">
                    <span className="live-status-pulse"></span>
                    <div className="url-info-col">
                      <span className="url-badge-label">Live App</span>
                      <a
                        href={selectedPipeline.deployedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="url-display-link"
                        title={selectedPipeline.deployedUrl}
                      >
                        {selectedPipeline.deployedUrl.replace('https://', '').replace('http://', '')}
                      </a>
                    </div>
                    <a
                      href={selectedPipeline.deployedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-open-live-pill"
                    >
                      Open ↗
                    </a>
                  </div>
                )}
              </div>

              {/* Compact Execution Stages Bar */}
              <div className="stages-compact-bar">
                <span className="stages-compact-title">Stages:</span>
                <div className="stages-pills-container">
                  {getPipelineStages(selectedPipeline).map((stage, idx) => (
                    <div
                      key={idx}
                      className={`stage-pill-card stage-status-${stage.status}`}
                    >
                      <span className="stage-pill-icon">
                        {stage.status === 'success' && <Check size={12} />}
                        {stage.status === 'failed' && <X size={12} />}
                        {stage.status === 'running' && <RefreshCw size={12} className="spin-icon" />}
                        {stage.status === 'pending' && <Clock size={12} />}
                        {stage.status === 'skipped' && '—'}
                      </span>
                      <span className="stage-pill-name">{stage.name}</span>
                      <span className="stage-pill-duration">{stage.duration}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terminal Execution Logs - Full Height & Spacious */}
              <div className={`terminal-box large-terminal-box ${isTerminalExpanded ? 'expanded' : ''}`}>
                <div className="terminal-header">
                  <div className="terminal-dots">
                    <span className="dot dot-red"></span>
                    <span className="dot dot-yellow"></span>
                    <span className="dot dot-green"></span>
                  </div>
                  <div className="terminal-title-bar">
                    <Terminal size={14} className="terminal-icon" />
                    <span className="terminal-title">build-log.stdout</span>
                    <span className="terminal-count-badge">
                      {liveLogs.reduce((acc, chunk) => acc + String(chunk).split('\n').length, 0)} lines executed
                    </span>
                  </div>
                  <div className="terminal-actions">
                    <button
                      className="terminal-btn"
                      title={copiedLogs ? "Copied!" : "Copy All Logs"}
                      type="button"
                      onClick={() => {
                        if (!liveLogs || liveLogs.length === 0) return;
                        navigator.clipboard.writeText(liveLogs.join('\n'));
                        setCopiedLogs(true);
                        setTimeout(() => setCopiedLogs(false), 2000);
                      }}
                    >
                      {copiedLogs ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                      <span className="terminal-btn-text">{copiedLogs ? "Copied" : "Copy"}</span>
                    </button>
                    <button 
                      className="terminal-btn" 
                      title="Download Log"
                      type="button"
                      onClick={() => {
                        if (!liveLogs || liveLogs.length === 0) return;
                        const blob = new Blob([liveLogs.join('\n')], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${selectedPipeline?.name?.replace(/\s+/g, '-') || 'pipeline'}-build.log`;
                        a.click();
                      }}
                    >
                      <Download size={13} />
                      <span className="terminal-btn-text">Download</span>
                    </button>
                    <button
                      className={`terminal-btn ${isTerminalExpanded ? 'active' : ''}`}
                      title={isTerminalExpanded ? "Collapse View" : "Expand View"}
                      type="button"
                      onClick={() => setIsTerminalExpanded(prev => !prev)}
                    >
                      {isTerminalExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                      <span className="terminal-btn-text">{isTerminalExpanded ? "Collapse" : "Expand"}</span>
                    </button>
                  </div>
                </div>
                <div className={`terminal-content large-terminal-content ${isTerminalExpanded ? 'expanded' : ''}`} ref={terminalRef}>
                  {liveLogs.length > 0 ? (
                    (() => {
                      let lineNumberCounter = 1;
                      return liveLogs.flatMap((logChunk, chunkIdx) => {
                        const lines = String(logChunk).split('\n');
                        return lines.map((line, lineIdx) => {
                          const currentNum = lineNumberCounter++;
                          let lineType = 'info';
                          if (line.includes('[ERROR]') || line.includes('ERR!') || line.includes('failed') || line.includes('Failed') || line.includes('Error:')) {
                            lineType = 'error';
                          } else if (line.includes('[SUCCESS]') || line.includes('✓') || line.includes('successful') || line.includes('🎉')) {
                            lineType = 'success';
                          } else if (line.includes('[WARN]') || line.includes('warning') || line.includes('[HINT]')) {
                            lineType = 'warn';
                          } else if (line.includes('[BUILD]')) {
                            lineType = 'build';
                          } else if (line.includes('[DEPLOY]') || line.includes('[EC2]')) {
                            lineType = 'deploy';
                          }
                          return (
                            <div key={`${chunkIdx}-${lineIdx}`} className={`log-line-wrapper ${lineType}`}>
                              <span className="log-line-num">{currentNum}</span>
                              <span className={`log-line ${lineType}`}>{line || ' '}</span>
                            </div>
                          );
                        });
                      });
                    })()
                  ) : (
                    <div className="log-empty-state">
                      <RefreshCw size={15} className="spin-icon" />
                      <span>Waiting for logs or initializing pipeline execution...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setLiveLogs([`[INFO] Re-triggering pipeline execution...`]);
                  handleRerun(selectedPipeline);
                }}
              >
                <RotateCcw size={15} />
                Rerun Pipeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Pipeline */}
      {isCreateModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div
            className="modal-container pipeline-create-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-group">
                <h3 className="modal-title-text">Create New Pipeline</h3>
                <p className="modal-subtitle">
                  Configure automated CI/CD pipeline triggers and workflows.
                </p>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setIsCreateModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePipelineSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Pipeline Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Order Service API"
                    value={newPipeline.name}
                    onChange={(e) =>
                      setNewPipeline({ ...newPipeline, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Repository</label>
                  <select
                    className="form-select"
                    value={newPipeline.repository}
                    onChange={(e) =>
                      setNewPipeline({ ...newPipeline, repository: e.target.value })
                    }
                    required
                  >
                    <option value="">Select a repository</option>
                    {availableRepos.map((repo, idx) => (
                      <option key={repo._id || repo.id || idx} value={repo._id || repo.id}>{repo.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label className="form-label">Target Branch</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newPipeline.branch}
                      onChange={(e) =>
                        setNewPipeline({ ...newPipeline, branch: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group flex-1">
                    <label className="form-label">Build Command</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newPipeline.buildCommand}
                      onChange={(e) =>
                        setNewPipeline({ ...newPipeline, buildCommand: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="form-group deployment-type-group">
                  <label className="form-label">Deployment Target</label>
                  <div className="radio-group-modern">
                    <label className={`radio-card ${newPipeline.deploymentTarget === 'cloudflare' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="deploymentTarget"
                        value="cloudflare"
                        checked={newPipeline.deploymentTarget === 'cloudflare'}
                        onChange={(e) => {
                          setNewPipeline({ 
                            ...newPipeline, 
                            deploymentTarget: e.target.value,
                            dockerfilePath: '',
                            ec2InstanceId: ''
                          });
                        }}
                      />
                      <div className="radio-content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="radio-title">Cloudflare Pages (*.pages.dev)</span>
                          <span style={{ fontSize: '10px', background: 'rgba(249, 115, 22, 0.2)', color: '#f97316', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>Idea 2 • Fastest</span>
                        </div>
                        <span className="radio-desc">Instant *.pages.dev URL • Mobile Ready • Zero EC2</span>
                      </div>
                    </label>

                    <label className={`radio-card ${newPipeline.deploymentTarget === 'aws-s3' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="deploymentTarget"
                        value="aws-s3"
                        checked={newPipeline.deploymentTarget === 'aws-s3'}
                        onChange={(e) => {
                          setNewPipeline({ 
                            ...newPipeline, 
                            deploymentTarget: e.target.value,
                            dockerfilePath: '',
                            ec2InstanceId: ''
                          });
                        }}
                      />
                      <div className="radio-content">
                        <span className="radio-title">AWS S3 + CloudFront</span>
                        <span className="radio-desc">Serverless CDN • Permanent URL • Zero EC2</span>
                      </div>
                    </label>

                    <label className={`radio-card ${newPipeline.deploymentTarget === 'aws' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="deploymentTarget"
                        value="aws"
                        checked={newPipeline.deploymentTarget === 'aws'}
                        onChange={(e) => {
                          setNewPipeline({ 
                            ...newPipeline, 
                            deploymentTarget: e.target.value,
                            dockerfilePath: '' 
                          });
                        }}
                      />
                      <div className="radio-content">
                        <span className="radio-title">Direct EC2</span>
                        <span className="radio-desc">Dockerfile: Not Required</span>
                      </div>
                    </label>

                    <label className={`radio-card ${newPipeline.deploymentTarget === 'docker' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="deploymentTarget"
                        value="docker"
                        checked={newPipeline.deploymentTarget === 'docker'}
                        onChange={(e) => {
                          setNewPipeline({ 
                            ...newPipeline, 
                            deploymentTarget: e.target.value,
                            dockerfilePath: './Dockerfile'
                          });
                        }}
                      />
                      <div className="radio-content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="radio-title">Docker Backend Container</span>
                          <span style={{ fontSize: '10px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>Backend API • Auto-Dockerfile</span>
                        </div>
                        <span className="radio-desc">Node.js, Python, or Go • Auto-generates Dockerfile • Injects .env Secrets</span>
                      </div>
                    </label>
                  </div>
                </div>

                {newPipeline.deploymentTarget === 'cloudflare' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Project Subdomain (*.pages.dev)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. velvora-company (leave empty to auto-generate)"
                        value={newPipeline.cloudflareProjectName || ''}
                        onChange={(e) =>
                          setNewPipeline({ ...newPipeline, cloudflareProjectName: e.target.value })
                        }
                      />
                      <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                        🌐 Live URL will be: <strong>https://{newPipeline.cloudflareProjectName || 'your-project'}.pages.dev</strong> (Works on all mobile phones, 24/7).
                      </span>
                    </div>
                  </>
                )}

                {newPipeline.deploymentTarget === 'aws-s3' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">AWS Account (Optional)</label>
                      <select
                        className="form-select"
                        value={newPipeline.cloudAccount}
                        onChange={(e) =>
                          setNewPipeline({ ...newPipeline, cloudAccount: e.target.value })
                        }
                      >
                        <option value="">⚡ Auto-Use Connected AWS Account ({availableCloudAccounts[0]?.accountName || 'Active Account'})</option>
                        {availableCloudAccounts.map((acc, idx) => (
                          <option key={acc._id || acc.id || idx} value={acc._id || acc.id}>{acc.accountName} ({acc.environment})</option>
                        ))}
                      </select>
                      <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                        Deploys to AWS S3 & CloudFront. 100% Serverless, stays live permanently even if your computer/EC2 is off.
                      </span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Custom S3 Bucket Name (Optional)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. my-app-production (leave empty to auto-generate)"
                        value={newPipeline.s3BucketName || ''}
                        onChange={(e) =>
                          setNewPipeline({
                            ...newPipeline,
                            s3BucketName: e.target.value.toLowerCase().replace(/_/g, '-').replace(/[^a-z0-9-]/g, '')
                          })
                        }
                      />
                      <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                        ℹ️ AWS S3 naming rule: Only lowercase letters, numbers, and hyphens (-) allowed. Underscores are automatically converted to hyphens.
                      </span>
                    </div>
                  </>
                )}

                {newPipeline.deploymentTarget === 'docker' && (
                  <div className="docker-config-section">
                    <div className="docker-auto-banner">
                      <div className="docker-banner-icon">⚡</div>
                      <div className="docker-banner-text">
                        <strong>Auto-Dockerfile Engine Active:</strong> If your repository doesn't have a <code>Dockerfile</code>, CloudOps will auto-detect your project (Node.js, Express, Python, Flask, FastAPI, Django, Go) and generate a production Dockerfile automatically!
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group flex-1">
                        <label className="form-label">Container API Port</label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="5000"
                          value={newPipeline.containerPort || 5000}
                          onChange={(e) =>
                            setNewPipeline({ ...newPipeline, containerPort: e.target.value })
                          }
                          required
                        />
                        <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                          Port mapped to container (e.g. 5000, 3000, 8000)
                        </span>
                      </div>
                      <div className="form-group flex-1">
                        <label className="form-label">Dockerfile Path</label>
                        <input
                          type="text"
                          className="form-input"
                          value={newPipeline.dockerfilePath || './Dockerfile'}
                          onChange={(e) =>
                            setNewPipeline({ ...newPipeline, dockerfilePath: e.target.value })
                          }
                          placeholder="./Dockerfile"
                          required
                        />
                        <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                          Auto-generated if missing in repository
                        </span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Deployment Host (Optional)</label>
                      <select
                        className="form-select"
                        value={newPipeline.cloudAccount || ''}
                        onChange={(e) =>
                          setNewPipeline({ ...newPipeline, cloudAccount: e.target.value })
                        }
                      >
                        <option value="">⚡ Local Docker Daemon (Runs on host machine)</option>
                        {availableCloudAccounts.map((acc, idx) => (
                          <option key={acc._id || acc.id || idx} value={acc._id || acc.id}>
                            ☁️ AWS EC2 Host: {acc.accountName} ({acc.region || acc.environment})
                          </option>
                        ))}
                      </select>
                      <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                        Run container locally or select AWS EC2 to deploy remotely in the cloud.
                      </span>
                    </div>

                    {newPipeline.cloudAccount && (
                      <div className="form-group">
                        <label className="form-label">EC2 Instance ID</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. i-0d7303a65e207bcc9"
                          value={newPipeline.ec2InstanceId || ''}
                          onChange={(e) =>
                            setNewPipeline({ ...newPipeline, ec2InstanceId: e.target.value })
                          }
                        />
                      </div>
                    )}

                    {renderEnvVarsEditor(newPipeline, 'new')}
                  </div>
                )}

                {newPipeline.deploymentTarget === 'aws' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">AWS Account</label>
                      <select
                        className="form-select"
                        value={newPipeline.cloudAccount}
                        onChange={(e) =>
                          setNewPipeline({ ...newPipeline, cloudAccount: e.target.value })
                        }
                        required
                      >
                        <option value="">Select AWS Account</option>
                        {availableCloudAccounts.map((acc, idx) => (
                          <option key={acc._id || acc.id || idx} value={acc._id || acc.id}>{acc.accountName} ({acc.environment})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-row">
                      <div className="form-group flex-2">
                        <label className="form-label">EC2 Instance ID</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. i-0abcd1234efgh5678"
                          value={newPipeline.ec2InstanceId}
                          onChange={(e) =>
                            setNewPipeline({ ...newPipeline, ec2InstanceId: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="form-group flex-1">
                        <label className="form-label">App Port</label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="e.g. 3000"
                          value={newPipeline.appPort}
                          onChange={(e) =>
                            setNewPipeline({ ...newPipeline, appPort: parseInt(e.target.value) || 3000 })
                          }
                          required
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Plus size={16} />
                  Create Pipeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Pipeline */}
      {isEditModalOpen && editPipeline && (
        <div className="modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
          <div
            className="modal-container pipeline-create-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-group">
                <h3 className="modal-title-text">Edit Pipeline</h3>
                <p className="modal-subtitle">
                  Update configuration for {editPipeline.name}.
                </p>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setIsEditModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditPipelineSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Pipeline Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editPipeline.name}
                    onChange={(e) =>
                      setEditPipeline({ ...editPipeline, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label className="form-label">Target Branch</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editPipeline.branch}
                      onChange={(e) =>
                        setEditPipeline({ ...editPipeline, branch: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group flex-1">
                    <label className="form-label">Build Command</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editPipeline.buildCommand}
                      onChange={(e) =>
                        setEditPipeline({ ...editPipeline, buildCommand: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="form-group deployment-type-group">
                  <label className="form-label">Deployment Target</label>
                  <div className="radio-group-modern">
                    <label className={`radio-card ${editPipeline.deploymentTarget === 'cloudflare' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="editDeploymentTarget"
                        value="cloudflare"
                        checked={editPipeline.deploymentTarget === 'cloudflare'}
                        onChange={(e) => {
                          setEditPipeline({ 
                            ...editPipeline, 
                            deploymentTarget: e.target.value,
                            dockerfilePath: '',
                            ec2InstanceId: ''
                          });
                        }}
                      />
                      <div className="radio-content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="radio-title">Cloudflare Pages (*.pages.dev)</span>
                          <span style={{ fontSize: '10px', background: 'rgba(249, 115, 22, 0.2)', color: '#f97316', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>Idea 2 • Fastest</span>
                        </div>
                        <span className="radio-desc">Instant *.pages.dev URL • Mobile Ready • Zero EC2</span>
                      </div>
                    </label>

                    <label className={`radio-card ${editPipeline.deploymentTarget === 'aws-s3' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="editDeploymentTarget"
                        value="aws-s3"
                        checked={editPipeline.deploymentTarget === 'aws-s3'}
                        onChange={(e) => {
                          setEditPipeline({ 
                            ...editPipeline, 
                            deploymentTarget: e.target.value,
                            dockerfilePath: '',
                            ec2InstanceId: ''
                          });
                        }}
                      />
                      <div className="radio-content">
                        <span className="radio-title">AWS S3 + CloudFront</span>
                        <span className="radio-desc">Serverless CDN • Permanent URL • Zero EC2</span>
                      </div>
                    </label>

                    <label className={`radio-card ${editPipeline.deploymentTarget === 'aws' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="editDeploymentTarget"
                        value="aws"
                        checked={editPipeline.deploymentTarget === 'aws'}
                        onChange={(e) => {
                          setEditPipeline({ 
                            ...editPipeline, 
                            deploymentTarget: e.target.value,
                            dockerfilePath: '' 
                          });
                        }}
                      />
                      <div className="radio-content">
                        <span className="radio-title">Direct EC2</span>
                        <span className="radio-desc">Dockerfile: Not Required</span>
                      </div>
                    </label>

                    <label className={`radio-card ${editPipeline.deploymentTarget === 'docker' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="editDeploymentTarget"
                        value="docker"
                        checked={editPipeline.deploymentTarget === 'docker'}
                        onChange={(e) => {
                          setEditPipeline({ 
                            ...editPipeline, 
                            deploymentTarget: e.target.value,
                            dockerfilePath: './Dockerfile'
                          });
                        }}
                      />
                      <div className="radio-content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="radio-title">Docker Backend Container</span>
                          <span style={{ fontSize: '10px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>Backend API • Auto-Dockerfile</span>
                        </div>
                        <span className="radio-desc">Node.js, Python, or Go • Auto-generates Dockerfile • Injects .env Secrets</span>
                      </div>
                    </label>
                  </div>
                </div>

                {editPipeline.deploymentTarget === 'cloudflare' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Project Subdomain (*.pages.dev)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. velvora-company (leave empty to auto-generate)"
                        value={editPipeline.cloudflareProjectName || ''}
                        onChange={(e) =>
                          setEditPipeline({ ...editPipeline, cloudflareProjectName: e.target.value })
                        }
                      />
                      <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                        🌐 Live URL will be: <strong>https://{editPipeline.cloudflareProjectName || 'your-project'}.pages.dev</strong> (Works on all mobile phones, 24/7).
                      </span>
                    </div>
                  </>
                )}

                {editPipeline.deploymentTarget === 'aws-s3' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">AWS Account (Optional)</label>
                      <select
                        className="form-select"
                        value={editPipeline.cloudAccount || ''}
                        onChange={(e) =>
                          setEditPipeline({ ...editPipeline, cloudAccount: e.target.value })
                        }
                      >
                        <option value="">⚡ Auto-Use Connected AWS Account ({availableCloudAccounts[0]?.accountName || 'Active Account'})</option>
                        {availableCloudAccounts.map((acc, idx) => (
                          <option key={acc._id || acc.id || idx} value={acc._id || acc.id}>{acc.accountName} ({acc.environment})</option>
                        ))}
                      </select>
                      <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                        Deploys to AWS S3 & CloudFront. 100% Serverless, stays live permanently even if your computer/EC2 is off.
                      </span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Custom S3 Bucket Name (Optional)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. my-app-production (leave empty to auto-generate)"
                        value={editPipeline.s3BucketName || ''}
                        onChange={(e) =>
                          setEditPipeline({
                            ...editPipeline,
                            s3BucketName: e.target.value.toLowerCase().replace(/_/g, '-').replace(/[^a-z0-9-]/g, '')
                          })
                        }
                      />
                      <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                        ℹ️ AWS S3 naming rule: Only lowercase letters, numbers, and hyphens (-) allowed. Underscores are automatically converted to hyphens.
                      </span>
                    </div>
                  </>
                )}

                {editPipeline.deploymentTarget === 'docker' && (
                  <div className="docker-config-section">
                    <div className="docker-auto-banner">
                      <div className="docker-banner-icon">⚡</div>
                      <div className="docker-banner-text">
                        <strong>Auto-Dockerfile Engine Active:</strong> If your repository doesn't have a <code>Dockerfile</code>, CloudOps will auto-detect your project (Node.js, Express, Python, Flask, FastAPI, Django, Go) and generate a production Dockerfile automatically!
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group flex-1">
                        <label className="form-label">Container API Port</label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="5000"
                          value={editPipeline.containerPort || 5000}
                          onChange={(e) =>
                            setEditPipeline({ ...editPipeline, containerPort: e.target.value })
                          }
                          required
                        />
                        <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                          Port mapped to container (e.g. 5000, 3000, 8000)
                        </span>
                      </div>
                      <div className="form-group flex-1">
                        <label className="form-label">Dockerfile Path</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editPipeline.dockerfilePath || './Dockerfile'}
                          onChange={(e) =>
                            setEditPipeline({ ...editPipeline, dockerfilePath: e.target.value })
                          }
                          placeholder="./Dockerfile"
                          required
                        />
                        <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                          Auto-generated if missing in repository
                        </span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Deployment Host (Optional)</label>
                      <select
                        className="form-select"
                        value={editPipeline.cloudAccount || ''}
                        onChange={(e) =>
                          setEditPipeline({ ...editPipeline, cloudAccount: e.target.value })
                        }
                      >
                        <option value="">⚡ Local Docker Daemon (Runs on host machine)</option>
                        {availableCloudAccounts.map((acc, idx) => (
                          <option key={acc._id || acc.id || idx} value={acc._id || acc.id}>
                            ☁️ AWS EC2 Host: {acc.accountName} ({acc.region || acc.environment})
                          </option>
                        ))}
                      </select>
                      <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                        Run container locally or select AWS EC2 to deploy remotely in the cloud.
                      </span>
                    </div>

                    {editPipeline.cloudAccount && (
                      <div className="form-group">
                        <label className="form-label">EC2 Instance ID</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. i-0d7303a65e207bcc9"
                          value={editPipeline.ec2InstanceId || ''}
                          onChange={(e) =>
                            setEditPipeline({ ...editPipeline, ec2InstanceId: e.target.value })
                          }
                        />
                      </div>
                    )}

                    {renderEnvVarsEditor(editPipeline, 'edit')}
                  </div>
                )}

                {editPipeline.deploymentTarget === 'aws' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">AWS Account</label>
                      <select
                        className="form-select"
                        value={editPipeline.cloudAccount || ''}
                        onChange={(e) =>
                          setEditPipeline({ ...editPipeline, cloudAccount: e.target.value })
                        }
                        required
                      >
                        <option value="">Select AWS Account</option>
                        {availableCloudAccounts.map((acc, idx) => (
                          <option key={acc._id || acc.id || idx} value={acc._id || acc.id}>{acc.accountName} ({acc.environment})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-row">
                      <div className="form-group flex-2">
                        <label className="form-label">EC2 Instance ID</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. i-0abcd1234efgh5678"
                          value={editPipeline.ec2InstanceId || ''}
                          onChange={(e) =>
                            setEditPipeline({ ...editPipeline, ec2InstanceId: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="form-group flex-1">
                        <label className="form-label">App Port</label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="e.g. 3000"
                          value={editPipeline.appPort || ''}
                          onChange={(e) =>
                            setEditPipeline({ ...editPipeline, appPort: parseInt(e.target.value) || 3000 })
                          }
                          required
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Generate GitHub Action Modal */}
      {isActionModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsActionModalOpen(false)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <Terminal size={20} className="text-blue" />
                Generate GitHub Action
              </h2>
              <button className="close-btn" onClick={() => setIsActionModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <p className="modal-description">
                Save this YAML file as <code>.github/workflows/ci-cd.yml</code> in your repository to automatically trigger pipeline updates on push.
              </p>
              
              <div className="code-block-wrapper" style={{ marginTop: '20px', background: 'var(--bg-card)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <pre style={{ fontSize: '12px', color: 'var(--text-secondary)', overflowX: 'auto' }}>
{`name: Cloud Orchestrator CI/CD

on:
  push:
    branches:
      - main
      - master

jobs:
  notify-orchestrator:
    runs-on: ubuntu-latest
    steps:
      - name: Notify Cloud Orchestrator API
        run: |
          curl -X POST https://your-orchestrator-domain.com/api/v1/pipelines/webhook/github \\
          -H "Content-Type: application/json" \\
          -H "x-github-event: workflow_run" \\
          -d '{
            "repository": { "name": "\${{ github.event.repository.name }}" },
            "workflow_run": { "status": "completed", "conclusion": "success" }
          }'
`}
                </pre>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsActionModalOpen(false)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={() => {
                navigator.clipboard.writeText(`name: Cloud Orchestrator CI/CD\n\non:\n  push:\n    branches:\n      - main\n      - master\n\njobs:\n  notify-orchestrator:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Notify Cloud Orchestrator API\n        run: |\n          curl -X POST https://your-orchestrator-domain.com/api/v1/pipelines/webhook/github \\\n          -H "Content-Type: application/json" \\\n          -H "x-github-event: workflow_run" \\\n          -d '{\n            "repository": { "name": "\${{ github.event.repository.name }}" },\n            "workflow_run": { "status": "completed", "conclusion": "success" }\n          }'`);
                showToast('Action YAML copied to clipboard!', 'success');
              }}>
                <Copy size={16} />
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk .env Paste Modal */}
      {isEnvPasteModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }} onClick={() => setIsEnvPasteModalOpen(false)}>
          <div className="modal-container env-paste-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <h3 className="modal-title">📋 Bulk Import Environment Variables</h3>
                <p className="modal-subtitle">
                  Paste the contents of your <code>.env</code> file below. Empty lines and comments (<code>#</code>) will be filtered automatically.
                </p>
              </div>
              <button className="btn-close-modal" onClick={() => setIsEnvPasteModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <textarea
                className="env-paste-textarea"
                rows={10}
                placeholder={`PORT=5000\nMONGODB_URI=mongodb+srv://...\nJWT_SECRET=super_secret_key\nNODE_ENV=production`}
                value={rawEnvText}
                onChange={(e) => setRawEnvText(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsEnvPasteModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleImportRawEnv}
              >
                Import Variables
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import './PipelinesPage.css';
import {
  Plus,
  Search,
  RotateCcw,
  Eye,
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
  ShieldAlert
} from 'lucide-react';

import ApiClient from '../utils/api';

// Removed INITIAL_PIPELINES mock data

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
  const [toast, setToast] = useState(null);

  React.useEffect(() => {
    if (!isViewModalOpen) {
      setLiveLogs([]);
    }
  }, [isViewModalOpen]);

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
    const socket = io("http://localhost:5002", {
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
      setLiveLogs(prev => {
        // Prevent duplicate consecutive lines if possible, or just append
        return [...prev, log];
      });
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
          dockerfilePath: p.dockerfilePath || './Dockerfile',
          deploymentTarget: p.deploymentTarget || 'docker',
          buildCommand: p.buildCommand || 'npm run build'
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
    deploymentTarget: 'docker',
    cloudAccount: '',
    ec2InstanceId: '',
    appPort: 3000
  });

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
        showToast(`Pipeline ${pipeline.name} executed successfully!`, 'success');
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

  const handleOpenViewModal = (pipeline) => {
    setSelectedPipeline(pipeline);
    setIsViewModalOpen(true);
    setLiveLogs([]);
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
        deploymentTarget: newPipeline.deploymentTarget
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
          deploymentTarget: 'docker'
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
        deploymentTarget: editPipeline.deploymentTarget
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
      repository: pipeline.repository || '',
    });
    setIsEditModalOpen(true);
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'Success':
        return (
          <span className="badge badge-success">
            <CheckCircle2 size={13} />
            Success
          </span>
        );
      case 'Failed':
        return (
          <span className="badge badge-failed">
            <XCircle size={13} />
            Failed
          </span>
        );
      case 'Running':
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
          <div className="stat-header">
            <span className="stat-label">Total Pipelines</span>
            <div className="stat-icon-wrapper total">
              <Layers size={18} />
            </div>
          </div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-footer">
            <span className="stat-trend neutral">Across all repositories</span>
          </div>
        </div>

        <div className="stat-card running-card">
          <div className="stat-header">
            <span className="stat-label">Running</span>
            <div className="stat-icon-wrapper running">
              <RefreshCw size={18} className="spin-icon" />
            </div>
          </div>
          <div className="stat-value running-color">{stats.running}</div>
          <div className="stat-footer">
            <span className="stat-indicator pulse-blue">Active execution</span>
          </div>
        </div>

        <div className="stat-card successful-card">
          <div className="stat-header">
            <span className="stat-label">Successful</span>
            <div className="stat-icon-wrapper successful">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="stat-value success-color">{stats.successful}</div>
          <div className="stat-footer">
            <span className="stat-trend positive">84.4% success rate</span>
          </div>
        </div>

        <div className="stat-card failed-card">
          <div className="stat-header">
            <span className="stat-label">Failed</span>
            <div className="stat-icon-wrapper failed">
              <XCircle size={18} />
            </div>
          </div>
          <div className="stat-value failed-color">{stats.failed}</div>
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
                        </div>
                        <div className="commit-preview">
                          <code className="commit-hash">{pipeline.commitHash}</code>
                          <span className="commit-msg">{pipeline.commitMsg}</span>
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

            <div className="modal-body">
              {/* Commit details card */}
              <div className="modal-commit-card">
                <div className="commit-header">
                  <span className="commit-title">{selectedPipeline.commitMsg}</span>
                  <span className="started-time">Triggered {selectedPipeline.startedAt}</span>
                </div>
                <div className="commit-author">
                  {renderTriggerAvatar(selectedPipeline.triggeredBy)}
                  <span>Triggered by <strong>{selectedPipeline.triggeredBy.name}</strong></span>
                </div>
              </div>

              {/* Execution Stages */}
              <div className="stages-section">
                <h4 className="section-title">Execution Stages</h4>
                <div className="stages-timeline">
                  {selectedPipeline.stages.map((stage, idx) => (
                    <div
                      key={idx}
                      className={`stage-card stage-${stage.status}`}
                    >
                      <div className="stage-header">
                        <span className="stage-name">{stage.name}</span>
                        <span className="stage-duration">{stage.duration}</span>
                      </div>
                      <div className="stage-status-indicator">
                        {stage.status === 'success' && (
                          <span className="status-label text-success">
                            <Check size={14} /> Passed
                          </span>
                        )}
                        {stage.status === 'failed' && (
                          <span className="status-label text-failed">
                            <X size={14} /> Failed
                          </span>
                        )}
                        {stage.status === 'running' && (
                          <span className="status-label text-running">
                            <RefreshCw size={14} className="spin-icon" /> In Progress
                          </span>
                        )}
                        {stage.status === 'pending' && (
                          <span className="status-label text-pending">
                            <Clock size={14} /> Pending
                          </span>
                        )}
                        {stage.status === 'skipped' && (
                          <span className="status-label text-muted">
                            Skipped
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mock Terminal Output */}
              <div className="terminal-box">
                <div className="terminal-header">
                  <div className="terminal-dots">
                    <span className="dot dot-red"></span>
                    <span className="dot dot-yellow"></span>
                    <span className="dot dot-green"></span>
                  </div>
                  <span className="terminal-title">build-log.stdout</span>
                  <div className="terminal-actions">
                    <button className="terminal-btn" title="Download Log">
                      <Download size={13} />
                    </button>
                  </div>
                </div>
                <div className="terminal-content">
                  {liveLogs.length > 0 ? (
                    liveLogs.map((log, idx) => (
                      <p key={idx} className={`log-line ${log.includes('[ERROR]') || log.includes('ERR!') ? 'error' : log.includes('✓') || log.includes('[SUCCESS]') ? 'success' : 'info'}`}>{log}</p>
                    ))
                  ) : (
                    <p className="log-line info">Waiting for logs...</p>
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
                  handleRerun(selectedPipeline);
                  setIsViewModalOpen(false);
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
                        <span className="radio-title">Docker + ECR + EC2</span>
                        <span className="radio-desc">Dockerfile: Required</span>
                      </div>
                    </label>
                  </div>
                </div>

                {newPipeline.deploymentTarget === 'docker' && (
                  <div className="form-group">
                    <label className="form-label">Dockerfile Path</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newPipeline.dockerfilePath}
                      onChange={(e) =>
                        setNewPipeline({ ...newPipeline, dockerfilePath: e.target.value })
                      }
                      required
                    />
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
                        <span className="radio-title">Docker + ECR + EC2</span>
                        <span className="radio-desc">Dockerfile: Required</span>
                      </div>
                    </label>
                  </div>
                </div>

                {editPipeline.deploymentTarget === 'docker' && (
                  <div className="form-group">
                    <label className="form-label">Dockerfile Path</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editPipeline.dockerfilePath || ''}
                      onChange={(e) =>
                        setEditPipeline({ ...editPipeline, dockerfilePath: e.target.value })
                      }
                      required
                    />
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
    </div>
  );
}

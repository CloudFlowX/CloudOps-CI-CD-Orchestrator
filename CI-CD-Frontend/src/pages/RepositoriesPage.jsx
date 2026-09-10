import React, { useState, useMemo } from 'react';
import { useRole } from '../context/RoleContext';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Plus,
  GitBranch,
  Star,
  Eye,
  Settings,
  Unplug,
  ChevronLeft,
  ChevronRight,
  Filter,
  GitCommit,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  X,
  Radio,
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';
import './RepositoriesPage.css';

// Inline SVGs for GitHub and GitLab as requested
const GitHubIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const GitLabIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94l1.22-3.78 2.44-7.51c.06-.18.26-.3.46-.3.2 0 .39.11.46.3l2.44 7.51h7.86l2.44-7.51c.07-.19.26-.3.46-.3.2 0 .4.11.46.3l2.44 7.51 1.22 3.78a.84.84 0 01-.3.94z" fill="#FC6D26"/>
    <path d="M22.65 14.39L12 22.13s6.88-5.32 10.65-7.74c.43-.32.55-.91.3-.94z" fill="#E24329"/>
    <path d="M1.35 14.39L12 22.13S5.12 16.81 1.35 14.39c-.43-.32-.55-.91-.3-.94z" fill="#E24329"/>
    <path d="M1.35 14.39l2.44-7.51c.07-.19.26-.3.46-.3.2 0 .4.11.46.3l2.44 7.51H1.35z" fill="#FCA326"/>
    <path d="M22.65 14.39l-2.44-7.51c-.07-.19-.26-.3-.46-.3-.2 0-.4.11-.46.3l-2.44 7.51h5.36z" fill="#FCA326"/>
  </svg>
);

const BitbucketIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M.75 2.5a.75.75 0 00-.742.846l2.5 17.5A.75.75 0 003.25 21.5h17.5a.75.75 0 00.742-.654l2.5-17.5A.75.75 0 0023.25 2.5H.75zm14.67 12.387H8.58l-1.1-6.137h9.04l-1.1 6.137z" fill="#2684FF" />
  </svg>
);

import ApiClient from '../utils/api';

// Initial Mock Repository Data
// Removed mock data

export default function RepositoriesPage() {
  const { currentRole } = useRole();
  const { user, token } = useAuth();
  
  const [repositories, setRepositories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Name');
  const [currentPage, setCurrentPage] = useState(1);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  // GitHub Integration States
  const [isGithubConnected, setIsGithubConnected] = useState(false);
  const [githubRepos, setGithubRepos] = useState([]);
  const [githubBranches, setGithubBranches] = useState([]);
  const [loadingGithubRepos, setLoadingGithubRepos] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);

  React.useEffect(() => {
    fetchRepositories();
  }, []);

  // GitHub OAuth Callback Handling
  React.useEffect(() => {
    if (user?.githubUsername) {
      setIsGithubConnected(true);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code && !user?.githubUsername) {
      handleGithubCallback(code);
    }
  }, [user]);

  const handleConnectGithub = async () => {
    try {
      const res = await ApiClient.get('/github/auth-url');
      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        showToast(res.message || "Failed to initiate GitHub login");
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Failed to initiate GitHub login");
    }
  };

  const handleGithubCallback = async (code) => {
    try {
      setLoading(true);
      window.history.replaceState({}, document.title, window.location.pathname);
      const res = await ApiClient.post('/github/connect', { code });
      if (res.success) {
        showToast("Successfully connected to GitHub!");
        setIsGithubConnected(true);
      }
    } catch (err) {
      showToast("Failed to connect GitHub account");
    } finally {
      setLoading(false);
    }
  };

  // Fetch GitHub repos when modal opens
  React.useEffect(() => {
    if (isConnectModalOpen && isGithubConnected && githubRepos.length === 0) {
      fetchGithubRepos();
    }
  }, [isConnectModalOpen, isGithubConnected]);

  const fetchGithubRepos = async () => {
    try {
      setLoadingGithubRepos(true);
      const res = await ApiClient.get('/github/repositories');
      if (res.success) {
        // Filter out repositories that are already in the database
        const existingFullNames = repositories.map(r => r.fullName.toLowerCase());
        const availableRepos = res.repositories.filter(
          repo => !existingFullNames.includes(repo.fullName.toLowerCase())
        );
        setGithubRepos(availableRepos);
      }
    } catch (err) {
      showToast("Failed to fetch GitHub repositories");
    } finally {
      setLoadingGithubRepos(false);
    }
  };

  const handleRepoChange = async (repoFullName) => {
    const selectedRepo = githubRepos.find(r => r.fullName === repoFullName);
    if (!selectedRepo) return;
    
    setNewRepo({ 
      ...newRepo, 
      name: selectedRepo.name,
      fullName: selectedRepo.fullName,
      provider: 'GitHub',
      language: selectedRepo.language || 'TypeScript',
      branch: selectedRepo.defaultBranch || 'main'
    });

    try {
      setLoadingBranches(true);
      const [owner, repo] = repoFullName.split('/');
      const res = await ApiClient.get(`/github/repositories/${owner}/${repo}/branches`);
      if (res.success) {
        setGithubBranches(res.branches);
      }
    } catch (err) {
      showToast("Failed to fetch branches");
    } finally {
      setLoadingBranches(false);
    }
  };

  const fetchRepositories = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.get('/repositories');
      if (res.success && res.repositories) {
        const mapped = res.repositories.map(repo => ({
          id: repo._id,
          name: repo.name,
          fullName: repo.githubUrl.replace('https://github.com/', ''),
          branch: repo.branch || 'main',
          provider: repo.githubUrl.includes('gitlab') ? 'GitLab' : 'GitHub',
          language: repo.name.toLowerCase().includes('python') ? 'Python' : (repo.name.toLowerCase().includes('go') ? 'Go' : 'JavaScript'),
          status: repo.status === 'active' ? 'Connected' : 'Disconnected',
          buildStatus: repo.status === 'active' ? 'Success' : 'None',
          stars: repo.name.length * 3, // Deterministic based on name length
          starred: false,
          lastCommit: {
            hash: repo._id.substring(repo._id.length - 7), // Use part of ID as mock hash
            author: repo.owner?.fullName || 'system',
            time: new Date(repo.updatedAt).toLocaleDateString() || 'Recently',
            message: 'Initial commit or update'
          }
        }));
        setRepositories(mapped);
      }
    } catch (error) {
      console.error('Error fetching repositories:', error);
      showToast('Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  // New Repository Form State
  const [newRepo, setNewRepo] = useState({
    name: '',
    fullName: '',
    provider: 'GitHub',
    branch: 'main',
    language: 'TypeScript'
  });

  // Calculate dynamic stats
  const totalCount = repositories.length;
  const connectedCount = useMemo(
    () => repositories.filter(r => r.status === 'Connected').length,
    [repositories]
  );
  const pendingCount = useMemo(
    () => totalCount - connectedCount,
    [totalCount, connectedCount]
  );

  // Show Toast
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Toggle Star
  const handleToggleStar = (id) => {
    setRepositories(prev =>
      prev.map(repo => {
        if (repo.id === id) {
          const isStarred = !repo.starred;
          showToast(isStarred ? `Starred ${repo.name}` : `Unstarred ${repo.name}`);
          return {
            ...repo,
            starred: isStarred,
            stars: isStarred ? repo.stars + 1 : repo.stars - 1
          };
        }
        return repo;
      })
    );
  };

  const handleToggleConnection = async (id) => {
    const repo = repositories.find(r => r.id === id);
    if (!repo) return;
    
    const newStatus = repo.status === 'Connected' ? 'inactive' : 'active';
    
    try {
      const res = await ApiClient.put(`/repositories/${id}`, { status: newStatus });
      if (res.success) {
        showToast(`${repo.name} is now ${newStatus === 'active' ? 'Connected' : 'Disconnected'}`);
        fetchRepositories();
      }
    } catch (error) {
      console.error(error);
      showToast('Error updating repository status');
    }
  };

  // Filter & Sort Repositories
  const filteredRepositories = useMemo(() => {
    return repositories.filter(repo => {
      const matchesSearch =
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.language.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesProvider =
        providerFilter === 'All' || repo.provider === providerFilter;

      const matchesStatus =
        statusFilter === 'All' || repo.status === statusFilter;

      return matchesSearch && matchesProvider && matchesStatus;
    }).sort((a, b) => {
      if (sortBy === 'Name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'Last Updated') {
        return a.id - b.id;
      } else if (sortBy === 'Status') {
        return a.status.localeCompare(b.status);
      } else if (sortBy === 'Stars') {
        return b.stars - a.stars;
      }
      return 0;
    });
  }, [repositories, searchQuery, providerFilter, statusFilter, sortBy]);

  const handleConnectSubmit = async (e) => {
    e.preventDefault();
    if (!newRepo.name.trim()) return;

    try {
      const payload = {
        name: newRepo.name,
        githubUrl: newRepo.fullName ? `https://github.com/${newRepo.fullName}` : `https://${newRepo.provider.toLowerCase()}.com/kunal24/${newRepo.name.toLowerCase().replace(/\s+/g, '-')}`,
        branch: newRepo.branch || 'main',
        visibility: 'private'
      };
      
      const res = await ApiClient.post('/repositories', payload);
      
      if (res.success) {
        setIsConnectModalOpen(false);
        setNewRepo({ name: '', provider: 'GitHub', branch: 'main', language: 'TypeScript' });
        showToast(`Successfully connected ${newRepo.name}!`);
        fetchRepositories();
      }
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.message || 'Error connecting repository';
      showToast(errorMsg);
    }
  };

  // Helper for language badge class
  const getLanguageColorClass = (lang) => {
    switch (lang.toLowerCase()) {
      case 'javascript':
      case 'js':
        return 'lang-js';
      case 'typescript':
      case 'ts':
        return 'lang-ts';
      case 'python':
        return 'lang-py';
      case 'go':
        return 'lang-go';
      case 'java':
        return 'lang-java';
      case 'rust':
        return 'lang-rust';
      case 'kotlin':
        return 'lang-kotlin';
      default:
        return 'lang-default';
    }
  };

  // Helper for build status badge
  const renderBuildBadge = (status) => {
    switch (status) {
      case 'Success':
        return (
          <span className="build-badge status-success">
            <CheckCircle2 size={13} /> Passed
          </span>
        );
      case 'Failed':
        return (
          <span className="build-badge status-failed">
            <XCircle size={13} /> Failed
          </span>
        );
      case 'Running':
        return (
          <span className="build-badge status-running">
            <Loader2 size={13} className="spin-icon" /> Running
          </span>
        );
      default:
        return (
          <span className="build-badge status-none">
            <RefreshCw size={13} /> Idle
          </span>
        );
    }
  };

  return (
    <div className="repo-page-container">
      {/* Notification Toast */}
      {toastMessage && (
        <div className="repo-toast">
          <Zap size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Page Header */}
      <div className="repo-header-section">
        <div className="repo-header-text">
          <h1 className="repo-title">Repositories</h1>
          <p className="repo-subtitle">Manage your connected repositories and source code</p>
        </div>
        {currentRole !== 'Viewer' && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn btn-primary"
              onClick={() => setIsConnectModalOpen(true)}
            >
              <Plus size={18} />
              <span>Connect Repository</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Stats Bar */}
      <div className="repo-stats-bar">
        <div className="stat-card">
          <div className="stat-icon-wrapper stat-blue">
            <GitBranch size={20} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Total Repositories</span>
            <span className="stat-value">{totalCount}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-green">
            <ShieldCheck size={20} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Connected</span>
            <div className="stat-value-group">
              <span className="stat-value text-green">{connectedCount}</span>
              <span className="stat-badge green-badge">Active Sync</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-yellow">
            <Radio size={20} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Pending</span>
            <div className="stat-value-group">
              <span className="stat-value text-yellow">{pendingCount}</span>
              <span className="stat-badge yellow-badge">Requires Action</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="repo-filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search repositories by name or language..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="repo-search-input"
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-controls">
          <div className="select-wrapper">
            <span className="select-label"><Filter size={14} /> Provider:</span>
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="repo-select"
            >
              <option value="All">All Providers</option>
              <option value="GitHub">GitHub</option>
              <option value="GitLab">GitLab</option>
              <option value="Bitbucket">Bitbucket</option>
            </select>
          </div>

          <div className="select-wrapper">
            <span className="select-label">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="repo-select"
            >
              <option value="All">All Status</option>
              <option value="Connected">Connected</option>
              <option value="Disconnected">Disconnected</option>
            </select>
          </div>

          <div className="select-wrapper">
            <span className="select-label">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="repo-select"
            >
              <option value="Name">Name</option>
              <option value="Last Updated">Last Updated</option>
              <option value="Status">Status</option>
              <option value="Stars">Stars</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Repository Cards Grid (2 Columns) */}
      <div className="repo-grid">
        {filteredRepositories.map((repo) => (
          <div key={repo.id} className={`repo-card ${repo.status.toLowerCase()}`}>
            {/* Card Header */}
            <div className="repo-card-header">
              <div className="repo-identity">
                <div className="provider-icon-box">
                  {repo.provider === 'GitLab' ? (
                    <GitLabIcon />
                  ) : repo.provider === 'Bitbucket' ? (
                    <BitbucketIcon />
                  ) : (
                    <GitHubIcon />
                  )}
                </div>
                <div className="repo-title-block">
                  <div className="repo-name-row">
                    <h3 className="repo-name">{repo.name}</h3>
                    <button
                      className={`star-btn ${repo.starred ? 'active' : ''}`}
                      onClick={() => handleToggleStar(repo.id)}
                      title={repo.starred ? 'Unstar repository' : 'Star repository'}
                    >
                      <Star size={15} fill={repo.starred ? 'var(--accent-yellow)' : 'none'} />
                      <span className="star-count">{repo.stars}</span>
                    </button>
                  </div>
                  <span className="repo-org">{repo.fullName}</span>
                </div>
              </div>

              {/* Connected / Disconnected Dot */}
              <div className="connection-status-pill">
                <span className={`status-dot ${repo.status.toLowerCase()}`}></span>
                <span className="status-text">{repo.status}</span>
              </div>
            </div>

            {/* Card Info Badges */}
            <div className="repo-badges-row">
              <div className="badge branch-badge">
                <GitBranch size={13} />
                <span>{repo.branch}</span>
              </div>

              <div className={`badge lang-badge ${getLanguageColorClass(repo.language)}`}>
                {repo.language}
              </div>

              {renderBuildBadge(repo.buildStatus)}
            </div>

            {/* Commit Meta */}
            <div className="repo-commit-info">
              <div className="commit-meta">
                <GitCommit size={14} className="commit-icon" />
                <span className="commit-hash">{repo.lastCommit.hash}</span>
                <span className="commit-author">by {repo.lastCommit.author}</span>
                <span className="commit-time">• {repo.lastCommit.time}</span>
              </div>
              <p className="commit-msg">{repo.lastCommit.message}</p>
            </div>

            {/* Card Actions */}
            <div className="repo-card-actions">
              <button
                className="action-btn btn-view"
                onClick={() => showToast(`Opening view for ${repo.name}`)}
              >
                <Eye size={14} />
                <span>View</span>
              </button>

              {currentRole !== 'Viewer' && (
                <>
                  <button
                    className="action-btn btn-settings"
                    onClick={() => showToast(`Opened settings for ${repo.name}`)}
                  >
                    <Settings size={14} />
                    <span>Settings</span>
                  </button>

                  <button
                    className={`action-btn ${repo.status === 'Connected' ? 'btn-disconnect' : 'btn-reconnect'}`}
                    onClick={() => handleToggleConnection(repo.id)}
                  >
                    <Unplug size={14} />
                    <span>{repo.status === 'Connected' ? 'Disconnect' : 'Connect'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredRepositories.length === 0 && (
        <div className="empty-repo-state">
          <Filter size={40} className="empty-icon" />
          <h3>No repositories found</h3>
          <p>Try adjusting your search query or filters.</p>
          <button
            className="reset-filters-btn"
            onClick={() => {
              setSearchQuery('');
              setProviderFilter('All');
              setStatusFilter('All');
            }}
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* 5. Pagination Bar */}
      <div className="repo-pagination-bar">
        <div className="pagination-info">
          Showing <span>1-{filteredRepositories.length}</span> of <span>{totalCount}</span> repositories
        </div>

        <div className="pagination-controls">
          <button
            className="page-nav-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>

          <div className="page-numbers">
            <button
              className={`page-num ${currentPage === 1 ? 'active' : ''}`}
              onClick={() => setCurrentPage(1)}
            >
              1
            </button>
            <button
              className={`page-num ${currentPage === 2 ? 'active' : ''}`}
              onClick={() => setCurrentPage(2)}
            >
              2
            </button>
            <button
              className={`page-num ${currentPage === 3 ? 'active' : ''}`}
              onClick={() => setCurrentPage(3)}
            >
              3
            </button>
          </div>

          <button
            className="page-nav-btn"
            disabled={currentPage === 3}
            onClick={() => setCurrentPage(p => Math.min(p + 1, 3))}
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Modal: Connect Repository */}
      {isConnectModalOpen && (
        <div className="repo-modal-overlay" onClick={() => setIsConnectModalOpen(false)}>
          <div className="repo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <Plus size={20} className="text-green" />
                <h2>Connect New Repository</h2>
              </div>
              <button className="close-modal-btn" onClick={() => setIsConnectModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConnectSubmit} className="modal-form">
              <div className="form-group">
                <label>Git Provider</label>
                <div className="provider-selector">
                  {['GitHub', 'GitLab', 'Bitbucket'].map(provider => (
                    <button
                      type="button"
                      key={provider}
                      className={`provider-option ${newRepo.provider === provider ? 'selected' : ''}`}
                      onClick={() => setNewRepo({ ...newRepo, provider })}
                    >
                      {provider === 'GitHub' && <GitHubIcon />}
                      {provider === 'GitLab' && <GitLabIcon />}
                      {provider === 'Bitbucket' && <BitbucketIcon />}
                      <span>{provider}</span>
                    </button>
                  ))}
                </div>
              </div>

              {newRepo.provider === 'GitHub' && !isGithubConnected ? (
                <div className="github-connect-prompt" style={{ textAlign: 'center', padding: '20px 0' }}>
                  <p style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>
                    Connect your GitHub account to automatically select repositories and branches.
                  </p>
                  <button 
                    type="button"
                    className="btn"
                    style={{ backgroundColor: '#24292e', color: 'white', margin: '0 auto' }}
                    onClick={handleConnectGithub}
                  >
                    <GitHubIcon className="w-4 h-4" />
                    <span style={{ marginLeft: '8px' }}>Connect with GitHub</span>
                  </button>
                </div>
              ) : newRepo.provider === 'GitHub' && isGithubConnected ? (
                <>
                  <div className="form-group">
                    <label>Select Repository</label>
                    <div className="select-wrapper-full">
                      <select
                        value={newRepo.fullName}
                        onChange={(e) => handleRepoChange(e.target.value)}
                        required
                        className="modal-input"
                        disabled={loadingGithubRepos}
                      >
                        <option value="">{loadingGithubRepos ? 'Loading repositories...' : 'Select a repository'}</option>
                        {githubRepos.map(r => (
                          <option key={r.id} value={r.fullName}>{r.fullName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Select Branch</label>
                      <select
                        value={newRepo.branch}
                        onChange={(e) => setNewRepo({ ...newRepo, branch: e.target.value })}
                        required
                        className="modal-input"
                        disabled={loadingBranches || !newRepo.fullName}
                      >
                        <option value="">{loadingBranches ? 'Loading branches...' : 'Select a branch'}</option>
                        {githubBranches.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>Repository Name</label>
                    <input
                      type="text"
                      placeholder="e.g. User Auth Microservice"
                      value={newRepo.name}
                      onChange={(e) => setNewRepo({ ...newRepo, name: e.target.value })}
                      required
                      className="modal-input"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Default Branch</label>
                      <input
                        type="text"
                        placeholder="main"
                        value={newRepo.branch}
                        onChange={(e) => setNewRepo({ ...newRepo, branch: e.target.value })}
                        className="modal-input"
                      />
                    </div>
                  </div>
                </>
              )}


              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-btn cancel-btn"
                  onClick={() => setIsConnectModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="modal-btn submit-btn">
                  Connect Repository
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

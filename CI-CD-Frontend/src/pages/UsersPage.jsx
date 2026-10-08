import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Mail,
  Shield,
  Eye,
  UserPlus,
  X,
  Check,
  MoreVertical,
  UserCheck,
  UserX,
  Layers,
  ChevronRight,
  Sparkles,
  Briefcase
} from 'lucide-react';
import './UsersPage.css';
import ApiClient from '../utils/api';
// Removing INITIAL_USERS mock

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  
  React.useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await ApiClient.get('/users');
      if (res.success) {
        const mappedUsers = res.users.map(u => {
          const initials = u.fullName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
          let color = '#64748b';
          if (u.role === 'admin') color = '#a855f7';
          else if (u.role === 'developer') color = '#3b82f6';
          
          return {
            id: u._id,
            name: u.fullName,
            email: u.email,
            role: u.role.charAt(0).toUpperCase() + u.role.slice(1),
            status: u.isVerified ? 'Active' : 'Pending',
            lastActive: new Date(u.updatedAt).toLocaleDateString(),
            teams: [],
            initials: initials,
            color: color
          };
        });
        setUsers(mappedUsers);
      }
    } catch (err) {
      console.error(err);
      showNotification('Failed to fetch users');
    }
  };
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeUser, setActiveUser] = useState(null);

  // Invite Form State
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'Developer',
    teams: []
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'Developer',
    status: 'Active',
    teams: []
  });

  // Action Notification State
  const [toastMessage, setToastMessage] = useState(null);

  const showNotification = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Derived Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter(u => u.role === 'Admin').length;
    const developers = users.filter(u => u.role === 'Developer').length;
    const viewers = users.filter(u => u.role === 'Viewer').length;
    const activeCount = users.filter(u => u.status === 'Active').length;

    return { total, admins, developers, viewers, activeCount };
  }, [users]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.teams.some(team => team.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRole = roleFilter === 'All' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'All' || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Handlers for Invite
  const handleInviteSubmit = (e) => {
    e.preventDefault();
    if (!inviteForm.name || !inviteForm.email) return;

    const initials = inviteForm.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2) || 'U';

    let color = '#3b82f6';
    if (inviteForm.role === 'Admin') color = '#a855f7';
    if (inviteForm.role === 'Viewer') color = '#64748b';

    const newUser = {
      id: Date.now(),
      name: inviteForm.name,
      email: inviteForm.email,
      role: inviteForm.role,
      status: 'Active',
      lastActive: 'Just now',
      teams: inviteForm.teams,
      initials: initials,
      color: color
    };

    setUsers([newUser, ...users]);
    setIsInviteModalOpen(false);
    setInviteForm({ name: '', email: '', role: 'Developer', teams: [] });
    showNotification(`Invitation sent to ${newUser.email}`);
  };

  // Handlers for Edit
  const openEditModal = (user) => {
    setActiveUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      teams: [...user.teams]
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!activeUser) return;

    try {
      const roleStr = editForm.role.toLowerCase();
      const res = await ApiClient.put(`/users/${activeUser.id}/role`, { role: roleStr });
      if (res.success) {
        showNotification(`Updated role for ${editForm.name}`);
        fetchUsers();
      } else {
        showNotification(`Failed to update: ${res.message || 'Error'}`);
      }
    } catch (err) {
      showNotification('Error updating user role');
    }
    
    setIsEditModalOpen(false);
    setActiveUser(null);
  };

  // Handlers for Remove
  const openDeleteModal = (user) => {
    setActiveUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!activeUser) return;
    try {
      const res = await ApiClient.delete(`/users/${activeUser.id}`);
      if (res.success) {
        showNotification(`User ${activeUser.name} removed successfully.`);
        fetchUsers();
      } else {
        showNotification(`Failed to remove: ${res.message || 'Error'}`);
      }
    } catch (err) {
      showNotification('Error removing user');
    }
    setIsDeleteModalOpen(false);
    setActiveUser(null);
  };

  const toggleInviteTeam = (teamName) => {
    setInviteForm(prev => {
      const exists = prev.teams.includes(teamName);
      return {
        ...prev,
        teams: exists
          ? prev.teams.filter(t => t !== teamName)
          : [...prev.teams, teamName]
      };
    });
  };

  const toggleEditTeam = (teamName) => {
    setEditForm(prev => {
      const exists = prev.teams.includes(teamName);
      return {
        ...prev,
        teams: exists
          ? prev.teams.filter(t => t !== teamName)
          : [...prev.teams, teamName]
      };
    });
  };

  const resetFilters = () => {
    setSearchQuery('');
    setRoleFilter('All');
    setStatusFilter('All');
  };

  return (
    <div className="users-page-container animate-fade-in">
      {/* Notification Toast */}
      {toastMessage && (
        <div className="users-toast">
          <Check className="toast-icon" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. PAGE HEADER */}
      <div className="users-page-header">
        <div className="header-text-group">
          <h1 className="users-page-title">
            <Users className="header-title-icon" />
            Users
          </h1>
          <p className="users-page-subtitle">
            Manage team members, assign role permissions, and organize environment access.
          </p>
        </div>

        <button
          className="btn-invite-user"
          onClick={() => setIsInviteModalOpen(true)}
        >
          <Plus className="btn-icon" />
          <span>Invite User</span>
        </button>
      </div>

      {/* 2. STATS BAR */}
      <div className="users-stats-grid">
        {/* Total Users */}
        <div className="stat-card glass-card">
          <div className="stat-card-header">
            <span className="stat-label">Total Users</span>
            <div className="stat-icon-wrapper blue">
              <Users className="stat-icon" />
            </div>
          </div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-footer">
            <span className="stat-badge success">{stats.activeCount} active now</span>
          </div>
        </div>

        {/* Admins */}
        <div className="stat-card glass-card">
          <div className="stat-card-header">
            <span className="stat-label">Admins</span>
            <div className="stat-icon-wrapper purple">
              <Shield className="stat-icon" />
            </div>
          </div>
          <div className="stat-value">{stats.admins}</div>
          <div className="stat-footer">
            <span className="stat-subtext">Full system & security controls</span>
          </div>
        </div>

        {/* Developers */}
        <div className="stat-card glass-card">
          <div className="stat-card-header">
            <span className="stat-label">Developers</span>
            <div className="stat-icon-wrapper cyan">
              <UserPlus className="stat-icon" />
            </div>
          </div>
          <div className="stat-value">{stats.developers}</div>
          <div className="stat-footer">
            <span className="stat-subtext">Pipeline & trigger permissions</span>
          </div>
        </div>

        {/* Viewers */}
        <div className="stat-card glass-card">
          <div className="stat-card-header">
            <span className="stat-label">Viewers</span>
            <div className="stat-icon-wrapper gray">
              <Eye className="stat-icon" />
            </div>
          </div>
          <div className="stat-value">{stats.viewers}</div>
          <div className="stat-footer">
            <span className="stat-subtext">Read-only monitoring access</span>
          </div>
        </div>
      </div>

      {/* 3. SEARCH & FILTER BAR */}
      <div className="users-filter-bar glass-card">
        <div className="search-input-group">
          <Search className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, email, or team..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              <X className="clear-icon" />
            </button>
          )}
        </div>

        <div className="filter-dropdowns-group">
          <div className="filter-select-wrapper">
            <Filter className="filter-select-icon" />
            <select
              className="filter-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="All">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Developer">Developer</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>

          <div className="filter-select-wrapper">
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {(searchQuery || roleFilter !== 'All' || statusFilter !== 'All') && (
            <button className="btn-reset-filters" onClick={resetFilters}>
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* FILTER RESULTS COUNTER */}
      <div className="results-summary">
        Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> team members
      </div>

      {/* 4. USERS TABLE */}
      <div className="users-table-card glass-card">
        <div className="table-responsive">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Active</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="user-table-row">
                    {/* User Info (Avatar + Name + Email) */}
                    <td className="td-user">
                      <div className="user-avatar-cell">
                        <div
                          className="user-avatar-circle"
                          style={{
                            backgroundColor: `${user.color}20`,
                            borderColor: `${user.color}40`,
                            color: user.color
                          }}
                        >
                          {user.initials}
                        </div>
                        <div className="user-details">
                          <span className="user-name">{user.name}</span>
                          <span className="user-email">
                            <Mail className="mini-mail-icon" />
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="td-role">
                      <span className={`role-badge role-${user.role.toLowerCase()}`}>
                        {user.role === 'Admin' && <Shield className="role-badge-icon" />}
                        {user.role === 'Developer' && <UserPlus className="role-badge-icon" />}
                        {user.role === 'Viewer' && <Eye className="role-badge-icon" />}
                        {user.role}
                      </span>
                    </td>

                    {/* Status Dot */}
                    <td className="td-status">
                      <div className="status-indicator">
                        <span
                          className={`status-dot-indicator ${
                            user.status === 'Active' ? 'active' : 'inactive'
                          }`}
                        />
                        <span className="status-label">{user.status}</span>
                      </div>
                    </td>

                    {/* Last Active */}
                    <td className="td-last-active">
                      <span className="last-active-text">{user.lastActive}</span>
                    </td>


                    {/* Actions */}
                    <td className="td-actions">
                      <div className="action-buttons-group">
                        <button
                          className="btn-action edit"
                          title="Edit User"
                          onClick={() => openEditModal(user)}
                        >
                          <Edit className="action-icon" />
                          <span className="btn-action-label">Edit</span>
                        </button>
                        <button
                          className="btn-action remove"
                          title="Remove User"
                          onClick={() => openDeleteModal(user)}
                        >
                          <Trash2 className="action-icon" />
                          <span className="btn-action-label">Remove</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-table-cell">
                    <div className="empty-state-wrapper">
                      <UserX className="empty-icon" />
                      <h3>No users found</h3>
                      <p>Try matching your search or filter keywords.</p>
                      <button className="btn-reset-filters mt-3" onClick={resetFilters}>
                        Clear Filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: INVITE USER */}
      {isInviteModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsInviteModalOpen(false)}>
          <div className="modal-container glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <UserPlus className="modal-title-icon" />
                <h3>Invite New User</h3>
              </div>
              <button
                className="btn-close-modal"
                onClick={() => setIsInviteModalOpen(false)}
              >
                <X />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="modal-body">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Rivera"
                  className="form-input"
                  value={inviteForm.name}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, name: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">Work Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. alex@cloudops.com"
                  className="form-input"
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, email: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">System Role</label>
                <div className="role-radio-options">
                  {['Admin', 'Developer', 'Viewer'].map((r) => (
                    <label
                      key={r}
                      className={`role-option-card ${
                        inviteForm.role === r ? 'selected' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="inviteRole"
                        value={r}
                        checked={inviteForm.role === r}
                        onChange={(e) =>
                          setInviteForm({ ...inviteForm, role: e.target.value })
                        }
                      />
                      <span className="role-option-label">{r}</span>
                    </label>
                  ))}
                </div>
              </div>


              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsInviteModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit">
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT USER */}
      {isEditModalOpen && activeUser && (
        <div className="modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-container glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <Edit className="modal-title-icon" />
                <h3>Edit User: {activeUser.name}</h3>
              </div>
              <button
                className="btn-close-modal"
                onClick={() => setIsEditModalOpen(false)}
              >
                <X />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="modal-body">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  required
                  className="form-input"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                />
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    className="form-select"
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm({ ...editForm, role: e.target.value })
                    }
                  >
                    <option value="Admin">Admin</option>
                    <option value="Developer">Developer</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value })
                    }
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>


              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE CONFIRMATION */}
      {isDeleteModalOpen && activeUser && (
        <div className="modal-backdrop" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal-container glass-card modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header danger">
              <div className="modal-header-title">
                <Trash2 className="modal-title-icon danger" />
                <h3>Remove User</h3>
              </div>
              <button
                className="btn-close-modal"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                <X />
              </button>
            </div>

            <div className="modal-body">
              <p className="delete-confirm-text">
                Are you sure you want to remove <strong>{activeUser.name}</strong> ({activeUser.email}) from the system?
              </p>
              <p className="delete-warning-subtext">
                This user will immediately lose access to all CI/CD pipelines, environments, and deployments.
              </p>

              <div className="modal-footer mt-4">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-modal-danger"
                  onClick={handleDeleteConfirm}
                >
                  Remove User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

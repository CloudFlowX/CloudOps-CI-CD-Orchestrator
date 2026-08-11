import React, { useState, useEffect } from "react";
import { useRole } from "../context/RoleContext";
import ApiClient from "../utils/api";
import {
  Cloud,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Server,
  Zap,
} from "lucide-react";
import "./CloudAccountsPage.css";

// Provider Icons
const AWSIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.016 13.916c-.958 0-1.802-.271-2.529-.815l.635-1.127c.563.385 1.229.613 1.895.613 1.011 0 1.488-.415 1.488-1.026 0-.665-.729-.864-1.748-1.171-1.393-.416-2.392-.915-2.392-2.315 0-1.289.988-2.268 2.508-2.268 1.04 0 1.83.332 2.372.727l-.613 1.082a3.86 3.86 0 00-1.801-.582c-.894 0-1.31.394-1.31.936 0 .603.624.789 1.571 1.082 1.549.477 2.58.913 2.58 2.389 0 1.413-1.092 2.475-2.656 2.475zM17.472 13.75h-1.373l-1.352-4.966-1.311 4.966h-1.373l-2.059-7.51h1.332l1.372 5.506 1.352-5.506h1.269l1.373 5.485 1.331-5.485h1.331l-1.892 7.51zM6.621 13.75l-.562-1.705H3.666l-.541 1.705H1.73l2.809-7.51h1.456l2.83 7.51H6.621zm-1.83-5.506L3.98 10.942h1.602l-.791-2.698zM21.905 16.326a11.172 11.172 0 01-9.96 5.505c-3.725 0-6.888-1.579-9.175-4.136 1.081.79 3.016 1.85 5.868 2.39-2.308-.853-4.223-2.122-5.409-3.411 3.516 3.12 8.07 4.16 11.976 3.203a11.396 11.396 0 006.7-3.551z" />
  </svg>
);

const GCPIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#4285F4"/>
    <path d="M12.5 7v3.5l3.5 3.5-1 1-4.5-4.5V7h2z" fill="#34A853"/>
  </svg>
);

const AzureIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M5.483 21.3H24L14.025 4.013h-2.9L5.483 21.3zM13.25 2.7l-9.11 16.48-4.14-7.1 9.1-16.49h4.15z" fill="#0089D6"/>
  </svg>
);

export default function CloudAccountsPage() {
  const { currentRole } = useRole();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState("info");

  // Modal State
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedAwsAccount, setSelectedAwsAccount] = useState(null);
  const [awsResources, setAwsResources] = useState({ instances: [], vpcs: [] });
  const [loadingResources, setLoadingResources] = useState(false);

  const [newAccount, setNewAccount] = useState({
    provider: "AWS",
    accountName: "",
    environment: "Development",
    // AWS
    accessKeyId: "",
    secretAccessKey: "",
    region: "",
    // GCP
    gcpProjectId: "",
    gcpClientEmail: "",
    gcpPrivateKey: "",
    // Azure
    azureTenantId: "",
    azureClientId: "",
    azureClientSecret: "",
    azureSubscriptionId: "",
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const showToast = (msg, type = "info") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.get("/cloud-accounts");
      if (res.success) {
        setAccounts(res.accounts);
      }
    } catch (error) {
      console.error(error);
      showToast("Failed to load cloud accounts", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAwsResources = async (accountId) => {
    try {
      setSelectedAwsAccount(accountId);
      setLoadingResources(true);
      const res = await ApiClient.get(`/cloud-accounts/${accountId}/resources/aws`);
      if (res.success) {
        setAwsResources(res.resources);
      }
    } catch (error) {
      console.error(error);
      showToast(error?.data?.message || "Failed to fetch AWS resources", "error");
      setSelectedAwsAccount(null);
    } finally {
      setLoadingResources(false);
    }
  };

  const handleConnectSubmit = async (e) => {
    e.preventDefault();
    setIsConnecting(true);

    try {
      const res = await ApiClient.post("/cloud-accounts", newAccount);
      if (res.success) {
        setIsConnectModalOpen(false);
        setNewAccount({
          provider: "AWS",
          accountName: "",
          environment: "Development",
          accessKeyId: "",
          secretAccessKey: "",
          region: "",
          gcpProjectId: "",
          gcpClientEmail: "",
          gcpPrivateKey: "",
          azureTenantId: "",
          azureClientId: "",
          azureClientSecret: "",
          azureSubscriptionId: "",
        });
        showToast("Cloud account connected successfully!", "success");
        fetchAccounts();
      }
    } catch (error) {
      console.error("Connection error:", error);
      showToast(
        error?.data?.message || "Error connecting cloud account. Check credentials.",
        "error"
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDelete = async (id, accountName) => {
    if (!window.confirm(`Are you sure you want to disconnect "${accountName}"?`)) return;

    try {
      const res = await ApiClient.delete(`/cloud-accounts/${id}`);
      if (res.success) {
        showToast("Account disconnected successfully.", "success");
        fetchAccounts();
      }
    } catch (error) {
      console.error(error);
      showToast(error?.data?.message || "Failed to disconnect account", "error");
    }
  };

  return (
    <div className="cloud-accounts-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`cloud-toast toast-${toastType}`}>
          <Zap size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="cloud-header">
        <div className="header-text">
          <h1>Cloud Accounts</h1>
          <p>Connect and manage your Multi-Cloud infrastructure securely.</p>
        </div>
        {currentRole !== "Viewer" && (
          <button className="btn btn-primary" onClick={() => setIsConnectModalOpen(true)}>
            <Plus size={18} />
            <span>Connect Account</span>
          </button>
        )}
      </div>

      {/* Stats Overview */}
      <div className="cloud-stats">
        <div className="stat-card">
          <div className="stat-icon-wrapper stat-blue">
            <Cloud size={20} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Total Connected</span>
            <span className="stat-value">{accounts.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper stat-green">
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Active Connections</span>
            <span className="stat-value text-green">
              {accounts.filter((a) => a.status === "connected").length}
            </span>
          </div>
        </div>
      </div>

      {/* Accounts List */}
      <div className="accounts-list">
        {loading ? (
          <div className="empty-state">
            <div className="spinner"></div>
            <p>Loading accounts...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="empty-state">
            <Server size={40} className="empty-icon" />
            <h3>No Cloud Accounts</h3>
            <p>You haven't connected any cloud providers yet.</p>
            {currentRole !== "Viewer" && (
              <button
                className="btn btn-primary"
                onClick={() => setIsConnectModalOpen(true)}
              >
                Connect Now
              </button>
            )}
          </div>
        ) : (
          <div className="accounts-grid">
            {accounts.map((acc) => (
              <div key={acc.id} className="account-card">
                <div className="card-header">
                  <div className="provider-icon">
                    {acc.provider === "AWS" ? <AWSIcon /> : acc.provider === "GCP" ? <GCPIcon /> : <AzureIcon />}
                  </div>
                  <div className="account-info">
                    <h3>{acc.accountName}</h3>
                    <span className="env-badge">{acc.environment}</span>
                  </div>
                  <div className={`status-dot ${acc.status}`} title={acc.status}></div>
                </div>

                <div className="card-body">
                  <div className="info-row">
                    <span className="label">
                      {acc.provider === "AWS" ? "Access Key:" : acc.provider === "GCP" ? "Project ID:" : "Subscription:"}
                    </span>
                    <span className="value font-mono">
                      {acc.provider === "AWS" ? acc.accessKeyId : acc.provider === "GCP" ? acc.gcpProjectId : acc.azureSubscriptionId}
                    </span>
                  </div>
                  {acc.provider === "AWS" && (
                    <div className="info-row">
                      <span className="label">Region:</span>
                      <span className="value">{acc.region}</span>
                    </div>
                  )}
                  {acc.provider === "GCP" && (
                    <div className="info-row">
                      <span className="label">Client Email:</span>
                      <span className="value">{acc.gcpClientEmail}</span>
                    </div>
                  )}
                  {acc.provider === "Azure" && (
                    <div className="info-row">
                      <span className="label">Tenant ID:</span>
                      <span className="value">{acc.azureTenantId}</span>
                    </div>
                  )}
                  {acc.owner && (
                    <div className="info-row">
                      <span className="label">Connected By:</span>
                      <span className="value">{acc.owner.fullName || "User"}</span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="label">Connected on:</span>
                    <span className="value">
                      {new Date(acc.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="card-actions">
                  {acc.provider === "AWS" && (
                    <button
                      className="btn-secondary"
                      onClick={() => fetchAwsResources(acc.id)}
                      title="Test AWS Resources API"
                      style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '6px', color: '#fff', cursor: 'pointer', transition: 'all 0.2s ease' }}
                    >
                      <Server size={14} /> Test API
                    </button>
                  )}
                  {currentRole === "Admin" && (
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(acc.id, acc.accountName)}
                      title="Disconnect Account"
                    >
                      <Trash2 size={16} /> Disconnect
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connect Modal */}
      {isConnectModalOpen && (
        <div className="modal-backdrop" onClick={() => !isConnecting && setIsConnectModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Connect Cloud Account</h2>
              <button
                className="close-btn"
                onClick={() => !isConnecting && setIsConnectModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConnectSubmit} className="modal-form">
              <div className="form-group">
                <label>Cloud Provider *</label>
                <select
                  value={newAccount.provider}
                  onChange={(e) => setNewAccount({ ...newAccount, provider: e.target.value })}
                  disabled={isConnecting}
                  className="input-field"
                >
                  <option value="AWS">AWS (Amazon Web Services)</option>
                  <option value="GCP">GCP (Google Cloud Platform)</option>
                  <option value="Azure">Azure (Microsoft Azure)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Account Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Production AWS Account"
                  value={newAccount.accountName}
                  onChange={(e) => setNewAccount({ ...newAccount, accountName: e.target.value })}
                  required
                  disabled={isConnecting}
                  className="input-field"
                />
              </div>

              {newAccount.provider === "AWS" && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Access Key ID *</label>
                      <input
                        type="text"
                        placeholder="AKIA..."
                        value={newAccount.accessKeyId}
                        onChange={(e) => setNewAccount({ ...newAccount, accessKeyId: e.target.value })}
                        required={newAccount.provider === "AWS"}
                        disabled={isConnecting}
                        className="input-field font-mono"
                      />
                    </div>
                    <div className="form-group">
                      <label>Region *</label>
                      <input
                        type="text"
                        placeholder="e.g. us-east-1"
                        value={newAccount.region}
                        onChange={(e) => setNewAccount({ ...newAccount, region: e.target.value })}
                        required={newAccount.provider === "AWS"}
                        disabled={isConnecting}
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Secret Access Key *</label>
                    <input
                      type="password"
                      placeholder="Enter your secret key"
                      value={newAccount.secretAccessKey}
                      onChange={(e) =>
                        setNewAccount({ ...newAccount, secretAccessKey: e.target.value })
                      }
                      required={newAccount.provider === "AWS"}
                      disabled={isConnecting}
                      className="input-field font-mono"
                    />
                    <small className="help-text text-yellow">
                      <AlertCircle size={12} /> Key will be verified using AWS STS before saving.
                    </small>
                  </div>
                </>
              )}

              {newAccount.provider === "GCP" && (
                <>
                  <div className="form-group">
                    <label>Project ID *</label>
                    <input
                      type="text"
                      placeholder="my-gcp-project-123"
                      value={newAccount.gcpProjectId}
                      onChange={(e) => setNewAccount({ ...newAccount, gcpProjectId: e.target.value })}
                      required={newAccount.provider === "GCP"}
                      disabled={isConnecting}
                      className="input-field"
                    />
                  </div>
                  <div className="form-group">
                    <label>Client Email *</label>
                    <input
                      type="email"
                      placeholder="service-account@project.iam.gserviceaccount.com"
                      value={newAccount.gcpClientEmail}
                      onChange={(e) => setNewAccount({ ...newAccount, gcpClientEmail: e.target.value })}
                      required={newAccount.provider === "GCP"}
                      disabled={isConnecting}
                      className="input-field"
                    />
                  </div>
                  <div className="form-group">
                    <label>Private Key *</label>
                    <textarea
                      placeholder="-----BEGIN PRIVATE KEY-----\n..."
                      value={newAccount.gcpPrivateKey}
                      onChange={(e) => setNewAccount({ ...newAccount, gcpPrivateKey: e.target.value })}
                      required={newAccount.provider === "GCP"}
                      disabled={isConnecting}
                      className="input-field font-mono textarea-field"
                      rows="4"
                    />
                    <small className="help-text text-yellow">
                      <AlertCircle size={12} /> Enter the exact private_key from your GCP JSON file.
                    </small>
                  </div>
                </>
              )}

              {newAccount.provider === "Azure" && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Tenant ID *</label>
                      <input
                        type="text"
                        placeholder="Directory (tenant) ID"
                        value={newAccount.azureTenantId}
                        onChange={(e) => setNewAccount({ ...newAccount, azureTenantId: e.target.value })}
                        required={newAccount.provider === "Azure"}
                        disabled={isConnecting}
                        className="input-field font-mono"
                      />
                    </div>
                    <div className="form-group">
                      <label>Subscription ID *</label>
                      <input
                        type="text"
                        placeholder="Azure Subscription ID"
                        value={newAccount.azureSubscriptionId}
                        onChange={(e) => setNewAccount({ ...newAccount, azureSubscriptionId: e.target.value })}
                        required={newAccount.provider === "Azure"}
                        disabled={isConnecting}
                        className="input-field font-mono"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Client ID *</label>
                    <input
                      type="text"
                      placeholder="Application (client) ID"
                      value={newAccount.azureClientId}
                      onChange={(e) => setNewAccount({ ...newAccount, azureClientId: e.target.value })}
                      required={newAccount.provider === "Azure"}
                      disabled={isConnecting}
                      className="input-field font-mono"
                    />
                  </div>
                  <div className="form-group">
                    <label>Client Secret *</label>
                    <input
                      type="password"
                      placeholder="Client Secret Value"
                      value={newAccount.azureClientSecret}
                      onChange={(e) => setNewAccount({ ...newAccount, azureClientSecret: e.target.value })}
                      required={newAccount.provider === "Azure"}
                      disabled={isConnecting}
                      className="input-field font-mono"
                    />
                    <small className="help-text text-yellow">
                      <AlertCircle size={12} /> Azure credentials will be verified before saving.
                    </small>
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Environment *</label>
                <select
                  value={newAccount.environment}
                  onChange={(e) => setNewAccount({ ...newAccount, environment: e.target.value })}
                  disabled={isConnecting}
                  className="input-field"
                >
                  <option value="Development">Development</option>
                  <option value="Staging">Staging</option>
                  <option value="Production">Production</option>
                </select>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsConnectModalOpen(false)}
                  disabled={isConnecting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isConnecting}>
                  {isConnecting ? (
                    <>
                      <div className="spinner-small"></div> Verifying...
                    </>
                  ) : (
                    "Connect Account"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AWS Resources Modal */}
      {selectedAwsAccount && (
        <div className="modal-backdrop" onClick={() => setSelectedAwsAccount(null)}>
          <div className="modal-container modal-large" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h2>AWS Resources Data</h2>
              <button
                className="close-btn"
                onClick={() => setSelectedAwsAccount(null)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
              {loadingResources ? (
                <div className="empty-state">
                  <div className="spinner"></div>
                  <p>Fetching resources from AWS APIs...</p>
                </div>
              ) : (
                <div className="aws-resources-container">
                  {/* EC2 Instances */}
                  <div className="resource-section" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <Server size={20} /> EC2 Instances ({awsResources.instances.length})
                    </h3>
                    {awsResources.instances.length === 0 ? (
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>No EC2 instances found in this region.</p>
                    ) : (
                      <div className="table-responsive" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                          <thead>
                            <tr style={{ backgroundColor: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                              <th style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Name</th>
                              <th style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>ID</th>
                              <th style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Type</th>
                              <th style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>State</th>
                              <th style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Public IP</th>
                            </tr>
                          </thead>
                          <tbody>
                            {awsResources.instances.map(inst => (
                              <tr key={inst.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '10px', fontWeight: '500' }}>{inst.name}</td>
                                <td style={{ padding: '10px', color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>{inst.id}</td>
                                <td style={{ padding: '10px', color: 'rgba(255,255,255,0.7)' }}>{inst.type}</td>
                                <td style={{ padding: '10px' }}>
                                  <span style={{ 
                                    padding: '2px 8px', 
                                    borderRadius: '12px', 
                                    fontSize: '0.75rem', 
                                    backgroundColor: inst.state === 'running' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                    color: inst.state === 'running' ? '#4ade80' : '#f87171'
                                  }}>
                                    {inst.state}
                                  </span>
                                </td>
                                <td style={{ padding: '10px', color: 'rgba(255,255,255,0.7)' }}>{inst.publicIp}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* VPCs */}
                  <div className="resource-section">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a78bfa', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <Cloud size={20} /> Virtual Private Clouds (VPCs) ({awsResources.vpcs.length})
                    </h3>
                    {awsResources.vpcs.length === 0 ? (
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>No VPCs found in this region.</p>
                    ) : (
                      <div className="table-responsive" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                          <thead>
                            <tr style={{ backgroundColor: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                              <th style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Name</th>
                              <th style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>ID</th>
                              <th style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>CIDR Block</th>
                              <th style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>State</th>
                            </tr>
                          </thead>
                          <tbody>
                            {awsResources.vpcs.map(vpc => (
                              <tr key={vpc.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '10px', fontWeight: '500' }}>{vpc.name}</td>
                                <td style={{ padding: '10px', color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>{vpc.id}</td>
                                <td style={{ padding: '10px', color: 'rgba(255,255,255,0.7)' }}>{vpc.cidr}</td>
                                <td style={{ padding: '10px', color: 'rgba(255,255,255,0.7)' }}>{vpc.state}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

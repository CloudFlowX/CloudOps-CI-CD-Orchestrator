import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { RoleProvider, useRole } from './context/RoleContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import DashboardPage from './pages/DashboardPage'
import RepositoriesPage from './pages/RepositoriesPage'
import PipelinesPage from './pages/PipelinesPage'
import DeploymentsPage from './pages/DeploymentsPage'
import GitHubActionsPage from './pages/GitHubActionsPage'
import EnvironmentsPage from './pages/EnvironmentsPage'
import LogsPage from './pages/LogsPage'
import MonitoringPage from './pages/MonitoringPage'
import AlertsPage from './pages/AlertsPage'
import SecretsPage from './pages/SecretsPage'
import SettingsPage from './pages/SettingsPage'
import UsersPage from './pages/UsersPage'
import AuditLogsPage from './pages/AuditLogsPage'
import CloudAccountsPage from './pages/CloudAccountsPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import OAuthCallbackPage from './pages/OAuthCallbackPage'

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentRole } = useRole();
  
  if (!allowedRoles.includes(currentRole)) {
    return (
      <div className="access-denied">
        <h2>403 - Access Denied</h2>
        <p>Your current role ({currentRole}) does not have permission to view this page.</p>
      </div>
    );
  }
  return children;
};

// Auth Guard - redirects to login if not authenticated
const AuthGuard = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0e27',
        color: '#818cf8',
        fontSize: '18px',
        fontFamily: 'Inter, sans-serif'
      }}>
        ⏳ Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Guest Guard - redirects to dashboard if already authenticated
const GuestGuard = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0e27',
        color: '#818cf8',
        fontSize: '18px',
        fontFamily: 'Inter, sans-serif'
      }}>
        ⏳ Loading...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Routes>
      <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
      
      {/* Auth Routes (Guest Only) */}
      <Route path="/login" element={
        <GuestGuard>
          <LoginPage />
        </GuestGuard>
      } />
      <Route path="/register" element={
        <GuestGuard>
          <RegisterPage />
        </GuestGuard>
      } />
      <Route path="/forgot-password" element={
        <GuestGuard>
          <ForgotPasswordPage />
        </GuestGuard>
      } />
      <Route path="/reset-password/:token" element={
        <GuestGuard>
          <ResetPasswordPage />
        </GuestGuard>
      } />

      {/* Protected App Routes */}
      <Route path="/*" element={
        <AuthGuard>
          <div className="app-layout">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <main className="app-main">
              <Header onMenuToggle={() => setSidebarOpen(prev => !prev)} />
              <div className="app-content">
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/repositories" element={<RepositoriesPage />} />
                  <Route path="/pipelines" element={<PipelinesPage />} />
                  <Route path="/deployments" element={<DeploymentsPage />} />
                  <Route path="/github-actions" element={<GitHubActionsPage />} />
                  
                  {/* Viewer cannot access Environments */}
                  <Route path="/environments" element={
                    <ProtectedRoute allowedRoles={['Admin', 'Developer']}>
                      <EnvironmentsPage />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/logs" element={<LogsPage />} />
                  <Route path="/monitoring" element={<MonitoringPage />} />
                  <Route path="/alerts" element={<AlertsPage />} />
                  <Route path="/cloud-accounts" element={<CloudAccountsPage />} />
                  
                  {/* Developer and Viewer cannot access Settings, Users, Audit Logs. Only Admin can access Users and Settings. 
                      Wait, Developers usually can't access Secrets in prod, but let's allow Admin and Developer for Secrets, 
                      and only Admin for Settings/Users/Audit Logs. */}
                  <Route path="/secrets" element={
                    <ProtectedRoute allowedRoles={['Admin', 'Developer']}>
                      <SecretsPage />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/settings" element={
                    <ProtectedRoute allowedRoles={['Admin']}>
                      <SettingsPage />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/users" element={
                    <ProtectedRoute allowedRoles={['Admin']}>
                      <UsersPage />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/audit-logs" element={
                    <ProtectedRoute allowedRoles={['Admin']}>
                      <AuditLogsPage />
                    </ProtectedRoute>
                  } />
                </Routes>
              </div>
            </main>
          </div>
        </AuthGuard>
      } />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <RoleProvider>
        <Router>
          <AppContent />
        </Router>
      </RoleProvider>
    </AuthProvider>
  )
}

export default App

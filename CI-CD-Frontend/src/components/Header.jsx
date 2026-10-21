import React, { useState, useEffect, useRef } from 'react';
import { Search, Settings, Bell, User, LogOut, Shield, Sliders, Check, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Header.css';

const Header = ({ title = 'Dashboard', subtitle = 'Overview of your CI/CD pipelines and deployments', onMenuToggle }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  
  const { user, logout } = useAuth();
  
  const searchInputRef = useRef(null);
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);

  const mockNotifications = [
    {
      id: 1,
      title: 'Pipeline #1042 Failed',
      time: '5m ago',
      unread: true,
      type: 'failed',
    },
    {
      id: 2,
      title: 'Production Deploy Successful v2.4.0',
      time: '25m ago',
      unread: true,
      type: 'success',
    },
    {
      id: 3,
      title: 'High CPU on Runner #03',
      time: '1h ago',
      unread: true,
      type: 'warning',
    },
  ];

  // Listen for keyboard shortcut Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = () => {
    setUnreadCount(0);
  };

  return (
    <header className="header-container">
      <div className="header-left-section">
        {onMenuToggle && (
          <button className="header-menu-toggle" onClick={onMenuToggle} aria-label="Toggle menu">
            <Menu size={20} />
          </button>
        )}

        {/* Mobile Brand Logo & Title (shown on mobile <= 768px) */}
        <div className="header-mobile-brand">
          <div className="mobile-brand-icon">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
              <path d="M30 18.3333C30 13.731 26.269 10 21.6667 10C18.4239 10 15.6146 11.854 14.1506 14.5422C13.4357 14.1866 12.5855 14 11.6667 14C8.90524 14 6.66667 16.2386 6.66667 19C6.66667 19.349 6.70244 19.6896 6.77028 20.0182C4.05342 20.6725 2 23.1378 2 26.0606C2 29.3409 4.65909 32 7.93939 32H28.6667C33.269 32 37 28.269 37 23.6667C37 19.5398 33.9922 16.1158 30 15.4208V18.3333Z" stroke="#4F8AFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 22H24M16 22L19 19M16 22L19 25M24 22L21 19M24 22L21 25" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="mobile-brand-text">CloudOps</span>
        </div>

        {/* Desktop Title & Subtitle (hidden on mobile <= 768px) */}
        <div className="header-left">
          <h1 className="header-title">{title}</h1>
          <p className="header-subtitle">{subtitle}</p>
        </div>
      </div>

      {/* Right side: Search, Settings, Notifications, User Avatar */}
      <div className="header-right">
        {/* Search Bar */}
        <div className="header-search-wrapper">
          <Search className="header-search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            className="header-search-input"
            placeholder="Search anything..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="header-search-shortcut">⌘ K</span>
        </div>

        {/* Settings Button */}
        <button 
          className="header-icon-btn" 
          aria-label="Settings"
          title="Settings"
          onClick={() => alert('Settings menu clicked')}
        >
          <Settings size={18} />
        </button>

        {/* Notification Bell Button */}
        <div className="header-avatar-wrapper" ref={notificationRef}>
          <button
            className={`header-icon-btn ${showNotifications ? 'active' : ''}`}
            aria-label="Notifications"
            title="Notifications"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="header-notification-badge" />}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="header-dropdown">
              <div className="header-dropdown-header">
                <span className="header-dropdown-title">Notifications</span>
                {unreadCount > 0 && (
                  <button className="header-dropdown-action" onClick={markAllRead}>
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="header-notification-list">
                {mockNotifications.map((item) => (
                  <div key={item.id} className={`header-notification-item ${item.unread && unreadCount > 0 ? 'unread' : ''}`}>
                    {item.unread && unreadCount > 0 && <div className="header-notification-dot" />}
                    <div className="header-notification-content">
                      <div className="header-notification-text">{item.title}</div>
                      <div className="header-notification-time">{item.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div className="header-avatar-wrapper" ref={userMenuRef}>
          <button 
            className="header-avatar" 
            aria-label="User profile"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            {user?.fullName ? user.fullName.substring(0, 2).toUpperCase() : 'U'}
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div className="header-dropdown header-user-menu">
              <div className="header-user-info">
                <div className="header-user-name">{user?.fullName || 'User'}</div>
                <div className="header-user-email">{user?.email || 'user@example.com'}</div>
              </div>
              <button className="header-menu-item" onClick={() => alert('Profile settings coming soon!')}>
                <User size={16} /> Profile
              </button>
              <button className="header-menu-item" onClick={() => alert('Preferences coming soon!')}>
                <Sliders size={16} /> Preferences
              </button>
              <button className="header-menu-item" onClick={() => alert('Security settings coming soon!')}>
                <Shield size={16} /> Security & Access
              </button>
              <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
              <button className="header-menu-item danger" onClick={logout}>
                <LogOut size={16} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

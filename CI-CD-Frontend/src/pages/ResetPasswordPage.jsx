import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ShieldCheck, Zap, Mail, Quote, ArrowRight } from 'lucide-react';
import ApiClient from '../utils/api';
import './LoginPage.css';

// Import local assets
import mountailsImg from '../assets/mountails.png';
import archiImg from '../assets/archi.png';

function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const res = await ApiClient.post(`/auth/reset-password/${token}`, { password });
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err) {
      setLocalError(err.message || 'Failed to reset password. Token may be invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-layout" style={{ backgroundImage: `url(${mountailsImg})` }}>
      {/* Top Header */}
      <header className="auth-top-header">
        <div className="brand-header">
          <div className="brand-logo-img">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M30 18.3333C30 13.731 26.269 10 21.6667 10C18.4239 10 15.6146 11.854 14.1506 14.5422C13.4357 14.1866 12.5855 14 11.6667 14C8.90524 14 6.66667 16.2386 6.66667 19C6.66667 19.349 6.70244 19.6896 6.77028 20.0182C4.05342 20.6725 2 23.1378 2 26.0606C2 29.3409 4.65909 32 7.93939 32H28.6667C33.269 32 37 28.269 37 23.6667C37 19.5398 33.9922 16.1158 30 15.4208V18.3333Z" stroke="#4F8AFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 22H24M16 22L19 19M16 22L19 25M24 22L21 19M24 22L21 25" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-name">CLOUDOPS</span>
            <span className="brand-sub">ORCHESTRATOR</span>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="auth-main-content">
        
        {/* Left Column - Text & Features */}
        <div className="auth-text-col">
          <div className="badge-simple">
            <span className="dot"></span> DevOps Made Simple
          </div>
          
          <h1>Reset your<br/><span className="highlight-text">password.</span></h1>
          <p className="hero-desc">Choose a new password for your account. Make sure it's secure.</p>

          <div className="features-list">
            <div className="feature-item">
              <div className="feature-icon bg-cyan">
                <ShieldCheck size={20} className="icon-cyan" />
              </div>
              <div className="feature-text">
                <h3>Secure Recovery</h3>
                <p>Your data stays protected</p>
              </div>
            </div>
          </div>

          <div className="quote-box">
            <Quote className="quote-icon" size={24} fill="currentColor" fillOpacity="0.2" />
            <p className="quote-text">"Security today<br/>for a stronger tomorrow."</p>
            <p className="quote-author">— CloudOps Orchestrator</p>
          </div>
        </div>

        {/* Center Column - Graphic Illustration */}
        <div className="auth-graphic-col">
          <div className="graphic-container">
            <img src={archiImg} alt="Cloud Architecture" className="architecture-img" />
          </div>
        </div>

        {/* Right Column - Form */}
        <div className="auth-form-col">
          <div className="auth-card-glass">
            
            <div className="auth-card-logo">
              <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)', marginBottom: '10px' }}>
                <Lock size={20} color="#A855F7" />
              </div>
            </div>

            <h2>New Password</h2>
            <p className="subtitle" style={{ maxWidth: '300px', margin: '0 auto 24px' }}>
              Create a new password that is at least 6 characters long.
            </p>

            {localError && (
              <div className="auth-error" style={{ marginBottom: '20px' }}>
                {localError}
              </div>
            )}

            {success ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px' }}>✓</div>
                <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '8px' }}>Password Updated</h3>
                <p style={{ color: '#94A3B8', fontSize: '13px', lineHeight: '1.5', marginBottom: '20px' }}>
                  Your password has been successfully reset. Redirecting to login...
                </p>
                <Link to="/login" className="submit-btn" style={{ textDecoration: 'none' }}>
                  Go to Login
                </Link>
              </div>
            ) : (
              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label>New Password</label>
                  <div className="input-wrapper">
                    <Lock className="input-icon" size={16} />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <button 
                      type="button" 
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label>Confirm Password</label>
                  <div className="input-wrapper">
                    <Lock className="input-icon" size={16} />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="submit-btn" disabled={isLoading || !password || !confirmPassword} style={{ marginBottom: '20px' }}>
                  {isLoading ? 'Resetting...' : 'Reset Password'} <ArrowRight size={18} />
                </button>
              </form>
            )}

            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <ShieldCheck size={18} color="#64748B" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ color: '#64748B', fontSize: '12px', margin: 0, lineHeight: '1.5' }}>
                Your password is securely encrypted.<br/>
                We never store it in plain text.
              </p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

export default ResetPasswordPage;

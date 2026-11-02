import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { Mail, Shield, Lock, Send, ArrowLeft, Quote, ShieldCheck } from 'lucide-react';
import './LoginPage.css';

// Import local assets
import mountailsImg from '../assets/mountails.png';
import archiImg from '../assets/archi.png';

import ApiClient from '../utils/api';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    setLocalError('');
    setDeliveryInfo(null);
    try {
      const res = await ApiClient.post('/auth/forgot-password', { email });
      if (res.success) {
        setDeliveryInfo(res);
        setIsSubmitted(true);
      }
    } catch (err) {
      setLocalError(err.message || 'Failed to send reset link. Please try again.');
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
          
          <h1>Secure your<br/><span className="highlight-text">account.</span></h1>
          <p className="hero-desc">Reset your password and get back to your workflow quickly and securely.</p>

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
            
            <div className="feature-item">
              <div className="feature-icon bg-blue">
                <Mail size={20} className="icon-blue" />
              </div>
              <div className="feature-text">
                <h3>Fast Verification</h3>
                <p>Get back in minutes</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon bg-purple">
                <Lock size={20} className="icon-purple" />
              </div>
              <div className="feature-text">
                <h3>Protected Account</h3>
                <p>Same security, always</p>
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
              <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', marginBottom: '10px' }}>
                <Lock size={20} color="#3B82F6" />
              </div>
            </div>

            <h2>Forgot Password?</h2>
            <p className="subtitle" style={{ maxWidth: '300px', margin: '0 auto 24px' }}>
              No worries! Enter your email address and we'll send you a secure password reset link.
            </p>

            {localError && (
              <div className="auth-error" style={{ marginBottom: '20px' }}>
                {localError}
              </div>
            )}

            {isSubmitted ? (
              deliveryInfo && deliveryInfo.emailSent === false ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: '22px' }}>!</div>
                  <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '8px' }}>Reset Link Generated</h3>
                  
                  <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '8px', padding: '12px', textAlign: 'left', marginBottom: '16px', fontSize: '12px', color: '#FCD34D', lineHeight: '1.5' }}>
                    {deliveryInfo.error && (deliveryInfo.error.toLowerCase().includes('smtp') || deliveryInfo.error.toLowerCase().includes('timeout')) ? (
                      <>
                        <strong>Notice:</strong> Cloud host (Render) blocks outbound direct SMTP ports to prevent spam.
                        <br />
                        Your secure password reset link has been generated. Click the button below to reset your password immediately:
                      </>
                    ) : (
                      <>
                        <strong>Notice:</strong> Resend Free Tier (<code>onboarding@resend.dev</code>) only delivers test emails to <strong>royalkhurana1@gmail.com</strong>.
                        <br />
                        Since this request is for <strong>{email}</strong>, you can use the direct reset link below to proceed immediately!
                      </>
                    )}
                  </div>

                  {deliveryInfo.resetUrl && (
                    <div style={{ marginBottom: '16px' }}>
                      <a
                        href={deliveryInfo.resetUrl}
                        className="submit-btn"
                        style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', marginBottom: '10px' }}
                      >
                        Reset Password Now &rarr;
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(deliveryInfo.resetUrl);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', width: '100%' }}
                      >
                        {copiedLink ? '✓ Copied Link' : 'Copy Reset Link'}
                      </button>
                    </div>
                  )}

                  <div style={{ textAlign: 'center', marginTop: '12px' }}>
                    <button type="button" style={{ background: 'transparent', border: 'none', color: '#64748B', fontSize: '12px', cursor: 'pointer' }} onClick={() => setIsSubmitted(false)}>
                      Try another email
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px' }}>✓</div>
                  <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '8px' }}>Check your email</h3>
                  <p style={{ color: '#94A3B8', fontSize: '13px', lineHeight: '1.5', marginBottom: '20px' }}>
                    We've sent a password reset link to <strong>{email}</strong>.
                  </p>

                  <button type="button" className="submit-btn" onClick={() => setIsSubmitted(false)}>
                    Send again
                  </button>
                </div>
              )
            ) : (
              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label>Email Address</label>
                  <div className="input-wrapper">
                    <Mail className="input-icon" size={16} />
                    <input
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="submit-btn" disabled={isLoading || !email} style={{ marginBottom: '20px' }}>
                  {isLoading ? 'Sending...' : (
                    <>
                      <Send size={16} style={{ marginRight: '8px' }} />
                      Send Reset Link
                    </>
                  )}
                </button>

                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <Link to="/login" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <ArrowLeft size={14} /> Back to Login
                  </Link>
                </div>
              </form>
            )}

            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <ShieldCheck size={18} color="#64748B" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ color: '#64748B', fontSize: '12px', margin: 0, lineHeight: '1.5' }}>
                We never share your information.<br/>
                Your account is always protected.
              </p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

export default ForgotPasswordPage;

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import { Mail, Lock, Eye, EyeOff, Zap, Activity, Layers, ArrowRight, Quote } from 'lucide-react';
import './LoginPage.css';

// Import local assets
import mountailsImg from '../assets/mountails.png';
import archiImg from '../assets/archi.png';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = window.location;

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const errorParam = params.get('error');
    if (errorParam) {
      setLocalError(errorParam.replace(/_/g, ' '));
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setLocalError(err.message || 'Login failed. Please try again.');
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
        <div className="auth-nav">
          Build <span>&gt;</span> Deploy <span>&gt;</span> Scale <span>&gt;</span> Repeat
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="auth-main-content">
        
        {/* Left Column - Text & Features */}
        <div className="auth-text-col">
          <div className="badge-simple">
            <span className="dot"></span> DevOps Made Simple
          </div>
          
          <h1>Automate.<br/>Deploy.<br/><span className="highlight-text">Scale.</span></h1>
          <p className="hero-desc">The complete DevOps orchestration platform to build, deploy and manage infrastructure with confidence.</p>

          <div className="features-list">
            <div className="feature-item">
              <div className="feature-icon bg-purple">
                <Zap size={20} className="icon-purple" />
              </div>
              <div className="feature-text">
                <h3>CI/CD Automation</h3>
                <p>Streamline your pipelines</p>
              </div>
            </div>
            
            <div className="feature-item">
              <div className="feature-icon bg-blue">
                <Activity size={20} className="icon-blue" />
              </div>
              <div className="feature-text">
                <h3>Real-time Monitoring</h3>
                <p>Insights when you need them</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon bg-cyan">
                <Layers size={20} className="icon-cyan" />
              </div>
              <div className="feature-text">
                <h3>Scalable Infrastructure</h3>
                <p>Built to grow with you</p>
              </div>
            </div>
          </div>

          <div className="quote-box">
            <Quote className="quote-icon" size={24} fill="currentColor" fillOpacity="0.2" />
            <p className="quote-text">"Simplifying complex infrastructure<br/>for modern teams."</p>
            <p className="quote-author">— CloudOps Orchestrator</p>
          </div>
        </div>

        {/* Center Column - Graphic Illustration (from actual assets) */}
        <div className="auth-graphic-col">
          <div className="graphic-container">
            <img src={archiImg} alt="Cloud Architecture" className="architecture-img" />
          </div>

          <div className="graphic-footer-text">
            FROM CODE TO CLOUD<br/>ALL IN ONE PLACE
          </div>
        </div>

        {/* Right Column - Form */}
        <div className="auth-form-col">
          <div className="auth-card-glass">
            
            <div className="auth-card-logo">
              <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="48" height="48" className="logo-icon-glass">
                <path d="M30 18.3333C30 13.731 26.269 10 21.6667 10C18.4239 10 15.6146 11.854 14.1506 14.5422C13.4357 14.1866 12.5855 14 11.6667 14C8.90524 14 6.66667 16.2386 6.66667 19C6.66667 19.349 6.70244 19.6896 6.77028 20.0182C4.05342 20.6725 2 23.1378 2 26.0606C2 29.3409 4.65909 32 7.93939 32H28.6667C33.269 32 37 28.269 37 23.6667C37 19.5398 33.9922 16.1158 30 15.4208V18.3333Z" stroke="url(#paint0_linear)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 22H24M16 22L19 19M16 22L19 25M24 22L21 19M24 22L21 25" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <defs>
                  <linearGradient id="paint0_linear" x1="2" y1="10" x2="37" y2="32" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3B82F6" />
                    <stop offset="1" stopColor="#A855F7" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <h2>Welcome Back</h2>
            <p className="subtitle">Sign in to continue to your account</p>

            {localError && (
              <div className="auth-error">
                {localError}
              </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={16} />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={16} />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
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

              <div className="form-actions">
                <label className="checkbox-container">
                  <input type="checkbox" />
                  <span className="checkmark"></span>
                  Remember me
                </label>
                <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
              </div>

              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? 'Signing In...' : 'Sign In'} <ArrowRight size={18} />
              </button>
            </form>

            <div className="divider">
              <span>or continue with</span>
            </div>

            <div className="social-logins">
              <button 
                type="button"
                className="social-btn" 
                onClick={() => window.location.href = 'http://localhost:5002/api/v1/auth/github'}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                </svg>
                Continue with GitHub
              </button>
              <button 
                type="button"
                className="social-btn" 
                onClick={() => window.location.href = 'http://localhost:5002/api/v1/auth/google'}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </div>

            <div className="auth-footer-link">
              Don't have an account? <Link to="/register" className="link-text">Sign up</Link>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

export default LoginPage;

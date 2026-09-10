import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function OAuthCallbackPage() {
  const { setTokenWithLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (token) {
      setTokenWithLogin(token);
      navigate('/');
    } else {
      navigate('/login?error=OAuth_Failed');
    }
  }, [location, navigate, setTokenWithLogin]);

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
      ⏳ Completing Authentication...
    </div>
  );
}

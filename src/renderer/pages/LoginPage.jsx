import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import { LogIn, UserPlus, KeyRound, Eye, EyeOff } from 'lucide-react';

export default function LoginPage({ onNavigate }) {
  const { setUser, loadAccountData, logoUrl, showToast, serverUrl } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(
    localStorage.getItem('yyc_remember') === 'true'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      showToast('Please enter both username/email and password.', 'error');
      return;
    }

    setLoading(true);
    try {
      localStorage.setItem('yyc_remember', String(rememberMe));
      const res = await api.login(username.trim(), password, rememberMe);
      setUser(res.account || res);
      await loadAccountData(res.account || res);
      showToast(`Welcome back, ${(res.account || res).owner_name || 'Owner'}!`, 'success');
    } catch (err) {
      showToast(err.message || 'Login failed. Please verify credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      width: '100vw',
      background: 'radial-gradient(ellipse at 30% 10%, #1e3a8a 0%, #0f1f4b 45%, #080f24 100%)',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background decorative circles */}
      <div style={{
        position: 'absolute', top: '-80px', right: '-80px',
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'rgba(245, 158, 11, 0.08)', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-100px', left: '-60px',
        width: '350px', height: '350px', borderRadius: '50%',
        background: 'rgba(37, 99, 235, 0.1)', pointerEvents: 'none'
      }} />

      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '40px 36px 32px',
        boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.08)',
        animation: 'scaleUp 0.25s ease',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          {logoUrl ? (
            <div style={{
              display: 'inline-block',
              padding: '6px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              boxShadow: '0 8px 24px rgba(245, 158, 11, 0.35)',
              marginBottom: '14px'
            }}>
              <img
                src={logoUrl}
                alt="Yum Yum Cafe Logo"
                style={{
                  width: '88px',
                  height: '88px',
                  borderRadius: '13px',
                  objectFit: 'contain',
                  display: 'block',
                  background: '#fff'
                }}
              />
            </div>
          ) : (
            <div style={{
              width: '88px',
              height: '88px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#fff',
              fontWeight: 900,
              fontSize: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px auto',
              boxShadow: '0 8px 24px rgba(245, 158, 11, 0.35)'
            }}>
              YYC
            </div>
          )}
          <h1 style={{
            fontSize: '23px',
            fontWeight: 900,
            color: '#0f1f4b',
            letterSpacing: '0.3px',
            lineHeight: 1.2,
            margin: 0
          }}>
            YUM YUM BILLING
          </h1>
          <p style={{
            fontSize: '12.5px',
            fontWeight: 700,
            color: '#d97706',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            marginTop: '4px'
          }}>
            Yum Yum Cafe · POS System
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Username or Email</label>
            <input
              id="login-username"
              type="text"
              className="form-input"
              placeholder="e.g. owner or admin@yumyum.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
              style={{ height: '44px' }}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">Password</label>
              <button
                type="button"
                onClick={() => onNavigate('reset-password')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '11.5px',
                  color: '#2563eb',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline'
                }}
              >
                Forgot Password?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ height: '44px', paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '12px', top: '12px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#94a3b8', padding: 0
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <label className="auth-checkbox-row" style={{ marginTop: '-4px' }}>
            <input
              type="checkbox"
              id="remember-me"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Stay logged in (Remember Me)</span>
          </label>

          <button
            type="submit"
            id="login-submit-btn"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%', marginTop: '6px', height: '48px', fontSize: '15px' }}
          >
            <LogIn size={18} />
            <span>{loading ? 'Signing In...' : 'Sign In to Billing'}</span>
          </button>
        </form>

        {/* Register / Server Info */}
        <div style={{
          marginTop: '22px',
          paddingTop: '18px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <button
            type="button"
            id="goto-register-btn"
            onClick={() => onNavigate('register')}
            className="btn btn-secondary"
            style={{ width: '100%' }}
          >
            <UserPlus size={16} />
            <span>Register New Cafe Account</span>
          </button>

          <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            {serverUrl ? (
              <span>Server: <strong style={{ color: '#1e3a8a' }}>{serverUrl}</strong></span>
            ) : (
              <span>🔌 Standalone Local Mode · No Cloud Server Configured</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import { ArrowLeft, KeyRound, CheckCircle2, ShieldQuestion } from 'lucide-react';

export default function ResetPasswordPage({ onNavigate }) {
  const { showToast } = useApp();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [question, setQuestion] = useState(null);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!usernameOrEmail.trim()) {
      showToast('Please enter your username or email.', 'error');
      return;
    }

    setLoading(true);
    try {
      const q = await api.getSecurityQuestion(usernameOrEmail.trim());
      setQuestion(q);
      showToast('Account identified. Please answer your security question.', 'info');
    } catch (err) {
      showToast(err.message || 'No account found with this identifier.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword({
        username_or_email: usernameOrEmail.trim(),
        security_answer: securityAnswer.trim(),
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      showToast('Password reset successfully! Please sign in.', 'success');
      onNavigate('login');
    } catch (err) {
      showToast(err.message || 'Password reset failed.', 'error');
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
      background: 'radial-gradient(circle at 50% 20%, #1e3a8a 0%, #080f24 100%)',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: '#ffffff',
        borderRadius: '18px',
        padding: '36px 32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        animation: 'scaleUp 0.2s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px' }}>
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="btn btn-secondary btn-sm"
          >
            <ArrowLeft size={16} />
            <span>Login</span>
          </button>
          <h2 style={{ fontSize: '19px', fontWeight: 900, color: '#0f1f4b', margin: 0 }}>
            Reset Password
          </h2>
        </div>

        {!question ? (
          <form onSubmit={handleLookup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.4 }}>
              Enter your registered username or email address to verify your account identity.
            </p>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Username or Email</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. admin or owner@yumyum.com"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-royal btn-lg"
              disabled={loading}
              style={{ width: '100%', marginTop: '8px' }}
            >
              <ShieldQuestion size={18} />
              <span>{loading ? 'Finding Account...' : 'Continue to Security Question'}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase' }}>Security Question:</div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{question}</div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Your Security Answer</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter answer"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%', marginTop: '6px' }}
            >
              <CheckCircle2 size={18} />
              <span>{loading ? 'Updating Password...' : 'Save New Password'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import { Store, User, Mail, Lock, ShieldCheck, ArrowLeft, CheckCircle } from 'lucide-react';

export default function RegisterPage({ onNavigate }) {
  const { setUser, loadAccountData, logoUrl, showToast } = useApp();
  const [formData, setFormData] = useState({
    cafe_name: 'Yum Yum Cafe',
    owner_name: '',
    email: '',
    username: '',
    password: '',
    confirm_password: '',
    security_question: 'What is your favorite food or beverage?',
    security_answer: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirm_password) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    if (formData.password.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    if (!formData.security_answer.trim()) {
      showToast('Please provide an answer to the security question for password recovery.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.register(formData);
      setUser(res.account || res);
      await loadAccountData(res.account || res);
      showToast('Account registered successfully! Welcome to Yum Yum Billing.', 'success');
    } catch (err) {
      showToast(err.message || 'Registration failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      background: 'radial-gradient(circle at 50% 20%, #1e3a8a 0%, #080f24 100%)',
      padding: '24px',
      overflowY: 'auto'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '520px',
        backgroundColor: '#ffffff',
        borderRadius: '18px',
        padding: '32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        animation: 'scaleUp 0.2s ease',
        margin: 'auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="btn btn-secondary btn-sm"
          >
            <ArrowLeft size={16} />
            <span>Back to Login</span>
          </button>
          <h2 style={{ fontSize: '19px', fontWeight: 900, color: '#0f1f4b', margin: 0 }}>
            Register Cafe Account
          </h2>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Cafe Name *</label>
              <input
                type="text"
                name="cafe_name"
                className="form-input"
                placeholder="Yum Yum Cafe"
                value={formData.cafe_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Owner Name *</label>
              <input
                type="text"
                name="owner_name"
                className="form-input"
                placeholder="Owner Full Name"
                value={formData.owner_name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                name="email"
                className="form-input"
                placeholder="owner@yumyum.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Username *</label>
              <input
                type="text"
                name="username"
                className="form-input"
                placeholder="e.g. admin"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Password *</label>
              <input
                type="password"
                name="password"
                className="form-input"
                placeholder="Min 6 characters"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Confirm Password *</label>
              <input
                type="password"
                name="confirm_password"
                className="form-input"
                placeholder="Repeat password"
                value={formData.confirm_password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Security Question (For Password Recovery) *</label>
            <select
              name="security_question"
              className="form-select"
              value={formData.security_question}
              onChange={handleChange}
            >
              <option value="What is your favorite food or beverage?">What is your favorite food or beverage?</option>
              <option value="What is the name of your first pet?">What is the name of your first pet?</option>
              <option value="What city was your cafe founded in?">What city was your cafe founded in?</option>
              <option value="What was your childhood nickname?">What was your childhood nickname?</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Security Answer *</label>
            <input
              type="text"
              name="security_answer"
              className="form-input"
              placeholder="Your secret answer"
              value={formData.security_answer}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%', marginTop: '10px' }}
          >
            <CheckCircle size={18} />
            <span>{loading ? 'Creating Account...' : 'Complete Registration'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

import React from 'react';
import { useApp } from '../context/AppContext';
import {
  ShoppingCart,
  LayoutDashboard,
  UtensilsCrossed,
  ReceiptText,
  BarChart3,
  Settings as SettingsIcon,
  Cloud,
  LogOut
} from 'lucide-react';

export default function Sidebar() {
  const { activeTab, setActiveTab, user, logout, logoUrl, settings } = useApp();

  const navItems = [
    { id: 'pos', label: 'POS Billing', icon: ShoppingCart },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'menu', label: 'Menu & Items', icon: UtensilsCrossed },
    { id: 'history', label: 'Bill History', icon: ReceiptText },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Cafe Settings', icon: SettingsIcon },
    { id: 'cloud', label: 'Cloud / Server', icon: Cloud }
  ];

  const cafeName = (settings && settings.cafe_name) || (user && user.cafe_name) || 'Yum Yum Cafe';

  return (
    <aside className="sidebar">
      {/* Header with Logo */}
      <div className="sidebar-header">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Yum Yum Cafe Logo"
            className="sidebar-logo"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f59e0b', color: '#fff', fontWeight: 900 }}>
            YYC
          </div>
        )}
        <div className="sidebar-brand">
          <div className="sidebar-title">{cafeName}</div>
          <div className="sidebar-subtitle">POS Billing</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <div
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={18} className="nav-icon" />
              <span>{item.label}</span>
            </div>
          );
        })}
      </nav>

      {/* Footer / Account */}
      <div className="sidebar-footer">
        <div className="account-pill">
          <div className="account-info">
            <span className="account-name">{user ? user.owner_name : 'Guest User'}</span>
            <span className="account-role">{user ? `@${user.username}` : 'Offline'}</span>
          </div>
          {user && (
            <button
              onClick={logout}
              title="Logout"
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#f43f5e')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

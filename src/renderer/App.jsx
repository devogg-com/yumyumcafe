import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Toast from './components/Toast';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

import PosBillingPage from './pages/PosBillingPage';
import DashboardPage from './pages/DashboardPage';
import MenuPage from './pages/MenuPage';
import BillHistoryPage from './pages/BillHistoryPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import CloudSettingsPage from './pages/CloudSettingsPage';

export default function App() {
  const { user, loading, activeTab, logoUrl } = useApp();
  const [authView, setAuthView] = useState('login'); // 'login' | 'register' | 'reset-password'

  // Loading Screen
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        background: 'radial-gradient(circle at 50% 20%, #1e3a8a 0%, #080f24 100%)',
        color: '#fff'
      }}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Yum Yum Cafe"
            style={{
              width: '90px',
              height: '90px',
              borderRadius: '16px',
              border: '3px solid #fbbf24',
              marginBottom: '20px',
              boxShadow: '0 0 24px rgba(245, 158, 11, 0.4)'
            }}
          />
        ) : (
          <div style={{
            width: '90px',
            height: '90px',
            borderRadius: '16px',
            backgroundColor: '#f59e0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            fontWeight: 900,
            marginBottom: '20px'
          }}>
            YYC
          </div>
        )}
        <h2 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '1px' }}>
          YUM YUM BILLING
        </h2>
        <p style={{ fontSize: '13px', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '4px' }}>
          Loading POS Terminal...
        </p>
      </div>
    );
  }

  // Auth Screens
  if (!user) {
    return (
      <>
        {authView === 'login' && <LoginPage onNavigate={setAuthView} />}
        {authView === 'register' && <RegisterPage onNavigate={setAuthView} />}
        {authView === 'reset-password' && <ResetPasswordPage onNavigate={setAuthView} />}
        <Toast />
      </>
    );
  }

  // Main POS Application
  const renderActivePage = () => {
    switch (activeTab) {
      case 'pos':
        return <PosBillingPage />;
      case 'dashboard':
        return <DashboardPage />;
      case 'menu':
        return <MenuPage />;
      case 'history':
        return <BillHistoryPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'cloud':
        return <CloudSettingsPage />;
      default:
        return <PosBillingPage />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-wrapper">
        <TopBar />
        {renderActivePage()}
      </div>
      <Toast />
    </div>
  );
}

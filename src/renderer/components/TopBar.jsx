import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { RefreshCw, Wifi, WifiOff, UserCheck, Clock } from 'lucide-react';

export default function TopBar() {
  const {
    activeTab,
    activeStaff,
    setActiveStaff,
    staffList,
    connectionStatus,
    serverHealth,
    pendingChanges,
    triggerSync,
    serverUrl,
    setActiveTab
  } = useApp();

  const [time, setTime] = useState(new Date());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSyncClick = async () => {
    setSyncing(true);
    await triggerSync();
    setSyncing(false);
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'pos': return 'POS Billing Terminal';
      case 'dashboard': return 'Performance Dashboard';
      case 'menu': return 'Menu & Category Management';
      case 'history': return 'Bill History & Invoices';
      case 'reports': return 'Financial & Sales Reports';
      case 'settings': return 'Cafe & Hardware Settings';
      case 'cloud': return 'Multi-PC LAN & Cloud Server';
      default: return 'Yum Yum Billing';
    }
  };

  const isConnected = connectionStatus === 'connected';
  const isSyncing = connectionStatus === 'syncing' || syncing;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="page-title">{getPageTitle()}</h1>
      </div>

      <div className="topbar-right">
        {/* Active Staff Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '5px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <UserCheck size={16} color="#1e3a8a" />
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b' }}>STAFF:</span>
          {staffList && staffList.length > 0 ? (
            <select
              value={activeStaff}
              onChange={(e) => setActiveStaff(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                fontWeight: 700,
                fontSize: '12.5px',
                color: '#0f172a',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {staffList.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={activeStaff}
              onChange={(e) => setActiveStaff(e.target.value)}
              placeholder="Staff Name"
              style={{
                border: 'none',
                background: 'transparent',
                fontWeight: 700,
                fontSize: '12.5px',
                color: '#0f172a',
                outline: 'none',
                width: '90px'
              }}
            />
          )}
        </div>

        {/* Live Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>
          <Clock size={15} color="#94a3b8" />
          <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>

        {/* Server Connection Status Pill */}
        <div
          className={`status-badge ${isConnected ? 'connected' : isSyncing ? 'syncing' : 'disconnected'}`}
          onClick={() => setActiveTab('cloud')}
          style={{ cursor: 'pointer' }}
          title={serverUrl ? `Server: ${serverUrl} (Click to manage)` : 'Click to configure Server URL'}
        >
          {isConnected ? (
            <>
              <span className="pulse-dot pulse"></span>
              <Wifi size={13} />
              <span>LAN Server</span>
            </>
          ) : isSyncing ? (
            <>
              <RefreshCw size={13} className="spin" />
              <span>Syncing...</span>
            </>
          ) : (
            <>
              <WifiOff size={13} />
              <span>Offline (Local)</span>
            </>
          )}
        </div>

        {/* Quick Sync Button */}
        <button
          onClick={handleSyncClick}
          disabled={isSyncing}
          className="btn btn-secondary btn-sm"
          title="Synchronize data with server"
          style={{ position: 'relative' }}
        >
          <RefreshCw size={14} className={isSyncing ? 'spin' : ''} />
          <span>Sync</span>
          {pendingChanges > 0 && (
            <span style={{
              background: '#f59e0b',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 800,
              padding: '1px 5px',
              borderRadius: '9999px',
              marginLeft: '2px'
            }}>
              {pendingChanges}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

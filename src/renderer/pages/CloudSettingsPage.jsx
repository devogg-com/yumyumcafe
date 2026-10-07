import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import {
  Cloud,
  Wifi,
  WifiOff,
  RefreshCw,
  Server,
  Activity,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Shield,
  Save,
  Link2,
  Unlink
} from 'lucide-react';

export default function CloudSettingsPage() {
  const {
    user,
    serverUrl,
    setServerUrl,
    connectionStatus,
    setConnectionStatus,
    serverHealth,
    lastSync,
    pendingChanges,
    showToast,
    checkServerConnection,
    triggerSync
  } = useApp();

  const [inputUrl, setInputUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setInputUrl(serverUrl || '');
  }, [serverUrl]);

  // Save Server URL to SQLite settings & app_config
  const handleSaveUrl = async (e) => {
    if (e) e.preventDefault();
    const clean = inputUrl.trim().replace(/\/+$/, '');
    try {
      await api.setServerUrl(clean);
      setServerUrl(clean);
      showToast('Server URL saved to persistent database!', 'success');

      // Test immediately after saving
      if (clean) {
        setTesting(true);
        const res = await checkServerConnection(clean);
        setTestResult(res);
        setTesting(false);
        if (res.ok) {
          showToast(`Successfully connected to ${clean}!`, 'success');
        } else {
          showToast(res.message || 'Connection failed.', 'error');
        }
      }
    } catch (err) {
      showToast('Failed to save URL: ' + err.message, 'error');
    }
  };

  // Test Connection
  const handleTestConnection = async () => {
    const clean = inputUrl.trim().replace(/\/+$/, '');
    if (!clean) {
      showToast('Please enter a Server URL to test.', 'error');
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await checkServerConnection(clean);
      setTestResult(res);
      if (res.ok) {
        showToast(`Server is healthy (${res.latency || 0}ms response time)`, 'success');
      } else {
        showToast(res.message || 'Server did not respond.', 'error');
      }
    } catch (err) {
      setTestResult({ ok: false, message: err.message });
      showToast(err.message, 'error');
    } finally {
      setTesting(false);
    }
  };

  // Connect
  const handleConnect = async () => {
    await handleSaveUrl();
  };

  // Disconnect
  const handleDisconnect = async () => {
    try {
      await api.setServerUrl('');
      setServerUrl('');
      setInputUrl('');
      setConnectionStatus('disconnected');
      setTestResult(null);
      showToast('Disconnected from server. Switched to Standalone Offline Mode.', 'info');
    } catch (err) {
      showToast('Error disconnecting: ' + err.message, 'error');
    }
  };

  // Manual Sync Now
  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await triggerSync();
    } finally {
      setSyncing(false);
    }
  };

  const isConnected = connectionStatus === 'connected';
  const isChecking = connectionStatus === 'checking' || testing;

  return (
    <div className="page-container">
      {/* Top Banner */}
      <div className="card" style={{ marginBottom: '22px', padding: '22px 26px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Cloud size={24} color="#1e3a8a" />
              <span>Multi-PC LAN & Cloud Server Configuration</span>
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Connect multiple billing counters, POS tablets, or backoffice computers across your local cafe Wi-Fi or LAN.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>Current Status:</span>
            <div className={`status-badge ${isConnected ? 'connected' : isChecking ? 'syncing' : 'disconnected'}`}>
              <span className={`pulse-dot ${isConnected ? 'pulse' : ''}`} />
              {isConnected ? 'CONNECTED' : isChecking ? 'CHECKING...' : 'DISCONNECTED'}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '22px' }}>
        {/* LEFT COLUMN: URL Configuration & Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={18} color="#1e3a8a" />
              <span>Server Connection Settings</span>
            </h3>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label">Server / Cloud URL</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. http://192.168.1.100:4500"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  style={{ fontSize: '14px', fontWeight: 600 }}
                />
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '6px' }}>
                Enter the IP address and port of your main Server PC (Default port is <strong>4500</strong>). Do NOT assume localhost.
              </div>
            </div>

            {/* Action Buttons Row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={handleSaveUrl}
                className="btn btn-primary"
                title="Save URL permanently to SQLite"
              >
                <Save size={15} />
                <span>Save Server URL</span>
              </button>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isChecking || !inputUrl.trim()}
                className="btn btn-secondary"
                title="Ping server health endpoint"
              >
                <Activity size={15} />
                <span>{isChecking ? 'Testing...' : 'Test Connection'}</span>
              </button>

              {isConnected ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="btn btn-secondary"
                  style={{ color: '#e11d48', borderColor: '#fecdd3' }}
                >
                  <Unlink size={15} />
                  <span>Disconnect</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={!inputUrl.trim()}
                  className="btn btn-royal"
                >
                  <Link2 size={15} />
                  <span>Connect</span>
                </button>
              )}
            </div>

            {/* Test Connection Results Card */}
            {testResult && (
              <div style={{
                marginTop: '18px',
                padding: '14px 16px',
                borderRadius: '10px',
                background: testResult.ok ? '#ecfdf5' : '#fff1f2',
                border: `1.5px solid ${testResult.ok ? '#a7f3d0' : '#fecdd3'}`,
                color: testResult.ok ? '#065f46' : '#9f1239'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '13px' }}>
                  {testResult.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <span>{testResult.ok ? 'Connection Succeeded!' : 'Connection Failed'}</span>
                </div>
                <div style={{ fontSize: '12px', marginTop: '6px', lineHeight: 1.4 }}>
                  {testResult.message}
                </div>
                {testResult.latency !== undefined && (
                  <div style={{ fontSize: '11px', marginTop: '4px', fontWeight: 600 }}>
                    Round-trip latency: {testResult.latency} ms
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sync Controls Card */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={18} color="#1e3a8a" />
              <span>Bidirectional Data Synchronization</span>
            </h3>

            <p style={{ fontSize: '12.5px', color: '#64748b', lineHeight: 1.5, marginBottom: '16px' }}>
              Sync ensures all bills generated offline on this machine reach the main server, and any menu updates from the server arrive on this device.
            </p>

            <button
              onClick={handleSyncNow}
              disabled={syncing || !isConnected}
              className="btn btn-royal btn-lg"
              style={{ width: '100%' }}
            >
              <RefreshCw size={18} className={syncing ? 'spin' : ''} />
              <span>{syncing ? 'Synchronizing...' : 'Sync Now'}</span>
            </button>

            {!isConnected && (
              <div style={{ fontSize: '11.5px', color: '#d97706', marginTop: '10px', textAlign: 'center', fontWeight: 600 }}>
                * Normal billing continues working offline locally. When connection is restored, click Sync Now.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Diagnostics & Setup Instructions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Diagnostics Card */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="#1e3a8a" />
              <span>System & Sync Telemetry</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Configured Server URL:</span>
                <span style={{ fontWeight: 800, color: serverUrl ? '#1e3a8a' : '#94a3b8' }}>
                  {serverUrl || 'None (Local Standalone)'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Server Health (/api/health):</span>
                <span style={{ fontWeight: 800, color: isConnected ? '#059669' : '#94a3b8' }}>
                  {serverHealth ? `${serverHealth.app} v${serverHealth.version || '1.0.0'}` : 'Unavailable'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Last Successful Sync:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {lastSync ? new Date(lastSync).toLocaleString() : 'Never'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Pending Local Changes:</span>
                <span style={{
                  fontWeight: 800,
                  color: pendingChanges > 0 ? '#d97706' : '#059669'
                }}>
                  {pendingChanges} {pendingChanges === 1 ? 'record' : 'records'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ color: '#64748b' }}>Logged In Account:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {user ? `${user.cafe_name} (${user.username})` : 'Not logged in'}
                </span>
              </div>
            </div>
          </div>

          {/* Windows LAN Setup Guidelines */}
          <div className="card" style={{ background: '#f8fafc' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} color="#1e3a8a" />
              <span>Multi-PC Setup Guide</span>
            </h3>

            <ol style={{ paddingLeft: '18px', fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
              <li>
                <strong>Start Server on Host PC:</strong> Double-click <code>start-server.bat</code> or run <code>npm run server</code>.
              </li>
              <li>
                <strong>Allow Windows Firewall:</strong> Right-click <code>setup-firewall.bat</code> and select <em>"Run as Administrator"</em> to open TCP port 4500.
              </li>
              <li>
                <strong>Check Host IP Address:</strong> Note the IP shown on server startup (e.g. <code>http://192.168.100.100:4500</code>).
              </li>
              <li>
                <strong>Connect from Client PC:</strong> Enter <code>http://HOST-IP:4500</code> in the field on the left and click <strong>"Save Server URL"</strong> and <strong>"Connect"</strong>.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

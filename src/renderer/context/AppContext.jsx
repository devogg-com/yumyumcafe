import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [activeStaff, setActiveStaff] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [serverUrl, setServerUrl] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connected' | 'disconnected' | 'checking'
  const [serverHealth, setServerHealth] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [activeTab, setActiveTab] = useState('pos'); // default to POS Billing for speed!
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Toast notification system
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Check server connection
  const checkServerConnection = useCallback(async (customUrl = null) => {
    const url = customUrl !== null ? customUrl : serverUrl;
    if (!url || !url.trim()) {
      setConnectionStatus('disconnected');
      setServerHealth(null);
      return { ok: false, message: 'No Server URL configured.' };
    }

    setConnectionStatus('checking');
    try {
      const res = await api.testConnection(url);
      if (res.ok) {
        setConnectionStatus('connected');
        setServerHealth(res.serverInfo || res);
        return { ok: true, latency: res.latency, serverInfo: res.serverInfo };
      } else {
        setConnectionStatus('disconnected');
        setServerHealth(null);
        return { ok: false, message: res.message || 'Connection failed' };
      }
    } catch (err) {
      setConnectionStatus('disconnected');
      setServerHealth(null);
      return { ok: false, message: err.message };
    }
  }, [serverUrl]);

  // Sync now action
  const triggerSync = useCallback(async () => {
    if (!user) {
      showToast('Please log in to sync.', 'error');
      return;
    }
    setConnectionStatus('syncing');
    try {
      const res = await api.syncNow(user.id, api.getToken());
      setLastSync(res.serverTime || new Date().toISOString());
      setConnectionStatus('connected');
      showToast('Data synchronized successfully with server!', 'success');
      // Refresh status
      const status = await api.getSyncStatus(user.id);
      setPendingChanges(status.pendingChanges || 0);
      return res;
    } catch (err) {
      setConnectionStatus('disconnected');
      showToast(err.message || 'Sync failed. Working in offline mode.', 'error');
    }
  }, [user, showToast]);

  // Load logo
  const loadLogo = useCallback(async () => {
    try {
      const logo = await api.getLogoBase64();
      if (logo) setLogoUrl(logo);
    } catch (err) {
      console.warn('Logo load notice:', err.message);
    }
  }, []);

  // Load settings & staff
  const loadAccountData = useCallback(async (account) => {
    try {
      const s = await api.getSettings(account.id);
      setSettings(s);

      // Load staff members
      const staff = await api.getStaff(account.id);
      setStaffList(staff || []);
      if (staff && staff.length > 0) {
        setActiveStaff(staff[0].name);
      } else {
        setActiveStaff(account.owner_name || 'Staff');
      }

      // Check sync status
      const syncStatus = await api.getSyncStatus(account.id);
      if (syncStatus.lastSync) setLastSync(syncStatus.lastSync);
      setPendingChanges(syncStatus.pendingChanges || 0);
    } catch (err) {
      console.error('Error loading account data:', err);
    }
  }, []);

  // Initialize app
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // 1. Load persisted Server URL from SQLite / storage
        const savedUrl = await api.getServerUrl();
        if (mounted && savedUrl) {
          setServerUrl(savedUrl);
          // Ping server silently in background
          api.testConnection(savedUrl).then((res) => {
            if (mounted) {
              setConnectionStatus(res.ok ? 'connected' : 'disconnected');
              if (res.ok) setServerHealth(res.serverInfo || res);
            }
          }).catch(() => {
            if (mounted) setConnectionStatus('disconnected');
          });
        }

        // 2. Load authentic logo
        await loadLogo();

        // 3. Check current user session
        const currentUser = await api.getCurrentUser();
        if (mounted && currentUser) {
          setUser(currentUser);
          await loadAccountData(currentUser);
        }
      } catch (err) {
        console.error('App init error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();
    return () => { mounted = false; };
  }, [loadLogo, loadAccountData]);

  // Periodically check server connection every 30 seconds if URL is set
  useEffect(() => {
    if (!serverUrl) return;
    const interval = setInterval(() => {
      checkServerConnection(serverUrl);
    }, 30000);
    return () => clearInterval(interval);
  }, [serverUrl, checkServerConnection]);

  const logout = async () => {
    await api.logout();
    setUser(null);
    setSettings(null);
    setActiveTab('pos');
    showToast('Logged out successfully.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        settings,
        setSettings,
        logoUrl,
        activeStaff,
        setActiveStaff,
        staffList,
        setStaffList,
        serverUrl,
        setServerUrl,
        connectionStatus,
        setConnectionStatus,
        serverHealth,
        lastSync,
        pendingChanges,
        activeTab,
        setActiveTab,
        toasts,
        showToast,
        loading,
        checkServerConnection,
        triggerSync,
        loadAccountData,
        logout
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

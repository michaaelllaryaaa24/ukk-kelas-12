import { useCallback, useEffect, useState } from 'react';
import {
  demoLoginApi,
  getProfileApi,
  loginApi,
  logoutApi,
  registerApi,
  updateProfileApi,
} from '../api/authApi';
import { AuthContext } from './useContexts';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('taskflow_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('taskflow_token'));
  const [initializing, setInitializing] = useState(() =>
    Boolean(localStorage.getItem('taskflow_token'))
  );

  const persistSession = useCallback((nextToken, nextUser) => {
    localStorage.setItem('taskflow_token', nextToken);
    localStorage.setItem('taskflow_user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
    setInitializing(false);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem('taskflow_token');
    localStorage.removeItem('taskflow_user');
    setToken(null);
    setUser(null);
    setInitializing(false);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearSession();
    };
    window.addEventListener('taskflow:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('taskflow:unauthorized', handleUnauthorized);
  }, [clearSession]);

  useEffect(() => {
    let active = true;
    if (!token) {
      setInitializing(false);
      return undefined;
    }

    // Safety timeout: jika backend tidak merespons dalam 4 detik, jangan biarkan layar gantung
    const timeoutId = setTimeout(() => {
      if (active) {
        setInitializing(false);
      }
    }, 4000);

    getProfileApi()
      .then((res) => {
        if (active && res?.user) {
          setUser(res.user);
          localStorage.setItem('taskflow_user', JSON.stringify(res.user));
        }
      })
      .catch(() => {
        if (active) {
          clearSession();
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        if (active) {
          setInitializing(false);
        }
      });

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [token, clearSession]);

  const login = async (credentials) => {
    const res = await loginApi(credentials);
    persistSession(res.token, res.user);
    return res;
  };

  const register = async (payload) => {
    const res = await registerApi(payload);
    persistSession(res.token, res.user);
    return res;
  };

  const loginDemo = async () => {
    const res = await demoLoginApi();
    persistSession(res.token, res.user);
    return res;
  };

  const updateProfile = async (payload) => {
    const res = await updateProfileApi(payload);
    if (res?.user) {
      setUser(res.user);
      localStorage.setItem('taskflow_user', JSON.stringify(res.user));
    }
    return res;
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch {
      // Tetap bersihkan sesi lokal meskipun token sudah tidak berlaku
    } finally {
      clearSession();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        initializing,
        login,
        register,
        loginDemo,
        updateProfile,
        logout,
        clearSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

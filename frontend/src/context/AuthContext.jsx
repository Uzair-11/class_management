import React, { createContext, useContext, useState, useEffect } from 'react';
import { setAuthTokenRef, setLogoutHandlerRef } from '../utils/apiClient';
import { buildApiUrl } from '../utils/apiConfig';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync current access token to apiClient ref
  const updateToken = (newToken) => {
    setToken(newToken);
    setAuthTokenRef(newToken);
  };

  const handleForceLogout = () => {
    setToken(null);
    setUser(null);
    setAuthTokenRef(null);
  };

  useEffect(() => {
    setLogoutHandlerRef(handleForceLogout);
  }, []);

  // Silent refresh on app initial mount
  useEffect(() => {
    const silentRefresh = async () => {
      try {
        const res = await fetch(buildApiUrl('/api/auth/refresh'), {
          method: 'POST',
          credentials: 'include'
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          updateToken(data.token);
        } else {
          console.warn('Silent refresh endpoint returned non-ok status:', res.status);
          handleForceLogout();
        }
      } catch (err) {
        console.error('Silent refresh fetch failed:', err);
        handleForceLogout();
      } finally {
        setLoading(false);
      }
    };

    silentRefresh();
  }, []);

  const login = async (phone, password) => {
    const res = await fetch(buildApiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ phone, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Login failed');
    }

    setUser(data.user);
    updateToken(data.token);
    return data.user;
  };

  const logout = async () => {
    try {
      await fetch(buildApiUrl('/api/auth/logout'), {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.warn('Logout request failed:', err);
    } finally {
      handleForceLogout();
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <div>Authenticating system session...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

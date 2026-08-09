import React, { createContext, useContext, useState, useEffect } from 'react';
import { setAuthTokenRef, setLogoutHandlerRef } from '../utils/apiClient';
import { buildApiUrl } from '../utils/apiConfig';
import logoImg from '../../../logo_reverse.png';

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
    localStorage.removeItem('refresh_token');
  };

  useEffect(() => {
    setLogoutHandlerRef(handleForceLogout);
  }, []);

  // Silent refresh on app initial mount
  useEffect(() => {
    const silentRefresh = async () => {
      const storedRefreshToken = localStorage.getItem('refresh_token');
      try {
        const res = await fetch(buildApiUrl('/api/auth/refresh'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ refreshToken: storedRefreshToken || undefined })
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          updateToken(data.token);
          if (data.refreshToken) localStorage.setItem('refresh_token', data.refreshToken);
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

    if (data.refreshToken) {
      localStorage.setItem('refresh_token', data.refreshToken);
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
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--color-background, #F4F6F5)',
        padding: '1.5rem',
        fontFamily: 'var(--font-body, sans-serif)'
      }}>
        <div className="skeuocard" style={{
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          padding: '2.5rem 2rem',
          borderTop: '5px solid var(--color-primary, #0B6E4F)',
          boxShadow: 'var(--shadow-card), var(--shadow-inner)'
        }}>
          <img 
            src={logoImg} 
            alt="Jamaat-e-Islami Hind Logo" 
            style={{ 
              height: '72px', 
              width: 'auto', 
              marginBottom: '1.25rem',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.12))'
            }} 
          />
          <h2 style={{ 
            fontSize: '1.35rem', 
            color: 'var(--color-primary-dark, #074733)', 
            marginBottom: '0.85rem',
            fontFamily: 'var(--font-heading, sans-serif)',
            fontWeight: '800'
          }}>
            JIH Sewing Classes Management System
          </h2>
          <p style={{ 
            fontSize: '0.86rem', 
            color: 'var(--color-text-secondary, #5A6662)', 
            lineHeight: '1.6', 
            marginBottom: '1.75rem',
            fontStyle: 'italic'
          }}>
            "Jamaat-e-Islami Hind is a socio-religious organization of India that aims to uphold a way of life that submits to the will of God."
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.55rem 1.15rem',
            borderRadius: '20px',
            backgroundColor: 'var(--color-primary-light, #E7F3EF)',
            border: '1px solid var(--color-primary, #0B6E4F)',
            color: 'var(--color-primary-dark, #074733)',
            fontSize: '0.85rem',
            fontWeight: '600'
          }}>
            <span style={{ display: 'inline-block' }}>🔄</span>
            Authenticating system session...
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

import { buildApiUrl } from './apiConfig';

let tokenRef = { current: null };
let logoutHandlerRef = { current: null };

export const setAuthTokenRef = (token) => {
  tokenRef.current = token;
};

export const setLogoutHandlerRef = (handler) => {
  logoutHandlerRef.current = handler;
};

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (newToken) => {
  refreshSubscribers.map(cb => cb(newToken));
  refreshSubscribers = [];
};

export const apiFetch = async (url, options = {}) => {
  const fullUrl = buildApiUrl(url);
  const headers = { ...options.headers };
  
  if (tokenRef.current && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${tokenRef.current}`;
  }

  const fetchOptions = {
    ...options,
    headers,
    credentials: 'include'
  };

  let response = await fetch(fullUrl, fetchOptions);

  if (response.status === 401 && !options._retry) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh(async (newToken) => {
          if (!newToken) {
            return resolve(response);
          }
          headers['Authorization'] = `Bearer ${newToken}`;
          try {
            const res = await fetch(fullUrl, { ...options, headers, credentials: 'include' });
            resolve(res);
          } catch (err) {
            reject(err);
          }
        });
      });
    }

    options._retry = true;
    isRefreshing = true;

    try {
      const refreshRes = await fetch(buildApiUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refreshToken: localStorage.getItem('refresh_token') || undefined })
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setAuthTokenRef(refreshData.token);
        isRefreshing = false;
        onRefreshed(refreshData.token);

        headers['Authorization'] = `Bearer ${refreshData.token}`;
        return await fetch(fullUrl, { ...options, headers, credentials: 'include', _retry: true });
      } else {
        isRefreshing = false;
        onRefreshed(null);
        if (logoutHandlerRef.current) {
          logoutHandlerRef.current();
        }
      }
    } catch (err) {
      isRefreshing = false;
      onRefreshed(null);
      if (logoutHandlerRef.current) {
        logoutHandlerRef.current();
      }
    }
  }

  return response;
};

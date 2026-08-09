// Base API URL configuration
// Resolves to import.meta.env.VITE_API_URL if defined (e.g. Production Vercel deploy pointing to Render backend)
// Defaults to empty string ('' relative path) so Vite dev server proxy handles /api calls seamlessly
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const buildApiUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanEndpoint}` : cleanEndpoint;
};

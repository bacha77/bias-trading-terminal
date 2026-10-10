// Centralized API configuration for local dev and production deployment
export const API_BASE = 
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : (typeof window !== 'undefined' && (window.location.port === '5173' || window.location.port === '5174'))
      ? 'http://127.0.0.1:8000'
      : '';

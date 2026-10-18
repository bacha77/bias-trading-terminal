// Centralized API configuration: directs production web clients straight to Cloud Run API
export const API_BASE = 
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : (typeof window !== 'undefined' && (window.location.port === '5173' || window.location.port === '5174'))
      ? 'http://127.0.0.1:8000'
      : 'https://bias-api-105092699964.us-central1.run.app';


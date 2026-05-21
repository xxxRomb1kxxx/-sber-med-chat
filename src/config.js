export const CONFIG = {
  API_URL: (typeof import !== 'undefined' && import.meta?.env?.VITE_API_URL) || 'http://localhost:8000',
  API_PREFIX: '/api/v1',
};

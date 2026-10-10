export const BACKEND_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081').replace(/\/$/, '');
export const API_BASE_URL = `${BACKEND_URL}/api`;
export const WS_BASE_URL = `${BACKEND_URL}/ws`;

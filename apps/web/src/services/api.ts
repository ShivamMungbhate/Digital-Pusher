import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach Authorization header if access token is stored in memory or localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Standard error unwrapping
    const message = error.response?.data?.error?.message || error.message || 'Network request failed';
    return Promise.reject(new Error(message));
  }
);

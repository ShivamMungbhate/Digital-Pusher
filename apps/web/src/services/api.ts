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
    // Unpack validation details if present
    const errData = error.response?.data?.error;
    let message = errData?.message || error.message || 'Network request failed';
    if (errData?.details && Array.isArray(errData.details) && errData.details.length > 0) {
      const detailMsgs = errData.details.map((d: any) => d.message).filter(Boolean).join('. ');
      if (detailMsgs) {
        message = detailMsgs;
      }
    }
    return Promise.reject(new Error(message));
  }
);

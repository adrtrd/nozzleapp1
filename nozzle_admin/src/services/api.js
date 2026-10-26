import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Global Error Handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      
      // Auto logout on 401 (Token expired/Invalid)
      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Do not redirect forcefully here to avoid page loops during login
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/panel/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

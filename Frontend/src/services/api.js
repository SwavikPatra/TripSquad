import axios from 'axios';

// 1. Create Axios instance
const API = axios.create({
  baseURL: 'http://localhost:8000', // Your FastAPI backend URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Add request interceptor for JWT tokens
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 3. Add response interceptor for error handling
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;
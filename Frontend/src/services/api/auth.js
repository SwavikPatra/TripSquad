import api from './index.js'; // Import your configured axios instance

export const login = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const signup = async (userData) => {
  try {
    const response = await api.post('/auth/signup', userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Optionally add logout if needed
export const logout = () => {
  localStorage.removeItem('token');
};
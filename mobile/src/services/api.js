import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor tự động gắn JWT Token từ AsyncStorage
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('memora_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Lỗi đọc token từ storage:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor xử lý lỗi 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      try {
        await AsyncStorage.multiRemove(['memora_token', 'memora_user']);
      } catch (e) {
        // ignore
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    return res.data;
  },
  register: async (userData) => {
    const res = await api.post('/auth/register', userData);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  updateProfile: async (data) => {
    const res = await api.put('/auth/profile', data);
    return res.data;
  },
  changePassword: async (data) => {
    const res = await api.put('/auth/change-password', data);
    return res.data;
  },
};

export const deckService = {
  getAll: async (params) => {
    const res = await api.get('/decks', { params });
    return res.data;
  },
  getMyDecks: async (params) => {
    const res = await api.get('/decks', { params: { ...params, myDecks: 'true' } });
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/decks/${id}`);
    return res.data;
  },
  create: async (deckData) => {
    const res = await api.post('/decks', deckData);
    return res.data;
  },
  update: async (id, deckData) => {
    const res = await api.put(`/decks/${id}`, deckData);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/decks/${id}`);
    return res.data;
  },
};

export const progressService = {
  get: async (deckId) => {
    const res = await api.get(`/progress/${deckId}`);
    return res.data;
  },
  update: async (deckId, data) => {
    const res = await api.post(`/progress/${deckId}`, data);
    return res.data;
  },
  reset: async (deckId) => {
    const res = await api.delete(`/progress/${deckId}`);
    return res.data;
  },
};

export default api;


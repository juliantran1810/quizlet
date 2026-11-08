import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor gắn Token tự động vào mỗi Request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('quizlet_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor bắt lỗi 401 hết hạn token
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Nếu có lỗi token không hợp lệ hoặc hết hạn
      if (localStorage.getItem('quizlet_token')) {
        localStorage.removeItem('quizlet_token');
        localStorage.removeItem('quizlet_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth Services
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
};

// Deck Services
export const deckService = {
  getAll: async (params) => {
    const res = await api.get('/decks', { params });
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

// Progress Services
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

// Admin Services
export const adminService = {
  getStats: async () => {
    const res = await api.get('/admin/stats');
    return res.data;
  },
  getUsers: async (params) => {
    const res = await api.get('/admin/users', { params });
    return res.data;
  },
  updateUserRole: async (userId, role) => {
    const res = await api.patch(`/admin/users/${userId}/role`, { role });
    return res.data;
  },
  deleteUser: async (userId) => {
    const res = await api.delete(`/admin/users/${userId}`);
    return res.data;
  },
  getDecks: async (params) => {
    const res = await api.get('/admin/decks', { params });
    return res.data;
  },
  deleteDeck: async (deckId) => {
    const res = await api.delete(`/admin/decks/${deckId}`);
    return res.data;
  },
};

export default api;


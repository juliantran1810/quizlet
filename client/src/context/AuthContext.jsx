import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('quizlet_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState(localStorage.getItem('quizlet_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const savedToken = localStorage.getItem('quizlet_token');
      if (savedToken) {
        try {
          const res = await authService.getMe();
          const freshUser = res.data.user;
          setUser(freshUser);
          localStorage.setItem('quizlet_user', JSON.stringify(freshUser));
        } catch (err) {
          console.error('Lỗi lấy thông tin user:', err);
          logout();
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const login = async (credentials) => {
    const res = await authService.login(credentials);
    const { token: newToken, data } = res;
    localStorage.setItem('quizlet_token', newToken);
    localStorage.setItem('quizlet_user', JSON.stringify(data.user));
    setToken(newToken);
    setUser(data.user);
    return data.user;
  };

  const register = async (userData) => {
    const res = await authService.register(userData);
    const { token: newToken, data } = res;
    localStorage.setItem('quizlet_token', newToken);
    localStorage.setItem('quizlet_user', JSON.stringify(data.user));
    setToken(newToken);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('quizlet_token');
    localStorage.removeItem('quizlet_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    const merged = { ...user, ...updatedUser };
    localStorage.setItem('quizlet_user', JSON.stringify(merged));
    setUser(merged);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return context;
};


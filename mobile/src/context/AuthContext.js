import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Khởi động: đọc token & user từ AsyncStorage
  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const [savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem('memora_token'),
          AsyncStorage.getItem('memora_user'),
        ]);

        if (savedToken) {
          setToken(savedToken);
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          }
          // Gọi getMe để cập nhật dữ liệu mới nhất (streak, avatar)
          try {
            const meRes = await authService.getMe();
            if (meRes.data?.user) {
              setUser(meRes.data.user);
              await AsyncStorage.setItem('memora_user', JSON.stringify(meRes.data.user));
            }
          } catch (e) {
            console.log('Lỗi cập nhật profile khi khởi động:', e?.message);
          }
        }
      } catch (e) {
        console.error('Lỗi nạp Auth Storage:', e);
      } finally {
        setLoading(false);
      }
    }

    loadStoredAuth();
  }, []);

  const login = async (email, password) => {
    const res = await authService.login({ email, password });
    const receivedToken = res.token || res.data?.token;
    const receivedUser = res.data?.user || res.user;

    if (!receivedToken || !receivedUser) {
      throw new Error('Không nhận được dữ liệu xác thực từ máy chủ');
    }

    setToken(receivedToken);
    setUser(receivedUser);
    await Promise.all([
      AsyncStorage.setItem('memora_token', receivedToken),
      AsyncStorage.setItem('memora_user', JSON.stringify(receivedUser)),
    ]);
    return receivedUser;
  };

  const register = async (username, email, password) => {
    const res = await authService.register({ username, email, password });
    const receivedToken = res.token || res.data?.token;
    const receivedUser = res.data?.user || res.user;

    if (!receivedToken || !receivedUser) {
      throw new Error('Không nhận được dữ liệu xác thực từ máy chủ');
    }

    setToken(receivedToken);
    setUser(receivedUser);
    await Promise.all([
      AsyncStorage.setItem('memora_token', receivedToken),
      AsyncStorage.setItem('memora_user', JSON.stringify(receivedUser)),
    ]);
    return receivedUser;
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.multiRemove(['memora_token', 'memora_user']);
  };

  const updateStreak = (streakData) => {
    if (!streakData) return;
    setUser((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        streakCount: streakData.streakCount ?? prev.streakCount,
        longestStreak: streakData.longestStreak ?? prev.longestStreak,
      };
      AsyncStorage.setItem('memora_user', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const refreshUser = async () => {
    try {
      const res = await authService.getMe();
      if (res.data?.user) {
        setUser(res.data.user);
        await AsyncStorage.setItem('memora_user', JSON.stringify(res.data.user));
      }
    } catch (e) {
      console.warn('Lỗi refresh user:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token,
        login,
        register,
        logout,
        updateStreak,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


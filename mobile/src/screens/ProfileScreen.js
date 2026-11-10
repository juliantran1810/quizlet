import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { API_BASE_URL } from '../config/api';

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/png?seed=Felix',
  'https://api.dicebear.com/7.x/bottts/png?seed=Aneka',
  'https://api.dicebear.com/7.x/bottts/png?seed=Zack',
  'https://api.dicebear.com/7.x/bottts/png?seed=Milo',
  'https://api.dicebear.com/7.x/avataaars/png?seed=Oliver',
  'https://api.dicebear.com/7.x/avataaars/png?seed=Sophia',
  'https://api.dicebear.com/7.x/avataaars/png?seed=Lucas',
  'https://api.dicebear.com/7.x/avataaars/png?seed=Emma',
];

export default function ProfileScreen({ navigation }) {
  const { user, logout, refreshUser } = useAuth();

  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || '');
  const [savingAvatar, setSavingAvatar] = useState(false);

  // Password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSaveAvatar = async (avatarUrl) => {
    setSelectedAvatar(avatarUrl);
    try {
      setSavingAvatar(true);
      await authService.updateProfile({ avatar: avatarUrl });
      await refreshUser();
      Alert.alert('Thành công', 'Đã cập nhật ảnh đại diện mới!');
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể cập nhật ảnh đại diện.');
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Thông báo', 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Mật khẩu yếu', 'Mật khẩu mới cần tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Không khớp', 'Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    try {
      setSavingPassword(true);
      await authService.changePassword({ currentPassword, newPassword });
      Alert.alert('Thành công', 'Đã đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.';
      Alert.alert('Đổi mật khẩu thất bại', msg);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Xác nhận đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>
                {(user?.username || 'U').charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={styles.userName}>{user?.username || 'Người dùng'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'N/A'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {user?.role === 'admin' ? 'Quản Trị Viên' : 'Học Viên Memora'}
            </Text>
          </View>
        </View>

        {/* Avatar Selection Card */}
        <Text style={styles.sectionHeader}>CHỌN ẢNH ĐẠI DIỆN MEMORA</Text>
        <View style={styles.avatarSelectionCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.avatarRow}>
            {PRESET_AVATARS.map((avUrl, idx) => {
              const isSelected = (selectedAvatar || user?.avatar) === avUrl;
              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.7}
                  style={[styles.avatarOption, isSelected && styles.avatarOptionSelected]}
                  onPress={() => handleSaveAvatar(avUrl)}
                  disabled={savingAvatar}
                >
                  <Image source={{ uri: avUrl }} style={styles.presetImg} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {savingAvatar && (
            <ActivityIndicator size="small" color="#4F46E5" style={{ marginTop: 8 }} />
          )}
        </View>

        {/* Streak & Stats */}
        <Text style={styles.sectionHeader}>THÀNH TÍCH HỌC TẬP</Text>
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <View style={styles.statLeft}>
              <Text style={styles.statIcon}>🔥</Text>
              <View>
                <Text style={styles.statTitle}>Chuỗi ngày học liên tục</Text>
                <Text style={styles.statDesc}>Mỗi ngày học ít nhất 1 thẻ</Text>
              </View>
            </View>
            <Text style={styles.statValueOrange}>{user?.streakCount || 0} ngày</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statRow}>
            <View style={styles.statLeft}>
              <Text style={styles.statIcon}>🏆</Text>
              <View>
                <Text style={styles.statTitle}>Kỷ lục chuỗi dài nhất</Text>
                <Text style={styles.statDesc}>Thành tích cá nhân cao nhất</Text>
              </View>
            </View>
            <Text style={styles.statValueBlue}>{user?.longestStreak || 0} ngày</Text>
          </View>
        </View>

        {/* Security & Password */}
        <Text style={styles.sectionHeader}>BẢO MẬT TÀI KHOẢN</Text>
        <View style={styles.securityCard}>
          {!showPasswordForm ? (
            <TouchableOpacity
              style={styles.expandPasswordBtn}
              onPress={() => setShowPasswordForm(true)}
            >
              <Text style={styles.expandPasswordText}>🔒 Đổi Mật Khẩu Tài Khoản</Text>
              <Text style={styles.expandPasswordArrow}>&rarr;</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.passwordForm}>
              <Text style={styles.passwordFormTitle}>Đổi Mật Khẩu Mới</Text>

              <TextInput
                style={styles.input}
                placeholder="Mật khẩu hiện tại"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />

              <TextInput
                style={styles.input}
                placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />

              <TextInput
                style={styles.input}
                placeholder="Xác nhận mật khẩu mới"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              <View style={styles.passwordActionsRow}>
                <TouchableOpacity
                  style={styles.cancelPasswordBtn}
                  onPress={() => setShowPasswordForm(false)}
                >
                  <Text style={styles.cancelPasswordText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.savePasswordBtn, savingPassword && { opacity: 0.6 }]}
                  disabled={savingPassword}
                  onPress={handleChangePassword}
                >
                  {savingPassword ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.savePasswordText}>Cập Nhật Mật Khẩu</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* App Info */}
        <Text style={styles.sectionHeader}>HỆ THỐNG</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phiên bản</Text>
            <Text style={styles.infoValue}>Memora Mobile v1.0.0</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Máy chủ API</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{API_BASE_URL}</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.logoutBtn}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Đăng Xuất Tài Khoản</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    padding: 18,
    paddingBottom: 40,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderBottomWidth: 5,
    borderBottomColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
  },
  userName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 10,
    fontWeight: '500',
  },
  roleBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    borderBottomWidth: 3,
    borderBottomColor: '#A5B4FC',
  },
  roleText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderBottomWidth: 5,
    borderBottomColor: '#CBD5E1',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIcon: {
    fontSize: 26,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  statDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },
  statValueOrange: {
    fontSize: 18,
    fontWeight: '900',
    color: '#EA580C',
  },
  statValueBlue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4F46E5',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 28,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderBottomWidth: 5,
    borderBottomColor: '#CBD5E1',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },
  infoValue: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '700',
    maxWidth: '65%',
  },
  logoutBtn: {
    backgroundColor: '#FFF1F2',
    borderWidth: 2,
    borderColor: '#FECDD3',
    borderBottomWidth: 4.5,
    borderBottomColor: '#FDA4AF',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: '#E11D48',
    fontSize: 16,
    fontWeight: '800',
  },
  avatarImg: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  avatarSelectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderBottomWidth: 5,
    borderBottomColor: '#CBD5E1',
  },
  avatarRow: {
    flexDirection: 'row',
  },
  avatarOption: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginRight: 10,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOptionSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
    transform: [{ scale: 1.08 }],
    borderWidth: 2.5,
  },
  presetImg: {
    width: 50,
    height: 50,
  },
  securityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderBottomWidth: 5,
    borderBottomColor: '#CBD5E1',
  },
  expandPasswordBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  expandPasswordText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  expandPasswordArrow: {
    fontSize: 16,
    color: '#64748B',
  },
  passwordForm: {
    paddingVertical: 4,
  },
  passwordFormTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
    marginBottom: 10,
  },
  passwordActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelPasswordBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelPasswordText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  savePasswordBtn: {
    flex: 1,
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 14,
    borderBottomWidth: 4,
    borderBottomColor: '#312E81',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savePasswordText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});


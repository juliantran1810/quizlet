import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminService, avatarService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Users,
  BookOpen,
  LayoutDashboard,
  Trash2,
  Shield,
  ShieldOff,
  Search,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  BookMarked,
  FileText,
  AlertTriangle,
  CheckCircle,
  X,
  Flame,
  Eye,
  Globe,
  Lock,
  RefreshCw,
  Filter,
  Sparkles,
  Layers,
  Laugh,
  Plus,
  Edit,
  Camera,
  Check,
  Image as ImageIcon,
} from 'lucide-react';

// ===== STAT CARD =====
function StatCard({ icon: Icon, label, value, color }) {
  const colorMap = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
  };
  return (
    <div className={`rounded-2xl border p-5 flex items-center gap-4 ${colorMap[color]}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
        <p className="text-2xl font-extrabold">{value?.toLocaleString() ?? '—'}</p>
      </div>
    </div>
  );
}

// ===== CONFIRM MODAL =====
function ConfirmModal({ message, onConfirm, onCancel, t }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-rose-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">{t ? t('admin.confirm_title') : 'Xác nhận'}</h3>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            {t ? t('common.cancel') : 'Hủy'}
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition"
          >
            {t ? t('admin.confirm_delete_btn') : 'Xác nhận xóa'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== TOAST =====
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold text-white transition-all ${type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
      {type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      {message}
      <button onClick={onClose}><X className="w-4 h-4 opacity-70" /></button>
    </div>
  );
}

// ===== MAIN PAGE =====
export default function AdminPage() {
  const { user } = useAuth();
  const { t, formatCategory } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [deckSearch, setDeckSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [deckPage, setDeckPage] = useState(1);
  const [userPagination, setUserPagination] = useState({});
  const [deckPagination, setDeckPagination] = useState({});
  const [userRoleFilter, setUserRoleFilter] = useState('All');
  const [deckVisibilityFilter, setDeckVisibilityFilter] = useState('All');
  const [deckCategoryFilter, setDeckCategoryFilter] = useState('All');
  const [previewDeck, setPreviewDeck] = useState(null); // xem trước chi tiết thẻ
  const [refreshing, setRefreshing] = useState(false);
  const [confirm, setConfirm] = useState(null); // { type, id, name }
  const [toast, setToast] = useState(null);

  // States cho Quản lý Avatar Studio
  const [avatars, setAvatars] = useState([]);
  const [loadingAvatars, setLoadingAvatars] = useState(false);
  const [avatarStats, setAvatarStats] = useState(null);
  const [avatarCategoryFilter, setAvatarCategoryFilter] = useState('all');
  const [avatarSearch, setAvatarSearch] = useState('');
  const [avatarModal, setAvatarModal] = useState(null); // { isOpen, mode: 'create'|'edit', form }
  const [avatarSubmitting, setAvatarSubmitting] = useState(false);

  // Chặn truy cập nếu không phải admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const showToast = (message, type = 'success') => setToast({ message, type });

  // Tải stats
  const loadStats = useCallback(async () => {
    try {
      const res = await adminService.getStats();
      setStats(res.data);
    } catch {
      showToast('Không tải được thống kê', 'error');
    }
  }, []);

  // Tải users
  const loadUsers = useCallback(async () => {
    try {
      const res = await adminService.getUsers({
        search: userSearch,
        role: userRoleFilter,
        page: userPage,
        limit: 15,
      });
      setUsers(res.data.users);
      setUserPagination(res.data.pagination);
    } catch {
      showToast('Không tải được danh sách người dùng', 'error');
    }
  }, [userSearch, userRoleFilter, userPage]);

  // Tải decks
  const loadDecks = useCallback(async () => {
    try {
      const res = await adminService.getDecks({
        search: deckSearch,
        category: deckCategoryFilter,
        visibility: deckVisibilityFilter.toLowerCase(),
        page: deckPage,
        limit: 15,
      });
      setDecks(res.data.decks);
      setDeckPagination(res.data.pagination);
    } catch {
      showToast('Không tải được danh sách bộ thẻ', 'error');
    }
  }, [deckSearch, deckCategoryFilter, deckVisibilityFilter, deckPage]);

  // Tải avatars cho Admin
  const loadAvatars = useCallback(async () => {
    try {
      setLoadingAvatars(true);
      const res = await avatarService.adminGetAll({
        category: avatarCategoryFilter,
        search: avatarSearch,
      });
      setAvatars(res.data.avatars || []);
      setAvatarStats(res.data.stats || null);
    } catch {
      showToast('Không tải được danh sách avatar', 'error');
    } finally {
      setLoadingAvatars(false);
    }
  }, [avatarCategoryFilter, avatarSearch]);

  // Làm mới dữ liệu tab hiện tại
  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'dashboard') await loadStats();
    if (activeTab === 'users') await loadUsers();
    if (activeTab === 'decks') await loadDecks();
    if (activeTab === 'avatars') await loadAvatars();
    setRefreshing(false);
    showToast('Đã làm mới dữ liệu thành công!');
  };

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadStats();
      setLoading(false);
    };
    if (user?.role === 'admin') init();
  }, [loadStats, user]);

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
  }, [activeTab, loadUsers]);

  useEffect(() => {
    if (activeTab === 'decks') loadDecks();
  }, [activeTab, loadDecks]);

  useEffect(() => {
    if (activeTab === 'avatars') loadAvatars();
  }, [activeTab, loadAvatars]);

  // Debounce search
  useEffect(() => {
    if (activeTab !== 'users') return;
    const t = setTimeout(() => { setUserPage(1); loadUsers(); }, 400);
    return () => clearTimeout(t);
  }, [userSearch]);

  useEffect(() => {
    if (activeTab !== 'decks') return;
    const t = setTimeout(() => { setDeckPage(1); loadDecks(); }, 400);
    return () => clearTimeout(t);
  }, [deckSearch]);

  useEffect(() => {
    if (activeTab !== 'avatars') return;
    const t = setTimeout(() => { loadAvatars(); }, 400);
    return () => clearTimeout(t);
  }, [avatarSearch]);

  // Actions
  const handleUpdateRole = async (userId, newRole) => {
    try {
      await adminService.updateUserRole(userId, newRole);
      const roleName = newRole === 'admin' ? 'Admin' : newRole === 'qa' ? 'QA Tester' : 'Học viên (User)';
      showToast(`Đã chuyển vai trò người dùng sang: ${roleName}`);
      loadUsers();
    } catch (e) {
      showToast(e.response?.data?.message || 'Lỗi thay đổi role', 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await adminService.deleteUser(userId);
      showToast('Đã xóa người dùng thành công');
      loadUsers();
      loadStats();
    } catch (e) {
      showToast(e.response?.data?.message || 'Lỗi xóa người dùng', 'error');
    }
    setConfirm(null);
  };

  const handleToggleDeckVisibility = async (deckId, currentIsPublic) => {
    try {
      await adminService.toggleDeckVisibility(deckId, !currentIsPublic);
      showToast(`Đã chuyển bộ thẻ sang ${!currentIsPublic ? 'Công khai' : 'Riêng tư'}`);
      loadDecks();
      loadStats();
    } catch (e) {
      showToast(e.response?.data?.message || 'Lỗi thay đổi trạng thái bộ thẻ', 'error');
    }
  };

  const handleDeleteDeck = async (deckId) => {
    try {
      await adminService.deleteDeck(deckId);
      showToast('Đã xóa bộ thẻ thành công');
      loadDecks();
      loadStats();
    } catch (e) {
      showToast(e.response?.data?.message || 'Lỗi xóa bộ thẻ', 'error');
    }
    setConfirm(null);
  };

  // Avatar Handlers
  const handleToggleAvatarActive = async (avatarId, currentActive) => {
    try {
      await avatarService.adminUpdate(avatarId, { isActive: !currentActive });
      showToast(`Đã ${!currentActive ? 'kích hoạt' : 'ẩn'} avatar thành công!`);
      loadAvatars();
    } catch (e) {
      showToast(e.response?.data?.message || 'Lỗi cập nhật trạng thái avatar', 'error');
    }
  };

  const handleDeleteAvatar = async (avatarId) => {
    try {
      await avatarService.adminDelete(avatarId);
      showToast('Đã xóa avatar khỏi hệ thống thành công');
      loadAvatars();
    } catch (e) {
      showToast(e.response?.data?.message || 'Lỗi xóa avatar', 'error');
    }
    setConfirm(null);
  };

  const handleSeedDefaultAvatars = async () => {
    try {
      await avatarService.adminSeedDefaults('append');
      showToast('Đã nạp bộ sưu tập avatar và meme mẫu mặc định thành công!');
      loadAvatars();
    } catch (e) {
      showToast(e.response?.data?.message || 'Lỗi nạp avatar mặc định', 'error');
    }
    setConfirm(null);
  };

  const handleSaveAvatar = async (e) => {
    e.preventDefault();
    if (!avatarModal?.form?.name?.trim() || !avatarModal?.form?.url?.trim()) {
      showToast('Vui lòng điền tên và đường dẫn ảnh', 'error');
      return;
    }
    setAvatarSubmitting(true);
    try {
      if (avatarModal.mode === 'create') {
        await avatarService.adminCreate(avatarModal.form);
        showToast('Đã thêm avatar mới thành công!');
      } else {
        await avatarService.adminUpdate(avatarModal.form._id, avatarModal.form);
        showToast('Đã cập nhật avatar thành công!');
      }
      setAvatarModal(null);
      loadAvatars();
    } catch (e) {
      showToast(e.response?.data?.message || 'Lỗi lưu avatar', 'error');
    } finally {
      setAvatarSubmitting(false);
    }
  };

  // Nén ảnh tải lên từ máy tính cho Avatar
  const handleAvatarFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const minDim = Math.min(img.width, img.height);
        const startX = (img.width - minDim) / 2;
        const startY = (img.height - minDim) / 2;
        canvas.width = 240;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, 240, 240);
        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        setAvatarModal((prev) => ({
          ...prev,
          form: { ...prev.form, url: compressed },
        }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || user.role !== 'admin') return null;

  const tabs = [
    { id: 'dashboard', label: t('admin.tab_dashboard'), icon: LayoutDashboard },
    { id: 'users', label: t('admin.tab_users'), icon: Users },
    { id: 'decks', label: t('admin.tab_decks'), icon: BookOpen },
    { id: 'avatars', label: t('admin.tab_avatars'), icon: Laugh },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-100">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">{t('admin.title')}</h1>
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-extrabold text-[11px] uppercase tracking-wider">
                Control Hub
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{t('admin.subtitle')}</p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? t('admin.refreshing') : t('admin.refresh')}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl mb-8 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeTab === id
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ===== DASHBOARD ===== */}
      {activeTab === 'dashboard' && stats && (
        <div className="space-y-8">
          {/* Stats grid (6 Thẻ KPI phong cách hiện đại) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <StatCard icon={Users} label={t('admin.total_users')} value={stats.stats?.totalUsers} color="indigo" />
            <StatCard icon={Flame} label={t('admin.streak_active')} value={stats.stats?.activeStreaks} color="rose" />
            <StatCard icon={BookOpen} label={t('admin.total_decks')} value={stats.stats?.totalDecks} color="emerald" />
            <StatCard icon={Globe} label={t('admin.public_decks')} value={stats.stats?.publicDecks} color="indigo" />
            <StatCard icon={Lock} label={t('admin.private_decks')} value={stats.stats?.privateDecks} color="amber" />
            <StatCard icon={FileText} label={t('admin.total_cards')} value={stats.stats?.totalCards} color="amber" />
          </div>

          {/* Phân bổ theo chuyên mục & Bảng vàng Streak */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Phân bổ Chủ đề / Categories */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5">
              <h2 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" /> {t('admin.category_distribution')}
              </h2>
              <div className="space-y-3">
                {stats.categoryStats?.map((c) => {
                  const pct = stats.stats?.totalDecks > 0 ? Math.round((c.count / stats.stats.totalDecks) * 100) : 0;
                  return (
                    <div key={c._id || 'Khác'} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-600">
                        <span>{formatCategory(c._id)}</span>
                        <span className="text-slate-400">{c.count} {t('deck.cards_count')} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bảng vàng Streak (Top Streakers) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5">
              <h2 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500" /> {t('admin.top_streakers')}
              </h2>
              <div className="space-y-3">
                {stats.topStreakers?.length > 0 ? (
                  stats.topStreakers.map((u, i) => (
                    <div key={u._id} className="flex items-center justify-between p-2 rounded-xl bg-orange-50/50 border border-orange-100">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 text-center font-black text-xs text-orange-600">#{i + 1}</span>
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-orange-200 shrink-0 flex items-center justify-center font-bold text-xs text-slate-600">
                          {u.avatar ? <img src={u.avatar} alt={u.username} className="w-full h-full object-cover" /> : u.username.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-slate-700 truncate">{u.username}</span>
                      </div>
                      <div className="flex items-center gap-1 font-black text-xs text-orange-600 bg-white px-2 py-0.5 rounded-md border border-orange-200">
                        <Flame className="w-3.5 h-3.5 fill-orange-500" />
                        <span>{u.streakCount}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">{t('admin.no_streakers')}</p>
                )}
              </div>
            </div>

            {/* Tóm tắt hiệu suất hệ thống */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Hiệu suất học tập
                </span>
                <h3 className="text-xl font-black mt-2">Memora Platform</h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Trung bình mỗi bộ thẻ chứa <strong>{stats.stats?.avgCardsPerDeck || 0} thẻ thuật ngữ</strong>. Hệ thống hiện ghi nhận <strong>{stats.stats?.totalProgress || 0} lượt hoàn thành bài học</strong> từ cộng đồng.
                </p>
              </div>

              <div className="pt-6 border-t border-slate-700/60 mt-6 grid grid-cols-2 gap-3 text-center">
                <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs">
                  <span className="text-lg font-black text-indigo-200">{stats.stats?.publicDecks || 0}</span>
                  <p className="text-[10px] text-slate-300">Bộ thẻ công khai</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs">
                  <span className="text-lg font-black text-amber-200">{stats.stats?.privateDecks || 0}</span>
                  <p className="text-[10px] text-slate-300">Bộ thẻ riêng tư</p>
                </div>
              </div>
            </div>
          </div>

          {/* Hai cột danh sách mới nhất */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top decks */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5">
              <h2 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-indigo-500" /> Bộ thẻ mới tạo gần đây
              </h2>
              <div className="space-y-3">
                {stats.topDecks?.map((deck) => (
                  <div key={deck._id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">
                        {deck.cards?.length || 0} thẻ
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/decks/${deck._id}`}
                          className="text-xs font-bold text-slate-800 hover:text-indigo-600 truncate block"
                        >
                          {deck.title}
                        </Link>
                        <p className="text-[11px] text-slate-400 truncate">
                          {deck.author?.username || 'Ẩn danh'} · {deck.category}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${deck.isPublic ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                      {deck.isPublic ? 'Công khai' : 'Riêng tư'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent users */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5">
              <h2 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" /> Thành viên đăng ký mới
              </h2>
              <div className="space-y-3">
                {stats.recentUsers?.map((u) => (
                  <div key={u._id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition">
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                      {u.avatar ? <img src={u.avatar} alt={u.username} className="w-full h-full object-cover" /> : u.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{u.username}</p>
                      <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                      {u.role.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== USERS ===== */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          {/* Search & Filter Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder={t('admin.search_users_placeholder')}
                className="w-full text-xs outline-none bg-transparent text-slate-700 placeholder:text-slate-400"
              />
              {userSearch && (
                <button onClick={() => setUserSearch('')}>
                  <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700" />
                </button>
              )}
            </div>

            {/* Filter by Role */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> {t('admin.col_role')}:
              </span>
              {['All', 'user', 'admin'].map((role) => (
                <button
                  key={role}
                  onClick={() => { setUserRoleFilter(role); setUserPage(1); }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    userRoleFilter === role
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {role === 'All' ? t('admin.role_all') : role === 'admin' ? t('admin.role_admin') : t('admin.role_user')}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="text-left px-5 py-3">{t('admin.col_user')}</th>
                  <th className="text-left px-5 py-3">{t('admin.col_email')}</th>
                  <th className="text-left px-5 py-3">{t('admin.col_streak')}</th>
                  <th className="text-left px-5 py-3">{t('admin.col_deck')}</th>
                  <th className="text-left px-5 py-3">{t('admin.col_role')}</th>
                  <th className="text-left px-5 py-3">{t('admin.col_joined')}</th>
                  <th className="text-right px-5 py-3">{t('admin.col_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-xs font-bold text-slate-600 shrink-0 shadow-2xs">
                          {u.avatar ? (
                            <img src={u.avatar} alt={u.username} className="w-full h-full object-cover" />
                          ) : (
                            u.username.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800">{u.username}</span>
                            {u._id === user._id && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 font-extrabold">
                                Bạn
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 font-medium">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 text-xs font-bold text-orange-600">
                        <Flame className={`w-3.5 h-3.5 ${(u.streakCount || 0) > 0 ? 'fill-orange-500 text-orange-500' : 'text-slate-300'}`} />
                        <span>{u.streakCount || 0} ngày</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                        {u.deckCount || 0} bộ
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {u._id === user._id ? (
                        <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                          🛡️ Admin
                        </span>
                      ) : (
                        <select
                          value={u.role || 'user'}
                          onChange={(e) => handleUpdateRole(u._id, e.target.value)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-xl border outline-none cursor-pointer transition ${
                            u.role === 'admin'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : u.role === 'qa'
                              ? 'bg-rose-50 text-rose-700 border-rose-200 font-extrabold'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          <option value="user">Học viên (User)</option>
                          <option value="qa">🐞 QA Tester</option>
                          <option value="admin">🛡️ Admin</option>
                        </select>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        {u._id !== user._id && (
                          <button
                            onClick={() => setConfirm({ type: 'user', id: u._id, name: u.username })}
                            title="Xóa người dùng"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {userPagination.pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm">
              <span className="text-slate-400">
                Hiển thị {users.length}/{userPagination.total} người dùng
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={userPage <= 1}
                  onClick={() => setUserPage((p) => p - 1)}
                  className="p-1 rounded disabled:opacity-30 hover:bg-slate-100"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-slate-700">
                  {userPage}/{userPagination.pages}
                </span>
                <button
                  disabled={userPage >= userPagination.pages}
                  onClick={() => setUserPage((p) => p + 1)}
                  className="p-1 rounded disabled:opacity-30 hover:bg-slate-100"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== DECKS ===== */}
      {activeTab === 'decks' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          {/* Search & Filter Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={deckSearch}
                onChange={(e) => setDeckSearch(e.target.value)}
                placeholder={t('admin.search_decks_placeholder')}
                className="w-full text-xs outline-none bg-transparent text-slate-700 placeholder:text-slate-400"
              />
              {deckSearch && (
                <button onClick={() => setDeckSearch('')}>
                  <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700" />
                </button>
              )}
            </div>

            {/* Filter by Category & Visibility */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Category Select */}
              <select
                value={deckCategoryFilter}
                onChange={(e) => { setDeckCategoryFilter(e.target.value); setDeckPage(1); }}
                className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 outline-none"
              >
                <option value="All">{t('home.all_categories')}</option>
                {['Tiếng Trung', 'Tiếng Anh', 'Công nghệ', 'Khoa học', 'Lịch sử', 'Y Dược', 'General'].map((c) => (
                  <option key={c} value={c}>{formatCategory(c)}</option>
                ))}
              </select>

              {/* Visibility Filter */}
              <div className="flex items-center gap-1">
                {['All', 'public', 'private'].map((vis) => (
                  <button
                    key={vis}
                    onClick={() => { setDeckVisibilityFilter(vis); setDeckPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      deckVisibilityFilter === vis
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {vis === 'All' ? t('home.all_scope') : vis === 'public' ? t('deck.public') : t('deck.private')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="text-left px-5 py-3">{t('admin.col_deck')}</th>
                  <th className="text-left px-5 py-3">{t('admin.col_category')}</th>
                  <th className="text-left px-5 py-3">{t('admin.col_author')}</th>
                  <th className="text-left px-5 py-3">{t('admin.col_cards')}</th>
                  <th className="text-left px-5 py-3">{t('admin.col_visibility')}</th>
                  <th className="text-left px-5 py-3">{t('admin.col_joined')}</th>
                  <th className="text-right px-5 py-3">{t('admin.col_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {decks.map((deck) => (
                  <tr key={deck._id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5">
                      <div>
                        <Link
                          to={`/decks/${deck._id}`}
                          className="font-bold text-slate-800 hover:text-indigo-600 truncate max-w-[220px] block"
                        >
                          {deck.title}
                        </Link>
                        {deck.description && (
                          <p className="text-[11px] text-slate-400 truncate max-w-[220px] mt-0.5">
                            {deck.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-semibold">
                        {deck.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 border border-slate-200 shrink-0">
                          {deck.author?.avatar ? (
                            <img src={deck.author.avatar} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            deck.author?.username?.slice(0, 1).toUpperCase() || 'U'
                          )}
                        </div>
                        <span className="text-xs font-semibold text-slate-600 truncate max-w-[100px]">
                          {deck.author?.username || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                        {deck.cards?.length || 0} thẻ
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleToggleDeckVisibility(deck._id, deck.isPublic)}
                        title="Bấm để đổi trạng thái Công khai / Riêng tư"
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition hover:opacity-80 ${
                          deck.isPublic
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {deck.isPublic ? <Globe className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3 text-amber-600" />}
                        <span>{deck.isPublic ? 'Công khai' : 'Riêng tư'}</span>
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs">
                      {new Date(deck.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewDeck(deck)}
                          title="Xem nhanh nội dung thẻ"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirm({ type: 'deck', id: deck._id, name: deck.title })}
                          title="Xóa vĩnh viễn bộ thẻ"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {deckPagination.pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm">
              <span className="text-slate-400">
                Hiển thị {decks.length}/{deckPagination.total} bộ thẻ
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={deckPage <= 1}
                  onClick={() => setDeckPage((p) => p - 1)}
                  className="p-1 rounded disabled:opacity-30 hover:bg-slate-100"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-slate-700">
                  {deckPage}/{deckPagination.pages}
                </span>
                <button
                  disabled={deckPage >= deckPagination.pages}
                  onClick={() => setDeckPage((p) => p + 1)}
                  className="p-1 rounded disabled:opacity-30 hover:bg-slate-100"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== QUẢN LÝ AVATAR & MEMES STUDIO ===== */}
      {activeTab === 'avatars' && (
        <div className="space-y-6">
          {/* Header & Thống kê nhanh */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">{t('admin.total_avatars')}</span>
              <span className="text-2xl font-black text-slate-800 mt-1 block">{avatarStats?.total ?? avatars.length}</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-emerald-100 bg-emerald-50/30 shadow-2xs">
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">{t('admin.active_avatars')}</span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">{avatarStats?.activeCount ?? avatars.filter(a => a.isActive).length}</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-amber-100 bg-amber-50/30 shadow-2xs">
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider block">{t('admin.inactive_avatars')}</span>
              <span className="text-2xl font-black text-amber-700 mt-1 block">{avatarStats?.inactiveCount ?? avatars.filter(a => !a.isActive).length}</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-indigo-100 bg-indigo-50/30 shadow-2xs">
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block">Danh mục / Thể loại</span>
              <span className="text-2xl font-black text-indigo-700 mt-1 block">{avatarStats?.categoryStats?.length || 5}</span>
            </div>
          </div>

          {/* Thanh công cụ tìm kiếm và hành động */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            {/* Lọc theo Category */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'characters', label: 'Nhân vật & Anime' },
                { id: 'robots', label: 'Robot' },
                { id: 'emoji', label: 'Emoji' },
                { id: 'intellectual', label: 'Tri thức' },
                { id: 'memes', label: '🔥 Meme Bất Hủ' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setAvatarCategoryFilter(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap border ${
                    avatarCategoryFilter === c.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Tìm kiếm & Nút hành động */}
            <div className="flex items-center gap-2.5">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={avatarSearch}
                  onChange={(e) => setAvatarSearch(e.target.value)}
                  placeholder="Tìm theo tên avatar, meme..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  setAvatarModal({
                    isOpen: true,
                    mode: 'create',
                    form: {
                      name: '',
                      category: avatarCategoryFilter !== 'all' ? avatarCategoryFilter : 'characters',
                      url: '',
                      isActive: true,
                      order: 0,
                    },
                  })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs hover:scale-105 active:scale-95 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('admin.add_avatar_btn')}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setConfirm({
                    type: 'seed_avatars',
                    name: 'Nạp bộ sưu tập avatar và meme mẫu mặc định',
                  })
                }
                title="Khôi phục hoặc nạp thêm 57+ avatar & meme kinh điển vào hệ thống"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">{t('admin.seed_avatars_btn')}</span>
              </button>
            </div>
          </div>

          {/* Lưới hiển thị danh sách Avatar */}
          {loadingAvatars ? (
            <div className="py-16 text-center">
              <LoadingSpinner message="Đang tải danh sách avatar..." />
            </div>
          ) : avatars.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <Laugh className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800">Chưa có avatar nào phù hợp</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Hiện chưa có avatar nào trong danh mục này hoặc chưa nạp dữ liệu vào hệ thống.
              </p>
              <button
                onClick={handleSeedDefaultAvatars}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                <span>Nạp 57+ Avatar & Meme Mẫu Ngay</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {avatars.map((item) => (
                <div
                  key={item._id}
                  className={`p-3.5 rounded-2xl bg-white border transition-all hover:shadow-md flex flex-col justify-between ${
                    item.isActive ? 'border-slate-200' : 'border-slate-200/60 opacity-60 bg-slate-50/50'
                  }`}
                >
                  <div>
                    {/* Ảnh Preview */}
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 mb-2.5">
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {/* Badge Category */}
                      <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-slate-900/70 text-white backdrop-blur-xs">
                        {item.category}
                      </span>
                      {/* Trạng thái Bật / Tắt */}
                      <span
                        className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                          item.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                        title={item.isActive ? 'Đang hiển thị' : 'Đang ẩn'}
                      />
                    </div>

                    {/* Tên avatar */}
                    <h4 className="text-xs font-bold text-slate-800 truncate" title={item.name}>
                      {item.name}
                    </h4>
                  </div>

                  {/* Thanh nút hành động */}
                  <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                    {/* Nút Toggle On/Off */}
                    <button
                      type="button"
                      onClick={() => handleToggleAvatarActive(item._id, item.isActive)}
                      className={`text-[11px] font-bold px-2 py-1 rounded-lg transition ${
                        item.isActive
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                      title="Bấm để Bật/Tắt hiển thị cho học viên"
                    >
                      {item.isActive ? 'Hiện' : 'Ẩn'}
                    </button>

                    <div className="flex items-center gap-1">
                      {/* Nút Sửa */}
                      <button
                        type="button"
                        onClick={() =>
                          setAvatarModal({
                            isOpen: true,
                            mode: 'edit',
                            form: { ...item },
                          })
                        }
                        className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        title="Chỉnh sửa thông tin avatar"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {/* Nút Xóa */}
                      <button
                        type="button"
                        onClick={() =>
                          setConfirm({
                            type: 'avatar',
                            id: item._id,
                            name: item.name,
                          })
                        }
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Xóa avatar này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview Deck Modal */}
      {previewDeck && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setPreviewDeck(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                    {previewDeck.category || 'Chung'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${previewDeck.isPublic ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {previewDeck.isPublic ? 'Công khai' : 'Riêng tư'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {previewDeck.cards?.length || 0} thẻ
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-800">{previewDeck.title}</h3>
                {previewDeck.description && (
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">{previewDeck.description}</p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  Tạo bởi: <span className="font-semibold text-slate-600">{previewDeck.owner?.username || 'Ẩn danh'}</span> ({previewDeck.owner?.email || 'N/A'})
                </p>
              </div>
              <button
                onClick={() => setPreviewDeck(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-2.5 pr-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Danh sách thẻ từ vựng</p>
              {(!previewDeck.cards || previewDeck.cards.length === 0) ? (
                <div className="py-8 text-center text-sm text-slate-400">Bộ thẻ chưa có thẻ nào.</div>
              ) : (
                previewDeck.cards.map((c, idx) => (
                  <div key={c._id || idx} className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-100 flex items-start gap-4 transition">
                    <span className="text-xs font-bold text-slate-400 w-5 text-right pt-0.5">{idx + 1}</span>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <div className="font-bold text-slate-800 text-base">{c.term}</div>
                        {c.pinyin && <div className="text-xs text-indigo-600 font-medium">{c.pinyin}</div>}
                      </div>
                      <div>
                        <div className="text-sm text-slate-700 font-medium">{c.definition}</div>
                        {c.example && <div className="text-xs text-slate-400 italic mt-0.5">{c.example}</div>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <Link
                to={`/decks/${previewDeck._id}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1"
              >
                Mở trang chi tiết bộ thẻ &rarr;
              </Link>
              <button
                onClick={() => setPreviewDeck(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Modal (Thêm mới / Chỉnh sửa) */}
      {avatarModal?.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget && !avatarSubmitting) setAvatarModal(null); }}
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Laugh className="w-5 h-5 text-indigo-600" />
                <span>{avatarModal.mode === 'create' ? t('admin.add_avatar_btn') : 'Chỉnh sửa Avatar'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setAvatarModal(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAvatar} className="mt-4 space-y-4">
              {/* Preview ảnh hiện tại */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white border border-slate-200 shrink-0 shadow-xs flex items-center justify-center">
                  {avatarModal.form.url ? (
                    <img src={avatarModal.form.url} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-slate-700 block truncate">
                    {avatarModal.form.name || 'Tên avatar...'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold block capitalize">
                    {avatarModal.form.category}
                  </span>
                  <label
                    htmlFor="admin-avatar-upload"
                    className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold cursor-pointer transition"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Tải ảnh từ máy</span>
                    <input
                      id="admin-avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Tên avatar */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('admin.avatar_name')} *
                </label>
                <input
                  type="text"
                  required
                  value={avatarModal.form.name || ''}
                  onChange={(e) =>
                    setAvatarModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, name: e.target.value },
                    }))
                  }
                  placeholder="VD: Doge, Luna, Gigachad..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              {/* Danh mục */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('admin.avatar_category')} *
                </label>
                <select
                  value={avatarModal.form.category || 'characters'}
                  onChange={(e) =>
                    setAvatarModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, category: e.target.value },
                    }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
                >
                  <option value="characters">Nhân vật & Anime (characters)</option>
                  <option value="robots">Robot & Tương lai (robots)</option>
                  <option value="emoji">Emoji & Vui vẻ (emoji)</option>
                  <option value="intellectual">Tri thức & Nghệ thuật (intellectual)</option>
                  <option value="memes">🔥 Meme Bất Hủ (memes)</option>
                </select>
              </div>

              {/* Đường dẫn URL ảnh */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('admin.avatar_url')} *
                </label>
                <input
                  type="text"
                  required
                  value={avatarModal.form.url || ''}
                  onChange={(e) =>
                    setAvatarModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, url: e.target.value },
                    }))
                  }
                  placeholder="https://... hoặc data:image/jpeg;base64,..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              {/* Trạng thái Kích hoạt */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Kích hoạt hiển thị</span>
                  <span className="text-[11px] text-slate-400">Cho phép học viên nhìn thấy và chọn avatar này</span>
                </div>
                <input
                  type="checkbox"
                  checked={avatarModal.form.isActive}
                  onChange={(e) =>
                    setAvatarModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, isActive: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {/* Nút hành động */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAvatarModal(null)}
                  disabled={avatarSubmitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={avatarSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {avatarSubmitting ? (
                    <span>Đang lưu...</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{avatarModal.mode === 'create' ? 'Tạo mới' : 'Lưu thay đổi'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirm && (
        <ConfirmModal
          t={t}
          message={
            confirm.type === 'user'
              ? `${t('admin.confirm_delete_user')} "${confirm.name}"`
              : confirm.type === 'deck'
              ? `${t('admin.confirm_delete_deck')} "${confirm.name}"`
              : confirm.type === 'avatar'
              ? `${t('admin.confirm_delete_avatar')} "${confirm.name}"`
              : t('admin.confirm_seed_avatar')
          }
          onConfirm={() => {
            if (confirm.type === 'user') handleDeleteUser(confirm.id);
            else if (confirm.type === 'deck') handleDeleteDeck(confirm.id);
            else if (confirm.type === 'avatar') handleDeleteAvatar(confirm.id);
            else if (confirm.type === 'seed_avatars') handleSeedDefaultAvatars();
          }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}


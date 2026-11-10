import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminService } from '../services/api';
import { useAuth } from '../context/AuthContext';
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
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  X,
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
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-rose-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Xác nhận</h3>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition"
          >
            Xác nhận xóa
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
  const [confirm, setConfirm] = useState(null); // { type, id, name }
  const [toast, setToast] = useState(null);

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
      const res = await adminService.getUsers({ search: userSearch, page: userPage, limit: 15 });
      setUsers(res.data.users);
      setUserPagination(res.data.pagination);
    } catch {
      showToast('Không tải được danh sách người dùng', 'error');
    }
  }, [userSearch, userPage]);

  // Tải decks
  const loadDecks = useCallback(async () => {
    try {
      const res = await adminService.getDecks({ search: deckSearch, page: deckPage, limit: 15 });
      setDecks(res.data.decks);
      setDeckPagination(res.data.pagination);
    } catch {
      showToast('Không tải được danh sách bộ thẻ', 'error');
    }
  }, [deckSearch, deckPage]);

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

  // Actions
  const handleUpdateRole = async (userId, newRole) => {
    try {
      await adminService.updateUserRole(userId, newRole);
      showToast(`Đã ${newRole === 'admin' ? 'cấp' : 'thu hồi'} quyền Admin`);
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

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || user.role !== 'admin') return null;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Người dùng', icon: Users },
    { id: 'decks', label: 'Bộ thẻ', icon: BookOpen },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-200">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Admin Workbench</h1>
          <p className="text-sm text-slate-400">Quản lý toàn bộ hệ sinh thái Memora</p>
        </div>
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
          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Người dùng" value={stats.stats?.totalUsers} color="indigo" />
            <StatCard icon={BookOpen} label="Bộ thẻ" value={stats.stats?.totalDecks} color="emerald" />
            <StatCard icon={FileText} label="Thẻ từ vựng" value={stats.stats?.totalCards} color="amber" />
            <StatCard icon={TrendingUp} label="Phiên học" value={stats.stats?.totalProgress} color="rose" />
          </div>

          {/* Two-column content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top decks */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="text-base font-bold text-slate-700 mb-4 flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-indigo-500" /> Bộ thẻ mới nhất
              </h2>
              <div className="space-y-3">
                {stats.topDecks?.map((deck) => (
                  <div key={deck._id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-sm font-bold flex-shrink-0">
                      {deck.cards?.length || 0}
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/decks/${deck._id}`}
                        className="text-sm font-semibold text-slate-700 hover:text-indigo-600 truncate block"
                      >
                        {deck.title}
                      </Link>
                      <p className="text-xs text-slate-400 truncate">
                        {deck.author?.username} · {deck.category}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent users */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="text-base font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" /> Người dùng mới nhất
              </h2>
              <div className="space-y-3">
                {stats.recentUsers?.map((u) => (
                  <div key={u._id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                      {u.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-700 truncate">{u.username}</p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
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
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          {/* Search */}
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Tìm theo username hoặc email..."
              className="flex-1 text-sm outline-none text-slate-700 placeholder:text-slate-400"
            />
            {userSearch && (
              <button onClick={() => setUserSearch('')}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Người dùng</th>
                  <th className="text-left px-5 py-3">Email</th>
                  <th className="text-left px-5 py-3">Role</th>
                  <th className="text-left px-5 py-3">Ngày tạo</th>
                  <th className="text-right px-5 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/50 transition">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                          {u.username.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-700">{u.username}</span>
                        {u._id === user._id && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold">Tôi</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {u._id !== user._id && (
                          <>
                            <button
                              onClick={() => handleUpdateRole(u._id, u.role === 'admin' ? 'user' : 'admin')}
                              title={u.role === 'admin' ? 'Thu hồi Admin' : 'Cấp Admin'}
                              className={`p-1.5 rounded-lg transition ${u.role === 'admin' ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'}`}
                            >
                              {u.role === 'admin' ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => setConfirm({ type: 'user', id: u._id, name: u.username })}
                              title="Xóa người dùng"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
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
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          {/* Search */}
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={deckSearch}
              onChange={(e) => setDeckSearch(e.target.value)}
              placeholder="Tìm theo tiêu đề bộ thẻ..."
              className="flex-1 text-sm outline-none text-slate-700 placeholder:text-slate-400"
            />
            {deckSearch && (
              <button onClick={() => setDeckSearch('')}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Tiêu đề</th>
                  <th className="text-left px-5 py-3">Chủ đề</th>
                  <th className="text-left px-5 py-3">Tác giả</th>
                  <th className="text-left px-5 py-3">Thẻ</th>
                  <th className="text-left px-5 py-3">Ngày tạo</th>
                  <th className="text-right px-5 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {decks.map((deck) => (
                  <tr key={deck._id} className="hover:bg-slate-50/50 transition">
                    <td className="px-5 py-3">
                      <Link
                        to={`/decks/${deck._id}`}
                        className="font-semibold text-slate-700 hover:text-indigo-600 truncate max-w-[200px] block"
                      >
                        {deck.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-medium">
                        {deck.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{deck.author?.username || '—'}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {deck.cards?.length || 0} thẻ
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">
                      {new Date(deck.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setConfirm({ type: 'deck', id: deck._id, name: deck.title })}
                          title="Xóa bộ thẻ"
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

      {/* Confirm Modal */}
      {confirm && (
        <ConfirmModal
          message={
            confirm.type === 'user'
              ? `Xóa người dùng "${confirm.name}"? Toàn bộ bộ thẻ và dữ liệu học của người này cũng sẽ bị xóa.`
              : `Xóa bộ thẻ "${confirm.name}"? Thao tác này không thể hoàn tác.`
          }
          onConfirm={() =>
            confirm.type === 'user'
              ? handleDeleteUser(confirm.id)
              : handleDeleteDeck(confirm.id)
          }
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


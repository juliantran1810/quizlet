import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { deckService, authService } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  User,
  Mail,
  Shield,
  Calendar,
  Layers,
  Lock,
  Globe,
  Plus,
  Search,
  Edit,
  Trash2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  BrainCircuit,
  Gamepad2,
  RotateCcw,
} from 'lucide-react';

export default function ManageAccountPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('decks'); // 'decks' | 'settings'
  const [decks, setDecks] = useState([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [searchDeck, setSearchDeck] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('all'); // 'all' | 'public' | 'private'

  // Form states cho Settings
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  // Form states cho Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
      loadMyDecks();
    }
  }, [user]);

  const loadMyDecks = async () => {
    try {
      setLoadingDecks(true);
      const res = await deckService.getMyDecks();
      setDecks(res.data.decks || []);
    } catch (err) {
      console.error('Lỗi tải bộ thẻ của tôi:', err);
    } finally {
      setLoadingDecks(false);
    }
  };

  const handleToggleVisibility = async (deckId, currentIsPublic) => {
    try {
      const res = await deckService.toggleVisibility(deckId, !currentIsPublic);
      const newStatus = res.data.isPublic;
      setDecks((prev) =>
        prev.map((d) => (d._id === deckId ? { ...d, isPublic: newStatus } : d))
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể thay đổi trạng thái riêng tư');
    }
  };

  const handleDeleteDeck = async (deckId, title) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn bộ thẻ "${title}"?`)) {
      return;
    }
    try {
      await deckService.delete(deckId);
      setDecks((prev) => prev.filter((d) => d._id !== deckId));
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể xóa bộ thẻ');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });
    if (!username.trim() || !email.trim()) {
      setProfileMsg({ type: 'error', text: 'Tên người dùng và email không được để trống' });
      return;
    }
    setProfileSaving(true);
    try {
      const res = await authService.updateProfile({ username, email });
      updateUser(res.data.user);
      setProfileMsg({ type: 'success', text: 'Cập nhật thông tin tài khoản thành công!' });
    } catch (err) {
      setProfileMsg({
        type: 'error',
        text: err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật thông tin',
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (!currentPassword || !newPassword) {
      setPasswordMsg({ type: 'error', text: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu mới phải có tối thiểu 6 ký tự' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp' });
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await authService.changePassword({ currentPassword, newPassword });
      setPasswordMsg({ type: 'success', text: res.message || 'Đổi mật khẩu thành công!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMsg({
        type: 'error',
        text: err.response?.data?.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại',
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  // Lọc bộ thẻ theo search và trạng thái
  const filteredDecks = decks.filter((deck) => {
    const matchSearch =
      deck.title.toLowerCase().includes(searchDeck.toLowerCase()) ||
      (deck.description && deck.description.toLowerCase().includes(searchDeck.toLowerCase())) ||
      (deck.category && deck.category.toLowerCase().includes(searchDeck.toLowerCase()));

    if (!matchSearch) return false;
    if (visibilityFilter === 'public') return deck.isPublic;
    if (visibilityFilter === 'private') return !deck.isPublic;
    return true;
  });

  const totalCards = decks.reduce((acc, d) => acc + (d.cards?.length || 0), 0);
  const publicCount = decks.filter((d) => d.isPublic).length;
  const privateCount = decks.filter((d) => !d.isPublic).length;
  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Gần đây';

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* User Summary Header */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                {user?.username?.slice(0, 2).toUpperCase() || 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                    {user?.username}
                  </h1>
                  {user?.role === 'admin' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                      <Shield className="w-3 h-3" /> Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {user?.email}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Tham gia từ: {joinedDate}
                </p>
              </div>
            </div>

            {/* Quick Stats Badges */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-4 py-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-center min-w-[90px]">
                <div className="text-xl font-black text-indigo-700">{decks.length}</div>
                <div className="text-[11px] font-semibold text-indigo-600">Bộ thẻ</div>
              </div>
              <div className="px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-center min-w-[90px]">
                <div className="text-xl font-black text-emerald-700">{publicCount}</div>
                <div className="text-[11px] font-semibold text-emerald-600">🌍 Công khai</div>
              </div>
              <div className="px-4 py-3 rounded-2xl bg-amber-50 border border-amber-100 text-center min-w-[90px]">
                <div className="text-xl font-black text-amber-700">{privateCount}</div>
                <div className="text-[11px] font-semibold text-amber-600">🔒 Riêng tư</div>
              </div>
              <div className="px-4 py-3 rounded-2xl bg-slate-100 border border-slate-200 text-center min-w-[90px]">
                <div className="text-xl font-black text-slate-700">{totalCards}</div>
                <div className="text-[11px] font-semibold text-slate-600">Tổng số thẻ</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('decks')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition ${
              activeTab === 'decks'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            Bộ thẻ của tôi ({decks.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            Cài đặt & Bảo mật
          </button>
        </div>

        {/* TAB 1: BỘ THẺ CỦA TÔI */}
        {activeTab === 'decks' && (
          <div className="space-y-6">
            {/* Toolbar: Search + Filter + Add Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-1 max-w-md bg-white border border-slate-200 rounded-2xl px-3 py-1.5 shadow-xs">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm trong bộ thẻ của bạn..."
                  value={searchDeck}
                  onChange={(e) => setSearchDeck(e.target.value)}
                  className="w-full text-xs sm:text-sm focus:outline-none text-slate-800"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1 text-xs font-semibold text-slate-600">
                  <button
                    onClick={() => setVisibilityFilter('all')}
                    className={`px-3 py-1.5 rounded-xl transition ${
                      visibilityFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    Tất cả ({decks.length})
                  </button>
                  <button
                    onClick={() => setVisibilityFilter('public')}
                    className={`px-3 py-1.5 rounded-xl transition ${
                      visibilityFilter === 'public'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    🌍 Công khai ({publicCount})
                  </button>
                  <button
                    onClick={() => setVisibilityFilter('private')}
                    className={`px-3 py-1.5 rounded-xl transition ${
                      visibilityFilter === 'private'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    🔒 Riêng tư ({privateCount})
                  </button>
                </div>

                <Link
                  to="/create"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-sm transition active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo bộ mới</span>
                </Link>
              </div>
            </div>

            {/* Deck List Grid */}
            {loadingDecks ? (
              <LoadingSpinner message="Đang nạp các bộ thẻ của bạn..." />
            ) : filteredDecks.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
                <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700">Chưa tìm thấy bộ thẻ nào</h3>
                <p className="text-xs text-slate-400 mt-1 mb-6">
                  {searchDeck
                    ? 'Không có bộ thẻ nào khớp với từ khóa tìm kiếm.'
                    : 'Hãy tạo bộ thẻ đầu tiên của bạn để bắt đầu học tập nhé!'}
                </p>
                <Link
                  to="/create"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
                >
                  <Plus className="w-4 h-4" /> Tạo bộ thẻ mới
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredDecks.map((deck) => (
                  <div
                    key={deck._id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between group"
                  >
                    <div>
                      {/* Badge Top Header */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs">
                          {deck.category || 'General'}
                        </span>

                        {/* Status Badge + Quick Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleVisibility(deck._id, deck.isPublic)}
                          title="Bấm để chuyển đổi trạng thái Công khai / Riêng tư"
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border transition ${
                            deck.isPublic
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                          }`}
                        >
                          {deck.isPublic ? (
                            <>
                              <Globe className="w-3 h-3 text-emerald-600" />
                              <span>Công khai</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 text-amber-600" />
                              <span>Riêng tư</span>
                            </>
                          )}
                        </button>
                      </div>

                      <Link to={`/decks/${deck._id}`}>
                        <h3 className="font-extrabold text-base text-slate-800 group-hover:text-indigo-600 transition line-clamp-1">
                          {deck.title}
                        </h3>
                      </Link>

                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[32px]">
                        {deck.description || 'Không có mô tả chi tiết.'}
                      </p>

                      <div className="mt-3 text-xs text-slate-400 font-semibold flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" />
                        <span>{deck.cards?.length || 0} thẻ thuật ngữ</span>
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      {/* Learning Mode Links */}
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/decks/${deck._id}/flashcards`}
                          title="Lật thẻ 3D"
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition"
                        >
                          <Layers className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/decks/${deck._id}/quiz`}
                          title="Trắc nghiệm"
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-purple-50 hover:text-purple-600 transition"
                        >
                          <BrainCircuit className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/decks/${deck._id}/match`}
                          title="Ghép từ"
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-amber-50 hover:text-amber-600 transition"
                        >
                          <Gamepad2 className="w-4 h-4" />
                        </Link>
                      </div>

                      {/* Edit & Delete Actions */}
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/decks/${deck._id}/edit`}
                          title="Chỉnh sửa bộ thẻ"
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteDeck(deck._id, deck.title)}
                          title="Xóa bộ thẻ"
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CÀI ĐẶT & BẢO MẬT */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Form Cập nhật thông tin */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-indigo-600" />
                Thông tin cá nhân
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                Cập nhật tên người dùng hiển thị và địa chỉ email đăng nhập
              </p>

              {profileMsg.text && (
                <div
                  className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                    profileMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {profileMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{profileMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tên người dùng (Username)
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Địa chỉ Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm font-medium"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm"
                  >
                    {profileSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            </div>

            {/* Form Đổi mật khẩu */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2 mb-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                Đổi mật khẩu bảo mật
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                Đặt mật khẩu mạnh có ít nhất 6 ký tự để bảo vệ tài khoản
              </p>

              {passwordMsg.text && (
                <div
                  className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                    passwordMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {passwordMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{passwordMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mật khẩu hiện tại
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mật khẩu mới (tối thiểu 6 ký tự)
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-sm"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition disabled:opacity-50 shadow-sm"
                  >
                    {passwordSaving ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

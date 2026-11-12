import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from './LanguageSelector';
import {
  Sparkles,
  PlusCircle,
  LogOut,
  User as UserIcon,
  BookOpen,
  Shield,
  Layers,
  Flame,
  Menu,
  X,
  ChevronRight,
  LogIn,
  UserPlus,
  Settings,
} from 'lucide-react';

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Tự động đóng menu khi chuyển trang
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 bg-clip-text text-transparent">
                Memora
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium -mt-1 hidden sm:block">
              {t('nav.slogan')}
            </p>
          </div>
        </Link>

        {/* Desktop Navigation (>= md screens) */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/account"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition"
                title={t('nav.my_decks')}
              >
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>{t('nav.my_decks')}</span>
              </Link>

              <Link
                to="/create"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t('nav.create_deck')}</span>
              </Link>

              {/* Admin button — chỉ hiển thị cho admin */}
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition active:scale-95"
                  title="Admin Workbench"
                >
                  <Shield className="w-4 h-4" />
                  <span>{t('nav.admin')}</span>
                </Link>
              )}

              <div className="h-6 w-px bg-slate-200 mx-1" />

              <div className="flex items-center gap-2">
                {/* Language Selector */}
                <LanguageSelector />

                {/* Daily Streak Flame Badge */}
                <Link
                  to="/account"
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black transition border shadow-xs ${
                    (user.streakCount || 0) > 0
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-orange-200 text-orange-600 hover:scale-105'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                  title={`${t('nav.streak_tooltip')}: ${user.streakCount || 0}`}
                >
                  <Flame
                    className={`w-4 h-4 ${
                      (user.streakCount || 0) > 0
                        ? 'fill-orange-500 text-orange-600 animate-pulse'
                        : 'text-slate-400'
                    }`}
                  />
                  <span>{user.streakCount || 0}</span>
                </Link>

                <Link
                  to="/account"
                  className="flex items-center gap-2 py-1 px-2 rounded-xl hover:bg-slate-100 transition group"
                  title={t('nav.account_settings')}
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-xs group-hover:scale-105 transition-transform overflow-hidden">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                      user.username.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600">
                    {user.username}
                  </span>
                </Link>

                <button
                  onClick={handleLogout}
                  title={t('nav.logout')}
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : loading ? (
            <div className="w-24 h-8 bg-slate-100 rounded-xl animate-pulse" />
          ) : (
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition"
              >
                {t('nav.login')}
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm transition"
              >
                {t('nav.register')}
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Action Controls (< md screens) */}
        <div className="flex md:hidden items-center gap-2">
          {/* Mobile Language Selector */}
          <LanguageSelector compact={true} />

          {user && (
            <Link
              to="/account"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black transition border shadow-xs ${
                (user.streakCount || 0) > 0
                  ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-orange-200 text-orange-600'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <Flame
                className={`w-4 h-4 ${
                  (user.streakCount || 0) > 0
                    ? 'fill-orange-500 text-orange-600'
                    : 'text-slate-400'
                }`}
              />
              <span>{user.streakCount || 0}</span>
            </Link>
          )}

          {/* Hamburger Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Mở menu điều hướng"
            className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 active:scale-95 transition"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-slate-800" />
            ) : (
              <Menu className="w-5 h-5 text-slate-800" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown Sheet */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white/98 backdrop-blur-xl px-4 py-4 space-y-4 shadow-2xl animate-in slide-in-from-top-2 duration-150">
          {user ? (
            <>
              {/* User Info Header Card */}
              <Link
                to="/account"
                className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-indigo-50/50 transition"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center font-black text-base overflow-hidden shrink-0">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    user.username.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-base truncate">
                      {user.username}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      {user.role === 'admin' ? t('nav.admin') : 'Member'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
              </Link>

              {/* Main Actions List */}
              <div className="space-y-1.5 pt-1">
                <Link
                  to="/create"
                  className="flex items-center justify-between p-3 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-sm active:scale-[0.98] transition"
                >
                  <div className="flex items-center gap-2.5">
                    <PlusCircle className="w-5 h-5" />
                    <span>{t('nav.create_deck')}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-80" />
                </Link>

                <Link
                  to="/account"
                  className="flex items-center justify-between p-3 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold text-sm transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-5 h-5 text-indigo-600" />
                    <span>{t('nav.my_decks')}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="flex items-center justify-between p-3 rounded-xl bg-amber-50 text-amber-800 font-semibold text-sm border border-amber-200 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <Shield className="w-5 h-5 text-amber-600" />
                      <span>{t('nav.admin')}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-500" />
                  </Link>
                )}

                <Link
                  to="/account"
                  className="flex items-center justify-between p-3 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold text-sm transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className="w-5 h-5 text-slate-500" />
                    <span>{t('nav.account_settings')}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              </div>

              {/* Logout button */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 font-bold text-sm hover:bg-rose-100 transition active:scale-[0.98]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('nav.logout')}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3 py-1">
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
                <p className="text-xs font-semibold text-indigo-900 leading-relaxed">
                  {t('nav.guest_welcome')}
                </p>
              </div>

              <div className="space-y-2">
                <Link
                  to="/login"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-sm transition"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t('nav.login')}</span>
                </Link>

                <Link
                  to="/register"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition"
                >
                  <UserPlus className="w-4 h-4 text-slate-500" />
                  <span>{t('nav.register')}</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}


import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  PlusCircle,
  LogOut,
  User as UserIcon,
  BookOpen,
  Shield,
  Layers,
  Flame,
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
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
              Học thông minh qua Flashcard
            </p>
          </div>
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/account"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition"
                title="Quản lý bộ thẻ của tôi"
              >
                <Layers className="w-4 h-4 text-indigo-600" />
                <span className="hidden lg:inline">Bộ thẻ của tôi</span>
              </Link>

              <Link
                to="/create"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Tạo bộ thẻ</span>
              </Link>

              {/* Admin button — chỉ hiển thị cho admin */}
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition active:scale-95"
                  title="Admin Workbench"
                >
                  <Shield className="w-4 h-4" />
                  <span className="hidden md:inline">Admin</span>
                </Link>
              )}

              <div className="h-6 w-px bg-slate-200 mx-1" />

              <div className="flex items-center gap-2">
                {/* Daily Streak Flame Badge */}
                <Link
                  to="/account"
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black transition border shadow-xs ${
                    (user.streakCount || 0) > 0
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-orange-200 text-orange-600 hover:scale-105'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                  title={`Chuỗi học tập liên tục: ${user.streakCount || 0} ngày`}
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
                  title="Quản lý tài khoản"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-xs group-hover:scale-105 transition-transform">
                    {user.username.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600 hidden md:inline">
                    {user.username}
                  </span>
                </Link>

                <button
                  onClick={handleLogout}
                  title="Đăng xuất"
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm transition"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


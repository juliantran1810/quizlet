import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import {
  BookOpen,
  AlertCircle,
  Mail,
  KeyRound,
  CheckCircle2,
  ArrowLeft,
  Send,
} from 'lucide-react';

const RESEND_COOLDOWN = 60; // giây, khớp với giới hạn phía server

const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm transition';
const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5';

export default function ForgotPasswordPage() {
  // step: 'email' -> 'reset' -> 'done'
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const { t } = useLanguage();

  // Đếm ngược cho nút "Gửi lại mã"
  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const requestOtp = async () => {
    setError('');
    setSubmitting(true);
    try {
      const res = await authService.forgotPassword({ email: email.trim() });
      setDevOtp(res.devOtp || '');
      setCountdown(RESEND_COOLDOWN);
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendOtp = (e) => {
    e.preventDefault();
    requestOtp();
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(otp.trim())) {
      setError(t('auth.enter_otp'));
      return;
    }
    if (newPassword.length < 6) {
      setError(t('auth.password_min_len'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('auth.password_mismatch'));
      return;
    }

    setSubmitting(true);
    try {
      await authService.resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {step === 'done' ? <CheckCircle2 className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800">
            {step === 'email' ? t('auth.forgot_title') : t('auth.reset_title')}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {step === 'email' && t('auth.forgot_subtitle')}
            {step === 'reset' && t('auth.reset_subtitle')}
            {step === 'done' && t('auth.reset_success')}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-sm text-rose-700">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Bước 1: nhập email */}
        {step === 'email' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className={labelClass}>{t('auth.email_label')}</label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.email_ph')}
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {submitting ? t('common.loading') : t('auth.forgot_send_btn')}
            </button>
          </form>
        )}

        {/* Bước 2: nhập OTP và mật khẩu mới */}
        {step === 'reset' && (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-800 flex items-start gap-2">
              <Mail className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p>{t('auth.forgot_sent')}</p>
                <p className="font-bold break-all mt-1">{email}</p>
              </div>
            </div>

            {devOtp && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                {t('auth.otp_dev_hint')}{' '}
                <button
                  type="button"
                  onClick={() => setOtp(devOtp)}
                  className="font-black tracking-widest underline"
                  title="Click để điền"
                >
                  {devOtp}
                </button>
              </div>
            )}

            <div>
              <label className={labelClass}>{t('auth.otp_label')}</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder={t('auth.otp_input_ph')}
                  className={`${inputClass} pl-10 tracking-widest font-bold`}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>{t('auth.new_password_label')}</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{t('auth.confirm_password_label')}</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              {submitting ? t('common.loading') : t('auth.reset_btn')}
            </button>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setOtp('');
                  setError('');
                  setDevOtp('');
                }}
                className="text-slate-500 hover:text-indigo-600 font-semibold transition"
              >
                {t('auth.change_email')}
              </button>
              <button
                type="button"
                disabled={countdown > 0 || submitting}
                onClick={requestOtp}
                className="font-semibold text-indigo-600 hover:text-indigo-700 disabled:text-slate-400 disabled:cursor-not-allowed transition"
              >
                {countdown > 0
                  ? t('auth.otp_resend_wait').replace('{seconds}', countdown)
                  : t('auth.otp_resend')}
              </button>
            </div>
          </form>
        )}

        {/* Bước 3: thành công */}
        {step === 'done' && (
          <Link
            to="/login"
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition shadow-sm flex items-center justify-center gap-2"
          >
            {t('auth.login_now')}
          </Link>
        )}

        {step !== 'done' && (
          <div className="mt-8 pt-6 border-t border-slate-100 text-center text-sm">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 font-semibold text-slate-500 hover:text-indigo-600 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('auth.back_to_login')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

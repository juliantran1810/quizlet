import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { authService } from '../services/api';
import {
  UserPlus,
  BookOpen,
  AlertCircle,
  Mail,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Clock,
} from 'lucide-react';

export default function RegisterPage() {
  const [step, setStep] = useState(1); // 1: Info form | 2: OTP Verification
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { verifyOtpRegister } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Đếm ngược thời gian gửi lại OTP
  useEffect(() => {
    let timer;
    if (step === 2 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Bước 1: Gửi yêu cầu nhận mã OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');

    if (!username.trim() || !email.trim() || !password) {
      setError(t('auth.enter_all_fields'));
      return;
    }

    if (password.length < 6) {
      setError(t('auth.password_min_len'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await authService.sendOtp({ email, username });
      if (res.data?.devOtp) {
        setDevOtp(res.data.devOtp);
      }
      setInfoMsg(res.data?.message || 'Mã xác thực OTP đã được gửi đến email của bạn.');
      setStep(2);
      setCountdown(60);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi mã xác thực. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  // Gửi lại mã OTP
  const handleResendOtp = async () => {
    if (countdown > 0 || submitting) return;
    setError('');
    setInfoMsg('');
    setSubmitting(true);
    try {
      const res = await authService.sendOtp({ email, username });
      if (res.data?.devOtp) {
        setDevOtp(res.data.devOtp);
      }
      setInfoMsg(res.data?.message || 'Đã gửi lại mã xác thực OTP.');
      setCountdown(60);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi lại mã xác thực.');
    } finally {
      setSubmitting(false);
    }
  };

  // Bước 2: Xác thực mã OTP và hoàn tất tạo tài khoản
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setError(t('auth.enter_otp'));
      return;
    }

    setSubmitting(true);
    try {
      await verifyOtpRegister({
        username,
        email,
        password,
        otp: otpCode.trim(),
      });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800">
            {step === 1 ? t('auth.register_title') : t('auth.otp_step_title')}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {step === 1 ? t('auth.register_subtitle') : t('auth.otp_step_desc')}
          </p>
          {step === 2 && (
            <p className="text-sm font-bold text-indigo-600 mt-0.5">{email}</p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-sm text-rose-700">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {infoMsg && step === 2 && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-sm text-emerald-800">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* BƯỚC 1: NHẬP THÔNG TIN TÀI KHOẢN */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                {t('auth.username_label')}
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('auth.username_ph')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                {t('auth.email_label')}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.email_ph')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                {t('auth.password_label')}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm transition"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              {submitting ? t('auth.sending_otp') : t('auth.send_otp_btn')}
            </button>
          </form>
        )}

        {/* BƯỚC 2: NHẬP MÃ XÁC THỰC OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {/* Dev Mode OTP Banner (Nếu có) */}
            {devOtp && (
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-semibold flex items-center justify-between">
                <span>{t('auth.otp_dev_hint')}</span>
                <span className="font-mono text-base font-black tracking-widest text-indigo-600 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                  {devOtp}
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 text-center">
                Mã xác thực 6 số
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder={t('auth.otp_input_ph')}
                autoFocus
                className="w-full text-center tracking-[0.5em] font-mono text-2xl px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-600 outline-none text-slate-800 transition"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || otpCode.length !== 6}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              {submitting ? t('auth.verifying_otp') : t('auth.otp_verify_btn')}
            </button>

            {/* Resend & Back controls */}
            <div className="pt-2 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtpCode('');
                  setError('');
                }}
                className="text-slate-500 hover:text-indigo-600 font-semibold flex items-center gap-1 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> {t('auth.otp_back')}
              </button>

              <button
                type="button"
                disabled={countdown > 0 || submitting}
                onClick={handleResendOtp}
                className={`font-semibold transition ${
                  countdown > 0
                    ? 'text-slate-400 cursor-not-allowed flex items-center gap-1'
                    : 'text-indigo-600 hover:underline'
                }`}
              >
                {countdown > 0 ? (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{t('auth.otp_resend_wait').replace('{seconds}', countdown)}</span>
                  </>
                ) : (
                  t('auth.otp_resend')
                )}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-xs text-slate-500 mt-6">
          {t('auth.have_account')}{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:underline">
            {t('auth.login_now')}
          </Link>
        </p>
      </div>
    </div>
  );
}


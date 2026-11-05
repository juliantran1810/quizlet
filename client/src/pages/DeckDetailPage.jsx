import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { deckService, progressService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import HanziWriter from '../components/HanziWriter';
import { speak } from '../utils/speech';
import {
  Layers,
  BrainCircuit,
  Gamepad2,
  Volume2,
  Trash2,
  Edit,
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  PenLine,
} from 'lucide-react';

export default function DeckDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [deck, setDeck] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, [id, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await deckService.getById(id);
      setDeck(res.data.deck);

      if (user) {
        try {
          const progRes = await progressService.get(id);
          setProgress(progRes.data.progress);
        } catch (e) {
          console.warn('Không tải được tiến độ:', e);
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải chi tiết bộ thẻ:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = (text) => {
    speak(text);
  };

  const handleDelete = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bộ thẻ này không?')) return;
    try {
      setDeleting(true);
      await deckService.delete(id);
      navigate('/');
    } catch (err) {
      alert('Lỗi xóa bộ thẻ: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeleting(false);
    }
  };

  const handleResetProgress = async () => {
    if (!window.confirm('Bạn có muốn đặt lại toàn bộ tiến độ học cho bộ thẻ này?')) return;
    try {
      await progressService.reset(id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <LoadingSpinner message="Đang tải nội dung bộ thẻ..." />;
  if (!deck) return <div className="text-center py-20">Không tìm thấy bộ thẻ</div>;

  const isAuthor = user && deck.author && deck.author._id === user._id;
  const totalCards = deck.cards?.length || 0;
  const masteredCount = progress?.masteredCount || 0;
  const progressPercent = totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Về trang chủ
        </Link>

        {isAuthor && (
          <div className="flex items-center gap-2">
            <Link
              to={`/decks/${id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              <Edit className="w-3.5 h-3.5" /> Chỉnh sửa
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
            >
              <Trash2 className="w-3.5 h-3.5" /> Xóa bộ
            </button>
          </div>
        )}
      </div>

      {/* Deck Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 mb-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-xs">
            {deck.category || 'General'}
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold text-xs">
            {totalCards} thẻ thuật ngữ
          </span>
          <span className="text-xs text-slate-400">
            Tạo bởi <strong className="text-slate-600">{deck.author?.username || 'Ẩn danh'}</strong>
          </span>
        </div>

        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          {deck.title}
        </h1>
        {deck.description && (
          <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
            {deck.description}
          </p>
        )}

        {/* Progress Bar (if logged in) */}
        {user && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-slate-600">Tiến độ ghi nhớ: {progressPercent}%</span>
              <div className="flex items-center gap-4">
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {masteredCount} Đã thuộc
                </span>
                <span className="text-amber-600 flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5" /> {totalCards - masteredCount} Cần ôn
                </span>
                {masteredCount > 0 && (
                  <button
                    onClick={handleResetProgress}
                    className="text-slate-400 hover:text-rose-500 text-[11px] underline"
                  >
                    Đặt lại
                  </button>
                )}
              </div>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 3 Study Modes Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <Link
          to={`/decks/${id}/flashcards`}
          className="group p-5 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md hover:shadow-indigo-200 hover:scale-[1.02] transition-all flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-base">Thẻ ghi nhớ (Flashcards)</h3>
            <p className="text-xs text-indigo-100 mt-0.5">Lật thẻ 3D & phát âm audio</p>
          </div>
        </Link>

        <Link
          to={`/decks/${id}/quiz`}
          className="group p-5 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-md hover:shadow-purple-200 hover:scale-[1.02] transition-all flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-base">Trắc nghiệm (Quiz Mode)</h3>
            <p className="text-xs text-purple-100 mt-0.5">Lựa chọn 4 đáp án thông minh</p>
          </div>
        </Link>

        <Link
          to={`/decks/${id}/match`}
          className="group p-5 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md hover:shadow-amber-200 hover:scale-[1.02] transition-all flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-base">Ghép từ (Match Game)</h3>
            <p className="text-xs text-amber-100 mt-0.5">Đua thời gian ghép cặp từ vựng</p>
          </div>
        </Link>
      </div>

      {/* Cards List in this Deck */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          Các thẻ trong bộ này ({totalCards})
        </h2>

        <div className="space-y-3">
          {deck.cards.map((card, idx) => {
            const isChinese = /[\u4e00-\u9fff\u3400-\u4dbf]/.test(card.term || '');
            return (
              <div
                key={card._id || idx}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col gap-3 hover:border-slate-300 transition"
              >
                {/* Row chính: Term + Definition */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Cột trái: Chữ Hán / Term + Pinyin */}
                  <div className="flex-1 border-b md:border-b-0 md:border-r border-slate-100 pb-3 md:pb-0 md:pr-6">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-slate-800 ${isChinese ? 'text-2xl' : 'text-base'}`}>
                        {card.term}
                      </span>
                      <button
                        onClick={() => handleSpeak(card.term)}
                        title="Phát âm"
                        className="p-1 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                    {/* Pinyin hiển thị ngay dưới chữ Hán */}
                    {card.pinyin && (
                      <p className="text-sm font-semibold text-indigo-500 tracking-widest mt-1">
                        {card.pinyin}
                      </p>
                    )}
                    {card.hint && (
                      <p className="text-xs text-amber-600 mt-1">💡 {card.hint}</p>
                    )}
                  </div>

                  {/* Cột phải: Nghĩa */}
                  <div className="flex-1 md:pl-6 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">{card.definition}</p>
                    {card.imageUrl && (
                      <img
                        src={card.imageUrl}
                        alt={card.term}
                        className="w-14 h-14 object-cover rounded-lg border border-slate-200 shrink-0 ml-4"
                      />
                    )}
                  </div>
                </div>

                {/* HanziWriter — hiển thị inline cho chữ Hán */}
                {isChinese && (
                  <HanziWriter characters={card.term} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


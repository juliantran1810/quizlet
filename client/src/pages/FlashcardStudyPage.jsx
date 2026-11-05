import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { deckService, progressService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Flashcard3D from '../components/Flashcard3D';
import LoadingSpinner from '../components/LoadingSpinner';
import { ArrowLeft, Shuffle, RotateCcw, CheckCircle2, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function FlashcardStudyPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardStatuses, setCardStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    loadDeckAndProgress();
  }, [id]);

  const loadDeckAndProgress = async () => {
    try {
      setLoading(true);
      const res = await deckService.getById(id);
      const deckData = res.data.deck;
      setDeck(deckData);
      setCards(deckData.cards || []);

      if (user) {
        try {
          const progRes = await progressService.get(id);
          const stats = {};
          progRes.data.progress?.cardStats?.forEach((c) => {
            stats[c.cardId] = c.status;
          });
          setCardStatuses(stats);
        } catch (e) {
          console.warn('Lỗi tải tiến độ:', e);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCompleted(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleMarkStatus = async (cardId, status) => {
    // Cập nhật local state ngay lập tức cho UI phản hồi tức thì
    setCardStatuses((prev) => ({ ...prev, [cardId]: status }));

    // Gửi cập nhật lên backend nếu đã đăng nhập
    if (user) {
      try {
        await progressService.update(id, { cardId, status });
      } catch (err) {
        console.error('Lỗi lưu tiến độ:', err);
      }
    }

    // Tự động chuyển thẻ tiếp theo
    handleNext();
  };

  const handleShuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setCompleted(false);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setCompleted(false);
  };

  if (loading) return <LoadingSpinner message="Đang nạp bộ thẻ 3D..." />;
  if (!deck || cards.length === 0) {
    return <div className="text-center py-20">Không tìm thấy thẻ học nào</div>;
  }

  const currentCard = cards[currentIndex];
  const masteredCount = Object.values(cardStatuses).filter((s) => s === 'mastered').length;
  const learningCount = Object.values(cardStatuses).filter((s) => s === 'learning').length;
  const progressPercent = Math.round(((currentIndex + 1) / cards.length) * 100);

  return (
    <div className="min-h-[85vh] max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col justify-between">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Link
            to={`/decks/${id}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Thoát chế độ học
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShuffle}
              title="Xáo trộn thứ tự thẻ"
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              onClick={handleRestart}
              title="Bắt đầu lại từ đầu"
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress indicators */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
            <span>Tiến độ bài học: {currentIndex + 1} / {cards.length} thẻ</span>
            <div className="flex items-center gap-3">
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {masteredCount} Đã thuộc
              </span>
              <span className="text-amber-600 flex items-center gap-1">
                <RotateCcw className="w-3.5 h-3.5" /> {learningCount} Đang học
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Flashcard Component or Completed Screen */}
      <div className="my-auto py-4">
        {completed ? (
          <div className="text-center py-12 px-6 bg-white rounded-3xl border border-slate-200 shadow-md max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">
              Chúc mừng bạn đã hoàn thành!
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Bạn đã lướt qua toàn bộ {cards.length} thẻ trong bộ bài này.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <span className="text-2xl font-black text-emerald-600">{masteredCount}</span>
                <p className="text-xs font-semibold text-emerald-700 mt-1">Đã thuộc</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <span className="text-2xl font-black text-amber-600">
                  {cards.length - masteredCount}
                </span>
                <p className="text-xs font-semibold text-amber-700 mt-1">Cần ôn lại</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleRestart}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition"
              >
                Học lại lần nữa
              </button>
              <Link
                to={`/decks/${id}/quiz`}
                className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition"
              >
                Chuyển sang Trắc nghiệm
              </Link>
            </div>
          </div>
        ) : (
          <Flashcard3D
            card={currentCard}
            currentIndex={currentIndex}
            totalCards={cards.length}
            status={cardStatuses[currentCard._id] || 'learning'}
            onNext={handleNext}
            onPrev={handlePrev}
            onMarkStatus={handleMarkStatus}
          />
        )}
      </div>

      {/* Keyboard Shortcut Hints Footer */}
      <div className="text-center text-xs text-slate-400 py-4 flex items-center justify-center gap-4 flex-wrap">
        <span>💡 Phím tắt:</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[10px] text-slate-700">Space</kbd> Lật thẻ</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[10px] text-slate-700">←</kbd> Thẻ trước</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[10px] text-slate-700">→</kbd> Thẻ tiếp</span>
      </div>
    </div>
  );
}


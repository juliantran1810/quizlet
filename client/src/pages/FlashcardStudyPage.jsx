import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { deckService, progressService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Flashcard3D from '../components/Flashcard3D';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  ArrowLeft,
  Shuffle,
  RotateCcw,
  CheckCircle2,
  Trophy,
  Star,
  Volume2,
  VolumeX,
  ArrowLeftRight,
  Headphones,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sfx } from '../utils/sfx';

export default function FlashcardStudyPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();

  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardStatuses, setCardStatuses] = useState({});
  const [cardStars, setCardStars] = useState({});
  const [filterMode, setFilterMode] = useState(
    searchParams.get('mode') === 'starred' ? 'starred' : 'all'
  );
  const [isReversed, setIsReversed] = useState(
    localStorage.getItem('quizlet_study_reversed') === 'true'
  );
  const [autoPlayAudio, setAutoPlayAudio] = useState(
    localStorage.getItem('quizlet_autoplay_audio') === 'true'
  );
  const [isMuted, setIsMuted] = useState(sfx.isMuted());
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    return sfx.onMuteChange(setIsMuted);
  }, []);

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
          const stars = {};
          progRes.data.progress?.cardStats?.forEach((c) => {
            stats[c.cardId] = c.status;
            if (c.isStarred) {
              stars[c.cardId] = true;
            }
          });
          setCardStatuses(stats);
          setCardStars(stars);
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
    if (currentIndex < activeCards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCompleted(true);
      sfx.fanfare();
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
        const res = await progressService.update(id, { cardId, status });
        if (res.data?.userStreak) {
          updateUser(res.data.userStreak);
        }
      } catch (err) {
        console.error('Lỗi lưu tiến độ:', err);
      }
    }

    // Tự động chuyển thẻ tiếp theo
    handleNext();
  };

  const handleToggleStar = async (cardId) => {
    const newStarred = !cardStars[cardId];
    if (newStarred) {
      sfx.star();
    } else {
      sfx.unstar();
    }
    setCardStars((prev) => ({ ...prev, [cardId]: newStarred }));

    if (user) {
      try {
        await progressService.toggleStar(id, cardId, newStarred);
      } catch (err) {
        console.error('Lỗi lưu gắn sao:', err);
      }
    }
  };

  const handleShuffle = () => {
    sfx.slide();
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setCompleted(false);
  };

  const handleRestart = () => {
    sfx.slide();
    setCurrentIndex(0);
    setCompleted(false);
  };

  const handleToggleReversed = () => {
    sfx.click();
    setIsReversed((prev) => {
      const next = !prev;
      localStorage.setItem('quizlet_study_reversed', String(next));
      return next;
    });
  };

  const handleToggleAutoPlayAudio = () => {
    sfx.click();
    setAutoPlayAudio((prev) => {
      const next = !prev;
      localStorage.setItem('quizlet_autoplay_audio', String(next));
      return next;
    });
  };

  const handleFilterChange = (mode) => {
    sfx.click();
    setFilterMode(mode);
    setCurrentIndex(0);
    setCompleted(false);
    setSearchParams(mode === 'starred' ? { mode: 'starred' } : {});
  };

  if (loading) return <LoadingSpinner message="Đang nạp bộ thẻ 3D..." />;
  if (!deck || (deck.cards && deck.cards.length === 0)) {
    return <div className="text-center py-20">Không tìm thấy thẻ học nào</div>;
  }

  const allCards = deck.cards || [];
  const starredCards = allCards.filter((c) => cardStars[c._id]);
  const starredCount = starredCards.length;
  const activeCards = filterMode === 'starred' ? cards.filter((c) => cardStars[c._id]) : cards;

  // Đảm bảo currentIndex hợp lệ nếu activeCards bị co lại
  const safeIndex = currentIndex >= activeCards.length && activeCards.length > 0 ? activeCards.length - 1 : currentIndex;
  const currentCard = activeCards[safeIndex];

  const masteredCount = activeCards.filter((c) => cardStatuses[c._id] === 'mastered').length;
  const learningCount = activeCards.filter((c) => cardStatuses[c._id] === 'learning').length;
  const progressPercent = activeCards.length > 0 ? Math.round(((safeIndex + 1) / activeCards.length) * 100) : 0;

  return (
    <div className="min-h-[85vh] max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col justify-between">
      {/* Top Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <Link
            to={`/decks/${id}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" /> {t('flashcards.exit')}
          </Link>

          {/* Bộ lọc chế độ học: Tất cả vs Thẻ gắn sao */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start sm:self-auto">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                filterMode === 'all'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('flashcards.all_cards')} ({allCards.length})
            </button>
            <button
              onClick={() => handleFilterChange('starred')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                filterMode === 'starred'
                  ? 'bg-white text-amber-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${starredCount > 0 ? 'fill-amber-400 text-amber-500' : ''}`} />
              {t('flashcards.starred_cards')} ({starredCount})
            </button>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            {/* Nút Đảo mặt thẻ */}
            <button
              onClick={handleToggleReversed}
              title={isReversed ? t('flashcards.reverse_on') : t('flashcards.reverse')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                isReversed
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isReversed ? t('flashcards.reverse_on') : t('flashcards.reverse')}</span>
            </button>

            {/* Nút Tự động đọc Audio */}
            <button
              onClick={handleToggleAutoPlayAudio}
              title={autoPlayAudio ? t('flashcards.auto_audio_on') : t('flashcards.auto_audio')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                autoPlayAudio
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{autoPlayAudio ? t('flashcards.auto_audio_on') : t('flashcards.auto_audio')}</span>
            </button>

            {/* Nút Bật/Tắt hiệu ứng âm thanh SFX */}
            <button
              onClick={() => {
                const next = sfx.toggleMute();
                setIsMuted(next);
              }}
              title={t('study.sound')}
              className={`p-2 rounded-xl border transition ${
                isMuted
                  ? 'bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-100'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={handleShuffle}
              disabled={activeCards.length <= 1}
              title={t('flashcards.shuffle')}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              onClick={handleRestart}
              disabled={activeCards.length === 0}
              title={t('flashcards.restart')}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress indicators - chỉ hiện khi có thẻ trong activeCards */}
        {activeCards.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
              <span>
                {t('flashcards.progress')} ({filterMode === 'starred' ? t('flashcards.starred_cards') : t('flashcards.all_cards')}): {safeIndex + 1} / {activeCards.length} {t('deck.cards_count')}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {masteredCount} {t('flashcards.mastered')}
                </span>
                <span className="text-amber-600 flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5" /> {learningCount} {t('flashcards.learning')}
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
        )}
      </div>

      {/* Main Flashcard Component or Completed Screen or Empty Starred State */}
      <div className="my-auto py-4">
        {filterMode === 'starred' && activeCards.length === 0 ? (
          <div className="text-center py-16 px-6 bg-white rounded-3xl border border-slate-200 shadow-sm max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 fill-amber-400 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">{t('flashcards.no_starred_title')}</h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              {t('flashcards.no_starred_desc')}
            </p>
            <button
              onClick={() => handleFilterChange('all')}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 shadow-sm transition"
            >
              {t('flashcards.study_all_btn').replace('{count}', allCards.length)}
            </button>
          </div>
        ) : completed ? (
          <div className="text-center py-12 px-6 bg-white rounded-3xl border border-slate-200 shadow-md max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">
              {t('flashcards.completed_title')}
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              {t('flashcards.completed_desc').replace('{count}', activeCards.length)}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <span className="text-2xl font-black text-emerald-600">{masteredCount}</span>
                <p className="text-xs font-semibold text-emerald-700 mt-1">{t('flashcards.mastered')}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <span className="text-2xl font-black text-amber-600">
                  {activeCards.length - masteredCount}
                </span>
                <p className="text-xs font-semibold text-amber-700 mt-1">{t('flashcards.need_review')}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleRestart}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition"
              >
                {t('flashcards.study_again')}
              </button>
              {filterMode === 'starred' ? (
                <button
                  onClick={() => handleFilterChange('all')}
                  className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition"
                >
                  {t('flashcards.study_all_btn').replace('{count}', allCards.length)}
                </button>
              ) : (
                <Link
                  to={`/decks/${id}/quiz`}
                  className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition"
                >
                  {t('flashcards.switch_quiz')}
                </Link>
              )}
            </div>
          </div>
        ) : (
          <Flashcard3D
            card={currentCard}
            currentIndex={safeIndex}
            totalCards={activeCards.length}
            status={cardStatuses[currentCard?._id] || 'learning'}
            isStarred={Boolean(cardStars[currentCard?._id])}
            isReversed={isReversed}
            autoPlayAudio={autoPlayAudio}
            onToggleStar={handleToggleStar}
            onNext={handleNext}
            onPrev={handlePrev}
            onMarkStatus={handleMarkStatus}
          />
        )}
      </div>

      {/* Keyboard Shortcut Hints Footer */}
      <div className="text-center text-xs text-slate-400 py-4 flex items-center justify-center gap-4 flex-wrap">
        <span>💡 {t('flashcards.shortcuts_hint')}</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[10px] text-slate-700">Space</kbd> {t('flashcards.shortcut_space')}</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[10px] text-slate-700">←</kbd> {t('flashcards.shortcut_prev')}</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[10px] text-slate-700">→</kbd> {t('flashcards.shortcut_next')}</span>
      </div>
    </div>
  );
}


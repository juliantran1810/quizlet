import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { deckService, progressService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LoadingSpinner from '../components/LoadingSpinner';
import HanziWriter from '../components/HanziWriter';
import { speak } from '../utils/speech';
import { sfx } from '../utils/sfx';
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
  Lock,
  Globe,
  Star,
  Sparkles,
  SpellCheck,
  Rocket,
} from 'lucide-react';

export default function DeckDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, formatCategory } = useLanguage();

  const [deck, setDeck] = useState(null);
  const [progress, setProgress] = useState(null);
  const [cardStars, setCardStars] = useState({});
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [activeStrokeCardId, setActiveStrokeCardId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [id, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await deckService.getById(id);
      setDeck(res.data.deck);

      if (user) {
        try {
          const progRes = await progressService.get(id);
          const progData = progRes.data.progress;
          setProgress(progData);
          const stars = {};
          progData?.cardStats?.forEach((c) => {
            if (c.isStarred) stars[c.cardId] = true;
          });
          setCardStars(stars);
        } catch (e) {
          console.warn('Không tải được tiến độ:', e);
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải chi tiết bộ thẻ:', err);
      setError(
        err.response?.data?.message ||
          'Không thể tải nội dung bộ thẻ này.'
      );
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

  const handleToggleStar = async (cardId) => {
    if (!user) {
      alert('Vui lòng đăng nhập để lưu đánh dấu thẻ gắn sao!');
      return;
    }
    const newStarred = !cardStars[cardId];
    if (newStarred) {
      sfx.star();
    } else {
      sfx.unstar();
    }
    setCardStars((prev) => ({ ...prev, [cardId]: newStarred }));
    try {
      const res = await progressService.toggleStar(id, cardId, newStarred);
      if (res.data?.progress) {
        setProgress(res.data.progress);
      }
    } catch (err) {
      console.error('Lỗi khi gắn sao:', err);
      setCardStars((prev) => ({ ...prev, [cardId]: !newStarred }));
    }
  };

  if (loading) return <LoadingSpinner message="Đang tải nội dung bộ thẻ..." />;

  // Màn hình thông báo nếu bộ thẻ ở chế độ riêng tư hoặc không tìm thấy
  if (error || !deck) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-2">
          {error?.includes('riêng tư') ? 'Bộ thẻ ở chế độ Riêng tư' : 'Không tìm thấy bộ thẻ'}
        </h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          {error || 'Bộ thẻ này không tồn tại hoặc đã bị gỡ bỏ.'}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-sm transition"
        >
          <ArrowLeft className="w-4 h-4" /> Khám phá các bộ thẻ công khai
        </Link>
      </div>
    );
  }

  const isAuthor = user && deck.author && deck.author._id === user._id;
  const totalCards = deck.cards?.length || 0;
  const masteredCount = progress?.masteredCount || 0;
  const dueCount = progress?.dueCount || 0;
  const starredCount = Object.values(cardStars).filter(Boolean).length;
  const progressPercent = totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" /> {t('common.back_to_home')}
        </Link>

        {isAuthor && (
          <div className="flex items-center gap-2">
            <Link
              to={`/decks/${id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              <Edit className="w-3.5 h-3.5" /> {t('common.edit')}
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
            >
              <Trash2 className="w-3.5 h-3.5" /> {t('deck.delete_deck')}
            </button>
          </div>
        )}
      </div>

      {/* Deck Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 mb-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-xs">
            {formatCategory(deck.category)}
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold text-xs">
            {totalCards} {t('deck.cards_count')}
          </span>
          {starredCount > 0 && (
            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold text-xs flex items-center gap-1 border border-amber-200">
              <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
              {starredCount} {t('deck.starred_count')}
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold text-xs ${
              deck.isPublic
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            {deck.isPublic ? <Globe className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3 text-amber-600" />}
            {deck.isPublic ? t('deck.public') : t('deck.private')}
          </span>
          <span className="text-xs text-slate-400">
            {t('deck.created_by')} <strong className="text-slate-600">{deck.author?.username || 'Memora'}</strong>
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-semibold mb-2">
              <span className="text-slate-600">{t('deck.progress_label')}: {progressPercent}%</span>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {masteredCount} {t('deck.mastered')}
                </span>
                <span className="text-amber-600 flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5" /> {totalCards - masteredCount} {t('deck.need_review')}
                </span>
                {masteredCount > 0 && (
                  <button
                    onClick={handleResetProgress}
                    className="text-slate-400 hover:text-rose-500 text-[11px] underline"
                  >
                    {t('deck.reset_progress')}
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

      {/* 5 Interactive Study & Game Modes Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-10">
        <Link
          to={`/decks/${id}/flashcards`}
          className="group p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md hover:shadow-indigo-200 hover:scale-[1.02] transition-all flex items-center gap-3.5"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm">{t('deck.mode_flashcards')}</h3>
            <p className="text-[11px] text-indigo-100 mt-0.5">{t('deck.mode_flashcards_desc')}</p>
          </div>
        </Link>

        <Link
          to={`/decks/${id}/learn`}
          className="group p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md hover:shadow-emerald-200 hover:scale-[1.02] transition-all flex items-center gap-3.5 relative overflow-hidden"
        >
          {dueCount > 0 && (
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 font-extrabold text-[10px] shadow">
              {dueCount} {t('deck.due_badge')}
            </span>
          )}
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
            <SpellCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm">{t('deck.mode_learn')}</h3>
            <p className="text-[11px] text-emerald-100 mt-0.5">{t('deck.mode_learn_desc')}</p>
          </div>
        </Link>

        <Link
          to={`/decks/${id}/quiz`}
          className="group p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-md hover:shadow-purple-200 hover:scale-[1.02] transition-all flex items-center gap-3.5"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm">{t('deck.mode_quiz')}</h3>
            <p className="text-[11px] text-purple-100 mt-0.5">{t('deck.mode_quiz_desc')}</p>
          </div>
        </Link>

        <Link
          to={`/decks/${id}/match`}
          className="group p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md hover:shadow-amber-200 hover:scale-[1.02] transition-all flex items-center gap-3.5"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm">{t('deck.mode_match')}</h3>
            <p className="text-[11px] text-amber-100 mt-0.5">{t('deck.mode_match_desc')}</p>
          </div>
        </Link>

        <Link
          to={`/decks/${id}/gravity`}
          className="group p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-rose-500 via-orange-500 to-amber-600 text-white shadow-md hover:shadow-orange-200 hover:scale-[1.02] transition-all flex items-center gap-3.5 relative overflow-hidden"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
            <Rocket className="w-5 h-5 text-white group-hover:animate-bounce" />
          </div>
          <div>
            <h3 className="font-bold text-sm">{t('deck.mode_gravity')}</h3>
            <p className="text-[11px] text-orange-100 mt-0.5">{t('deck.mode_gravity_desc')}</p>
          </div>
        </Link>
      </div>

      {/* Starred Cards Study Banner */}
      {starredCount > 0 && (
        <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Star className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h4 className="font-bold text-amber-950 text-sm">
                {t('deck.starred_banner_title').replace('{count}', starredCount)}
              </h4>
              <p className="text-xs text-amber-800">
                {t('deck.starred_banner_desc')}
              </p>
            </div>
          </div>
          <Link
            to={`/decks/${id}/flashcards?mode=starred`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition shadow-sm whitespace-nowrap self-stretch sm:self-auto justify-center"
          >
            <Star className="w-3.5 h-3.5 fill-white" /> {t('deck.study_starred_btn').replace('{count}', starredCount)}
          </Link>
        </div>
      )}

      {/* Cards List in this Deck */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {t('deck.card_list_title')} ({totalCards})
          </h2>
          {starredCount > 0 && (
            <Link
              to={`/decks/${id}/flashcards?mode=starred`}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400" /> {starredCount} {t('deck.starred_count')}
            </Link>
          )}
        </div>

        <div className="space-y-3">
          {deck.cards.map((card, idx) => {
            const isChinese = /[\u4e00-\u9fff\u3400-\u4dbf]/.test(card.term || '');
            const isStarred = Boolean(cardStars[card._id]);
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
                      <button
                        type="button"
                        onClick={() => handleToggleStar(card._id)}
                        title={isStarred ? "Bỏ gắn sao" : "Gắn sao thẻ khó"}
                        className={`p-1.5 rounded-full transition ${
                          isStarred
                            ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                            : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50/50'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400' : ''}`} />
                      </button>
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
                      {isChinese && (
                        <button
                          type="button"
                          onClick={() =>
                            setActiveStrokeCardId((prev) =>
                              prev === (card._id || idx) ? null : card._id || idx
                            )
                          }
                          title="Xem nét bút chữ Hán"
                          className={`p-1 rounded-full transition ${
                            activeStrokeCardId === (card._id || idx)
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                          }`}
                        >
                          <PenLine className="w-4 h-4" />
                        </button>
                      )}
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

                {/* HanziWriter — hiển thị khi người dùng bấm vào biểu tượng bút */}
                {isChinese && activeStrokeCardId === (card._id || idx) && (
                  <div className="pt-2 border-t border-slate-100">
                    <HanziWriter characters={card.term} autoAnimate />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


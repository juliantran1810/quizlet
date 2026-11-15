import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Volume2,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Send,
  Lightbulb,
  Award,
  ChevronRight,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { deckService, progressService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { speakTerm, speakChinese, stopSpeaking } from '../utils/speech';
import { checkAnswerMatch } from '../utils/answerMatcher';
import sfx from '../utils/sfx';
import LoadingSpinner from '../components/LoadingSpinner';

export default function LearnModePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();

  const [deck, setDeck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Danh sách thẻ trong phiên học
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Trạng thái nhập liệu của người dùng
  const [inputValue, setInputValue] = useState('');
  const [revealedHintChars, setRevealedHintChars] = useState(0); // Số ký tự đã hé lộ
  const [showCardHint, setShowCardHint] = useState(false); // Hiển thị gợi ý thẻ
  const [feedback, setFeedback] = useState(null); // null | 'correct' | 'wrong'
  const [mistakeRetryInput, setMistakeRetryInput] = useState(''); // Ô nhập lại khi gõ sai

  // Lịch sử trả lời để xem lại toàn bộ bài sau khi hoàn thành
  const [history, setHistory] = useState([]);
  const [reviewTab, setReviewTab] = useState('all'); // 'all' | 'wrong' | 'correct'

  // Tùy chọn học tập
  const [isReversed, setIsReversed] = useState(() => {
    return localStorage.getItem('memora_learn_reversed') === 'true';
  });
  const [autoPlayAudio, setAutoPlayAudio] = useState(true);

  // Thống kê phiên học
  const [sessionResults, setSessionResults] = useState({
    correctFirstTry: 0,
    wrongCards: [],
    completed: false,
  });

  const inputRef = useRef(null);
  const retryInputRef = useRef(null);

  useEffect(() => {
    fetchDeckData();
  }, [id]);

  const fetchDeckData = async () => {
    try {
      setLoading(true);
      const res = await deckService.getById(id);
      const fetchedDeck = res.data.deck;
      setDeck(fetchedDeck);

      if (fetchedDeck && fetchedDeck.cards && fetchedDeck.cards.length > 0) {
        // Xáo trộn nhẹ để tăng tính phản xạ
        const shuffled = [...fetchedDeck.cards].sort(() => Math.random() - 0.5);
        setCards(shuffled);
      }
    } catch (err) {
      console.error('Lỗi khi tải bộ thẻ:', err);
      setError(err.response?.data?.message || 'Không thể tải nội dung bộ thẻ.');
    } finally {
      setLoading(false);
    }
  };

  const currentCard = cards[currentIndex];

  // Thuật ngữ/Định nghĩa cần đoán dựa trên chế độ đảo chiều
  // isReversed = false: Hỏi Định nghĩa -> Đoán Thuật ngữ (Mặc định chuẩn)
  // isReversed = true:  Hỏi Thuật ngữ  -> Đoán Định nghĩa
  const questionText = currentCard
    ? isReversed
      ? currentCard.term
      : currentCard.definition
    : '';

  const answerTarget = currentCard
    ? isReversed
      ? currentCard.definition
      : currentCard.term
    : '';

  // Tự động phát âm thanh và focus vào ô input khi chuyển thẻ
  useEffect(() => {
    if (currentCard && !sessionResults.completed && !feedback) {
      setInputValue('');
      setRevealedHintChars(0);
      setMistakeRetryInput('');
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);

      if (autoPlayAudio) {
        if (isReversed) {
          // Hỏi Term -> Đọc Term
          if (currentCard.pinyin) {
            speakChinese(currentCard.term);
          } else {
            speakTerm(currentCard.term);
          }
        }
      }
    }
  }, [currentIndex, sessionResults.completed, isReversed]);

  // Dọn dẹp TTS khi rời trang
  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  // Xử lý gửi câu trả lời với so khớp thông minh hỗ trợ nhiều nghĩa
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || feedback) return;

    const isMatch = checkAnswerMatch(inputValue, answerTarget, currentCard);

    // Ghi lại lịch sử để xem lại toàn bộ bài sau khi hoàn tất
    setHistory((prev) => [
      ...prev,
      {
        card: currentCard,
        userAnswer: inputValue.trim(),
        targetAnswer,
        isCorrect: isMatch,
        hint: currentCard.hint,
        partOfSpeech: currentCard.partOfSpeech,
      },
    ]);

    if (isMatch) {
      // Đúng!
      sfx.play('correct');
      setFeedback('correct');

      // Tự động đọc phát âm đáp án đúng
      if (currentCard.pinyin) {
        speakChinese(currentCard.term);
      } else {
        speakTerm(currentCard.term);
      }

      // Cập nhật tiến độ lên Server (Spaced Repetition Leitner Box & Daily Streak)
      if (user && currentCard._id) {
        progressService
          .update(id, { cardId: currentCard._id, status: 'mastered' })
          .then((res) => {
            if (res.data?.userStreak) {
              updateUser(res.data.userStreak);
            }
          })
          .catch(() => {});
      }

      setSessionResults((prev) => ({
        ...prev,
        correctFirstTry: prev.correctFirstTry + (revealedHintChars === 0 ? 1 : 0),
      }));

      // Chuyển thẻ tiếp theo sau 800ms
      setTimeout(() => {
        moveToNextCard();
      }, 800);
    } else {
      // Sai!
      sfx.play('wrong');
      setFeedback('wrong');

      if (user && currentCard._id) {
        progressService.update(id, { cardId: currentCard._id, status: 'learning' }).catch(() => {});
      }

      setSessionResults((prev) => ({
        ...prev,
        wrongCards: [...prev.wrongCards, currentCard],
      }));

      setTimeout(() => {
        if (retryInputRef.current) retryInputRef.current.focus();
      }, 100);
    }
  };

  // Khi gõ sai, người học gõ lại đúng đáp án để củng cố
  const handleRetrySubmit = (e) => {
    e.preventDefault();
    const isRetryMatch = checkAnswerMatch(mistakeRetryInput, answerTarget, currentCard);

    if (isRetryMatch) {
      sfx.play('correct');
      moveToNextCard();
    } else {
      sfx.play('wrong');
    }
  };

  const moveToNextCard = () => {
    setFeedback(null);
    setInputValue('');
    setMistakeRetryInput('');
    setRevealedHintChars(0);
    setShowCardHint(false);

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Hoàn thành phiên học
      sfx.play('fanfare');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setSessionResults((prev) => ({ ...prev, completed: true }));
    }
  };

  // Nút gợi ý (Hé lộ thêm 1 ký tự)
  const handleGiveHint = () => {
    sfx.play('click');
    if (revealedHintChars < answerTarget.length) {
      const nextCount = revealedHintChars + 1;
      setRevealedHintChars(nextCount);
      setInputValue(answerTarget.slice(0, nextCount));
      if (inputRef.current) inputRef.current.focus();
    }
  };

  // Đảo chiều học
  const toggleReversed = () => {
    sfx.play('click');
    const next = !isReversed;
    setIsReversed(next);
    localStorage.setItem('memora_learn_reversed', String(next));
  };

  // Học lại từ đầu
  const handleRestart = () => {
    sfx.play('click');
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setFeedback(null);
    setInputValue('');
    setHistory([]);
    setReviewTab('all');
    setShowCardHint(false);
    setSessionResults({
      correctFirstTry: 0,
      wrongCards: [],
      completed: false,
    });
  };

  // Chỉ học lại các từ đã gõ sai
  const handleRetryWrongCards = () => {
    sfx.play('click');
    const uniqueWrongs = Array.from(new Set(sessionResults.wrongCards));
    setCards(uniqueWrongs);
    setCurrentIndex(0);
    setFeedback(null);
    setInputValue('');
    setHistory([]);
    setReviewTab('all');
    setShowCardHint(false);
    setSessionResults({
      correctFirstTry: 0,
      wrongCards: [],
      completed: false,
    });
  };

  if (loading) return <LoadingSpinner message={t('common.loading')} />;

  if (error || !deck) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-2">{t('deck.not_found')}</h2>
        <p className="text-sm text-slate-500 mb-6">{error || t('deck.not_found')}</p>
        <Link to="/" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm">
          {t('deck.back_to_decks')}
        </Link>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-2">{t('deck.empty_title')}</h2>
        <p className="text-sm text-slate-500 mb-6">{t('deck.empty_desc')}</p>
        <Link to={`/decks/${id}`} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm">
          {t('learn.view_deck')}
        </Link>
      </div>
    );
  }

  // --- MÀN HÌNH TỔNG KẾT PHIÊN HỌC & XEM LẠI BÀI TEST ---
  if (sessionResults.completed) {
    const accuracy = Math.round((sessionResults.correctFirstTry / cards.length) * 100);
    const wrongCount = history.filter((h) => !h.isCorrect).length;
    const correctCount = history.filter((h) => h.isCorrect).length;

    const displayedHistory = history.filter((item) => {
      if (reviewTab === 'wrong') return !item.isCorrect;
      if (reviewTab === 'correct') return item.isCorrect;
      return true;
    });

    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-100">
            <Award className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-black text-slate-800 mb-1">{t('learn.awesome_done')}</h1>
          <p className="text-sm text-slate-500 mb-6">
            {t('learn.finished_desc').replace('{title}', deck.title)}
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-center">
              <span className="text-3xl font-black text-indigo-600">{accuracy}%</span>
              <p className="text-xs font-semibold text-indigo-700 mt-1">{t('learn.first_try_correct')}</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-100 text-center">
              <span className="text-3xl font-black text-emerald-600">
                {sessionResults.correctFirstTry}/{cards.length}
              </span>
              <p className="text-xs font-semibold text-emerald-700 mt-1">{t('learn.solid_cards')}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {sessionResults.wrongCards.length > 0 && (
              <button
                onClick={handleRetryWrongCards}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition"
              >
                <RotateCcw className="w-4 h-4" />{' '}
                {t('learn.retry_wrong').replace('{count}', sessionResults.wrongCards.length)}
              </button>
            )}
            <button
              onClick={handleRestart}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition"
            >
              <RotateCcw className="w-4 h-4" /> {t('learn.restart')}
            </button>
            <Link
              to={`/decks/${id}`}
              className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition"
            >
              {t('learn.view_deck')}
            </Link>
          </div>
        </div>

        {/* XEM LẠI BÀI TEST CHI TIẾT (Review Section - Bug 11) */}
        {history.length > 0 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                {t('quiz.review_title')}
              </h2>

              {/* Tabs Lọc: Tất cả / Câu sai / Câu đúng */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold self-start sm:self-auto">
                <button
                  onClick={() => setReviewTab('all')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    reviewTab === 'all'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('learn.review_tab_all').replace('{count}', history.length)}
                </button>
                <button
                  onClick={() => setReviewTab('wrong')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    reviewTab === 'wrong'
                      ? 'bg-white text-rose-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('learn.review_tab_wrong').replace('{count}', wrongCount)}
                </button>
                <button
                  onClick={() => setReviewTab('correct')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    reviewTab === 'correct'
                      ? 'bg-white text-emerald-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('learn.review_tab_correct').replace('{count}', correctCount)}
                </button>
              </div>
            </div>

            {displayedHistory.length === 0 ? (
              <p className="text-center py-8 text-sm text-slate-400">Không có câu nào trong danh mục này.</p>
            ) : (
              <div className="space-y-3">
                {displayedHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border text-sm transition ${
                      item.isCorrect
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-rose-50/40 border-rose-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-base text-slate-900">{item.card.term}</span>
                          {item.partOfSpeech && (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold">
                              {item.partOfSpeech}
                            </span>
                          )}
                          {item.card.pinyin && (
                            <span className="text-xs font-semibold text-indigo-600">
                              {item.card.pinyin}
                            </span>
                          )}
                          <button
                            onClick={() => {
                              if (item.card.pinyin) {
                                speakChinese(item.card.term);
                              } else {
                                speakTerm(item.card.term);
                              }
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-white transition"
                            title={t('learn.listen_audio')}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="text-xs text-slate-600 font-medium">
                          <span className="font-bold text-slate-500">{t('deck.definition_col')}:</span>{' '}
                          {item.card.definition}
                        </div>

                        <div className="pt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                          <div>
                            <span className="text-slate-400 font-semibold">{t('quiz.your_answer')}: </span>
                            <span
                              className={`font-bold ${
                                item.isCorrect ? 'text-emerald-700' : 'text-rose-600 line-through'
                              }`}
                            >
                              {item.userAnswer || '(Bỏ trống)'}
                            </span>
                          </div>
                          {!item.isCorrect && (
                            <div>
                              <span className="text-emerald-700 font-semibold">{t('quiz.correct_answer')}: </span>
                              <span className="font-bold text-emerald-800">{item.targetAnswer}</span>
                            </div>
                          )}
                        </div>

                        {item.hint && (
                          <div className="text-[11px] text-amber-700 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/60 mt-1 inline-block">
                            💡 {t('quiz.explanation_hint')} {item.hint}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 pt-0.5">
                        {item.isCorrect ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Đúng
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">
                            <XCircle className="w-3.5 h-3.5" /> Sai
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / cards.length) * 100);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          to={`/decks/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{deck.title}</span>
        </Link>

        {/* Options */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleReversed}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              isReversed
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title={t('learn.reverse_toggle')}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{isReversed ? t('learn.guess_def') : t('learn.guess_term')}</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
          <span>{t('learn.mode_name')}</span>
          <span>
            {currentIndex + 1} / {cards.length}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* QUESTION CARD */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-lg relative mb-6">
        {/* Category tag & Part of Speech Badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
              {isReversed ? t('learn.type_definition') : t('learn.type_term')}
            </span>
            {currentCard.partOfSpeech && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700">
                {currentCard.partOfSpeech}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              sfx.play('click');
              if (currentCard.pinyin) {
                speakChinese(currentCard.term);
              } else {
                speakTerm(currentCard.term);
              }
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
            title={t('learn.listen_audio')}
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>

        {/* Question Prompt */}
        <div className="min-h-[90px] flex flex-col justify-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 leading-snug">
            {questionText}
          </h2>
          {/* Nếu hỏi Term và là tiếng Trung thì hiện Pinyin để dễ đọc */}
          {isReversed && currentCard.pinyin && (
            <p className="text-sm font-semibold text-indigo-600 mt-1">{currentCard.pinyin}</p>
          )}

          {/* Gợi ý từ vựng (Card Hint - Bug 2) */}
          {showCardHint && currentCard.hint && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{t('learn.card_hint').replace('{hint}', currentCard.hint)}</span>
            </div>
          )}
        </div>

        {/* INPUT FORM (Trạng thái bình thường hoặc khi đã trả lời đúng) */}
        {feedback !== 'wrong' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={feedback === 'correct'}
                placeholder={`${t('learn.type_answer_ph')} (Enter)`}
                autoComplete="off"
                spellCheck="false"
                className={`w-full px-5 py-4 rounded-2xl text-base font-semibold border-2 outline-none transition-all ${
                  feedback === 'correct'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 focus:border-indigo-600 bg-slate-50/50 focus:bg-white text-slate-800 shadow-inner'
                }`}
              />

              {feedback === 'correct' && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-emerald-600 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" /> {t('learn.correct_feedback')}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                {/* Nút Hé lộ ký tự */}
                <button
                  type="button"
                  onClick={handleGiveHint}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3.5 py-2 rounded-xl transition"
                  title="Hé lộ từng chữ cái"
                >
                  <Lightbulb className="w-4 h-4" />
                  <span>{t('learn.hint_btn')} {revealedHintChars > 0 ? `(${revealedHintChars}/${answerTarget.length})` : ''}</span>
                </button>

                {/* Nút Xem Gợi ý thẻ nếu có hint */}
                {currentCard.hint && (
                  <button
                    type="button"
                    onClick={() => {
                      sfx.play('click');
                      setShowCardHint(!showCardHint);
                    }}
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition border ${
                      showCardHint
                        ? 'bg-amber-100 border-amber-300 text-amber-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{showCardHint ? 'Ẩn gợi ý' : 'Xem gợi ý'}</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={!inputValue.trim() || feedback === 'correct'}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-100 transition"
              >
                <span>{t('learn.submit_btn')}</span>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* FEEDBACK MÀN HÌNH KHI GÕ SAI (Yêu cầu gõ lại) */}
        {feedback === 'wrong' && (
          <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 font-black text-rose-700">
              <XCircle className="w-5 h-5" /> {t('learn.wrong_feedback')}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-xl bg-white/80 border border-rose-100">
                <span className="text-xs font-bold text-slate-400 block mb-0.5">{t('quiz.your_answer')}</span>
                <span className="font-semibold text-rose-600 line-through">{inputValue || '(Bỏ trống)'}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200">
                <span className="text-xs font-bold text-emerald-700 block mb-0.5">{t('learn.correct_answer_label')}</span>
                <span className="font-bold text-emerald-800 text-base">{answerTarget}</span>
                {currentCard.pinyin && (
                  <span className="text-xs text-indigo-600 block mt-0.5">{currentCard.pinyin}</span>
                )}
              </div>
            </div>

            {/* Bắt buộc gõ lại đáp án đúng để tiếp tục */}
            <form onSubmit={handleRetrySubmit} className="pt-2">
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                👉 {t('learn.type_to_continue')}
              </label>
              <div className="flex gap-2">
                <input
                  ref={retryInputRef}
                  type="text"
                  value={mistakeRetryInput}
                  onChange={(e) => setMistakeRetryInput(e.target.value)}
                  placeholder={`"${answerTarget}"`}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-rose-300 focus:border-emerald-500 outline-none text-sm font-semibold bg-white"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={!mistakeRetryInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow transition"
                >
                  {t('common.continue') || 'Tiếp tục'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

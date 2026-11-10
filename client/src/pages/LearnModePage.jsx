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
import { speakTerm, speakChinese } from '../utils/speech';
import sfx from '../utils/sfx';
import LoadingSpinner from '../components/LoadingSpinner';

export default function LearnModePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [deck, setDeck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Danh sách thẻ trong phiên học
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Trạng thái nhập liệu của người dùng
  const [inputValue, setInputValue] = useState('');
  const [revealedHintChars, setRevealedHintChars] = useState(0); // Số ký tự đã hé lộ
  const [feedback, setFeedback] = useState(null); // null | 'correct' | 'wrong'
  const [mistakeRetryInput, setMistakeRetryInput] = useState(''); // Ô nhập lại khi gõ sai

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

  // Chuẩn hóa văn bản để so khớp thông minh (bỏ khoảng trắng thừa, chữ hoa/thường, dấu chấm câu mềm)
  const normalize = (str) => {
    if (!str) return '';
    return str
      .trim()
      .toLowerCase()
      .replace(/[\s\t\n]+/g, ' ')
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, '');
  };

  // Xử lý gửi câu trả lời
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || feedback) return;

    const userAns = normalize(inputValue);
    const targetAns = normalize(answerTarget);

    // Ngoài đáp án chính, nếu học tiếng Trung, chấp nhận cả việc gõ đúng Pinyin
    const pinyinAns = currentCard.pinyin ? normalize(currentCard.pinyin) : null;

    const isMatch = userAns === targetAns || (pinyinAns && userAns === pinyinAns);

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

  // Khi gõ sai, người học phải gõ lại đúng đáp án để củng cố
  const handleRetrySubmit = (e) => {
    e.preventDefault();
    const retryAns = normalize(mistakeRetryInput);
    const targetAns = normalize(answerTarget);

    if (retryAns === targetAns) {
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
    setSessionResults({
      correctFirstTry: 0,
      wrongCards: [],
      completed: false,
    });
  };

  if (loading) return <LoadingSpinner message="Đang chuẩn bị phiên luyện gõ..." />;

  if (error || !deck) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Lỗi tải bộ thẻ</h2>
        <p className="text-sm text-slate-500 mb-6">{error || 'Không tìm thấy bộ thẻ'}</p>
        <Link to="/" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm">
          Trở về Trang chủ
        </Link>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Bộ thẻ trống</h2>
        <p className="text-sm text-slate-500 mb-6">Bộ thẻ này chưa có thẻ từ vựng nào để luyện gõ.</p>
        <Link to={`/decks/${id}`} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm">
          Xem chi tiết bộ thẻ
        </Link>
      </div>
    );
  }

  // --- MÀN HÌNH TỔNG KẾT PHIÊN HỌC ---
  if (sessionResults.completed) {
    const accuracy = Math.round((sessionResults.correctFirstTry / cards.length) * 100);
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-100">
            <Award className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-black text-slate-800 mb-1">Xuất sắc hoàn thành!</h1>
          <p className="text-sm text-slate-500 mb-6">
            Bạn vừa hoàn tất phiên luyện gõ từ cho bộ <strong className="text-slate-700">{deck.title}</strong>
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-center">
              <span className="text-3xl font-black text-indigo-600">{accuracy}%</span>
              <p className="text-xs font-semibold text-indigo-700 mt-1">Đúng ngay lần đầu</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-100 text-center">
              <span className="text-3xl font-black text-emerald-600">
                {sessionResults.correctFirstTry}/{cards.length}
              </span>
              <p className="text-xs font-semibold text-emerald-700 mt-1">Thẻ ghi nhớ vững</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {sessionResults.wrongCards.length > 0 && (
              <button
                onClick={handleRetryWrongCards}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition"
              >
                <RotateCcw className="w-4 h-4" /> Ôn lại {sessionResults.wrongCards.length} từ chưa vững
              </button>
            )}
            <button
              onClick={handleRestart}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition"
            >
              <RotateCcw className="w-4 h-4" /> Luyện tập lại từ đầu
            </button>
            <Link
              to={`/decks/${id}`}
              className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition"
            >
              Xem bộ thẻ
            </Link>
          </div>
        </div>
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
            title="Đảo chiều câu hỏi và đáp án"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{isReversed ? 'Đoán Định nghĩa' : 'Đoán Thuật ngữ'}</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
          <span>Luyện gõ từ (Learn Mode)</span>
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
        {/* Category tag */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
            {isReversed ? 'Gõ định nghĩa phù hợp' : 'Gõ thuật ngữ chuẩn'}
          </span>
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
            title="Nghe phát âm chuẩn"
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
                placeholder={`Gõ câu trả lời của bạn... (Nhấn Enter)`}
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
                  <CheckCircle2 className="w-5 h-5" /> Chính xác!
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              {/* Nút Gợi ý */}
              <button
                type="button"
                onClick={handleGiveHint}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3.5 py-2 rounded-xl transition"
                title="Hé lộ từng chữ cái"
              >
                <Lightbulb className="w-4 h-4" />
                <span>Gợi ý {revealedHintChars > 0 ? `(${revealedHintChars}/${answerTarget.length})` : ''}</span>
              </button>

              <button
                type="submit"
                disabled={!inputValue.trim() || feedback === 'correct'}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-100 transition"
              >
                <span>Trả lời</span>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* FEEDBACK MÀN HÌNH KHI GÕ SAI (Yêu cầu gõ lại) */}
        {feedback === 'wrong' && (
          <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 font-black text-rose-700">
              <XCircle className="w-5 h-5" /> Chưa chính xác!
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-xl bg-white/80 border border-rose-100">
                <span className="text-xs font-bold text-slate-400 block mb-0.5">Bạn đã gõ:</span>
                <span className="font-semibold text-rose-600 line-through">{inputValue || '(Bỏ trống)'}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200">
                <span className="text-xs font-bold text-emerald-700 block mb-0.5">Đáp án đúng là:</span>
                <span className="font-bold text-emerald-800 text-base">{answerTarget}</span>
                {currentCard.pinyin && (
                  <span className="text-xs text-indigo-600 block mt-0.5">{currentCard.pinyin}</span>
                )}
              </div>
            </div>

            {/* Bắt buộc gõ lại đáp án đúng để tiếp tục */}
            <form onSubmit={handleRetrySubmit} className="pt-2">
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                👉 Gõ lại đáp án đúng để ghi nhớ và tiếp tục:
              </label>
              <div className="flex gap-2">
                <input
                  ref={retryInputRef}
                  type="text"
                  value={mistakeRetryInput}
                  onChange={(e) => setMistakeRetryInput(e.target.value)}
                  placeholder={`Gõ lại: "${answerTarget}"`}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-rose-300 focus:border-emerald-500 outline-none text-sm font-semibold bg-white"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={!mistakeRetryInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow transition"
                >
                  Tiếp tục
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { deckService } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  Volume2,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function QuizModePage() {
  const { id } = useParams();
  const [deck, setDeck] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [quizFinished, setQuizFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeckAndGenerateQuiz();
  }, [id]);

  const generateQuizQuestions = (cards) => {
    if (!cards || cards.length < 2) return [];

    return cards.map((card) => {
      // 1 đáp án đúng
      const correctAnswer = card.definition;

      // Chọn 3 đáp án sai từ các thẻ còn lại trong bộ
      const otherCards = cards.filter((c) => c._id !== card._id);
      const shuffledOthers = [...otherCards].sort(() => Math.random() - 0.5);
      const wrongChoices = shuffledOthers.slice(0, 3).map((c) => c.definition);

      // Trộn đáp án đúng và các đáp án sai
      const allChoices = [correctAnswer, ...wrongChoices].sort(() => Math.random() - 0.5);

      return {
        cardId: card._id,
        term: card.term,
        correctAnswer,
        choices: allChoices,
        hint: card.hint,
      };
    }).sort(() => Math.random() - 0.5); // Xáo trộn thứ tự câu hỏi
  };

  const loadDeckAndGenerateQuiz = async () => {
    try {
      setLoading(true);
      const res = await deckService.getById(id);
      const deckData = res.data.deck;
      setDeck(deckData);

      const generated = generateQuizQuestions(deckData.cards);
      setQuestions(generated);
      resetQuizState();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetQuizState = () => {
    setCurrentQIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setWrongAnswers([]);
    setQuizFinished(false);
  };

  const handleSelectOption = (choice) => {
    if (isAnswered) return;

    setSelectedOption(choice);
    setIsAnswered(true);

    const currentQ = questions[currentQIndex];
    if (choice === currentQ.correctAnswer) {
      setScore((prev) => prev + 1);
    } else {
      setWrongAnswers((prev) => [
        ...prev,
        {
          term: currentQ.term,
          correctAnswer: currentQ.correctAnswer,
          userAnswer: choice,
        },
      ]);
    }
  };

  const handleNextQuestion = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setQuizFinished(true);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }
  };

  const handleSpeak = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = /^[a-zA-Z0-9\s.,!?'"()-]+$/.test(text) ? 'en-US' : 'vi-VN';
    window.speechSynthesis.speak(utterance);
  };

  if (loading) return <LoadingSpinner message="Đang tạo đề thi trắc nghiệm..." />;
  if (!deck || questions.length < 2) {
    return (
      <div className="text-center py-20">
        Bộ thẻ cần có ít nhất 2 thẻ để sinh câu hỏi trắc nghiệm!
      </div>
    );
  }

  const currentQ = questions[currentQIndex];
  const percentage = Math.round((score / questions.length) * 100);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 min-h-[85vh] flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <Link
            to={`/decks/${id}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Thoát Quiz
          </Link>
          <span className="text-xs font-bold px-3 py-1 bg-purple-50 text-purple-700 rounded-full">
            Chế độ Trắc nghiệm (Quiz Mode)
          </span>
        </div>

        {/* Progress Bar */}
        {!quizFinished && (
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
              <span>Câu hỏi {currentQIndex + 1} / {questions.length}</span>
              <span className="text-indigo-600 font-bold">Điểm hiện tại: {score}</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-purple-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="my-auto py-2">
        {quizFinished ? (
          /* RESULT SCREEN */
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-md text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-black text-slate-800 mb-2">
              {percentage >= 80 ? 'Xuất sắc! Kết quả tuyệt vời!' : 'Hoàn thành bài kiểm tra!'}
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Bạn đã trả lời đúng <strong className="text-slate-800">{score}</strong> trên tổng số{' '}
              <strong className="text-slate-800">{questions.length}</strong> câu ({percentage}%).
            </p>

            {/* List of wrong questions */}
            {wrongAnswers.length > 0 && (
              <div className="mb-8 text-left bg-slate-50 p-5 rounded-2xl border border-slate-200/80 max-h-64 overflow-y-auto">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-500" />
                  Các câu cần xem lại ({wrongAnswers.length}):
                </h4>
                <div className="space-y-3">
                  {wrongAnswers.map((w, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
                      <div className="font-bold text-slate-800 mb-1">Thuật ngữ: {w.term}</div>
                      <div className="text-rose-600 font-medium">Bạn chọn: {w.userAnswer}</div>
                      <div className="text-emerald-700 font-semibold">
                        Đáp án đúng: {w.correctAnswer}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  const generated = generateQuizQuestions(deck.cards);
                  setQuestions(generated);
                  resetQuizState();
                }}
                className="px-6 py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 transition flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Làm lại bài thi
              </button>
              <Link
                to={`/decks/${id}`}
                className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition"
              >
                Quay lại bộ thẻ
              </Link>
            </div>
          </div>
        ) : (
          /* QUESTION CARD */
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            {/* Term Display */}
            <div className="text-center mb-8">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Thuật ngữ cần định nghĩa:
              </span>
              <div className="flex items-center justify-center gap-3 mt-2">
                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                  {currentQ.term}
                </h2>
                <button
                  onClick={() => handleSpeak(currentQ.term)}
                  title="Phát âm"
                  className="p-1.5 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              {currentQ.hint && (
                <p className="text-xs text-amber-600 italic mt-2">💡 Gợi ý: {currentQ.hint}</p>
              )}
            </div>

            {/* 4 Choices Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {currentQ.choices.map((choice, index) => {
                let btnStyle =
                  'bg-white border-slate-200 text-slate-700 hover:border-purple-400 hover:bg-purple-50/40';

                if (isAnswered) {
                  if (choice === currentQ.correctAnswer) {
                    btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold';
                  } else if (choice === selectedOption) {
                    btnStyle = 'bg-rose-50 border-rose-500 text-rose-800 line-through';
                  } else {
                    btnStyle = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
                  }
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleSelectOption(choice)}
                    disabled={isAnswered}
                    className={`p-4 rounded-2xl border-2 text-left font-medium text-sm transition-all flex items-start gap-3 ${btnStyle}`}
                  >
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="leading-snug">{choice}</span>
                  </button>
                );
              })}
            </div>

            {/* Next Button when answered */}
            {isAnswered && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleNextQuestion}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 transition"
                >
                  {currentQIndex === questions.length - 1 ? 'Xem kết quả →' : 'Câu tiếp theo →'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-center text-xs text-slate-400 py-2">
        Quizlet Clone • Tự động tạo câu hỏi trắc nghiệm thông minh
      </div>
    </div>
  );
}


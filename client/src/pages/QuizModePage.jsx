import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { deckService } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sfx } from '../utils/sfx';
import { speak, speakChinese, stopSpeaking } from '../utils/speech';

export default function QuizModePage() {
  const { id } = useParams();
  const { t } = useLanguage();
  const [deck, setDeck] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [answeredHistory, setAnsweredHistory] = useState([]);
  const [reviewTab, setReviewTab] = useState('all'); // 'all' | 'wrong' | 'correct'
  const [quizFinished, setQuizFinished] = useState(false);
  const [isMuted, setIsMuted] = useState(sfx.isMuted());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return sfx.onMuteChange(setIsMuted);
  }, []);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

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
        pinyin: card.pinyin,
        partOfSpeech: card.partOfSpeech,
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
    setAnsweredHistory([]);
    setReviewTab('all');
    setQuizFinished(false);
  };

  const handleSelectOption = (choice) => {
    if (isAnswered) return;

    setSelectedOption(choice);
    setIsAnswered(true);

    const currentQ = questions[currentQIndex];
    const isCorrect = choice === currentQ.correctAnswer;

    // Ghi nhận vào lịch sử để phục vụ xem lại toàn bộ bài thi
    setAnsweredHistory((prev) => [
      ...prev,
      {
        cardId: currentQ.cardId,
        term: currentQ.term,
        pinyin: currentQ.pinyin,
        partOfSpeech: currentQ.partOfSpeech,
        correctAnswer: currentQ.correctAnswer,
        userAnswer: choice,
        isCorrect,
        hint: currentQ.hint,
      },
    ]);

    if (isCorrect) {
      sfx.correct();
      setScore((prev) => prev + 1);
    } else {
      sfx.wrong();
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
      sfx.slide();
      setCurrentQIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setQuizFinished(true);
      sfx.fanfare();
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }
  };

  const handleSpeak = (term, pinyin) => {
    if (pinyin) {
      speakChinese(term);
    } else {
      speak(term);
    }
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
            <ArrowLeft className="w-4 h-4" /> {t('flashcards.exit')}
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const next = sfx.toggleMute();
                setIsMuted(next);
              }}
              title={t('study.sound')}
              className={`p-1.5 rounded-xl border transition ${
                isMuted
                  ? 'bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-100'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <span className="text-xs font-bold px-3 py-1 bg-purple-50 text-purple-700 rounded-full">
              {t('quiz.title')}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        {!quizFinished && (
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
              <span>{t('admin.col_cards')} {currentQIndex + 1} / {questions.length}</span>
              <span className="text-indigo-600 font-bold">{t('study.score')}: {score}</span>
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
          /* RESULT SCREEN VÀ XEM LẠI BÀI THI CHI TIẾT */
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-md text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-black text-slate-800 mb-2">
              {percentage >= 80 ? t('quiz.excellent_title') : t('quiz.finished_title')}
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              {t('quiz.result_summary')
                .replace('{score}', score)
                .replace('{total}', questions.length)
                .replace('{pct}', percentage)}
            </p>

            {/* XEM LẠI BÀI TEST CHI TIẾT (Full Test Review Tabs - Bug 11) */}
            {answeredHistory.length > 0 && (
              <div className="mb-8 text-left bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    {t('quiz.review_title')}
                  </h4>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setReviewTab('all')}
                      className={`px-3 py-1 rounded-lg transition ${
                        reviewTab === 'all'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t('quiz.review_all').replace('{count}', answeredHistory.length)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewTab('wrong')}
                      className={`px-3 py-1 rounded-lg transition ${
                        reviewTab === 'wrong'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t('quiz.review_wrong').replace(
                        '{count}',
                        answeredHistory.filter((a) => !a.isCorrect).length
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewTab('correct')}
                      className={`px-3 py-1 rounded-lg transition ${
                        reviewTab === 'correct'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t('quiz.review_correct').replace(
                        '{count}',
                        answeredHistory.filter((a) => a.isCorrect).length
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {answeredHistory
                    .filter((item) => {
                      if (reviewTab === 'wrong') return !item.isCorrect;
                      if (reviewTab === 'correct') return item.isCorrect;
                      return true;
                    })
                    .map((w, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border text-xs transition ${
                          w.isCorrect
                            ? 'bg-white border-emerald-200'
                            : 'bg-white border-rose-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-slate-800">
                              {w.term}
                            </span>
                            {w.partOfSpeech && (
                              <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold text-[10px]">
                                {w.partOfSpeech}
                              </span>
                            )}
                            {w.pinyin && (
                              <span className="text-xs font-semibold text-indigo-600">
                                {w.pinyin}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleSpeak(w.term, w.pinyin)}
                              className="p-1 rounded text-slate-400 hover:text-purple-600 transition"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[11px] ${
                              w.isCorrect
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {w.isCorrect ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đúng
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-rose-600" /> Sai
                              </>
                            )}
                          </span>
                        </div>

                        <div className="space-y-0.5">
                          <div className={w.isCorrect ? 'text-emerald-700 font-medium' : 'text-rose-600 font-medium'}>
                            <span className="font-semibold text-slate-500">{t('quiz.your_answer')}</span>{' '}
                            <span className={!w.isCorrect ? 'line-through' : ''}>{w.userAnswer}</span>
                          </div>
                          {!w.isCorrect && (
                            <div className="text-emerald-700 font-bold">
                              <span className="font-semibold text-slate-500">{t('quiz.correct_answer')}</span>{' '}
                              {w.correctAnswer}
                            </div>
                          )}
                        </div>

                        {w.hint && (
                          <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                            💡 {t('quiz.explanation_hint')} {w.hint}
                          </div>
                        )}
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
                <RotateCcw className="w-4 h-4" /> {t('quiz.retake_quiz')}
              </button>
              <Link
                to={`/decks/${id}`}
                className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition"
              >
                {t('quiz.back_to_deck')}
              </Link>
            </div>
          </div>
        ) : (
          /* QUESTION CARD */
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            {/* Term Display */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {t('quiz.term_to_define')}
                </span>
                {currentQ.partOfSpeech && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100">
                    {currentQ.partOfSpeech}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-center gap-3 mt-2">
                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                  {currentQ.term}
                </h2>
                <button
                  onClick={() => handleSpeak(currentQ.term, currentQ.pinyin)}
                  title={t('study.sound')}
                  className="p-1.5 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              {currentQ.pinyin && (
                <p className="text-sm font-semibold text-indigo-600 mt-1">{currentQ.pinyin}</p>
              )}

              {currentQ.hint && (
                <p className="text-xs text-amber-600 italic mt-2">💡 {t('quiz.hint')}: {currentQ.hint}</p>
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
                  {currentQIndex === questions.length - 1 ? t('quiz.view_results') : t('quiz.next_question')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-center text-xs text-slate-400 py-2">
        {t('quiz.smart_quiz_slogan')}
      </div>
    </div>
  );
}


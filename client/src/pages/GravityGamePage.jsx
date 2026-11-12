import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { deckService } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useLanguage } from '../context/LanguageContext';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Heart,
  Zap,
  Trophy,
  RotateCcw,
  Sparkles,
  Flame,
  ShieldAlert,
  Play,
  Pause,
  Rocket,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sfx } from '../utils/sfx';

// Cấu hình các cấp độ khó
const DIFFICULTIES = {
  easy: {
    labelKey: 'gravity.diff_easy',
    descKey: 'gravity.diff_easy_desc',
    speed: 0.18,
    speedInc: 0.015,
    maxWords: 1,
    lives: 5,
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  medium: {
    labelKey: 'gravity.diff_med',
    descKey: 'gravity.diff_med_desc',
    speed: 0.28,
    speedInc: 0.025,
    maxWords: 2,
    lives: 4,
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  hard: {
    labelKey: 'gravity.diff_hard',
    descKey: 'gravity.diff_hard_desc',
    speed: 0.42,
    speedInc: 0.035,
    maxWords: 3,
    lives: 3,
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
};

// Chuẩn hóa chuỗi để so khớp linh hoạt
function normalizeText(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // bỏ dấu phụ khi so khớp rộng
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ');
}

// Lấy danh sách câu trả lời hợp lệ cho 1 thẻ từ
function getValidAnswers(card, mode) {
  const answers = [];
  const add = (val) => {
    if (!val) return;
    const clean = String(val).trim().toLowerCase();
    if (clean && !answers.includes(clean)) answers.push(clean);
    // Thêm bản chuẩn hóa không dấu
    const norm = normalizeText(val);
    if (norm && !answers.includes(norm)) answers.push(norm);
  };

  if (mode === 'term') {
    add(card.term);
    if (card.pinyin) add(card.pinyin);
  } else if (mode === 'definition') {
    add(card.definition);
  } else {
    // smart mode: chấp nhận cả term, pinyin, definition
    add(card.term);
    if (card.pinyin) add(card.pinyin);
    add(card.definition);
  }
  return answers;
}

export default function GravityGamePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [deck, setDeck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(sfx.isMuted());

  // Trạng thái màn hình: 'setup' | 'playing' | 'recovery' | 'gameover' | 'victory'
  const [gameState, setGameState] = useState('setup');
  const [isPaused, setIsPaused] = useState(false);

  // Tùy chọn cài đặt
  const [difficulty, setDifficulty] = useState('medium');
  const [matchMode, setMatchMode] = useState('smart'); // 'smart' | 'term' | 'definition'

  // Gameplay state
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lives, setLives] = useState(4);
  const [level, setLevel] = useState(1);
  const [activeMeteors, setActiveMeteors] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [inputShake, setInputShake] = useState(false);

  // Danh sách từ vựng còn lại và từ đã xử lý
  const remainingCardsRef = useRef([]);
  const failedCardIdsRef = useRef(new Set());
  const missedCardsListRef = useRef([]);

  // Từ bị rơi đang trong giai đoạn "Học từ lỗi sai"
  const [recoveryCard, setRecoveryCard] = useState(null);
  const [recoveryInput, setRecoveryInput] = useState('');

  // Hiệu ứng nổ hạt (Explosions)
  const [explosions, setExplosions] = useState([]);

  // Ref cho game loop và audio
  const requestRef = useRef(null);
  const lastTimeRef = useRef(null);
  const arenaRef = useRef(null);
  const inputRef = useRef(null);
  const recoveryInputRef = useRef(null);

  // Lắng nghe mute state
  useEffect(() => {
    return sfx.onMuteChange(setIsMuted);
  }, []);

  // Tải dữ liệu bộ thẻ
  useEffect(() => {
    const fetchDeck = async () => {
      try {
        setLoading(true);
        const res = await deckService.getById(id);
        setDeck(res.data.deck);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDeck();
  }, [id]);

  // Bắt đầu game
  const startGame = () => {
    if (!deck || !deck.cards || deck.cards.length === 0) return;

    const shuffled = [...deck.cards].sort(() => Math.random() - 0.5);
    remainingCardsRef.current = shuffled;
    failedCardIdsRef.current = new Set();
    missedCardsListRef.current = [];

    const config = DIFFICULTIES[difficulty];
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setLives(config.lives);
    setLevel(1);
    setActiveMeteors([]);
    setInputVal('');
    setExplosions([]);
    setIsPaused(false);
    setGameState('playing');

    sfx.click();
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Tạo một thiên thạch mới rơi xuống
  const spawnMeteor = useCallback(() => {
    if (remainingCardsRef.current.length === 0) return null;

    const nextCard = remainingCardsRef.current.shift();
    const config = DIFFICULTIES[difficulty];
    const isRed = failedCardIdsRef.current.has(nextCard._id);

    // Xác định văn bản hiển thị trên thiên thạch
    let promptText = '';
    if (matchMode === 'term') {
      promptText = nextCard.definition;
    } else if (matchMode === 'definition') {
      promptText = nextCard.term;
    } else {
      // Smart: ưu tiên hiển thị Term kèm Pinyin nếu có
      promptText = nextCard.pinyin ? `${nextCard.term} (${nextCard.pinyin})` : nextCard.term;
    }

    const validAnswers = getValidAnswers(nextCard, matchMode);

    // Tọa độ x ngẫu nhiên từ 8% đến 78% để không bị tràn viền
    const x = Math.floor(Math.random() * 70) + 10;
    const baseSpeed = config.speed + (level - 1) * config.speedInc;
    const speed = isRed ? baseSpeed * 1.25 : baseSpeed;

    return {
      id: `meteor-${Date.now()}-${Math.random()}`,
      card: nextCard,
      promptText,
      validAnswers,
      x,
      y: 2, // bắt đầu từ đỉnh 2%
      speed,
      isRed,
    };
  }, [difficulty, level, matchMode]);

  // Vòng lặp trò chơi Game Loop (requestAnimationFrame)
  useEffect(() => {
    if (gameState !== 'playing' || isPaused) return;

    const updateFrame = (time) => {
      if (lastTimeRef.current != null) {
        const delta = (time - lastTimeRef.current) / 16.66; // chuẩn hóa 60fps

        setActiveMeteors((prevMeteors) => {
          const config = DIFFICULTIES[difficulty];
          const updated = [];
          let hitBottomMeteor = null;

          for (const m of prevMeteors) {
            const nextY = m.y + m.speed * delta;
            // Nếu chạm đáy (y >= 88%)
            if (nextY >= 88) {
              hitBottomMeteor = m;
              break;
            } else {
              updated.push({ ...m, y: nextY });
            }
          }

          // Xử lý khi có thiên thạch chạm đáy
          if (hitBottomMeteor) {
            handleMeteorHitBottom(hitBottomMeteor);
            return updated.filter((m) => m.id !== hitBottomMeteor.id);
          }

          // Sinh thêm thiên thạch nếu chưa đủ số lượng tối đa
          if (updated.length < config.maxWords && remainingCardsRef.current.length > 0) {
            // Đảm bảo khoảng cách rơi không đè nhau
            const lowestY = updated.reduce((max, m) => Math.max(max, m.y), 0);
            if (lowestY > 28 || updated.length === 0) {
              const newMeteor = spawnMeteor();
              if (newMeteor) updated.push(newMeteor);
            }
          }

          // Kiểm tra điều kiện chiến thắng nếu hết sạch từ
          if (updated.length === 0 && remainingCardsRef.current.length === 0) {
            setTimeout(handleVictory, 100);
          }

          return updated;
        });
      }

      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(updateFrame);
    };

    requestRef.current = requestAnimationFrame(updateFrame);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      lastTimeRef.current = null;
    };
  }, [gameState, isPaused, difficulty, level, spawnMeteor]);

  // Xử lý khi thiên thạch chạm đáy
  const handleMeteorHitBottom = (meteor) => {
    sfx.alarm();
    setCombo(0);
    failedCardIdsRef.current.add(meteor.card._id);
    missedCardsListRef.current.push(meteor.card);

    setLives((prevLives) => {
      const nextLives = prevLives - 1;
      if (nextLives <= 0) {
        setTimeout(handleGameOver, 200);
        return 0;
      } else {
        // Tạm dừng để người chơi học lại từ bị sai
        setRecoveryCard(meteor.card);
        setRecoveryInput('');
        setGameState('recovery');
        setTimeout(() => {
          recoveryInputRef.current?.focus();
        }, 150);
        return nextLives;
      }
    });
  };

  // Hoàn thành gõ lại từ sai trong modal hồi phục
  const handleRecoverySubmit = (e) => {
    e.preventDefault();
    if (!recoveryCard) return;

    const val = recoveryInput.trim().toLowerCase();
    const validAnswers = getValidAnswers(recoveryCard, matchMode);

    const isMatch = validAnswers.some(
      (ans) => ans === val || normalizeText(ans) === normalizeText(val)
    );

    if (isMatch) {
      sfx.correct();
      // Đưa từ vừa sai trở lại vào cuối hàng đợi để người chơi có cơ hội phục thù
      remainingCardsRef.current.push(recoveryCard);
      setRecoveryCard(null);
      setRecoveryInput('');
      setGameState('playing');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      sfx.wrong();
    }
  };

  // Xử lý khi người chơi gõ đáp án và bấm Enter
  const handleShoot = (e) => {
    e.preventDefault();
    const typed = inputVal.trim().toLowerCase();
    if (!typed || activeMeteors.length === 0) return;

    const typedNorm = normalizeText(typed);

    // Tìm thiên thạch có đáp án khớp và ở vị trí thấp nhất (nguy hiểm nhất)
    let matchedMeteor = null;
    let lowestY = -1;

    for (const m of activeMeteors) {
      const isMatch = m.validAnswers.some((ans) => {
        const cleanAns = ans.trim().toLowerCase();
        return (
          cleanAns === typed ||
          normalizeText(cleanAns) === typedNorm ||
          // Nếu câu trả lời dài có nhiều từ, kiểm tra chứa từ
          (cleanAns.length > 5 && cleanAns.includes(typed))
        );
      });

      if (isMatch && m.y > lowestY) {
        matchedMeteor = m;
        lowestY = m.y;
      }
    }

    if (matchedMeteor) {
      // BẮN TRÚNG THIÊN THẠCH!
      sfx.laser();
      setTimeout(() => sfx.explode(), 80);

      // Thêm hiệu ứng nổ
      const explosionId = Date.now();
      setExplosions((prev) => [
        ...prev,
        { id: explosionId, x: matchedMeteor.x, y: matchedMeteor.y },
      ]);
      setTimeout(() => {
        setExplosions((prev) => prev.filter((exp) => exp.id !== explosionId));
      }, 700);

      // Tính điểm
      const basePoints = 100;
      const heightBonus = Math.round((100 - matchedMeteor.y) * 1.5);
      const isRedBonus = matchedMeteor.isRed ? 150 : 0;
      const nextCombo = combo + 1;
      const comboMultiplier = Math.min(3, 1 + nextCombo * 0.1);
      const earnedPoints = Math.round((basePoints + heightBonus + isRedBonus) * comboMultiplier);

      setScore((prev) => prev + earnedPoints);
      setCombo(nextCombo);
      setMaxCombo((prev) => Math.max(prev, nextCombo));

      // Tăng level mỗi 5 từ tiêu diệt
      if (nextCombo > 0 && nextCombo % 5 === 0) {
        setLevel((prev) => prev + 1);
      }

      // Xóa thiên thạch bị bắn trúng
      setActiveMeteors((prev) => prev.filter((m) => m.id !== matchedMeteor.id));
      setInputVal('');
    } else {
      // Gõ sai hoặc không khớp từ nào
      sfx.retry();
      setInputShake(true);
      setTimeout(() => setInputShake(false), 400);
    }
  };

  // Chiến thắng (Tiêu diệt hết thiên thạch)
  const handleVictory = () => {
    setGameState('victory');
    sfx.fanfare();
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });
  };

  // Game over
  const handleGameOver = () => {
    setGameState('gameover');
    sfx.wrong();
  };

  if (loading) {
    return <LoadingSpinner message={t('common.loading')} />;
  }

  if (!deck || !deck.cards || deck.cards.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-2">{t('deck.no_cards')}</h2>
        <p className="text-sm text-slate-500 mb-6">{t('deck.description') || '...'}</p>
        <Link
          to={`/decks/${id}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> {t('common.back')}
        </Link>
      </div>
    );
  }

  // ==========================================
  // 1. MÀN HÌNH CÀI ĐẶT (SETUP SCREEN)
  // ==========================================
  if (gameState === 'setup') {
    return (
      <div className="min-h-[85vh] bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Link
              to={`/decks/${id}`}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" /> {t('gravity.exit')}
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMuted(sfx.toggleMute())}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition"
                title={isMuted ? t('gravity.sound_on') : t('gravity.sound_off')}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>
          </div>

          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 via-orange-500 to-amber-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/25 border-2 border-white/20">
              <Rocket className="w-8 h-8 text-white animate-pulse" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
              {t('gravity.title')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              {t('gravity.subtitle')}
            </p>
          </div>

          {/* Chọn Độ Khó */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              {t('gravity.diff_label')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {Object.entries(DIFFICULTIES).map(([key, item]) => {
                const isSelected = difficulty === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setDifficulty(key);
                      sfx.click();
                    }}
                    className={`p-3.5 rounded-2xl text-left border-2 transition-all relative ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-extrabold text-xs mb-1 flex items-center justify-between">
                      <span>{t(item.labelKey)}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight">
                      {t(item.descKey)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chọn Chế Độ So Khớp */}
          <div className="mb-8">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              {t('gravity.mode_label')}
            </label>
            <div className="space-y-2">
              <label
                onClick={() => setMatchMode('smart')}
                className={`flex items-center justify-between p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                  matchMode === 'smart'
                    ? 'bg-purple-600/20 border-purple-500 text-white'
                    : 'bg-slate-800/40 border-slate-700/50 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <div>
                    <div className="text-xs font-bold">{t('gravity.mode_smart')}</div>
                    <div className="text-[10px] text-slate-400">
                      {t('gravity.mode_smart_desc')}
                    </div>
                  </div>
                </div>
                <input
                  type="radio"
                  name="matchMode"
                  checked={matchMode === 'smart'}
                  onChange={() => {}}
                  className="accent-purple-500"
                />
              </label>

              <label
                onClick={() => setMatchMode('term')}
                className={`flex items-center justify-between p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                  matchMode === 'term'
                    ? 'bg-purple-600/20 border-purple-500 text-white'
                    : 'bg-slate-800/40 border-slate-700/50 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <div>
                    <div className="text-xs font-bold">{t('gravity.mode_term')}</div>
                    <div className="text-[10px] text-slate-400">
                      {t('gravity.mode_term_desc')}
                    </div>
                  </div>
                </div>
                <input
                  type="radio"
                  name="matchMode"
                  checked={matchMode === 'term'}
                  onChange={() => {}}
                  className="accent-purple-500"
                />
              </label>

              <label
                onClick={() => setMatchMode('definition')}
                className={`flex items-center justify-between p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                  matchMode === 'definition'
                    ? 'bg-purple-600/20 border-purple-500 text-white'
                    : 'bg-slate-800/40 border-slate-700/50 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-xs font-bold">{t('gravity.mode_def')}</div>
                    <div className="text-[10px] text-slate-400">
                      {t('gravity.mode_def_desc')}
                    </div>
                  </div>
                </div>
                <input
                  type="radio"
                  name="matchMode"
                  checked={matchMode === 'definition'}
                  onChange={() => {}}
                  className="accent-purple-500"
                />
              </label>
            </div>
          </div>

          {/* Nút Bắt đầu */}
          <button
            onClick={startGame}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 hover:from-rose-600 hover:via-orange-600 hover:to-amber-600 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] border-b-4 border-orange-700"
          >
            {t('gravity.start_btn').replace('{count}', deck.cards.length)}
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. MÀN HÌNH CHƠI CHÍNH (PLAYING ARENA)
  // ==========================================
  return (
    <div className="min-h-[90vh] bg-slate-950 text-white flex flex-col select-none relative overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Sao nền lấp lánh (Space Starfield) */}
      <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />

      {/* Header Dashboard */}
      <div className="relative z-20 px-4 py-3 bg-slate-900/80 border-b border-slate-800/80 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (window.confirm(t('gravity.exit_confirm'))) {
                setGameState('setup');
              }
            }}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
            title={t('gravity.exit')}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-xs font-black text-white">{deck.title}</span>
            <div className="text-[10px] text-slate-400">
              {t('gravity.level')} {level} • {t('gravity.words_left').replace('{count}', remainingCardsRef.current.length + activeMeteors.length)}
            </div>
          </div>
        </div>

        {/* Chỉ số: Điểm, Combo, Mạng */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Mạng (Lives) */}
          <div className="flex items-center gap-1">
            {Array.from({ length: DIFFICULTIES[difficulty].lives }).map((_, i) => (
              <Heart
                key={i}
                className={`w-4 h-4 transition-all ${
                  i < lives
                    ? 'text-rose-500 fill-rose-500 scale-100'
                    : 'text-slate-700 fill-slate-800 scale-90'
                }`}
              />
            ))}
          </div>

          {/* Combo */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Zap className="w-3.5 h-3.5 fill-amber-400" />
            <span className="text-xs font-black">
              {combo > 1 ? `x${combo} Combo` : `${combo} Combo`}
            </span>
          </div>

          {/* Điểm số */}
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('gravity.score')}</div>
            <div className="text-sm sm:text-base font-black text-white">{score.toLocaleString()}</div>
          </div>

          {/* Tạm dừng & Âm thanh */}
          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
            <button
              onClick={() => setIsPaused((prev) => !prev)}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition"
              title={isPaused ? t('gravity.resume') : t('gravity.paused')}
            >
              {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsMuted(sfx.toggleMute())}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition"
              title={isMuted ? t('gravity.sound_on') : t('gravity.sound_off')}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Khung trời rơi thiên thạch (Falling Arena) */}
      <div ref={arenaRef} className="flex-1 relative overflow-hidden">
        {/* Vạch cảnh báo nguy hiểm gần đáy */}
        <div className="absolute bottom-[14%] left-0 right-0 h-1 border-t border-dashed border-rose-500/30 pointer-events-none flex items-center justify-end px-4">
          <span className="text-[9px] font-bold tracking-widest uppercase text-rose-500/40">
            {t('gravity.defense_zone')}
          </span>
        </div>

        {/* Các thiên thạch đang rơi */}
        {activeMeteors.map((m) => (
          <div
            key={m.id}
            className={`absolute px-4 py-2.5 rounded-2xl shadow-xl transition-transform flex items-center gap-2 border-2 ${
              m.isRed
                ? 'bg-gradient-to-r from-red-600 to-rose-700 border-red-400 text-white shadow-red-500/40 animate-pulse scale-105'
                : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-indigo-500/60 text-white shadow-indigo-500/20'
            }`}
            style={{
              left: `${m.x}%`,
              top: `${m.y}%`,
              transform: 'translate(-50%, 0)',
            }}
          >
            {m.isRed ? (
              <Flame className="w-4 h-4 text-amber-300 animate-bounce" />
            ) : (
              <Rocket className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span className="font-extrabold text-xs sm:text-sm tracking-wide drop-shadow">
              {m.promptText}
            </span>
          </div>
        ))}

        {/* Hiệu ứng nổ hạt khi bắn trúng */}
        {explosions.map((exp) => (
          <div
            key={exp.id}
            className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${exp.x}%`, top: `${exp.y}%` }}
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 animate-ping opacity-75" />
              <div className="absolute inset-0 flex items-center justify-center font-black text-xs text-amber-300 animate-bounce">
                💥 +100
              </div>
            </div>
          </div>
        ))}

        {/* Màn hình tạm dừng khi người dùng bấm Pause */}
        {isPaused && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex items-center justify-center">
            <div className="text-center p-6 bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full mx-4 shadow-2xl">
              <h2 className="text-xl font-black text-white mb-2">{t('gravity.paused_title')}</h2>
              <p className="text-xs text-slate-400 mb-6">{t('gravity.paused_desc')}</p>
              <button
                onClick={() => setIsPaused(false)}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider"
              >
                {t('gravity.resume_btn')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Khu vực nhập liệu ở đáy màn hình (Bottom Defense Input) */}
      <div className="relative z-20 px-4 py-3 bg-slate-900/90 border-t border-slate-800/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleShoot} className="flex items-center gap-2 sm:gap-3">
            <div
              className={`flex-1 relative rounded-2xl border-2 transition-all ${
                inputShake
                  ? 'border-rose-500 ring-2 ring-rose-500/30 animate-shake'
                  : 'border-indigo-500/50 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-400/20'
              } bg-slate-950`}
            >
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={t('gravity.type_here')}
                disabled={isPaused || gameState !== 'playing'}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                className="w-full px-4 py-3 bg-transparent text-white placeholder-slate-500 text-sm font-semibold outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={!inputVal.trim() || isPaused || gameState !== 'playing'}
              className="px-5 sm:px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/20 transition-all active:scale-95 border-b-2 border-indigo-800 shrink-0"
            >
              {t('gravity.shoot')}
            </button>
          </form>
        </div>
      </div>

      {/* ==========================================
          3. POPUP PHỤC HỒI: HỌC TỪ LỖI SAI (RECOVERY MODAL)
          ========================================== */}
      {gameState === 'recovery' && recoveryCard && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border-2 border-rose-500/50 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6 animate-bounce" />
            </div>
            <h3 className="text-base font-black text-center text-white mb-1">
              {t('gravity.recovery_title')}
            </h3>
            <p className="text-xs text-center text-slate-400 mb-4">
              {t('gravity.recovery_desc')}
            </p>

            {/* Thẻ gợi ý từ sai */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 mb-4 text-center">
              <div className="text-xs text-slate-400 mb-1">{t('gravity.recovery_term_label')}</div>
              <div className="text-lg font-black text-amber-300 mb-1">{recoveryCard.term}</div>
              {recoveryCard.pinyin && (
                <div className="text-xs text-indigo-300 mb-1">Pinyin: {recoveryCard.pinyin}</div>
              )}
              <div className="text-xs text-slate-300">{recoveryCard.definition}</div>
            </div>

            <form onSubmit={handleRecoverySubmit} className="space-y-3">
              <input
                ref={recoveryInputRef}
                type="text"
                value={recoveryInput}
                onChange={(e) => setRecoveryInput(e.target.value)}
                placeholder={t('gravity.recovery_input_ph')}
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-semibold outline-none focus:border-rose-400"
              />
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-500/20 hover:scale-[1.02] active:scale-95 transition"
              >
                {t('gravity.recovery_btn')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          4. MÀN HÌNH GAME OVER
          ========================================== */}
      {gameState === 'gameover' && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white mb-1">{t('gravity.game_over_title')}</h2>
            <p className="text-xs text-slate-400 mb-6">
              {t('gravity.game_over_desc')}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">{t('gravity.score_earned')}</div>
                <div className="text-xl font-black text-white mt-1">{score.toLocaleString()}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">{t('gravity.highest_combo')}</div>
                <div className="text-xl font-black text-amber-400 mt-1">{maxCombo} x</div>
              </div>
            </div>

            {/* Các từ đã bỏ lỡ */}
            {missedCardsListRef.current.length > 0 && (
              <div className="mb-6 text-left">
                <div className="text-[11px] font-bold text-slate-400 uppercase mb-2">
                  {t('gravity.missed_words').replace('{count}', missedCardsListRef.current.length)}
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  {missedCardsListRef.current.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-slate-300">
                      <span className="font-bold text-amber-300">{c.term}</span>
                      <span className="text-slate-400 text-[11px] truncate max-w-[180px]">{c.definition}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              <button
                onClick={startGame}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> {t('gravity.restart')}
              </button>
              <button
                onClick={() => setGameState('setup')}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                {t('gravity.change_diff')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          5. MÀN HÌNH CHIẾN THẮNG (VICTORY)
          ========================================== */}
      {gameState === 'victory' && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Trophy className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white mb-1">{t('gravity.victory_title')}</h2>
            <p className="text-xs text-slate-400 mb-6">
              {t('gravity.victory_desc')}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">{t('gravity.total_score')}</div>
                <div className="text-xl font-black text-emerald-400 mt-1">{score.toLocaleString()}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">{t('gravity.highest_combo')}</div>
                <div className="text-xl font-black text-amber-400 mt-1">{maxCombo} x</div>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={startGame}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> {t('gravity.restart')}
              </button>
              <Link
                to={`/decks/${id}`}
                className="block w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                {t('study.back_to_deck')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

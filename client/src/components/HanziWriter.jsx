import React, { useEffect, useRef, useState } from 'react';
import { PenLine, Play, RotateCcw, Lightbulb, Eye, EyeOff, CheckCircle2, Trophy, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sfx } from '../utils/sfx';

/**
 * HanziWriter Component - Hỗ trợ cả 2 chế độ:
 * 1. Xem animation thứ tự nét bút (Animation Mode)
 * 2. Tự tay luyện viết tương tác có chấm điểm (Interactive Quiz Mode)
 */
export default function HanziWriter({ characters, autoAnimate = false }) {
  const containerRef = useRef(null);
  const writersRef = useRef([]);
  const [loaded, setLoaded] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [error, setError] = useState(false);

  // Tab: 'animation' (Xem mẫu) | 'quiz' (Tập viết)
  const [mode, setMode] = useState('quiz');
  const [activeCharIndex, setActiveCharIndex] = useState(0);

  // Quiz state
  const [showOutline, setShowOutline] = useState(true);
  const [quizProgress, setQuizProgress] = useState({
    strokeNum: 0,
    totalStrokes: 0,
    mistakes: 0,
    completed: false,
  });

  // Lọc ra các chữ Hán hợp lệ từ chuỗi
  const hanziChars = [...(characters || '')].filter((c) =>
    /[\u4e00-\u9fff\u3400-\u4dbf]/.test(c)
  );

  useEffect(() => {
    if (hanziChars.length === 0) return;

    // Tải thư viện hanzi-writer từ CDN nếu chưa có
    const loadHanziWriter = () => {
      return new Promise((resolve, reject) => {
        if (window.HanziWriter) {
          resolve(window.HanziWriter);
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js';
        script.onload = () => resolve(window.HanziWriter);
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    let isMounted = true;
    loadHanziWriter()
      .then((HanziWriter) => {
        if (!isMounted || !containerRef.current) return;

        // Xóa các writer cũ
        writersRef.current = [];
        containerRef.current.innerHTML = '';

        hanziChars.forEach((char, idx) => {
          // Tạo một vùng SVG riêng cho từng chữ
          const wrapper = document.createElement('div');
          wrapper.className = `hanzi-char-box flex flex-col items-center gap-2 p-3 bg-white rounded-2xl border border-indigo-100 shadow-sm transition ${
            idx === activeCharIndex ? 'ring-2 ring-indigo-500 shadow-indigo-100' : ''
          }`;
          wrapper.setAttribute('data-index', idx);

          const svgEl = document.createElement('div');
          svgEl.id = `hanzi-${idx}-${char}`;
          svgEl.className = 'relative cursor-crosshair rounded-xl overflow-hidden bg-slate-50/50';
          svgEl.style.width = '160px';
          svgEl.style.height = '160px';
          // Ngăn cản cuộn trang trên màn hình cảm ứng khi vẽ nét
          svgEl.style.touchAction = 'none';

          const label = document.createElement('div');
          label.textContent = `${char} (Chữ ${idx + 1})`;
          label.className = 'text-xs text-center font-bold text-indigo-700';

          wrapper.appendChild(svgEl);
          wrapper.appendChild(label);
          containerRef.current.appendChild(wrapper);

          try {
            const writer = HanziWriter.create(svgEl, char, {
              width: 160,
              height: 160,
              padding: 12,
              showOutline: true,
              strokeColor: '#4338ca', // Indigo-700
              outlineColor: '#e2e8f0', // Slate-200
              drawingColor: '#2563eb', // Blue-600
              strokeAnimationSpeed: 1,
              delayBetweenStrokes: 120,
              drawingWidth: 16,
              showHintAfterMisses: 2,
              highlightOnComplete: true,
            });
            writersRef.current.push(writer);
          } catch (e) {
            console.warn(`Không thể tải chữ Hán "${char}":`, e);
          }
        });

        setLoaded(true);

        // Khởi động chế độ tương ứng
        if (mode === 'quiz') {
          startQuiz(activeCharIndex);
        } else if (autoAnimate) {
          animateAll();
        }
      })
      .catch(() => {
        if (isMounted) setError(true);
      });

    return () => {
      isMounted = false;
      writersRef.current.forEach((w) => {
        try {
          w.cancelQuiz();
          w.stopAnimation();
        } catch (e) {}
      });
      writersRef.current = [];
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [characters]);

  // Cập nhật outline khi showOutline thay đổi
  useEffect(() => {
    writersRef.current.forEach((w) => {
      try {
        if (showOutline) {
          w.showOutline();
        } else {
          w.hideOutline();
        }
      } catch (e) {}
    });
  }, [showOutline]);

  // Bắt đầu chế độ tập viết (Quiz) cho chữ thứ charIdx
  const startQuiz = (charIdx) => {
    if (!writersRef.current[charIdx]) return;

    // Dừng animation và quiz của các chữ khác
    writersRef.current.forEach((w, i) => {
      try {
        w.cancelQuiz();
        w.stopAnimation();
        if (i !== charIdx) {
          w.showCharacter();
        }
      } catch (e) {}
    });

    const activeWriter = writersRef.current[charIdx];
    try {
      activeWriter.hideCharacter();
      if (showOutline) {
        activeWriter.showOutline();
      } else {
        activeWriter.hideOutline();
      }

      setQuizProgress({
        strokeNum: 0,
        totalStrokes: 0,
        mistakes: 0,
        completed: false,
      });

      activeWriter.quiz({
        showOutline: showOutline,
        showCharacter: false,
        showHintAfterMisses: 2,
        onCorrectStroke: (data) => {
          sfx.click();
          setQuizProgress((prev) => ({
            ...prev,
            strokeNum: data.strokeNum + 1,
            totalStrokes: data.strokeNum + 1 + data.strokesRemaining,
          }));
        },
        onMistake: (data) => {
          sfx.wrong();
          setQuizProgress((prev) => ({
            ...prev,
            mistakes: data.totalMistakes,
          }));
        },
        onComplete: (summary) => {
          sfx.correct();
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
          setQuizProgress((prev) => ({
            ...prev,
            completed: true,
            mistakes: summary.totalMistakes,
          }));
        },
      });
    } catch (err) {
      console.warn('Lỗi khởi động HanziWriter quiz:', err);
    }
  };

  // Chuyển chữ cần luyện viết
  const handleSelectChar = (idx) => {
    setActiveCharIndex(idx);
    if (mode === 'quiz') {
      startQuiz(idx);
    }
  };

  // Đổi chế độ giữa Xem mẫu và Tập viết
  const handleSwitchMode = (newMode) => {
    setMode(newMode);
    sfx.click();
    if (newMode === 'quiz') {
      stopAll();
      startQuiz(activeCharIndex);
    } else {
      writersRef.current.forEach((w) => {
        try {
          w.cancelQuiz();
          w.showCharacter();
          w.showOutline();
        } catch (e) {}
      });
      animateAll();
    }
  };

  // Gợi ý nét bút hiện tại
  const handleGiveHint = () => {
    sfx.slide();
    const activeWriter = writersRef.current[activeCharIndex];
    if (activeWriter) {
      try {
        activeWriter.highlightStroke(quizProgress.strokeNum);
      } catch (e) {}
    }
  };

  // Viết lại chữ hiện tại
  const handleRestartQuiz = () => {
    sfx.slide();
    startQuiz(activeCharIndex);
  };

  // Chạy hoạt ảnh tất cả các chữ
  const animateAll = () => {
    if (writersRef.current.length === 0) return;
    setAnimating(true);

    let chain = Promise.resolve();
    writersRef.current.forEach((writer) => {
      chain = chain.then(
        () =>
          new Promise((resolve) => {
            writer.showOutline();
            writer.animateCharacter({
              onComplete: resolve,
            });
          })
      );
    });

    chain.finally(() => setAnimating(false));
  };

  const loopAll = () => {
    writersRef.current.forEach((writer) => writer.loopCharacterAnimation());
    setAnimating(true);
  };

  const stopAll = () => {
    writersRef.current.forEach((writer) => {
      try {
        writer.stopAnimation();
      } catch (e) {}
    });
    setAnimating(false);
  };

  if (hanziChars.length === 0) return null;

  const currentChar = hanziChars[activeCharIndex] || hanziChars[0];
  const scorePercent = Math.max(0, 100 - quizProgress.mistakes * 15);

  return (
    <div className="bg-gradient-to-b from-indigo-50/80 to-white border border-indigo-100 rounded-3xl p-5 shadow-sm">
      {/* Top Header: Chuyển Mode & Điều khiển */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-indigo-100/80">
        {/* Tab chuyển đổi chế độ */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-indigo-100 shadow-sm self-start">
          <button
            onClick={() => handleSwitchMode('quiz')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              mode === 'quiz'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-indigo-600'
            }`}
          >
            <PenLine className="w-3.5 h-3.5" />
            Tự luyện viết (Quiz)
          </button>
          <button
            onClick={() => handleSwitchMode('animation')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              mode === 'animation'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-indigo-600'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            Xem mẫu nét bút
          </button>
        </div>

        {/* Thanh công cụ phụ trợ */}
        {loaded && mode === 'quiz' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowOutline((prev) => !prev)}
              title={showOutline ? 'Ẩn nét viền mờ' : 'Hiện nét viền mờ'}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl transition"
            >
              {showOutline ? <Eye className="w-3.5 h-3.5 text-indigo-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
              <span>{showOutline ? 'Viền mờ: Bật' : 'Viền mờ: Tắt'}</span>
            </button>
            <button
              onClick={handleGiveHint}
              disabled={quizProgress.completed}
              title="Gợi ý nét tiếp theo"
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-xl transition disabled:opacity-50"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              Gợi ý nét
            </button>
            <button
              onClick={handleRestartQuiz}
              title="Vẽ lại từ đầu"
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Viết lại
            </button>
          </div>
        )}

        {loaded && mode === 'animation' && (
          <div className="flex items-center gap-2">
            <button
              onClick={animating ? stopAll : animateAll}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                animating
                  ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              {animating ? 'Dừng' : 'Phát nét bút'}
            </button>
            <button
              onClick={loopAll}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition"
            >
              Lặp liên tục
            </button>
          </div>
        )}
      </div>

      {/* Multi-character selector: Nếu từ vựng có nhiều hơn 1 chữ Hán */}
      {hanziChars.length > 1 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Chọn chữ:</span>
          {hanziChars.map((char, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectChar(idx)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                idx === activeCharIndex
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300'
              }`}
            >
              <span>{char}</span>
              <span className="text-[10px] opacity-70">#{idx + 1}</span>
            </button>
          ))}
        </div>
      )}

      {/* Quiz Progress & Feedback Banner */}
      {mode === 'quiz' && (
        <div className="mb-4">
          {quizProgress.completed ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-emerald-900 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Xuất sắc! Đã hoàn thành chữ <strong>{currentChar}</strong> ({scorePercent} điểm • {quizProgress.mistakes} lỗi)
                </span>
              </div>
              {activeCharIndex < hanziChars.length - 1 && (
                <button
                  onClick={() => handleSelectChar(activeCharIndex + 1)}
                  className="px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-bold"
                >
                  Tập viết chữ tiếp theo →
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs text-slate-600 bg-white/70 px-4 py-2 rounded-xl border border-indigo-100">
              <span className="font-semibold text-indigo-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                Hãy dùng chuột hoặc ngón tay vẽ theo từng nét chữ <strong>{currentChar}</strong>
              </span>
              <div className="flex items-center gap-3 font-medium">
                {quizProgress.totalStrokes > 0 && (
                  <span>Nét: <strong>{quizProgress.strokeNum}</strong> / {quizProgress.totalStrokes}</span>
                )}
                <span className={quizProgress.mistakes > 0 ? 'text-amber-600 font-semibold' : 'text-slate-500'}>
                  Lỗi: {quizProgress.mistakes}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Canvas SVG Container */}
      {error ? (
        <p className="text-xs text-slate-500 italic text-center py-6">
          Không thể tải dữ liệu nét bút (cần kết nối Internet để tải thư viện Hanzi Writer).
        </p>
      ) : (
        <div className="relative min-h-[170px] flex items-center justify-center">
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-indigo-500 py-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang chuẩn bị bảng luyện viết...
            </div>
          )}
          {/* Vùng chứa riêng biệt cho HanziWriter - Tuyệt đối không chứa React child node */}
          <div
            ref={containerRef}
            className={`flex flex-wrap gap-4 justify-center items-center ${
              !loaded ? 'opacity-0' : 'opacity-100'
            } transition-opacity`}
          />
        </div>
      )}
    </div>
  );
}

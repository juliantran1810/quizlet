import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Volume2, Sparkles, CheckCircle2, RotateCcw, Lightbulb } from 'lucide-react';

export default function Flashcard3D({
  card,
  currentIndex,
  totalCards,
  status = 'learning',
  onNext,
  onPrev,
  onMarkStatus,
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Reset trạng thái lật thẻ khi chuyển sang thẻ khác
  useEffect(() => {
    setIsFlipped(false);
    setShowHint(false);
  }, [currentIndex, card]);

  // Lắng nghe phím tắt: Space để lật thẻ, Trái/Phải để chuyển bài
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Bỏ qua nếu người dùng đang gõ trong input/textarea
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        onNext && onNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        onPrev && onPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev]);

  // Tính năng phát âm Text-To-Speech (Web Speech API)
  const handleSpeak = (text, e) => {
    e.stopPropagation();
    if (!('speechSynthesis' in window)) {
      alert('Trình duyệt của bạn không hỗ trợ tính năng đọc âm thanh');
      return;
    }

    // Hủy các câu đọc trước đó nếu còn đang đọc
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    // Nhận diện tiếng Anh nếu chứa ký tự latin phổ thông hoặc tiếng Việt
    utterance.lang = /^[a-zA-Z0-9\s.,!?'"()-]+$/.test(text) ? 'en-US' : 'vi-VN';
    utterance.rate = 0.9; // Tốc độ vừa phải dễ nghe
    window.speechSynthesis.speak(utterance);
  };

  if (!card) return null;

  return (
    <div className="w-full max-w-2xl mx-auto select-none">
      {/* 3D Card Container */}
      <div
        className="w-full h-80 sm:h-96 cursor-pointer perspective-1000"
        onClick={() => setIsFlipped((prev) => !prev)}
      >
        <motion.div
          className="relative w-full h-full transform-style-preserve-3d shadow-xl rounded-3xl"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        >
          {/* MẶT TRƯỚC: THUẬT NGỮ (TERM) */}
          <div className="absolute inset-0 backface-hidden bg-white border-2 border-indigo-100 rounded-3xl p-8 flex flex-col justify-between shadow-sm hover:border-indigo-300 transition-colors">
            {/* Top Toolbar mặt trước */}
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 font-semibold rounded-full">
                <Sparkles className="w-3.5 h-3.5" /> Thuật ngữ (Term)
              </span>

              <div className="flex items-center gap-2">
                {card.hint && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowHint((prev) => !prev);
                    }}
                    title="Gợi ý"
                    className="p-2 rounded-full hover:bg-amber-50 text-amber-500 transition"
                  >
                    <Lightbulb className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={(e) => handleSpeak(card.term, e)}
                  title="Phát âm"
                  className="p-2 rounded-full hover:bg-indigo-50 text-indigo-600 transition"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Nội dung trung tâm */}
            <div className="flex flex-col items-center justify-center text-center my-auto px-4">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight leading-snug">
                {card.term}
              </h2>

              {showHint && card.hint && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm italic"
                >
                  💡 Gợi ý: {card.hint}
                </motion.p>
              )}
            </div>

            {/* Bottom info */}
            <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <span>Bấm chuột hoặc nhấn <kbd className="px-2 py-0.5 bg-slate-100 rounded border border-slate-300 font-mono text-[11px] text-slate-600">Space</kbd> để lật thẻ</span>
            </div>
          </div>

          {/* MẶT SAU: ĐỊNH NGHĨA (DEFINITION) */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-8 flex flex-col justify-between shadow-2xl">
            {/* Top Toolbar mặt sau */}
            <div className="flex items-center justify-between text-xs text-indigo-200">
              <span className="px-3 py-1 bg-white/10 backdrop-blur-sm text-indigo-200 font-semibold rounded-full">
                Định nghĩa (Definition)
              </span>

              <button
                onClick={(e) => handleSpeak(card.definition, e)}
                title="Phát âm định nghĩa"
                className="p-2 rounded-full hover:bg-white/10 text-indigo-200 transition"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            {/* Nội dung định nghĩa */}
            <div className="flex flex-col items-center justify-center text-center my-auto px-4 overflow-y-auto max-h-[220px]">
              {card.imageUrl && (
                <img
                  src={card.imageUrl}
                  alt={card.term}
                  className="w-28 h-28 object-cover rounded-xl mb-3 shadow border border-white/20"
                />
              )}
              <p className="text-2xl sm:text-3xl font-bold leading-relaxed text-indigo-50">
                {card.definition}
              </p>
            </div>

            {/* Bottom indicator */}
            <div className="text-center text-xs text-indigo-300/70">
              Nhấn <kbd className="px-2 py-0.5 bg-white/10 rounded border border-white/20 font-mono text-[11px] text-indigo-200">Space</kbd> để quay lại thuật ngữ
            </div>
          </div>
        </motion.div>
      </div>

      {/* Action Buttons: Đánh dấu Đã thuộc / Học lại & Điều hướng */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Nút đánh dấu tiến độ */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => onMarkStatus(card._id, 'learning')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition shadow-sm ${
              status === 'learning'
                ? 'bg-amber-500 text-white border-amber-600 shadow-amber-200'
                : 'bg-white text-slate-700 border-slate-200 hover:border-amber-400 hover:text-amber-600'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            Học lại (Still learning)
          </button>

          <button
            onClick={() => onMarkStatus(card._id, 'mastered')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition shadow-sm ${
              status === 'mastered'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-200'
                : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:text-emerald-600'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Đã thuộc (Mastered)
          </button>
        </div>

        {/* Nút điều hướng Trái / Phải */}
        <div className="flex items-center gap-3">
          <button
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            ← Thẻ trước
          </button>

          <span className="text-sm font-semibold text-slate-600">
            {currentIndex + 1} / {totalCards}
          </span>

          <button
            onClick={onNext}
            disabled={currentIndex === totalCards - 1}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Thẻ tiếp →
          </button>
        </div>
      </div>
    </div>
  );
}


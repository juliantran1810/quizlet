import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Volume2, Sparkles, CheckCircle2, RotateCcw, Lightbulb, PenLine, Star } from 'lucide-react';
import { speak, detectLang } from '../utils/speech';
import { sfx } from '../utils/sfx';
import { useLanguage } from '../context/LanguageContext';
import HanziWriter from './HanziWriter';

export default function Flashcard3D({
  card,
  currentIndex,
  totalCards,
  status = 'learning',
  isStarred = false,
  isReversed = false,
  autoPlayAudio = false,
  onToggleStar,
  onNext,
  onPrev,
  onMarkStatus,
}) {
  const { t } = useLanguage();
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showStroke, setShowStroke] = useState(false);

  // Kiểm tra thuật ngữ có phải chữ Hán không
  const isChinese = /[\u4e00-\u9fff\u3400-\u4dbf]/.test(card?.term || '');

  // Tự động phát âm khi chuyển sang thẻ mới
  useEffect(() => {
    setIsFlipped(false);
    setShowHint(false);
    setShowStroke(false);

    if (autoPlayAudio && card) {
      const textToSpeak = isReversed ? card.definition : card.term;
      speak(textToSpeak);
    }
  }, [currentIndex, card, isReversed, autoPlayAudio]);

  const handleFlip = () => {
    sfx.flip();
    setIsFlipped((prev) => {
      const nextFlipped = !prev;
      if (autoPlayAudio && card) {
        if (nextFlipped) {
          const textToSpeak = isReversed ? card.term : card.definition;
          speak(textToSpeak);
        } else {
          const textToSpeak = isReversed ? card.definition : card.term;
          speak(textToSpeak);
        }
      }
      return nextFlipped;
    });
  };

  const handleStarClick = (e) => {
    e.stopPropagation();
    if (isStarred) {
      sfx.unstar();
    } else {
      sfx.star();
    }
    onToggleStar && onToggleStar(card._id);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (currentIndex < totalCards - 1) {
          sfx.slide();
          onNext && onNext();
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (currentIndex > 0) {
          sfx.slide();
          onPrev && onPrev();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev, isReversed, autoPlayAudio, card, currentIndex, totalCards]);

  if (!card) return null;

  // Render nội dung Thuật ngữ (Chữ Hán + Pinyin + Loại từ)
  const renderTermContent = () => (
    <div className="flex flex-col items-center justify-center text-center my-auto px-4 gap-2">
      {card.partOfSpeech && (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 mb-1">
          {card.partOfSpeech}
        </span>
      )}
      <h2
        className={`font-extrabold tracking-tight leading-snug ${
          isReversed ? 'text-indigo-50' : 'text-slate-800'
        } ${isChinese ? 'text-5xl sm:text-6xl' : 'text-3xl sm:text-4xl'}`}
      >
        {card.term}
      </h2>

      {/* Pinyin hiển thị ngay dưới chữ Hán */}
      {card.pinyin && (
        <div className="flex items-center gap-2">
          <span
            className={`text-xl font-semibold tracking-widest ${
              isReversed ? 'text-indigo-300' : 'text-indigo-500'
            }`}
          >
            {card.pinyin}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              speak(card.term, 'zh-CN');
            }}
            title={t('flashcards.pronounce')}
            className={`p-1 rounded-full transition ${
              isReversed
                ? 'hover:bg-white/10 text-indigo-200'
                : 'hover:bg-indigo-50 text-indigo-400'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {showHint && card.hint && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm italic"
        >
          💡 {card.hint}
        </motion.p>
      )}
    </div>
  );

  // Render nội dung Định nghĩa (Nghĩa + Hình ảnh)
  const renderDefContent = () => (
    <div className="flex flex-col items-center justify-center text-center my-auto px-4 overflow-y-auto max-h-[220px] gap-3">
      {card.imageUrl && (
        <img
          src={card.imageUrl}
          alt={card.term}
          className="w-28 h-28 object-cover rounded-xl mb-2 shadow border border-white/20"
        />
      )}
      <p
        className={`text-2xl sm:text-3xl font-bold leading-relaxed ${
          isReversed ? 'text-slate-800' : 'text-indigo-50'
        }`}
      >
        {card.definition}
      </p>

      {showHint && card.hint && isReversed && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm italic"
        >
          💡 {card.hint}
        </motion.p>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-2xl mx-auto select-none">
      {/* 3D Card */}
      <div
        className="w-full h-80 sm:h-96 cursor-pointer perspective-1000"
        onClick={handleFlip}
      >
        <motion.div
          className="relative w-full h-full transform-style-preserve-3d shadow-xl rounded-3xl"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        >
          {/* MẶT TRƯỚC (Front side) */}
          <div className="absolute inset-0 backface-hidden bg-white border-2 border-indigo-100 rounded-3xl p-8 flex flex-col justify-between shadow-sm hover:border-indigo-300 transition-colors">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 font-semibold rounded-full">
                <Sparkles className="w-3.5 h-3.5" />
                {!isReversed
                  ? isChinese
                    ? t('flashcards.hanzi')
                    : t('flashcards.term')
                  : isChinese
                  ? t('flashcards.meaning')
                  : t('flashcards.definition')}
              </span>

              <div className="flex items-center gap-1.5">
                {card.hint && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowHint((p) => !p);
                    }}
                    title={t('flashcards.hint')}
                    className="p-2 rounded-full hover:bg-amber-50 text-amber-500 transition"
                  >
                    <Lightbulb className="w-4 h-4" />
                  </button>
                )}
                {!isReversed && isChinese && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowStroke((p) => !p);
                    }}
                    title={t('flashcards.stroke_order')}
                    className={`p-2 rounded-full transition ${
                      showStroke
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'hover:bg-indigo-50 text-indigo-500'
                    }`}
                  >
                    <PenLine className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(!isReversed ? card.term : card.definition);
                  }}
                  title={t('flashcards.pronounce')}
                  className="p-2 rounded-full hover:bg-indigo-50 text-indigo-600 transition"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
                {onToggleStar && (
                  <button
                    type="button"
                    onClick={handleStarClick}
                    title={isStarred ? t('flashcards.unstar') : t('flashcards.star')}
                    className={`p-2 rounded-full transition ${
                      isStarred
                        ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                        : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50/50'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400' : ''}`} />
                  </button>
                )}
              </div>
            </div>

            {/* Nội dung Mặt trước */}
            {!isReversed ? renderTermContent() : renderDefContent()}

            <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <span>{t('flashcards.flip_instruction')}</span>
            </div>
          </div>

          {/* MẶT SAU (Back side) */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-8 flex flex-col justify-between shadow-2xl">
            <div className="flex items-center justify-between text-xs text-indigo-200">
              <span className="px-3 py-1 bg-white/10 backdrop-blur-sm text-indigo-200 font-semibold rounded-full">
                {!isReversed
                  ? isChinese
                    ? t('flashcards.meaning')
                    : t('flashcards.definition')
                  : isChinese
                  ? t('flashcards.hanzi')
                  : t('flashcards.term')}
              </span>
              <div className="flex items-center gap-1.5">
                {card.hint && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowHint((p) => !p);
                    }}
                    title={t('flashcards.hint')}
                    className="p-2 rounded-full hover:bg-white/10 text-amber-300 transition"
                  >
                    <Lightbulb className="w-4 h-4" />
                  </button>
                )}
                {isReversed && isChinese && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowStroke((p) => !p);
                    }}
                    title={t('flashcards.stroke_order')}
                    className={`p-2 rounded-full transition ${
                      showStroke
                        ? 'bg-white/30 text-white'
                        : 'hover:bg-white/10 text-indigo-200'
                    }`}
                  >
                    <PenLine className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(!isReversed ? card.definition : card.term);
                  }}
                  title={t('flashcards.pronounce')}
                  className="p-2 rounded-full hover:bg-white/10 text-indigo-200 transition"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
                {onToggleStar && (
                  <button
                    type="button"
                    onClick={handleStarClick}
                    title={isStarred ? t('flashcards.unstar') : t('flashcards.star')}
                    className={`p-2 rounded-full transition ${
                      isStarred
                        ? 'text-amber-400 bg-white/20'
                        : 'text-white/40 hover:text-amber-300 hover:bg-white/10'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400' : ''}`} />
                  </button>
                )}
              </div>
            </div>

            {/* Nội dung Mặt sau */}
            {!isReversed ? renderDefContent() : renderTermContent()}

            <div className="text-center text-xs text-indigo-300/70">
              {t('flashcards.space_to_flip_back')}
            </div>
          </div>
        </motion.div>
      </div>

      {/* HanziWriter Panel — hiện khi bấm nút nét bút (hỗ trợ cả animation và tập viết tương tác quiz) */}
      {isChinese && showStroke && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <HanziWriter characters={card.term} autoAnimate />
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => {
              sfx.retry();
              onMarkStatus(card._id, 'learning');
            }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition shadow-sm ${status === 'learning'
              ? 'bg-amber-500 text-white border-amber-600 shadow-amber-200'
              : 'bg-white text-slate-700 border-slate-200 hover:border-amber-400 hover:text-amber-600'
              }`}
          >
            <RotateCcw className="w-4 h-4" />
            {t('flashcards.learn_again')}
          </button>

          <button
            onClick={() => {
              sfx.mastered();
              onMarkStatus(card._id, 'mastered');
            }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition shadow-sm ${status === 'mastered'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-200'
              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:text-emerald-600'
              }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {t('flashcards.mastered')}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sfx.slide();
              onPrev && onPrev();
            }}
            disabled={currentIndex <= 0 || totalCards <= 1}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {t('flashcards.prev_card')}
          </button>
          <span className="text-sm font-semibold text-slate-600">
            {currentIndex + 1} / {totalCards}
          </span>
          <button
            onClick={() => {
              sfx.slide();
              onNext && onNext();
            }}
            disabled={currentIndex >= totalCards - 1 || totalCards <= 1}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {t('flashcards.next_card')}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { PenLine, Play, Loader2 } from 'lucide-react';

/**
 * HanziWriter Component - Hiển thị animation thứ tự nét bút cho chữ Hán
 * Sử dụng thư viện hanzi-writer được tải động qua CDN
 */
export default function HanziWriter({ characters, autoAnimate = false }) {
  const containerRef = useRef(null);
  const writersRef = useRef([]);
  const [loaded, setLoaded] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [error, setError] = useState(false);

  // Lọc ra các chữ Hán hợp lệ từ chuỗi (bỏ dấu cách và ký tự khác)
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
          wrapper.className = 'flex flex-col items-center gap-1';

          const svgEl = document.createElement('div');
          svgEl.id = `hanzi-${idx}-${char}`;
          svgEl.className = 'relative';
          svgEl.style.width = '130px';
          svgEl.style.height = '130px';

          const label = document.createElement('div');
          label.textContent = char;
          label.className = 'text-xs text-center font-bold text-indigo-700 mt-1';

          wrapper.appendChild(svgEl);
          wrapper.appendChild(label);
          containerRef.current.appendChild(wrapper);

          try {
            const writer = HanziWriter.create(svgEl, char, {
              width: 130,
              height: 130,
              padding: 8,
              showOutline: true,
              strokeColor: '#4338ca', // Indigo-700
              outlineColor: '#e0e7ff', // Indigo-100
              strokeAnimationSpeed: 1,
              delayBetweenStrokes: 100,
              delayBetweenLoops: 1500,
              drawingFadeDuration: 300,
            });
            writersRef.current.push(writer);
          } catch (e) {
            console.warn(`Không thể tải chữ Hán "${char}":`, e);
          }
        });

        setLoaded(true);
        if (autoAnimate) {
          animateAll();
        }
      })
      .catch(() => {
        if (isMounted) setError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [characters]);

  const animateAll = () => {
    if (animating || writersRef.current.length === 0) return;
    setAnimating(true);

    // Phát animation tuần tự từng chữ
    let chain = Promise.resolve();
    writersRef.current.forEach((writer) => {
      chain = chain.then(
        () =>
          new Promise((resolve) => {
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
      try { writer.stopAnimation(); } catch (e) {}
    });
    setAnimating(false);
  };

  if (hanziChars.length === 0) return null;

  return (
    <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm font-bold text-indigo-800">
          <PenLine className="w-4 h-4" />
          Thứ tự nét bút ({hanziChars.length} chữ)
        </div>

        <div className="flex items-center gap-2">
          {!loaded && !error && (
            <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
          )}
          {loaded && (
            <>
              <button
                onClick={animating ? stopAll : animateAll}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  animating
                    ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                {animating ? 'Dừng' : 'Xem nét bút'}
              </button>
              <button
                onClick={loopAll}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition"
              >
                Lặp liên tục
              </button>
            </>
          )}
        </div>
      </div>

      {error ? (
        <p className="text-xs text-slate-500 italic text-center py-4">
          Không thể tải dữ liệu nét bút (cần kết nối Internet để tải thư viện Hanzi Writer).
        </p>
      ) : (
        <div
          ref={containerRef}
          className="flex flex-wrap gap-4 justify-center min-h-[150px]"
        >
          {/* Nội dung được render động bởi HanziWriter */}
          {!loaded && (
            <div className="flex items-center gap-2 text-sm text-indigo-400 m-auto py-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang tải dữ liệu nét bút...
            </div>
          )}
        </div>
      )}
    </div>
  );
}


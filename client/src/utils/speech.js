/**
 * Robust Speech & Pronunciation Engine
 * Giải quyết triệt để các vấn đề âm thanh không phát trên một số thiết bị:
 * 1. Chromium / WebKit Garbage Collection bug (giữ reference utterance tránh bị hủy ngang)
 * 2. Mobile (iOS / Android) voice async loading (bắt sự kiện onvoiceschanged và match voice chuẩn)
 * 3. Hỗ trợ thiết bị không cài gói ngôn ngữ Trung/Việt: Tự động chuyển tiếp sang Online TTS Audio Fallback
 * 4. Mở khóa âm thanh di động (Touch/Click unlock)
 * 5. Khắc phục lỗi paused/freeze của Chrome speechSynthesis
 */

// Lưu danh sách utterance đang nói để ngăn JavaScript Garbage Collector thu hồi giữa chừng
const activeUtterances = new Set();

let cachedVoices = [];
let currentAudio = null;

// Tải danh sách giọng nói
function updateVoices() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    cachedVoices = window.speechSynthesis.getVoices() || [];
  }
}

if (typeof window !== 'undefined') {
  updateVoices();
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }

  // Mở khóa âm thanh trên trình duyệt di động (iOS Safari / Android Chrome) sau cú chạm đầu tiên
  const unlockAudio = () => {
    if ('speechSynthesis' in window) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { passive: true, once: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true, once: true });
}

/**
 * Nhận diện ngôn ngữ dựa trên nội dung văn bản và trả về BCP-47 language tag phù hợp.
 * Ưu tiên: Hán tự (zh-CN) → Tiếng Anh (en-US) → Tiếng Việt (vi-VN)
 */
export function detectLang(text) {
  if (!text) return 'vi-VN';
  const clean = text.trim();
  // Nhận diện chữ Hán (CJK Unified Ideographs)
  if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(clean)) return 'zh-CN';
  // Nhận diện Hiragana / Katakana (Nhật)
  if (/[\u3040-\u30ff]/.test(clean)) return 'ja-JP';
  // Nhận diện Hangul (Hàn)
  if (/[\uac00-\ud7af]/.test(clean)) return 'ko-KR';
  // Nhận diện tiếng Anh thuần (chỉ gồm ASCII)
  if (/^[a-zA-Z0-9\s.,!?'"()\-:;]+$/.test(clean)) return 'en-US';
  // Mặc định tiếng Việt
  return 'vi-VN';
}

/**
 * Tìm kiếm giọng nói phù hợp nhất cho ngôn ngữ yêu cầu từ hệ điều hành
 */
function findBestVoice(lang) {
  if (!cachedVoices || cachedVoices.length === 0) {
    updateVoices();
  }

  const l = lang.toLowerCase();

  // Ưu tiên 1: Khớp chính xác hoàn toàn mã BCP-47 (ví dụ: zh-CN)
  let voice = cachedVoices.find((v) => v.lang && v.lang.toLowerCase() === l);
  if (voice) return voice;

  // Ưu tiên 2: Khớp tiền tố (ví dụ: zh, vi, en)
  const prefix = l.split('-')[0];
  voice = cachedVoices.find((v) => v.lang && v.lang.toLowerCase().startsWith(prefix));
  if (voice) return voice;

  // Ưu tiên 3: Tìm theo tên nhận diện giọng nói
  if (prefix === 'zh') {
    voice = cachedVoices.find(
      (v) =>
        v.name.toLowerCase().includes('chinese') ||
        v.name.toLowerCase().includes('mandarin') ||
        v.name.includes('普通话') ||
        v.name.includes('中文')
    );
  } else if (prefix === 'vi') {
    voice = cachedVoices.find((v) => v.name.toLowerCase().includes('vietnam'));
  }

  return voice || null;
}

/**
 * Fallback Online TTS Audio:
 * Sử dụng khi thiết bị không có sẵn giọng nói bản ngữ (ví dụ Windows/Android chưa cài gói tiếng Trung)
 * hoặc khi Web Speech API bị lỗi / không hỗ trợ.
 */
function playOnlineTTS(text, lang = 'zh-CN') {
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    const clean = text.trim();
    if (!clean) return;

    // Chuẩn hóa mã ngôn ngữ
    let tl = 'zh-CN';
    if (lang.startsWith('zh')) tl = 'zh-CN';
    else if (lang.startsWith('en')) tl = 'en';
    else if (lang.startsWith('vi')) tl = 'vi';
    else if (lang.startsWith('ja')) tl = 'ja';
    else if (lang.startsWith('ko')) tl = 'ko';

    // Endpoint 1: Google Translate TTS (âm thanh chuẩn quốc tế)
    const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${tl}&client=tw-ob&q=${encodeURIComponent(clean)}`;
    const audio = new Audio(googleUrl);
    currentAudio = audio;
    audio.playbackRate = 0.95;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        // Endpoint 2 Fallback: Youdao TTS (cho tiếng Trung và tiếng Anh)
        if (tl === 'zh-CN' || tl === 'en') {
          const youdaoUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(clean)}&type=${tl === 'zh-CN' ? 1 : 2}`;
          const fallbackAudio = new Audio(youdaoUrl);
          currentAudio = fallbackAudio;
          fallbackAudio.play().catch(() => {});
        }
      });
    }
  } catch (err) {
    console.warn('Lỗi Online TTS audio fallback:', err);
  }
}

/**
 * Phát âm văn bản thông minh (kết hợp Web Speech API + Voice Match + Online Audio Fallback)
 * @param {string} text - Văn bản cần đọc
 * @param {string} [forceLang] - Bắt buộc ngôn ngữ cụ thể (ví dụ: 'zh-CN', 'vi-VN')
 * @param {number} [rate=0.85] - Tốc độ đọc
 */
export function speak(text, forceLang = null, rate = 0.85) {
  if (!text || typeof window === 'undefined') return;

  const targetLang = forceLang || detectLang(text);

  // Nếu trình duyệt không hỗ trợ Web Speech API => dùng Online TTS Audio ngay
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    playOnlineTTS(text, targetLang);
    return;
  }

  try {
    // Dừng âm thanh Online đang phát (nếu có)
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    // Dừng phiên đọc trước đó
    window.speechSynthesis.cancel();

    // Khắc phục trạng thái paused của Chrome
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const matchedVoice = findBestVoice(targetLang);

    // Nếu là tiếng Trung (hoặc tiếng khác) mà thiết bị hoàn toàn KHÔNG CÓ giọng nói nào cho ngôn ngữ này
    // => Chuyển sang Online TTS Audio ngay để đảm bảo phát ra tiếng 100%
    if (targetLang.startsWith('zh') && (!matchedVoice || !matchedVoice.lang.toLowerCase().startsWith('zh'))) {
      playOnlineTTS(text, targetLang);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLang;
    utterance.rate = rate;

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    // Giữ reference utterance trong Set để tránh bị Garbage Collector thu hồi giữa chừng (Chromium bug)
    activeUtterances.add(utterance);

    utterance.onend = () => {
      activeUtterances.delete(utterance);
    };

    utterance.onerror = (event) => {
      activeUtterances.delete(utterance);
      // Nếu lỗi speechSynthesis trên thiết bị (ví dụ voice-unavailable, audio-busy) => fallback sang Online TTS
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        playOnlineTTS(text, targetLang);
      }
    };

    window.speechSynthesis.speak(utterance);

    // Watchdog: Sau 100ms nếu Chrome vẫn bị kẹt ở trạng thái pause thì ép resume
    setTimeout(() => {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 100);
  } catch (e) {
    console.warn('Lỗi khi kích hoạt speechSynthesis, chuyển sang Online Audio:', e);
    playOnlineTTS(text, targetLang);
  }
}

export function speakTerm(text) {
  speak(text);
}

export function speakChinese(text) {
  speak(text, 'zh-CN');
}

export default speak;

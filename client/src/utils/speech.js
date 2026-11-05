/**
 * Nhận diện ngôn ngữ dựa trên nội dung văn bản và trả về BCP-47 language tag phù hợp.
 * Ưu tiên: Hán tự (zh-CN) → Tiếng Anh (en-US) → Tiếng Việt (vi-VN)
 */
export function detectLang(text) {
  if (!text) return 'vi-VN';
  // Nhận diện chữ Hán (CJK Unified Ideographs)
  if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(text)) return 'zh-CN';
  // Nhận diện Hiragana / Katakana (Nhật)
  if (/[\u3040-\u30ff]/.test(text)) return 'ja-JP';
  // Nhận diện Hangul (Hàn)
  if (/[\uac00-\ud7af]/.test(text)) return 'ko-KR';
  // Nhận diện tiếng Anh thuần (chỉ gồm ASCII)
  if (/^[a-zA-Z0-9\s.,!?'"()\-:;]+$/.test(text.trim())) return 'en-US';
  // Mặc định tiếng Việt
  return 'vi-VN';
}

/**
 * Phát âm văn bản qua Web Speech API với ngôn ngữ được tự động nhận diện.
 * @param {string} text - Văn bản cần đọc
 * @param {string} [forceLang] - Nếu cung cấp, bắt buộc dùng ngôn ngữ này (overrides auto-detect)
 * @param {number} [rate=0.85] - Tốc độ đọc (0.1 – 2)
 */
export function speak(text, forceLang = null, rate = 0.85) {
  if (!text || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = forceLang || detectLang(text);
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
}

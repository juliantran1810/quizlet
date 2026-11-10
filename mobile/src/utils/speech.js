import * as Speech from 'expo-speech';

/**
 * Phát âm từ vựng theo ngôn ngữ chỉ định
 * Mặc định hỗ trợ Tiếng Trung zh-CN
 */
export function speakChinese(text) {
  if (!text) return;
  Speech.stop();
  Speech.speak(text, {
    language: 'zh-CN',
    pitch: 1.0,
    rate: 0.85,
  });
}

export function speakEnglish(text) {
  if (!text) return;
  Speech.stop();
  Speech.speak(text, {
    language: 'en-US',
    pitch: 1.0,
    rate: 0.9,
  });
}

export function stopSpeaking() {
  Speech.stop();
}

export default {
  speakChinese,
  speakEnglish,
  stopSpeaking,
};


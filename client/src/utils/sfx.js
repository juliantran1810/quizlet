/**
 * Sound Effects Engine (SFX) sử dụng Web Audio API thuần túy:
 * - Không cần tải file audio bên ngoài (zero-latency, không phụ thuộc mạng, không lỗi 404)
 * - Tự động thích ứng với chính sách autoplay của trình duyệt (lazy initialization)
 * - Có hỗ trợ Bật/Tắt âm thanh (Mute/Unmute) lưu trạng thái vào localStorage
 */

class SoundEffects {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('quizlet_sfx_muted') === 'true';
    this.volume = 0.25; // Âm lượng vừa phải, êm tai
    this.listeners = new Set();
  }

  // Khởi tạo AudioContext khi có tương tác đầu tiên của người dùng
  initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  isMuted() {
    return this.muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('quizlet_sfx_muted', String(this.muted));
    this.listeners.forEach((cb) => cb(this.muted));
    return this.muted;
  }

  onMuteChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Phát âm thanh theo tên: sfx.play('correct'), sfx.play('wrong'), sfx.play('fanfare'), etc.
  play(soundName) {
    if (this[soundName] && typeof this[soundName] === 'function') {
      this[soundName]();
    }
  }

  // Âm thanh lật thẻ Flashcard (tiếng phẩy thẻ nhẹ nhàng, tự nhiên)
  flip() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      // Tần số chuyển nhanh mô phỏng tiếng quẹt giấy
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

      gain.gain.setValueAtTime(this.volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {
      // Bỏ qua lỗi audio context nếu bị chặn
    }
  }

  // Âm thanh gắn sao thẻ (tiếng chuông tinh linh leng keng vui vẻ)
  star() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const notes = [987.77, 1318.51, 1975.53]; // B5 -> E6 -> B6
      notes.forEach((freq, i) => {
        const now = this.ctx.currentTime + i * 0.045;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(this.volume * 0.5, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.22);
      });
    } catch (e) {}
  }

  // Âm thanh bỏ gắn sao
  unstar() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(550, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.07);

      gain.gain.setValueAtTime(this.volume * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {}
  }

  // Âm thanh trả lời đúng / Đã thuộc (Giai điệu sáng, khích lệ)
  correct() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, idx) => {
        const now = this.ctx.currentTime + idx * 0.07;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(this.volume * 0.6, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
      });
    } catch (e) {}
  }

  // Tương tự correct nhưng cho thẻ Flashcard "Đã thuộc"
  mastered() {
    this.correct();
  }

  // Âm thanh "Học lại" (nhẹ nhàng, không tạo cảm giác tiêu cực)
  retry() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.12);

      gain.gain.setValueAtTime(this.volume * 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  // Âm thanh trả lời sai (êm dịu, không chói tai)
  wrong() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(170, now + 0.16);

      gain.gain.setValueAtTime(this.volume * 0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {}
  }

  // Âm thanh click / chọn đáp án / chọn ô ghép từ
  click() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.03);

      gain.gain.setValueAtTime(this.volume * 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch (e) {}
  }

  // Âm thanh ghép trúng cặp từ vựng trong Match Game
  match() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const notes = [659.25, 880, 1174.66]; // E5 -> A5 -> D6
      notes.forEach((freq, idx) => {
        const now = this.ctx.currentTime + idx * 0.05;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(this.volume * 0.5, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.18);
      });
    } catch (e) {}
  }

  // Âm thanh chuyển thẻ tiếp theo / trước
  slide() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.linearRampToValueAtTime(380, now + 0.05);

      gain.gain.setValueAtTime(this.volume * 0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {}
  }

  // Âm thanh chúc mừng hoàn thành bài học / chiến thắng (Fanfare)
  fanfare() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      // Chuỗi nốt chiến thắng rộn rã: C5 -> E5 -> G5 -> C6 ngân dài
      const notes = [
        { freq: 523.25, time: 0, dur: 0.12 },
        { freq: 659.25, time: 0.12, dur: 0.12 },
        { freq: 783.99, time: 0.24, dur: 0.15 },
        { freq: 1046.50, time: 0.39, dur: 0.45 },
      ];

      notes.forEach(({ freq, time, dur }) => {
        const now = this.ctx.currentTime + time;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(this.volume * 0.65, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + dur);
      });
    } catch (e) {}
  }
}

export const sfx = new SoundEffects();
export default sfx;

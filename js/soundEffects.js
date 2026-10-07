/**
 * HİKÂYE ATÖLYESİ - SES EFEKTLERİ VE METİN SESLENDİRME
 * Web Audio API ile harici dosya indirmeden hafif, zarif UI sesleri üretir.
 * Web Speech API ile Türkçe metin seslendirme (TTS) desteği sağlar.
 */

class SoundManager {
  constructor() {
    this.audioCtx = null;
    this.soundEnabled = typeof localStorage !== 'undefined' ? localStorage.getItem('hikaye_sound_enabled') !== 'false' : true;
    this.speechSynth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.isSpeaking = false;
  }

  _initCtx() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('hikaye_sound_enabled', this.soundEnabled);
    return this.soundEnabled;
  }

  isSoundEnabled() {
    return this.soundEnabled;
  }

  /**
   * Kart seçildiğinde çalan hafif ve tatlı çıngırak sesi (Ding)
   */
  playSelect() {
    if (!this.soundEnabled) return;
    try {
      this._initCtx();
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, this.audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.18);
    } catch {
      // Ses desteklenmiyorsa sessizce geç
    }
  }

  /**
   * Kartlar yenilendiğinde (shuffle) çalan hafif fısıltılı akor
   */
  playShuffle() {
    if (!this.soundEnabled) return;
    try {
      this._initCtx();
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(329.63, this.audioCtx.currentTime); // E4
      osc.frequency.linearRampToValueAtTime(440, this.audioCtx.currentTime + 0.08); // A4
      osc.frequency.linearRampToValueAtTime(523.25, this.audioCtx.currentTime + 0.16); // C5

      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.2);
    } catch {}
  }

  /**
   * 4/4 tamamlandığında veya hikâye hazır olduğunda başarı fanfarı
   */
  playSuccess() {
    if (!this.soundEnabled) return;
    try {
      this._initCtx();
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const start = this.audioCtx.currentTime + idx * 0.09;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(start);
        osc.stop(start + 0.25);
      });
    } catch {}
  }

  /**
   * Türkçe Metin Seslendirme (Text-To-Speech)
   */
  speakText(text, onStart = () => {}, onEnd = () => {}) {
    if (!this.speechSynth) return;

    if (this.isSpeaking) {
      this.stopSpeaking();
      onEnd();
      return;
    }

    this.speechSynth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'tr-TR';
    utterance.rate = 0.95; // Anlaşılır ve sakin anlatım hızı

    // Varsa Türkçe ses seç
    const voices = this.speechSynth.getVoices();
    const trVoice = voices.find(v => v.lang.startsWith('tr') || v.lang.includes('TR'));
    if (trVoice) {
      utterance.voice = trVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      onEnd();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      onEnd();
    };

    this.speechSynth.speak(utterance);
  }

  stopSpeaking() {
    if (this.speechSynth) {
      this.speechSynth.cancel();
      this.isSpeaking = false;
    }
  }
}

export const soundManager = new SoundManager();

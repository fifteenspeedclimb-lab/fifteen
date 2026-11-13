// Web Audio API Synthesizer for Speed Climbing Timers & Acoustic Coaching

export type ToneStyle = 'piercing' | 'ifsc_standard' | 'buzzer';

export interface AudioSettings {
  toneStyle: ToneStyle;
  volume: number; // 0.1 to 1.0
  voiceEnabled: boolean;
}

const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  toneStyle: 'piercing', // Loud, cutting gym tone
  volume: 0.85,
  voiceEnabled: true,
};

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function getStoredAudioSettings(): AudioSettings {
  if (typeof window === 'undefined') return DEFAULT_AUDIO_SETTINGS;
  try {
    const raw = localStorage.getItem('fifteen_audio_settings_v2');
    if (raw) return { ...DEFAULT_AUDIO_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // fallback
  }
  return DEFAULT_AUDIO_SETTINGS;
}

export function saveStoredAudioSettings(settings: AudioSettings) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('fifteen_audio_settings_v2', JSON.stringify(settings));
  }
}

/**
 * Play synthesized multi-frequency tone
 */
export function playTone(
  frequency: number,
  durationSec: number,
  type: OscillatorType = 'sine',
  gainVal: number = 0.5
) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(Math.min(1.0, gainVal), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + durationSec);
  } catch (err) {
    console.warn('Audio tone error:', err);
  }
}

/**
 * High-penetration dual harmonic tone for loud indoor climbing gyms
 */
function playDualHarmonicTone(freq1: number, freq2: number, durationSec: number, gainVal: number) {
  try {
    const ctx = getAudioContext();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq1, ctx.currentTime);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(freq2, ctx.currentTime);

    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + durationSec);
    osc2.stop(ctx.currentTime + durationSec);
  } catch (err) {
    console.warn('Dual harmonic audio error:', err);
  }
}

/**
 * Configurable Prep Tone (Beeps 1, 2, 3)
 */
export function playIFSCPrepTone(style?: ToneStyle) {
  const currentStyle = style || getStoredAudioSettings().toneStyle;
  const vol = getStoredAudioSettings().volume;

  if (currentStyle === 'piercing') {
    // Sharp high-penetration beep
    playDualHarmonicTone(1100, 2200, 0.1, vol * 0.7);
  } else if (currentStyle === 'buzzer') {
    // Short aggressive buzz
    playTone(750, 0.12, 'sawtooth', vol * 0.6);
  } else {
    // Official standard IFSC 440Hz triangle
    playTone(440, 0.1, 'triangle', vol * 0.6);
  }
}

/**
 * Configurable Start Tone (High green GO tone)
 */
export function playIFSCStartTone(style?: ToneStyle) {
  const currentStyle = style || getStoredAudioSettings().toneStyle;
  const vol = getStoredAudioSettings().volume;

  if (currentStyle === 'piercing') {
    // Piercing dual-tone (1800Hz + 2400Hz) - cuts through background noise instantly
    playDualHarmonicTone(1600, 2400, 0.35, vol * 0.9);
  } else if (currentStyle === 'buzzer') {
    // Horn blast
    playTone(1400, 0.4, 'sawtooth', vol * 0.85);
  } else {
    // Official IFSC 880Hz sine tone
    playTone(880, 0.32, 'sine', vol * 0.8);
  }
}

/**
 * Split Checkpoint Sound (5m or 10m gate chime)
 */
export function playSplitChime() {
  const vol = getStoredAudioSettings().volume;
  playTone(1320, 0.12, 'sine', vol * 0.5);
}

/**
 * Finish Pad Hit Sound (15m Top Pad - Victorious high harmonic)
 */
export function playFinishFanfare() {
  const vol = getStoredAudioSettings().volume;
  playTone(1200, 0.15, 'sine', vol * 0.6);
  setTimeout(() => {
    playDualHarmonicTone(1600, 2000, 0.4, vol * 0.8);
  }, 100);
}

/**
 * False Start Buzz Alarm (Reaction < 0.100s)
 */
export function playFalseStartAlarm() {
  const vol = getStoredAudioSettings().volume;
  playTone(200, 0.35, 'sawtooth', vol * 0.7);
  setTimeout(() => {
    playTone(160, 0.35, 'sawtooth', vol * 0.7);
  }, 100);
}

let cachedVoices: Record<string, SpeechSynthesisVoice> = {};

function getUnifiedVoice(langCode: 'cs' | 'de' | 'en'): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return cachedVoices[langCode] || null;

  const existing = cachedVoices[langCode];
  if (existing && voices.some((v) => v.voiceURI === existing.voiceURI)) {
    return existing;
  }

  const langPrefix = langCode === 'cs' ? 'cs' : langCode === 'de' ? 'de' : 'en';
  const candidates = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
  if (candidates.length === 0) return null;

  // Pick a single deterministic voice per language so "At your marks", "Ready", and cues sound consistent
  const preferred =
    candidates.find((v) => v.localService && (v.name.includes('Natural') || v.name.includes('Google') || v.default)) ||
    candidates.find((v) => v.default) ||
    candidates.find((v) => v.localService) ||
    candidates[0];

  if (preferred) {
    cachedVoices[langCode] = preferred;
  }
  return preferred || null;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = {};
    getUnifiedVoice('en');
    getUnifiedVoice('cs');
  };
}

/**
 * Speech synthesis audio coach for Ghost Mode into earphones
 */
export function speakCoachCue(text: string, langCode: 'cs' | 'de' | 'en' = 'cs') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const settings = getStoredAudioSettings();
  if (!settings.voiceEnabled) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = Math.min(1.0, settings.volume);
    utterance.lang = langCode === 'cs' ? 'cs-CZ' : langCode === 'de' ? 'de-DE' : 'en-US';

    const unifiedVoice = getUnifiedVoice(langCode);
    if (unifiedVoice) {
      utterance.voice = unifiedVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Speech synthesis error:', e);
  }
}

/**
 * Official IFSC Starter Voice Commands: "At your marks" and "Ready"
 * Uses a single unified voice, pitch (1.0), and rate (1.0) across all starter commands.
 */
export function speakIFSCCommand(command: 'marks' | 'ready') {
  const settings = getStoredAudioSettings();
  if (!settings.voiceEnabled) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  const text = command === 'marks' ? 'At your marks' : 'Ready';

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.volume = Math.min(1.0, settings.volume);
    utterance.pitch = 1.0;
    utterance.rate = 1.0;

    const unifiedVoice = getUnifiedVoice('en');
    if (unifiedVoice) {
      utterance.voice = unifiedVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Starter voice error:', e);
  }
}

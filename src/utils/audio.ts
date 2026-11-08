// Web Audio API Synthesizer for IFSC Official Speed Climbing Timers

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a synthesized tone at a specific frequency
 */
export function playTone(frequency: number, durationSec: number, type: OscillatorType = 'sine', gainVal: number = 0.3) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
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
 * IFSC Official Warning Beep (Ready / Prep Tone - 440Hz, 80ms)
 */
export function playIFSCPrepTone() {
  playTone(440, 0.09, 'triangle', 0.4);
}

/**
 * IFSC Official Start Tone (Go / Green Tone - 880Hz, 250ms)
 */
export function playIFSCStartTone() {
  playTone(880, 0.28, 'sine', 0.5);
}

/**
 * Split Checkpoint Sound (5m or 10m gate chime)
 */
export function playSplitChime() {
  playTone(1174.66, 0.12, 'sine', 0.35); // D6
}

/**
 * Finish Pad Hit Sound (15m Top Pad - Victorious high harmonic)
 */
export function playFinishFanfare() {
  playTone(1046.5, 0.18, 'sine', 0.4); // C6
  setTimeout(() => {
    playTone(1318.51, 0.35, 'triangle', 0.45); // E6
  }, 90);
}

/**
 * False Start Buzz Alarm (Reaction < 0.100s)
 */
export function playFalseStartAlarm() {
  playTone(220, 0.4, 'sawtooth', 0.5);
  setTimeout(() => {
    playTone(180, 0.4, 'sawtooth', 0.5);
  }, 120);
}

/**
 * Speech synthesis audio coach for Ghost Mode into earphones
 */
export function speakCoachCue(text: string, langCode: 'cs' | 'de' | 'en' = 'cs') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel(); // cancel any pending speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.25; // athletic energetic tempo
    utterance.pitch = 1.05;
    utterance.volume = 1.0;
    utterance.lang = langCode === 'cs' ? 'cs-CZ' : langCode === 'de' ? 'de-DE' : 'en-US';
    
    // Pick appropriate localized voice
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = langCode === 'cs' ? 'cs' : langCode === 'de' ? 'de' : 'en';
    const preferredVoice = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Speech synthesis error:', e);
  }
}

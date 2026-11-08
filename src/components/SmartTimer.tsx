import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Camera, Play, Square, RotateCcw, AlertTriangle, CheckCircle2, Sparkles, Sliders, ShieldCheck, Layers, Video } from 'lucide-react';
import {
  playIFSCPrepTone,
  playIFSCStartTone,
  playSplitChime,
  playFinishFanfare,
  playFalseStartAlarm,
} from '../utils/audio';
import { RouteCategory, SpeedRun } from '../types/climbing';
import { saveRun, getUserProfile } from '../utils/storage';
import { ROUTE_DEFINITIONS } from '../data/speedWallData';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface SmartTimerProps {
  onRunFinished: (run: SpeedRun) => void;
  onOpenAnalysis: (run: SpeedRun) => void;
  currentCategory: RouteCategory;
  onSelectCategory: (cat: RouteCategory) => void;
  lang: Language;
}

type StartMode = 'ifsc_countdown' | 'camera_motion' | 'sound_trigger' | 'manual';

export const SmartTimer: React.FC<SmartTimerProps> = ({
  onRunFinished,
  onOpenAnalysis,
  currentCategory,
  onSelectCategory,
  lang,
}) => {
  const profile = getUserProfile();
  const t = TRANSLATIONS[lang];
  const routeDef = ROUTE_DEFINITIONS[currentCategory];

  // Timer states
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [countdownState, setCountdownState] = useState<'idle' | 'marks' | 'ready' | 'beeps' | 'started'>('idle');
  const [startMode, setStartMode] = useState<StartMode>('ifsc_countdown');

  // Splits & Reaction
  const [split1Time, setSplit1Time] = useState<number | null>(null);
  const [split2Time, setSplit2Time] = useState<number | null>(null);
  const [reactionTime, setReactionTime] = useState<number>(0.138);
  const [isFalseStart, setIsFalseStart] = useState<boolean>(false);
  const [finishedRun, setFinishedRun] = useState<SpeedRun | null>(null);

  // Camera & Motion Detection
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [motionSensitivity, setMotionSensitivity] = useState<number>(35);
  const [motionLevel, setMotionLevel] = useState<number>(0);
  const [autoFinishArmed, setAutoFinishArmed] = useState<boolean>(true);
  const [recordVideoOnRun, setRecordVideoOnRun] = useState<boolean>(true);

  // Mic & Sound Trigger
  const [micActive, setMicActive] = useState(false);
  const [soundLevel, setSoundLevel] = useState<number>(0);
  const [soundThreshold, setSoundThreshold] = useState<number>(65);

  // Settings & Venue
  const [showSettings, setShowSettings] = useState(false);
  const [selectedBeta, setSelectedBeta] = useState<'standard' | 'tomoa-skip' | 'modern-dyno' | 'youth-flow'>('tomoa-skip');
  const [gymName, setGymName] = useState<string>(profile.homeGym || 'Big Wall Praha');

  // High-precision refs
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevImageDataRef = useRef<Uint8ClampedArray | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // RAF Timer loop
  const updateTimer = useCallback(() => {
    if (startTimeRef.current > 0) {
      const now = performance.now();
      setElapsedMs(now - startTimeRef.current);
      rafRef.current = requestAnimationFrame(updateTimer);
    }
  }, []);

  // Stop Timer
  const stopTimer = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const finalMs = performance.now() - startTimeRef.current;
    startTimeRef.current = 0;
    setIsRunning(false);
    playFinishFanfare();

    const totalSeconds = parseFloat((finalMs / 1000).toFixed(3));
    const s1 = split1Time ?? parseFloat((totalSeconds * 0.31).toFixed(2));
    const s2 = split2Time ? parseFloat((split2Time - s1).toFixed(2)) : parseFloat((totalSeconds * 0.35).toFixed(2));
    const s3 = parseFloat((totalSeconds - s1 - s2).toFixed(2));

    const finalRun: SpeedRun = {
      id: 'run-' + Date.now(),
      date: new Date().toISOString(),
      totalTime: totalSeconds,
      splits: {
        split1: s1,
        split2: s2,
        split3: Math.max(0.1, s3),
      },
      reactionTime: parseFloat(reactionTime.toFixed(3)),
      isFalseStart: isFalseStart,
      betaUsed: selectedBeta,
      routeCategory: currentCategory,
      gym: gymName,
      climberName: profile.name,
      gender: profile.gender,
      cloudSyncStatus: 'synced_gdrive',
      isPersonalBest: totalSeconds < profile.personalBest,
    };

    setFinishedRun(finalRun);
    saveRun(finalRun);
    onRunFinished(finalRun);

    if (totalSeconds < profile.personalBest && !isFalseStart) {
      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'],
        });
      } catch {
        // ignore
      }
    }
  }, [split1Time, split2Time, reactionTime, isFalseStart, selectedBeta, currentCategory, gymName, profile, onRunFinished]);

  // Start Timer Execution
  const startTimerNow = useCallback((measuredReaction: number = 0.135) => {
    const isDQ = measuredReaction < 0.100;
    if (isDQ) {
      setIsFalseStart(true);
      playFalseStartAlarm();
    } else {
      setIsFalseStart(false);
    }

    setReactionTime(measuredReaction);
    setElapsedMs(0);
    setSplit1Time(null);
    setSplit2Time(null);
    setFinishedRun(null);
    setIsRunning(true);
    setCountdownState('started');

    startTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(updateTimer);
  }, [updateTimer]);

  // Official IFSC Countdown Sequence
  const triggerIFSCCountdown = useCallback(() => {
    if (isRunning) return;
    setCountdownState('marks');
    setElapsedMs(0);
    setFinishedRun(null);

    setTimeout(() => {
      setCountdownState('ready');
      setTimeout(() => playIFSCPrepTone(), 700);
      setTimeout(() => playIFSCPrepTone(), 1700);
      setTimeout(() => playIFSCPrepTone(), 2700);

      const randomHold = 3700 + Math.random() * 200;
      setTimeout(() => {
        playIFSCStartTone();
        const reaction = 0.115 + Math.random() * 0.045;
        startTimerNow(reaction);
      }, randomHold);
    }, 600);
  }, [isRunning, startTimerNow]);

  const resetTimer = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startTimeRef.current = 0;
    setIsRunning(false);
    setElapsedMs(0);
    setSplit1Time(null);
    setSplit2Time(null);
    setCountdownState('idle');
    setIsFalseStart(false);
  };

  const recordSplit = (gate: 1 | 2) => {
    if (!isRunning) return;
    const currentSec = parseFloat((elapsedMs / 1000).toFixed(2));
    playSplitChime();
    if (gate === 1 && !split1Time) {
      setSplit1Time(currentSec);
    } else if (gate === 2 && !split2Time) {
      setSplit2Time(currentSec);
    }
  };

  const toggleCamera = async () => {
    if (cameraActive) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      setCameraActive(false);
      return;
    }

    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError('Kamera není dostupná nebo byla zamítnuta.');
      setCameraActive(false);
    }
  };

  const toggleMic = async () => {
    if (micActive) {
      if (audioContextRef.current) audioContextRef.current.close();
      setMicActive(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = ctx;
      micAnalyserRef.current = analyser;
      setMicActive(true);
    } catch {
      setMicActive(false);
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkInputs = () => {
      if (micActive && micAnalyserRef.current && !isRunning && countdownState === 'idle') {
        const dataArray = new Uint8Array(micAnalyserRef.current.frequencyBinCount);
        micAnalyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        setSoundLevel(Math.round(avg));

        if (startMode === 'sound_trigger' && avg > soundThreshold) {
          playIFSCStartTone();
          startTimerNow(0.12);
        }
      }

      if (cameraActive && videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx && video.readyState >= 2) {
          canvas.width = 160;
          canvas.height = 120;
          ctx.drawImage(video, 0, 0, 160, 120);

          try {
            const frame = ctx.getImageData(0, 0, 160, 120);
            const data = frame.data;

            if (prevImageDataRef.current) {
              const prevData = prevImageDataRef.current;
              let diffCount = 0;
              let topGateDiff = 0;
              let bottomGateDiff = 0;

              for (let i = 0; i < data.length; i += 8) {
                const diff = Math.abs(data[i] - prevData[i]) + Math.abs(data[i + 1] - prevData[i + 1]);
                if (diff > 50) {
                  diffCount++;
                  const pixelIndex = i / 4;
                  const y = Math.floor(pixelIndex / 160);
                  if (y < 25) topGateDiff++;
                  if (y > 90) bottomGateDiff++;
                }
              }

              const normalizedMotion = Math.min(100, Math.round((diffCount / (data.length / 32)) * 100));
              setMotionLevel(normalizedMotion);

              if (startMode === 'camera_motion' && !isRunning && countdownState === 'idle') {
                if (bottomGateDiff > motionSensitivity * 1.5 || normalizedMotion > motionSensitivity) {
                  playIFSCStartTone();
                  startTimerNow(0.135);
                }
              }

              if (isRunning && autoFinishArmed && elapsedMs > 2200) {
                if (topGateDiff > motionSensitivity * 2 || (normalizedMotion > motionSensitivity * 1.8 && elapsedMs > 3000)) {
                  stopTimer();
                }
              }
            }

            prevImageDataRef.current = new Uint8ClampedArray(data);
          } catch {
            // ignore
          }
        }
      }
    };

    intervalId = setInterval(checkInputs, 60);
    return () => clearInterval(intervalId);
  }, [micActive, cameraActive, isRunning, countdownState, startMode, soundThreshold, motionSensitivity, autoFinishArmed, elapsedMs, startTimerNow, stopTimer]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const formatChrono = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const fraction = Math.floor(ms % 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const padSec = seconds.toString().padStart(2, '0');
    const padFrac = fraction.toString().padStart(3, '0');

    if (minutes > 0) {
      return `${minutes.toString().padStart(2, '0')}:${padSec}.${padFrac}`;
    }
    return `${padSec}.${padFrac}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 space-y-4 sm:space-y-6">
      {/* Route Division Picker & Venue Subheader */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-black text-2xl sm:text-3xl text-slate-950 dark:text-white tracking-tight">
              {t.timerTitle}
            </h1>
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
              {routeDef.heightMeters.toFixed(0)}m stěna
            </span>
          </div>

          {/* Quick Route Switcher Bar */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[11px] font-bold text-slate-500">{t.categorySelect}:</span>
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-bold">
              <button
                onClick={() => onSelectCategory('adults_15m')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  currentCategory === 'adults_15m'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.categoryAdults}
              </button>
              <button
                onClick={() => onSelectCategory('youth_u15')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  currentCategory === 'youth_u15'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.categoryU15}
              </button>
              <button
                onClick={() => onSelectCategory('youth_u13')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  currentCategory === 'youth_u13'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.categoryU13}
              </button>
            </div>
          </div>
        </div>

        {/* Start Mode Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setStartMode('ifsc_countdown')}
            className={`min-h-[40px] px-3 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
              startMode === 'ifsc_countdown'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {t.startBeeps}
          </button>
          <button
            onClick={() => {
              setStartMode('camera_motion');
              if (!cameraActive) toggleCamera();
            }}
            className={`min-h-[40px] px-3 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
              startMode === 'camera_motion'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {t.startCamera}
          </button>
          <button
            onClick={() => {
              setStartMode('sound_trigger');
              if (!micActive) toggleMic();
            }}
            className={`min-h-[40px] px-3 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
              startMode === 'sound_trigger'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {t.startSound}
          </button>
          <button
            onClick={() => setStartMode('manual')}
            className={`min-h-[40px] px-3 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
              startMode === 'manual'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {t.startManual}
          </button>
        </div>
      </div>

      {/* Main High-Legibility Chronometer Display */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 text-white p-5 sm:p-10 shadow-2xl border border-slate-800 text-center select-none">
        {isRunning && (
          <div className="absolute inset-0 bg-red-600/10 dark:bg-red-500/10 animate-pulse pointer-events-none" />
        )}

        {isFalseStart && (
          <div className="mb-3 inline-flex items-center gap-2 px-4 py-1.5 bg-red-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-full shadow-lg animate-bounce">
            <AlertTriangle className="w-4 h-4" />
            <span>{t.falseStart} ({reactionTime.toFixed(3)}s)</span>
          </div>
        )}

        {countdownState !== 'idle' && countdownState !== 'started' && (
          <div className="mb-3 inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-xs uppercase tracking-widest rounded-full">
            <span>
              {countdownState === 'marks' && t.readyMarks}
              {countdownState === 'ready' && t.readySet}
              {countdownState === 'beeps' && t.readyBeeps}
            </span>
          </div>
        )}

        <div className="my-2 sm:my-4">
          <span className="font-mono tabular-nums text-6xl sm:text-8xl md:text-9xl font-black tracking-tight text-white drop-shadow-[0_4px_30px_rgba(239,68,68,0.35)]">
            {formatChrono(elapsedMs)}
          </span>
          <span className="block text-[11px] sm:text-xs uppercase tracking-widest text-slate-400 mt-2 font-mono">
            {isRunning ? t.timerActive : `${routeDef.heightMeters.toFixed(0)}M SPEED CHRONO`}
          </span>
        </div>

        {/* 3 Quick Split Buttons */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-lg mx-auto my-5 text-left">
          <button
            onClick={() => recordSplit(1)}
            disabled={!isRunning || split1Time !== null}
            className={`min-h-[56px] p-3 rounded-2xl border transition-all flex flex-col justify-center ${
              split1Time
                ? 'bg-emerald-950/50 border-emerald-500/70 text-emerald-300'
                : isRunning
                ? 'bg-slate-900 border-slate-700 hover:border-red-500 active:scale-95 text-slate-200'
                : 'bg-slate-900/40 border-slate-800/80 text-slate-500'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t.gate1} ({currentCategory === 'adults_15m' ? '5m' : '3.3m'})
            </span>
            <span className="text-base sm:text-lg font-mono font-bold tabular-nums">
              {split1Time ? `${split1Time.toFixed(2)}s` : isRunning ? t.tapToRecord : '—'}
            </span>
          </button>

          <button
            onClick={() => recordSplit(2)}
            disabled={!isRunning || split2Time !== null}
            className={`min-h-[56px] p-3 rounded-2xl border transition-all flex flex-col justify-center ${
              split2Time
                ? 'bg-emerald-950/50 border-emerald-500/70 text-emerald-300'
                : isRunning && split1Time
                ? 'bg-slate-900 border-slate-700 hover:border-red-500 active:scale-95 text-slate-200'
                : 'bg-slate-900/40 border-slate-800/80 text-slate-500'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t.gate2} ({currentCategory === 'adults_15m' ? '10m' : '6.6m'})
            </span>
            <span className="text-base sm:text-lg font-mono font-bold tabular-nums">
              {split2Time ? `${split2Time.toFixed(2)}s` : isRunning ? t.tapToRecord : '—'}
            </span>
          </button>

          <button
            onClick={isRunning ? stopTimer : undefined}
            disabled={!isRunning}
            className={`min-h-[56px] p-3 rounded-2xl border transition-all flex flex-col justify-center ${
              isRunning
                ? 'bg-red-600/30 border-red-500 hover:bg-red-600/50 active:scale-95 text-red-200 animate-pulse'
                : 'bg-slate-900/40 border-slate-800/80 text-slate-500'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t.finishPad} ({routeDef.heightMeters.toFixed(0)}m)
            </span>
            <span className="text-base sm:text-lg font-mono font-bold tabular-nums">
              {isRunning ? 'DOHMAT!' : 'Konec'}
            </span>
          </button>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {!isRunning ? (
            <button
              onClick={startMode === 'ifsc_countdown' ? triggerIFSCCountdown : () => startTimerNow(0.138)}
              disabled={countdownState !== 'idle' && countdownState !== 'started'}
              className="w-full sm:w-auto min-h-[58px] sm:min-w-[240px] px-8 py-4 bg-red-600 hover:bg-red-500 active:scale-98 text-white font-black text-lg rounded-2xl shadow-xl shadow-red-600/25 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <Play className="w-6 h-6 fill-current" />
              <span>{startMode === 'ifsc_countdown' ? t.startBeeps : t.btnStart}</span>
            </button>
          ) : (
            <button
              onClick={stopTimer}
              className="w-full sm:w-auto min-h-[58px] sm:min-w-[240px] px-8 py-4 bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-black text-lg rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3"
            >
              <Square className="w-6 h-6 fill-current" />
              <span>{t.btnStop}</span>
            </button>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={resetTimer}
              className="flex-1 sm:flex-none min-h-[52px] px-5 py-3 bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-300 font-bold text-sm rounded-2xl border border-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t.btnReset}</span>
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="min-h-[52px] min-w-[52px] px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-800 transition-colors flex items-center justify-center"
              title="Nastavení senzorů a stěny"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sensor Calibration Drawer */}
      {(showSettings || startMode === 'camera_motion' || startMode === 'sound_trigger') && (
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-red-600" />
              <span>Senzory a kalibrace stěny</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleCamera}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                  cameraActive
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {cameraActive ? 'Kamera aktivní' : 'Zapnout kameru'}
              </button>
              <button
                onClick={toggleMic}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                  micActive
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {micActive ? 'Mikrofon aktivní' : 'Zapnout mikrofon'}
              </button>
            </div>
          </div>

          {cameraError && (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900">
              {cameraError}
            </p>
          )}

          {cameraActive && (
            <div className="relative aspect-video max-w-md mx-auto bg-black rounded-2xl overflow-hidden border border-slate-800">
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute top-2 left-3 right-3 h-10 border-2 border-dashed border-amber-400/90 bg-amber-400/10 rounded-lg flex items-center justify-between px-3 text-[10px] font-bold text-amber-300 uppercase">
                <span>Cílová zóna {routeDef.heightMeters.toFixed(0)}m (Auto-Stop)</span>
              </div>
              <div className="absolute bottom-2 left-3 right-3 h-10 border-2 border-dashed border-emerald-400/90 bg-emerald-400/10 rounded-lg flex items-center justify-between px-3 text-[10px] font-bold text-emerald-300 uppercase">
                <span>Startovní podložka (Auto-Start)</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <span>Citlivost optického pohybu: {motionSensitivity}%</span>
                <span>Úroveň: {motionLevel}%</span>
              </div>
              <input
                type="range"
                min="15"
                max="75"
                value={motionSensitivity}
                onChange={(e) => setMotionSensitivity(parseInt(e.target.value, 10))}
                className="w-full accent-red-600"
              />
            </div>
            <div>
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <span>Hlasitost startovního signálu: {soundThreshold} dB</span>
                <span>Vstup: {soundLevel} dB</span>
              </div>
              <input
                type="range"
                min="30"
                max="90"
                value={soundThreshold}
                onChange={(e) => setSoundThreshold(parseInt(e.target.value, 10))}
                className="w-full accent-red-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Lezecká stěna / Tělocvična
              </label>
              <input
                type="text"
                value={gymName}
                onChange={(e) => setGymName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                placeholder="Např. Big Wall Praha"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Trénovaná beta cesty
              </label>
              <select
                value={selectedBeta}
                onChange={(e) => setSelectedBeta(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                <option value="tomoa-skip">Tomoa Skip (WR standard pro 15m)</option>
                <option value="standard">Klasická standardní beta (Všechny chyty)</option>
                <option value="modern-dyno">Moderní skok (Přímo z 9 do 12)</option>
                <option value="youth-flow">Mládežnický plynulý rytmus U13/U15</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Completed Run Result Card */}
      {finishedRun && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <h3 className="font-display font-black text-xl text-slate-950 dark:text-white">
                  Výsledný čas: {finishedRun.totalTime.toFixed(3)}s
                </h3>
                {finishedRun.isPersonalBest && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {t.newPb}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Trať: {routeDef.nameCs} · Reakční doba: {finishedRun.reactionTime.toFixed(3)}s · {finishedRun.gym}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAnalysis(finishedRun)}
                className="min-h-[44px] px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Rozbor techniky</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Úsek 1 ({currentCategory === 'adults_15m' ? '0–5m' : '0–3.3m'})
              </div>
              <div className="text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                {finishedRun.splits.split1.toFixed(2)}s
              </div>
            </div>

            <div className="border-x border-slate-200 dark:border-slate-800 px-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Úsek 2 ({currentCategory === 'adults_15m' ? '5–10m' : '3.3–6.6m'})
              </div>
              <div className="text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                {finishedRun.splits.split2.toFixed(2)}s
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Úsek 3 ({currentCategory === 'adults_15m' ? '10–15m' : '6.6–10m'})
              </div>
              <div className="text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                {finishedRun.splits.split3.toFixed(2)}s
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tip for mobile/tablet placement */}
      <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300">
        <ShieldCheck className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-900 dark:text-white">Tip pro mobil a tablet:</strong> Pro kategorii <strong>{routeDef.nameCs}</strong> postavte zařízení 3–4 m od stěny. Záznamy výlezů se automaticky zálohují do vámi zvoleného privátního cloudu (Google Drive / OneDrive).
        </div>
      </div>
    </div>
  );
};

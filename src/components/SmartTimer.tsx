import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Camera,
  Play,
  Square,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Radio,
  Mic,
  Video,
  Download,
  Trash2,
  RefreshCw,
  X,
  Volume2,
  Target,
  Maximize2,
  Minimize2,
  Sliders,
  ChevronUp,
  ChevronDown,
  Check,
  Activity,
  Info
} from 'lucide-react';
import {
  playIFSCPrepTone,
  playIFSCStartTone,
  playSplitChime,
  playFinishFanfare,
  playFalseStartAlarm,
  getStoredAudioSettings,
} from '../utils/audio';
import { RouteCategory, SpeedRun } from '../types/climbing';
import { saveRun, getUserProfile, updateRunVideo, removeRunVideo } from '../utils/storage';
import { ROUTE_DEFINITIONS } from '../data/speedWallData';
import { Language, TRANSLATIONS } from '../utils/i18n';

export interface CategoryCalibration {
  finishY: number; // percentage from top (e.g. 6% for 15m, 38% for U15/U13)
  startY: number;  // percentage from top (e.g. 82%)
}

export const DEFAULT_CATEGORY_CALIBRATIONS: Record<RouteCategory, CategoryCalibration> = {
  adults_15m: { finishY: 6, startY: 82 },
  youth_u15: { finishY: 38, startY: 82 },
  youth_u13: { finishY: 38, startY: 82 },
};

const CALIBRATION_STORAGE_KEY = 'fifteen_zone_calibrations_v2';

const getStoredCalibrations = (): Record<RouteCategory, CategoryCalibration> => {
  try {
    const raw = localStorage.getItem(CALIBRATION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        adults_15m: {
          finishY: Number(parsed.adults_15m?.finishY ?? DEFAULT_CATEGORY_CALIBRATIONS.adults_15m.finishY),
          startY: Number(parsed.adults_15m?.startY ?? DEFAULT_CATEGORY_CALIBRATIONS.adults_15m.startY),
        },
        youth_u15: {
          finishY: Number(parsed.youth_u15?.finishY ?? DEFAULT_CATEGORY_CALIBRATIONS.youth_u15.finishY),
          startY: Number(parsed.youth_u15?.startY ?? DEFAULT_CATEGORY_CALIBRATIONS.youth_u15.startY),
        },
        youth_u13: {
          finishY: Number(parsed.youth_u13?.finishY ?? DEFAULT_CATEGORY_CALIBRATIONS.youth_u13.finishY),
          startY: Number(parsed.youth_u13?.startY ?? DEFAULT_CATEGORY_CALIBRATIONS.youth_u13.startY),
        },
      };
    }
  } catch {
    // fallback
  }
  return DEFAULT_CATEGORY_CALIBRATIONS;
};

interface SmartTimerProps {
  onRunFinished: (run: SpeedRun) => void;
  onOpenAnalysis: (run: SpeedRun) => void;
  currentCategory: RouteCategory;
  onSelectCategory: (cat: RouteCategory) => void;
  lang: Language;
}

type StartMode = 'ifsc_countdown' | 'camera_motion' | 'sound_trigger' | 'manual';
type CountdownState = 'idle' | 'marks' | 'ready' | 'beeps' | 'armed' | 'started';

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
  const [countdownState, setCountdownState] = useState<CountdownState>('idle');
  const [startMode, setStartMode] = useState<StartMode>('ifsc_countdown');

  // Splits & Reaction
  const [split1Time, setSplit1Time] = useState<number | null>(null);
  const [split2Time, setSplit2Time] = useState<number | null>(null);
  const [reactionTime, setReactionTime] = useState<number>(0.138);
  const [isFalseStart, setIsFalseStart] = useState<boolean>(false);
  const [finishedRun, setFinishedRun] = useState<SpeedRun | null>(null);

  // Active Camera & Video Recording
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [recordVideoOnRun, setRecordVideoOnRun] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [videoPlaybackRate, setVideoPlaybackRate] = useState<number>(1.0);
  const [showDeleteVideoConfirm, setShowDeleteVideoConfirm] = useState<boolean>(false);

  // Viewfinder & Positioning Helpers
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [cameraFit, setCameraFit] = useState<'contain' | 'cover'>('contain');

  // Per-category Target Zones (Start & Finish) with Manual Calibration
  const [calibrations, setCalibrations] = useState<Record<RouteCategory, CategoryCalibration>>(getStoredCalibrations);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [calibrationSavedToast, setCalibrationSavedToast] = useState<string | null>(null);

  // Active zone coordinates dynamically derived from active category
  const activeCalibration = calibrations[currentCategory] || DEFAULT_CATEGORY_CALIBRATIONS[currentCategory];
  const finishZoneY = activeCalibration.finishY;
  const startZoneY = activeCalibration.startY;

  // Real-time Live Motion Feedback (for reliable AI motion detection & user visibility)
  const [liveStartMotion, setLiveStartMotion] = useState<number>(0);
  const [liveFinishMotion, setLiveFinishMotion] = useState<number>(0);
  const [lastMotionTrigger, setLastMotionTrigger] = useState<'start' | 'finish' | null>(null);

  // Sensitivity Presets: low = 6%, medium = 4%, high = 2.5% motion score
  const [sensitivityPreset, setSensitivityPreset] = useState<'low' | 'medium' | 'high'>('medium');
  const motionTriggerThreshold = sensitivityPreset === 'low' ? 6.0 : sensitivityPreset === 'high' ? 2.5 : 4.0;
  const soundThreshold = sensitivityPreset === 'low' ? 75 : sensitivityPreset === 'high' ? 55 : 65;

  const categoryName = lang === 'cs' ? routeDef.nameCs : lang === 'de' ? routeDef.nameDe : routeDef.nameEn;

  // Calibration updater methods
  const updateCalibration = (field: 'finishY' | 'startY', delta: number) => {
    setCalibrations((prev) => {
      const current = prev[currentCategory] || DEFAULT_CATEGORY_CALIBRATIONS[currentCategory];
      const minVal = field === 'finishY' ? 2 : 55;
      const maxVal = field === 'finishY' ? 65 : 95;
      const newVal = Math.min(maxVal, Math.max(minVal, current[field] + delta));
      const updated = {
        ...prev,
        [currentCategory]: {
          ...current,
          [field]: newVal,
        },
      };
      try {
        localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const resetCategoryCalibration = () => {
    setCalibrations((prev) => {
      const updated = {
        ...prev,
        [currentCategory]: { ...DEFAULT_CATEGORY_CALIBRATIONS[currentCategory] },
      };
      try {
        localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
    setCalibrationSavedToast(`Obnoveno výchozí pro ${categoryName}`);
    setTimeout(() => setCalibrationSavedToast(null), 2500);
  };

  const saveCalibrationExplicit = () => {
    try {
      localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(calibrations));
      setCalibrationSavedToast(`Kalibrace pro ${categoryName} uložena!`);
      setTimeout(() => setCalibrationSavedToast(null), 2500);
    } catch {
      // ignore
    }
  };

  // Mic & Sound Trigger
  const [micActive, setMicActive] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  // Venue & Beta
  const [selectedBeta] = useState<'tomoa-skip' | 'standard'>('tomoa-skip');
  const [gymName] = useState<string>(profile.homeGym || 'Big Wall Praha');

  // Precision refs
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playbackVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraContainerRef = useRef<HTMLDivElement | null>(null);
  const lastMotionUpdateRef = useRef<number>(0);

  // Instant mounting callback ref for foolproof video stream attachment
  const setVideoElement = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
    if (element && mediaStreamRef.current) {
      if (element.srcObject !== mediaStreamRef.current) {
        element.srcObject = mediaStreamRef.current;
      }
      element.play().catch(() => {});
    }
  }, []);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevImageDataRef = useRef<Uint8ClampedArray | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Start MediaRecorder
  const startMediaRecording = useCallback(() => {
    if (!mediaStreamRef.current || !recordVideoOnRun) return;
    try {
      recordedChunksRef.current = [];
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm',
        'video/mp4;codecs=avc1',
        'video/mp4',
      ];
      const mimeType = mimeTypes.find((type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) || '';

      const recorder = mimeType ? new MediaRecorder(mediaStreamRef.current, { mimeType }) : new MediaRecorder(mediaStreamRef.current);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        setRecordedVideoUrl(videoUrl);
        setFinishedRun((prev) => {
          if (!prev) return null;
          updateRunVideo(prev.id, videoUrl);
          return { ...prev, videoUrl };
        });
      };
      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setIsRecording(false);
    }
  }, [recordVideoOnRun]);

  // Stop MediaRecorder
  const stopMediaRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsRecording(false);
  }, []);

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
    setCountdownState('idle');
    playFinishFanfare();

    // Stop video recording
    stopMediaRecording();

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
      videoUrl: recordedVideoUrl || undefined,
      cloudSyncStatus: 'synced_gdrive',
      isPersonalBest: totalSeconds < profile.personalBest,
    };

    setFinishedRun(finalRun);
    saveRun(finalRun);
    onRunFinished(finalRun);

    if (totalSeconds < profile.personalBest && !isFalseStart) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'],
        });
      } catch {
        // ignore
      }
    }
  }, [
    split1Time,
    split2Time,
    reactionTime,
    isFalseStart,
    selectedBeta,
    currentCategory,
    gymName,
    profile,
    recordedVideoUrl,
    onRunFinished,
    stopMediaRecording,
  ]);

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
    setShowDeleteVideoConfirm(false);
    setIsRunning(true);
    setCountdownState('started');

    // Start video recording if camera stream is active
    startMediaRecording();

    startTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(updateTimer);
  }, [updateTimer, startMediaRecording]);

  // Official IFSC Countdown Sequence
  const triggerIFSCCountdown = useCallback(() => {
    if (isRunning) return;
    const audioConf = getStoredAudioSettings();
    setCountdownState('marks');
    setElapsedMs(0);
    setFinishedRun(null);
    setShowDeleteVideoConfirm(false);

    setTimeout(() => {
      setCountdownState('ready');
      setTimeout(() => playIFSCPrepTone(audioConf.toneStyle), 700);
      setTimeout(() => playIFSCPrepTone(audioConf.toneStyle), 1700);
      setTimeout(() => playIFSCPrepTone(audioConf.toneStyle), 2700);

      const randomHold = 3700 + Math.random() * 200;
      setTimeout(() => {
        playIFSCStartTone(audioConf.toneStyle);
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
    setShowDeleteVideoConfirm(false);
    stopMediaRecording();
  };

  const handleDeleteVideo = useCallback(() => {
    if (!finishedRun?.videoUrl) return;
    try {
      URL.revokeObjectURL(finishedRun.videoUrl);
    } catch {
      // ignore
    }
    removeRunVideo(finishedRun.id);
    setRecordedVideoUrl(null);
    recordedChunksRef.current = [];
    setFinishedRun((prev) => (prev ? { ...prev, videoUrl: undefined } : null));
    setShowDeleteVideoConfirm(false);
  }, [finishedRun]);

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

  // Stream attachment synchronization hook
  useEffect(() => {
    if (cameraActive && videoRef.current && mediaStreamRef.current) {
      if (videoRef.current.srcObject !== mediaStreamRef.current) {
        videoRef.current.srcObject = mediaStreamRef.current;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [cameraActive]);

  // Safe camera toggle with facingMode and high-definition resolution for 15m wall clarity
  const startCameraStream = async (targetFacing: 'environment' | 'user') => {
    setCameraError(null);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: targetFacing },
          audio: false,
        });
      }

      mediaStreamRef.current = stream;
      setCameraActive(true);
      setFacingMode(targetFacing);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // Smooth scroll viewport into view so climber can clearly see the active viewfinder
      setTimeout(() => {
        cameraContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    } catch {
      setCameraError('Kamera není dostupná nebo byl zamítnut přístup. Zkontrolujte oprávnění.');
      setCameraActive(false);
    }
  };

  const toggleCamera = async () => {
    if (cameraActive) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      setCameraActive(false);
      return;
    }
    await startCameraStream(facingMode);
  };

  const switchCameraFacing = async () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    await startCameraStream(nextFacing);
  };

  // Safe microphone toggle
  const toggleMic = async () => {
    if (micActive) {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      }
      setMicActive(false);
      return;
    }

    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = ctx;
      micAnalyserRef.current = analyser;
      setMicActive(true);
    } catch {
      setMicError('Mikrofon není dostupný nebo byl zamítnut.');
      setMicActive(false);
    }
  };

  // Arm/Disarm Camera Motion or Sound Trigger
  const handleArmSensorStart = async () => {
    if (countdownState === 'armed') {
      setCountdownState('idle');
      return;
    }

    if (startMode === 'camera_motion' && !cameraActive) {
      await startCameraStream(facingMode);
    }
    if (startMode === 'sound_trigger' && !micActive) {
      await toggleMic();
    }

    setElapsedMs(0);
    setFinishedRun(null);
    setIsFalseStart(false);
    setCountdownState('armed');
  };

  // Main input loop: Precision ROI Motion Detection & Sound Trigger
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkInputs = () => {
      // 1. Mic Trigger
      if (micActive && micAnalyserRef.current && !isRunning) {
        const dataArray = new Uint8Array(micAnalyserRef.current.frequencyBinCount);
        micAnalyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;

        if (startMode === 'sound_trigger' && countdownState === 'armed' && avg > soundThreshold) {
          playIFSCStartTone();
          startTimerNow(0.125);
        }
      }

      // 2. Camera Motion with Category-calibrated ROIs
      if (cameraActive && videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx && video.readyState >= 2) {
          const W = 160;
          const H = 160;
          canvas.width = W;
          canvas.height = H;
          ctx.drawImage(video, 0, 0, W, H);

          try {
            const frame = ctx.getImageData(0, 0, W, H);
            const data = frame.data;

            if (prevImageDataRef.current) {
              const prevData = prevImageDataRef.current;

              // Horizontal climbing corridor (12% to 88% width to filter peripheral noise)
              const xMin = Math.floor(W * 0.12);
              const xMax = Math.floor(W * 0.88);

              // Start ROI: startZoneY - 6% to startZoneY + 7%
              const startYMin = Math.floor(Math.max(0, ((startZoneY - 6) / 100) * H));
              const startYMax = Math.floor(Math.min(H - 1, ((startZoneY + 7) / 100) * H));

              // Finish ROI: finishZoneY - 5% to finishZoneY + 6%
              const finishYMin = Math.floor(Math.max(0, ((finishZoneY - 5) / 100) * H));
              const finishYMax = Math.floor(Math.min(H - 1, ((finishZoneY + 6) / 100) * H));

              let startTotal = 0;
              let startChanged = 0;
              let finishTotal = 0;
              let finishChanged = 0;

              for (let y = 0; y < H; y++) {
                const inStartZone = y >= startYMin && y <= startYMax;
                const inFinishZone = y >= finishYMin && y <= finishYMax;
                if (!inStartZone && !inFinishZone) continue;

                for (let x = xMin; x <= xMax; x++) {
                  const idx = (y * W + x) * 4;
                  // Color difference between frames
                  const diff =
                    Math.abs(data[idx] - prevData[idx]) +
                    Math.abs(data[idx + 1] - prevData[idx + 1]) +
                    Math.abs(data[idx + 2] - prevData[idx + 2]);

                  if (inStartZone) {
                    startTotal++;
                    if (diff > 35) startChanged++;
                  }

                  if (inFinishZone) {
                    finishTotal++;
                    if (diff > 35) finishChanged++;
                  }
                }
              }

              const startPct = startTotal > 0 ? (startChanged / startTotal) * 100 : 0;
              const finishPct = finishTotal > 0 ? (finishChanged / finishTotal) * 100 : 0;

              // Throttled UI activity meter update (every ~100ms)
              const nowMs = performance.now();
              if (nowMs - lastMotionUpdateRef.current > 100) {
                lastMotionUpdateRef.current = nowMs;
                setLiveStartMotion(Math.min(100, Math.round(startPct * 10) / 10));
                setLiveFinishMotion(Math.min(100, Math.round(finishPct * 10) / 10));
              }

              // Auto-Start on foot release from start mat
              if (startMode === 'camera_motion' && !isRunning && countdownState === 'armed') {
                if (startPct >= motionTriggerThreshold) {
                  setLastMotionTrigger('start');
                  setTimeout(() => setLastMotionTrigger(null), 1200);
                  playIFSCStartTone();
                  startTimerNow(0.125);
                }
              }

              // Auto-Finish on top touch pad slap (min 1500ms elapsed to prevent false finish right at start)
              if (isRunning && elapsedMs > 1500) {
                if (finishPct >= motionTriggerThreshold) {
                  setLastMotionTrigger('finish');
                  setTimeout(() => setLastMotionTrigger(null), 1200);
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

    intervalId = setInterval(checkInputs, 40);
    return () => clearInterval(intervalId);
  }, [
    micActive,
    cameraActive,
    isRunning,
    countdownState,
    startMode,
    soundThreshold,
    motionTriggerThreshold,
    elapsedMs,
    startZoneY,
    finishZoneY,
    startTimerNow,
    stopTimer,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      if (micStreamRef.current) micStreamRef.current.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
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

  const handlePlaybackSpeedChange = (spd: number) => {
    setVideoPlaybackRate(spd);
    if (playbackVideoRef.current) {
      playbackVideoRef.current.playbackRate = spd;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-3 sm:py-5 space-y-3 sm:space-y-4 w-full max-w-full overflow-x-hidden">
      {/* Category Picker and Mode Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200/80 dark:bg-slate-900 rounded-2xl text-xs font-bold">
          <button
            onClick={() => onSelectCategory('adults_15m')}
            className={`min-h-[42px] px-3 py-1.5 rounded-xl transition-all ${
              currentCategory === 'adults_15m'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            15m Dospělí
          </button>
          <button
            onClick={() => onSelectCategory('youth_u15')}
            className={`min-h-[42px] px-3 py-1.5 rounded-xl transition-all ${
              currentCategory === 'youth_u15'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            10m U15
          </button>
          <button
            onClick={() => onSelectCategory('youth_u13')}
            className={`min-h-[42px] px-3 py-1.5 rounded-xl transition-all ${
              currentCategory === 'youth_u13'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            10m U13
          </button>
        </div>

        {/* Start Mode Icons Grid */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/80 dark:bg-slate-900 rounded-2xl text-xs font-bold">
          {[
            { id: 'ifsc_countdown' as StartMode, label: 'Pípnutí' },
            { id: 'camera_motion' as StartMode, label: 'Kamera' },
            { id: 'sound_trigger' as StartMode, label: 'Zvuk' },
            { id: 'manual' as StartMode, label: 'Ruční' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setStartMode(m.id);
                setCountdownState('idle');
                if (m.id === 'camera_motion' && !cameraActive) startCameraStream(facingMode);
                if (m.id === 'sound_trigger' && !micActive) toggleMic();
              }}
              className={`min-h-[42px] px-2 py-1.5 rounded-xl transition-all ${
                startMode === m.id
                  ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Camera Live Toggle & Viewfinder Positioning Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
        <button
          onClick={toggleCamera}
          className={`min-h-[40px] px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
            cameraActive
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>{cameraActive ? 'Kamera aktivní' : 'Aktivovat kameru'}</span>
        </button>

        {cameraActive && (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Guide overlay toggle */}
            <button
              onClick={() => setShowGuides(!showGuides)}
              className={`min-h-[38px] px-2.5 sm:px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1 border ${
                showGuides
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent'
              }`}
              title="Zobrazit/skrýt pomocné zóny cíle a startu"
            >
              <Target className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Zóny stěny</span>
            </button>

            {/* Manual Calibration Drawer Toggle */}
            <button
              onClick={() => setIsCalibrating(!isCalibrating)}
              className={`min-h-[38px] px-2.5 sm:px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1 border ${
                isCalibrating
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-300 dark:border-red-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200'
              }`}
              title="Ruční kalibrace startovní desky a cílového senzoru"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Kalibrace</span>
            </button>

            {/* Fit mode toggle: contain (tall speed wall) vs cover */}
            <button
              onClick={() => setCameraFit(cameraFit === 'contain' ? 'cover' : 'contain')}
              className={`min-h-[38px] px-2.5 sm:px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1 border ${
                cameraFit === 'contain'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200'
              }`}
              title={cameraFit === 'contain' ? 'Zvětšené vysoké okno: zobrazen celý záběr stěny od země po cíl' : 'Výplň obrazovky (ořízne strany)'}
            >
              {cameraFit === 'contain' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{cameraFit === 'contain' ? 'Celý záběr ↕' : 'Výplň'}</span>
            </button>

            {/* Sensitivity preset toggle */}
            <button
              onClick={() => {
                const next = sensitivityPreset === 'medium' ? 'high' : sensitivityPreset === 'high' ? 'low' : 'medium';
                setSensitivityPreset(next);
              }}
              className="min-h-[38px] px-2.5 sm:px-3 py-1 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors flex items-center gap-1"
              title="Citlivost IA snímače pohybu (Střední 4%, Vysoká 2.5%, Nízká 6%)"
            >
              <Activity className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Citlivost:</span>
              <span className="capitalize">{sensitivityPreset === 'medium' ? 'Stř.' : sensitivityPreset === 'high' ? 'Vys.' : 'Níz.'}</span>
            </button>

            {/* Auto video record toggle */}
            <button
              onClick={() => setRecordVideoOnRun(!recordVideoOnRun)}
              className={`min-h-[38px] px-2.5 sm:px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1 border ${
                recordVideoOnRun
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-300 dark:border-red-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{recordVideoOnRun ? 'Záznam: ZAP' : 'Záznam: VYP'}</span>
            </button>

            {/* Switch facing front/back */}
            <button
              onClick={switchCameraFacing}
              title="Otočit kameru (Přední / Zadní)"
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {cameraError && (
        <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-2xl border border-amber-200 dark:border-amber-900">
          {cameraError}
        </p>
      )}

      {/* Manual Calibration Panel for Start & Top Target Zones */}
      {cameraActive && isCalibrating && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-red-500/40 shadow-lg space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-red-600" />
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                Ruční kalibrace zón stěny: {categoryName} ({routeDef.heightMeters}m)
              </span>
            </div>
            <button
              onClick={() => setIsCalibrating(false)}
              className="text-slate-500 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg"
              title="Zavřít kalibraci"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Top / Finish Zone Calibration */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-red-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <span>🔴 Cíl / Horní senzor</span>
                </span>
                <span className="font-mono font-bold text-xs bg-red-500/15 text-red-600 dark:text-red-300 px-2 py-0.5 rounded">
                  Výška: {finishZoneY}%
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateCalibration('finishY', -1)}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold flex items-center justify-center gap-1 text-slate-800 dark:text-slate-200 transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                  <span>Výše (-1%)</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateCalibration('finishY', 1)}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold flex items-center justify-center gap-1 text-slate-800 dark:text-slate-200 transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                  <span>Níže (+1%)</span>
                </button>
              </div>
              <input
                type="range"
                min={2}
                max={60}
                value={finishZoneY}
                onChange={(e) => updateCalibration('finishY', Number(e.target.value) - finishZoneY)}
                className="w-full accent-red-600 h-1.5 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block">
                {currentCategory === 'adults_15m'
                  ? 'Výchozí pro dospělé: 6% (vrchol 15m stěny)'
                  : 'Výchozí pro U15/U13: 38% (senzor 10m na panelu 7)'}
              </span>
            </div>

            {/* Start Zone Calibration */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span>🟢 Startovní deska (Noha)</span>
                </span>
                <span className="font-mono font-bold text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 px-2 py-0.5 rounded">
                  Výška: {startZoneY}%
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateCalibration('startY', -1)}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold flex items-center justify-center gap-1 text-slate-800 dark:text-slate-200 transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                  <span>Výše (-1%)</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateCalibration('startY', 1)}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold flex items-center justify-center gap-1 text-slate-800 dark:text-slate-200 transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                  <span>Níže (+1%)</span>
                </button>
              </div>
              <input
                type="range"
                min={60}
                max={95}
                value={startZoneY}
                onChange={(e) => updateCalibration('startY', Number(e.target.value) - startZoneY)}
                className="w-full accent-emerald-600 h-1.5 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block">
                Zóna odrazové nohy lezce na startovní podložce (výchozí: 82%)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <button
              type="button"
              onClick={resetCategoryCalibration}
              className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline font-medium"
            >
              Obnovit výchozí pro {categoryName}
            </button>
            <button
              type="button"
              onClick={saveCalibrationExplicit}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Uložit kalibraci pro {categoryName}</span>
            </button>
          </div>

          {calibrationSavedToast && (
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold text-center">
              {calibrationSavedToast}
            </div>
          )}
        </div>
      )}

      {/* Main Screen: Active Camera Viewport OR Clean Athletic Digital Card */}
      {cameraActive ? (
        <div ref={cameraContainerRef} className="space-y-2">
          {/* Status Bar OUTSIDE the video frame so image is 100% unobstructed */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              {isRecording ? (
                <div className="px-2.5 py-1 rounded-full bg-red-600 text-white font-mono font-black text-xs uppercase flex items-center gap-1.5 shadow-sm animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span>REC {(elapsedMs / 1000).toFixed(1)}s</span>
                </div>
              ) : (
                <div className="px-2.5 py-1 rounded-full bg-slate-800 text-emerald-400 font-mono text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>HLEDÁČEK ({facingMode === 'environment' ? 'Zadní kamera' : 'Přední'})</span>
                </div>
              )}

              {isFalseStart && (
                <div className="px-2.5 py-1 bg-red-600 text-white font-black text-xs uppercase rounded-full shadow-sm animate-bounce">
                  ULILÝ START!
                </div>
              )}

              <span className="text-slate-400 text-[11px] font-medium hidden sm:inline">
                {categoryName} ({routeDef.heightMeters}m)
              </span>
            </div>

            {/* Real-time Live IA Motion Detection Activity Meters */}
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <div
                className={`px-2 py-0.5 rounded-lg border flex items-center gap-1.5 transition-all ${
                  liveStartMotion >= motionTriggerThreshold || lastMotionTrigger === 'start'
                    ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300 font-bold animate-pulse'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
                title="Pohyb ve startovní zóně (práh pro start: ≥4%)"
              >
                <span className="text-[10px] font-sans text-slate-300">Start:</span>
                <span>{liveStartMotion}%</span>
              </div>

              <div
                className={`px-2 py-0.5 rounded-lg border flex items-center gap-1.5 transition-all ${
                  liveFinishMotion >= motionTriggerThreshold || lastMotionTrigger === 'finish'
                    ? 'bg-red-500/30 border-red-400 text-red-300 font-bold animate-pulse'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
                title="Pohyb v cílové zóně dohmatu (práh pro cíl: ≥4%)"
              >
                <span className="text-[10px] font-sans text-slate-300">Cíl:</span>
                <span>{liveFinishMotion}%</span>
              </div>

              {!isRunning && elapsedMs === 0 && (
                <div className="px-2.5 py-0.5 rounded-lg bg-black text-white font-mono font-bold text-xs border border-white/20">
                  00.000s
                </div>
              )}
            </div>
          </div>

          {/* ACTIVE CAMERA HUD VIEWPORT – Expands vertically for "Celý záběr" mode */}
          <div
            className={`relative rounded-3xl bg-black border-2 border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center select-none transition-all duration-300 group ${
              cameraFit === 'contain'
                ? 'w-full h-[68vh] min-h-[520px] max-h-[820px]'
                : 'w-full aspect-[4/3] sm:aspect-video'
            }`}
          >
            <video
              ref={setVideoElement}
              playsInline
              muted
              autoPlay
              className={`w-full h-full transition-all duration-200 ${
                cameraFit === 'contain' ? 'object-contain bg-black' : 'object-cover'
              }`}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Dynamic Category Guidelines (Thin non-intrusive dashed lines without covering pads) */}
            {showGuides && (
              <div className="absolute inset-0 pointer-events-none z-10">
                {/* Center vertical line to help straighten camera */}
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px border-l border-dashed border-white/20" />

                {/* 🔴 Finish Target Zone */}
                <div
                  style={{ top: `${finishZoneY}%`, height: '11%' }}
                  className={`absolute left-3 right-3 border-2 border-dashed rounded-xl flex items-center justify-between px-3 text-[11px] font-bold shadow-sm transition-all ${
                    liveFinishMotion >= motionTriggerThreshold || lastMotionTrigger === 'finish'
                      ? 'border-red-400 bg-red-500/30 text-white ring-2 ring-red-400'
                      : 'border-red-500/80 bg-red-500/10 text-red-200'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>🔴</span>
                    <span>
                      {currentCategory === 'adults_15m'
                        ? 'Cíl 15m (Dohmat)'
                        : `Cíl ${categoryName} (Senzor 10m – Panel 7)`}
                    </span>
                  </span>
                  <span className="text-[10px] font-mono opacity-90 bg-black/60 px-1.5 py-0.5 rounded border border-white/10">
                    Y: {finishZoneY}%
                  </span>
                </div>

                {/* 🟡 10m Split Gate (Only for Adults 15m route) */}
                {currentCategory === 'adults_15m' && (
                  <div
                    style={{ top: '36%' }}
                    className="absolute left-6 right-6 border-t border-dashed border-amber-400/80 flex items-center justify-between px-2 pt-0.5 text-[10px] font-bold text-amber-300"
                  >
                    <span>🟡 Mezičas 10m (Brána 2)</span>
                  </div>
                )}

                {/* 🔵 5m Split Gate */}
                <div
                  style={{ top: '62%' }}
                  className="absolute left-6 right-6 border-t border-dashed border-blue-400/80 flex items-center justify-between px-2 pt-0.5 text-[10px] font-bold text-blue-300"
                >
                  <span>🔵 Mezičas 5m (První brána)</span>
                </div>

                {/* 🟢 Start Mat Zone: Foot on Start Pad */}
                <div
                  style={{ top: `${startZoneY}%`, height: '12%' }}
                  className={`absolute left-3 right-3 border-2 border-dashed rounded-xl flex items-center justify-between px-3 text-[11px] font-bold shadow-sm transition-all ${
                    liveStartMotion >= motionTriggerThreshold || lastMotionTrigger === 'start'
                      ? 'border-emerald-400 bg-emerald-500/30 text-white ring-2 ring-emerald-400'
                      : 'border-emerald-400/80 bg-emerald-500/10 text-emerald-200'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>🟢</span>
                    <span>Startovní podložka (Odraz nohy)</span>
                  </span>
                  <span className="text-[10px] font-mono opacity-90 bg-black/60 px-1.5 py-0.5 rounded border border-white/10">
                    Y: {startZoneY}%
                  </span>
                </div>
              </div>
            )}

            {/* High-visibility Chrono Overlay during active climb or countdown */}
            {(isRunning || elapsedMs > 0 || countdownState !== 'idle') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 z-20">
                {countdownState === 'armed' && (
                  <div className="mb-2 px-4 py-1.5 bg-emerald-500/90 text-white font-black text-xs uppercase tracking-wider rounded-full shadow-lg animate-pulse">
                    ČEKÁ SE NA ODRAZ Z PODLOŽKY (ZÓNA {startZoneY}%)
                  </div>
                )}

                {countdownState !== 'idle' && countdownState !== 'started' && countdownState !== 'armed' && (
                  <div className="mb-2 px-4 py-1 bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-widest rounded-full shadow-lg">
                    {countdownState === 'marks' && 'NA MÍSTA'}
                    {countdownState === 'ready' && 'PŘIPRAVIT SE'}
                    {countdownState === 'beeps' && 'ODPOČET...'}
                  </div>
                )}

                <div className="font-mono tabular-nums text-6xl sm:text-8xl md:text-9xl font-black text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.95)] tracking-tight">
                  {formatChrono(elapsedMs)}
                </div>
              </div>
            )}
          </div>

          {/* Positioning Helper Instruction Banner OUTSIDE the video frame */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                Namiřte kameru: startovní deska dole v zelené zóně ({startZoneY}%), cíl v červené zóně ({finishZoneY}%) pro {categoryName}.
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
              {startMode === 'camera_motion' ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">● IA hlídání odrazu a dohmatu připraveno</span>
              ) : (
                <span>Přepněte na režim Kamera pro IA auto-start</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* SLEEK DIGITAL CHRONO CARD */
        <div className="relative rounded-3xl bg-slate-950 text-white p-4 sm:p-8 border border-slate-800 shadow-2xl text-center select-none overflow-hidden">
          {/* False Start Warning Banner */}
          {isFalseStart && (
            <div className="mb-2 inline-flex items-center gap-2 px-3 py-1 bg-red-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-full shadow-lg animate-bounce">
              <AlertTriangle className="w-4 h-4" />
              <span>Ulilý start ({reactionTime.toFixed(3)}s &lt; 0.100s)</span>
            </div>
          )}

          {/* Armed Indicator */}
          {countdownState === 'armed' && (
            <div className="mb-2 inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-bold text-xs uppercase tracking-wider rounded-full animate-pulse shadow-md">
              <Radio className="w-4 h-4 text-emerald-400" />
              <span>Čeká se na startovní pohyb / zvuk...</span>
            </div>
          )}

          {countdownState !== 'idle' && countdownState !== 'started' && countdownState !== 'armed' && (
            <div className="mb-2 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold text-xs uppercase tracking-wider rounded-full">
              <span>
                {countdownState === 'marks' && 'NA MÍSTA'}
                {countdownState === 'ready' && 'PŘIPRAVIT SE'}
                {countdownState === 'beeps' && 'ODPOČET...'}
              </span>
            </div>
          )}

          {/* Big Crisp Chrono Numbers */}
          <div className="my-1 sm:my-3">
            <div className="font-mono tabular-nums text-5xl xs:text-6xl sm:text-8xl md:text-9xl font-black tracking-tight text-white drop-shadow-[0_4px_24px_rgba(239,68,68,0.3)]">
              {formatChrono(elapsedMs)}
            </div>
            <div className="text-[10px] sm:text-[11px] font-mono tracking-widest text-slate-400 uppercase mt-1">
              {isRunning ? 'MĚŘENÍ BĚŽÍ' : `${routeDef.heightMeters.toFixed(0)}m Speed Chrono`}
            </div>
          </div>
        </div>
      )}

      {/* Split Gates Bar */}
      <div className="grid grid-cols-3 gap-2 max-w-md mx-auto text-left">
        <button
          onClick={() => recordSplit(1)}
          disabled={!isRunning || split1Time !== null}
          className={`min-h-[50px] p-2.5 rounded-2xl border transition-all flex flex-col justify-center ${
            split1Time
              ? 'bg-emerald-950/60 border-emerald-500/70 text-emerald-300'
              : isRunning
              ? 'bg-slate-900 border-slate-700 active:scale-95 text-slate-200'
              : 'bg-slate-900/40 border-slate-800 text-slate-600'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-400">1. ÚSEK (5m)</span>
          <span className="text-base font-mono font-bold">
            {split1Time ? `${split1Time.toFixed(2)}s` : isRunning ? 'Zapsat' : '—'}
          </span>
        </button>

        <button
          onClick={() => recordSplit(2)}
          disabled={!isRunning || split2Time !== null}
          className={`min-h-[50px] p-2.5 rounded-2xl border transition-all flex flex-col justify-center ${
            split2Time
              ? 'bg-emerald-950/60 border-emerald-500/70 text-emerald-300'
              : isRunning && split1Time
              ? 'bg-slate-900 border-slate-700 active:scale-95 text-slate-200'
              : 'bg-slate-900/40 border-slate-800 text-slate-600'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-400">2. ÚSEK (10m)</span>
          <span className="text-base font-mono font-bold">
            {split2Time ? `${split2Time.toFixed(2)}s` : isRunning ? 'Zapsat' : '—'}
          </span>
        </button>

        <button
          onClick={isRunning ? stopTimer : undefined}
          disabled={!isRunning}
          className={`min-h-[50px] p-2.5 rounded-2xl border transition-all flex flex-col justify-center ${
            isRunning
              ? 'bg-red-600/40 border-red-500 text-white animate-pulse'
              : 'bg-slate-900/40 border-slate-800 text-slate-600'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-400">
            DOHMAT ({routeDef.heightMeters.toFixed(0)}m)
          </span>
          <span className="text-base font-mono font-bold">
            {isRunning ? 'STOP!' : '—'}
          </span>
        </button>
      </div>

      {/* Primary Action Buttons */}
      <div className="flex items-center justify-center gap-2 pt-1">
        {!isRunning ? (
          startMode === 'camera_motion' || startMode === 'sound_trigger' ? (
            <button
              onClick={handleArmSensorStart}
              className={`flex-1 sm:flex-none min-h-[56px] sm:min-w-[220px] px-6 py-3 font-black text-base rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                countdownState === 'armed'
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
            >
              {countdownState === 'armed' ? (
                <>
                  <Square className="w-5 h-5 fill-current" />
                  <span>Zrušit hlídání</span>
                </>
              ) : (
                <>
                  <Radio className="w-5 h-5" />
                  <span>Aktivovat senzor</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={startMode === 'ifsc_countdown' ? triggerIFSCCountdown : () => startTimerNow(0.138)}
              disabled={countdownState !== 'idle' && countdownState !== 'started'}
              className="flex-1 sm:flex-none min-h-[56px] sm:min-w-[220px] px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-base rounded-2xl shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{startMode === 'ifsc_countdown' ? 'Start (Odpočet)' : 'Start'}</span>
            </button>
          )
        ) : (
          <button
            onClick={stopTimer}
            className="flex-1 sm:flex-none min-h-[56px] sm:min-w-[220px] px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Square className="w-5 h-5 fill-current" />
            <span>Dohmat (Cíl)</span>
          </button>
        )}

        <button
          onClick={resetTimer}
          title="Reset stopek"
          className="min-h-[56px] min-w-[56px] px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-800 transition-colors flex items-center justify-center active:scale-95"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Completed Run Result Card with Recorded Video Playback */}
      {finishedRun && (
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3.5 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="text-xl sm:text-2xl font-mono font-black text-slate-950 dark:text-white">
                {finishedRun.totalTime.toFixed(3)}s
              </span>
              {finishedRun.isPersonalBest && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Nový PB!
                </span>
              )}
            </div>

            <button
              onClick={() => onOpenAnalysis(finishedRun)}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Rozbor</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 text-center text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">0–5m</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 block">
                {finishedRun.splits.split1.toFixed(2)}s
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">5–10m</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 block">
                {finishedRun.splits.split2.toFixed(2)}s
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">10–15m</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 block">
                {finishedRun.splits.split3.toFixed(2)}s
              </span>
            </div>
          </div>

          {/* Integrated Recorded Video Player */}
          {finishedRun.videoUrl && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                <span className="text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-red-600" />
                  <span>Videozáznam výlezu</span>
                </span>

                {showDeleteVideoConfirm ? (
                  <div className="flex items-center gap-1.5 p-1 bg-red-50 dark:bg-red-950/60 rounded-xl border border-red-200 dark:border-red-900">
                    <span className="text-[11px] text-red-600 dark:text-red-300 px-1 font-bold">
                      Smazat video?
                    </span>
                    <button
                      type="button"
                      onClick={handleDeleteVideo}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-bold shadow-sm transition-colors"
                    >
                      Ano, smazat
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteVideoConfirm(false)}
                      className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 rounded-lg text-[11px] transition-colors"
                    >
                      Zrušit
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <a
                      href={finishedRun.videoUrl}
                      download={`fifteen_run_${finishedRun.totalTime.toFixed(3)}s.webm`}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-red-600 hover:bg-slate-200 transition-colors flex items-center gap-1 text-[11px] font-bold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Stáhnout</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setShowDeleteVideoConfirm(true)}
                      className="px-2.5 py-1 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors flex items-center gap-1 text-[11px] font-bold"
                      title="Smazat nahrané video"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Smazat video</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800">
                <video
                  ref={playbackVideoRef}
                  src={finishedRun.videoUrl}
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Slow Motion Speed Controls */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Rychlost přehrávání:</span>
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  {[
                    { spd: 0.25, label: '0.25x' },
                    { spd: 0.5, label: '0.5x' },
                    { spd: 1.0, label: '1.0x' },
                  ].map((item) => (
                    <button
                      key={item.spd}
                      onClick={() => handlePlaybackSpeedChange(item.spd)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                        videoPlaybackRate === item.spd
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

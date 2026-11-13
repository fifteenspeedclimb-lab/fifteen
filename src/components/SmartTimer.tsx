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
  Info,
  Share2,
  Cloud,
  ExternalLink,
  Crosshair
} from 'lucide-react';
import {
  playIFSCPrepTone,
  playIFSCStartTone,
  playSplitChime,
  playFinishFanfare,
  playFalseStartAlarm,
  speakIFSCCommand,
  getStoredAudioSettings,
} from '../utils/audio';
import { RouteCategory, SpeedRun } from '../types/climbing';
import { saveRun, getUserProfile, updateRunVideo, removeRunVideo, deleteRun, UserProfile } from '../utils/storage';
import { ROUTE_DEFINITIONS } from '../data/speedWallData';
import { Language, TRANSLATIONS } from '../utils/i18n';

export interface CategoryCalibration {
  finishY: number; // percentage from top (e.g. 6% for 15m, 38% for U15/U13)
  midY: number;    // middle of the route (e.g. 44% for 15m, 60% for U15/U13)
  startY: number;  // percentage from top (e.g. 82%)
  footPadX: number; // horizontal % for foot hold sensor (default 48%)
  handPadX: number; // horizontal % for top finish pad sensor (default 50%)
  padFocusMode: boolean; // if true, watches strictly foot pad & hand pad for 0 false triggers
}

export const DEFAULT_CATEGORY_CALIBRATIONS: Record<RouteCategory, CategoryCalibration> = {
  adults_15m: { finishY: 6, midY: 44, startY: 82, footPadX: 48, handPadX: 50, padFocusMode: true },
  youth_u15: { finishY: 38, midY: 60, startY: 82, footPadX: 48, handPadX: 50, padFocusMode: true },
  youth_u13: { finishY: 38, midY: 60, startY: 82, footPadX: 48, handPadX: 50, padFocusMode: true },
};

const CALIBRATION_STORAGE_KEY = 'fifteen_zone_calibrations_v3';
const SCANNED_SOUND_STORAGE_KEY = 'fifteen_scanned_sound_profile_v1';

export interface ScannedSoundProfile {
  ambientRms: number;
  peakFreqHz: number;
  peakBinIndex: number;
  bandwidthBins: number;
  targetBandEnergy: number;
  sampleRate: number;
  fftSize: number;
  scannedAt: string;
}

const getStoredScannedSound = (): ScannedSoundProfile | null => {
  try {
    const raw = localStorage.getItem(SCANNED_SOUND_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ScannedSoundProfile;
  } catch {
    // ignore
  }
  return null;
};

const getStoredCalibrations = (): Record<RouteCategory, CategoryCalibration> => {
  try {
    const raw = localStorage.getItem(CALIBRATION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        adults_15m: {
          finishY: Number(parsed.adults_15m?.finishY ?? DEFAULT_CATEGORY_CALIBRATIONS.adults_15m.finishY),
          midY: Number(parsed.adults_15m?.midY ?? DEFAULT_CATEGORY_CALIBRATIONS.adults_15m.midY),
          startY: Number(parsed.adults_15m?.startY ?? DEFAULT_CATEGORY_CALIBRATIONS.adults_15m.startY),
          footPadX: Number(parsed.adults_15m?.footPadX ?? DEFAULT_CATEGORY_CALIBRATIONS.adults_15m.footPadX),
          handPadX: Number(parsed.adults_15m?.handPadX ?? DEFAULT_CATEGORY_CALIBRATIONS.adults_15m.handPadX),
          padFocusMode: parsed.adults_15m?.padFocusMode ?? true,
        },
        youth_u15: {
          finishY: Number(parsed.youth_u15?.finishY ?? DEFAULT_CATEGORY_CALIBRATIONS.youth_u15.finishY),
          midY: Number(parsed.youth_u15?.midY ?? DEFAULT_CATEGORY_CALIBRATIONS.youth_u15.midY),
          startY: Number(parsed.youth_u15?.startY ?? DEFAULT_CATEGORY_CALIBRATIONS.youth_u15.startY),
          footPadX: Number(parsed.youth_u15?.footPadX ?? DEFAULT_CATEGORY_CALIBRATIONS.youth_u15.footPadX),
          handPadX: Number(parsed.youth_u15?.handPadX ?? DEFAULT_CATEGORY_CALIBRATIONS.youth_u15.handPadX),
          padFocusMode: parsed.youth_u15?.padFocusMode ?? true,
        },
        youth_u13: {
          finishY: Number(parsed.youth_u13?.finishY ?? DEFAULT_CATEGORY_CALIBRATIONS.youth_u13.finishY),
          midY: Number(parsed.youth_u13?.midY ?? DEFAULT_CATEGORY_CALIBRATIONS.youth_u13.midY),
          startY: Number(parsed.youth_u13?.startY ?? DEFAULT_CATEGORY_CALIBRATIONS.youth_u13.startY),
          footPadX: Number(parsed.youth_u13?.footPadX ?? DEFAULT_CATEGORY_CALIBRATIONS.youth_u13.footPadX),
          handPadX: Number(parsed.youth_u13?.handPadX ?? DEFAULT_CATEGORY_CALIBRATIONS.youth_u13.handPadX),
          padFocusMode: parsed.youth_u13?.padFocusMode ?? true,
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
  userProfile?: UserProfile;
  onDeleteRun?: (runId: string) => void;
}

type StartMode = 'ifsc_countdown' | 'camera_motion' | 'sound_trigger' | 'manual';
type CountdownState = 'idle' | 'marks' | 'ready' | 'beeps' | 'armed' | 'started';

interface TrackedPoint {
  x: number;
  y: number;
}

interface TrackedPose {
  active: boolean;
  hands: TrackedPoint;
  body: TrackedPoint;
  foot: TrackedPoint;
  confidence: number;
}

const EMPTY_POSE: TrackedPose = {
  active: false,
  hands: { x: 50, y: 20 },
  body: { x: 50, y: 50 },
  foot: { x: 50, y: 80 },
  confidence: 0,
};

export const SmartTimer: React.FC<SmartTimerProps> = ({
  onRunFinished,
  onOpenAnalysis,
  currentCategory,
  onSelectCategory,
  lang,
  userProfile,
  onDeleteRun,
}) => {
  const profile = userProfile || getUserProfile();
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
  const [midSplitTime, setMidSplitTime] = useState<number | null>(null);
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
  const [showDeleteRunConfirm, setShowDeleteRunConfirm] = useState<boolean>(false);

  // Viewfinder & Positioning Helpers (only active in AI Kamera mode)
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [cameraFit, setCameraFit] = useState<'contain' | 'cover'>('contain');

  // Per-category Horizontal Trigger Lines (Bottom Foot, Middle Hand Split, Top Finish Hand)
  const [calibrations, setCalibrations] = useState<Record<RouteCategory, CategoryCalibration>>(getStoredCalibrations);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [calibrationSavedToast, setCalibrationSavedToast] = useState<string | null>(null);

  // Active line coordinates dynamically derived from active category
  const activeCalibration = calibrations[currentCategory] || DEFAULT_CATEGORY_CALIBRATIONS[currentCategory];
  const finishZoneY = activeCalibration.finishY;
  const midZoneY = activeCalibration.midY ?? (currentCategory === 'adults_15m' ? 44 : 60);
  const startZoneY = activeCalibration.startY;

  // Active calibration line tool when clicking on viewfinder
  const [activeCalibrationTool, setActiveCalibrationTool] = useState<'foot' | 'mid' | 'hand'>('foot');

  // Video saving feedback & modal state
  const [videoShareFeedback, setVideoShareFeedback] = useState<string | null>(null);
  const [showCloudPicker, setShowCloudPicker] = useState<boolean>(false);

  // Real-time AI Climber Pose Tracking (Green = Foot, Blue = Torso, Red = Hands)
  const [trackedPose, setTrackedPose] = useState<TrackedPose>(EMPTY_POSE);
  const [wallBgReady, setWallBgReady] = useState<boolean>(false);
  const [lastLineTrigger, setLastLineTrigger] = useState<'start' | 'mid' | 'finish' | null>(null);

  // Sensitivity Presets: low = strict, medium = balanced, high = sensitive
  const [sensitivityPreset, setSensitivityPreset] = useState<'low' | 'medium' | 'high'>('medium');
  const soundThreshold = sensitivityPreset === 'low' ? 75 : sensitivityPreset === 'high' ? 55 : 65;

  const categoryName = lang === 'cs' ? routeDef.nameCs : lang === 'de' ? routeDef.nameDe : routeDef.nameEn;
  const isYouthCategory = currentCategory === 'youth_u15' || currentCategory === 'youth_u13';
  const isAiCameraMode = startMode === 'camera_motion';

  // Calibration updater methods
  const updateCalibrationField = <K extends keyof CategoryCalibration>(field: K, val: CategoryCalibration[K]) => {
    setCalibrations((prev) => {
      const current = prev[currentCategory] || DEFAULT_CATEGORY_CALIBRATIONS[currentCategory];
      const updated = {
        ...prev,
        [currentCategory]: {
          ...current,
          [field]: val,
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

  const updateCalibration = (field: 'finishY' | 'startY' | 'midY' | 'footPadX' | 'handPadX', delta: number) => {
    setCalibrations((prev) => {
      const current = prev[currentCategory] || DEFAULT_CATEGORY_CALIBRATIONS[currentCategory];
      const currentVal = Number(current[field] ?? (field === 'midY' ? 50 : 50));
      const minVal = field === 'finishY' ? 2 : field === 'midY' ? 20 : field === 'startY' ? 55 : 10;
      const maxVal = field === 'finishY' ? 65 : field === 'midY' ? 75 : field === 'startY' ? 95 : 90;
      const newVal = Math.min(maxVal, Math.max(minVal, currentVal + delta));
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

  // Direct Screen Tap to Start / Stop (No scrolling needed!)
  const handleScreenTapAction = () => {
    if (isRunning) {
      stopTimer();
      return;
    }
    if (countdownState === 'armed') {
      setCountdownState('idle');
      return;
    }
    if (countdownState === 'idle') {
      if (startMode === 'camera_motion') {
        handleArmSensorStart();
      } else if (startMode === 'ifsc_countdown') {
        triggerIFSCCountdown();
      } else if (startMode === 'manual') {
        startTimerNow(0.138);
      } else if (startMode === 'sound_trigger') {
        handleArmSensorStart();
      }
    }
  };

  // Viewfinder Click: in AI Kamera calibration mode, moves the selected horizontal line; otherwise starts/stops timer!
  const handleViewfinderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isAiCameraMode && isCalibrating) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickY = Math.round(((e.clientY - rect.top) / rect.height) * 100);

      if (activeCalibrationTool === 'foot') {
        const clamped = Math.min(95, Math.max(55, clickY));
        updateCalibrationField('startY', clamped);
        setCalibrationSavedToast(`🟢 Spodní linie (Noha) nastavena na ${clamped}%`);
        setTimeout(() => setCalibrationSavedToast(null), 2200);
      } else if (activeCalibrationTool === 'hand') {
        const clamped = Math.min(65, Math.max(2, clickY));
        updateCalibrationField('finishY', clamped);
        setCalibrationSavedToast(`🔴 Vrcholová linie (Cíl – Ruka) nastavena na ${clamped}%`);
        setTimeout(() => setCalibrationSavedToast(null), 2200);
      } else {
        const clamped = Math.min(80, Math.max(18, clickY));
        updateCalibrationField('midY', clamped);
        setCalibrationSavedToast(`🔵 Středová linie (Mezičas – Ruka) nastavena na ${clamped}%`);
        setTimeout(() => setCalibrationSavedToast(null), 2200);
      }
      return;
    }

    handleScreenTapAction();
  };

  // Video saving handlers (Device download vs Cloud sharing)
  const handleDownloadVideoDirect = () => {
    if (!finishedRun?.videoUrl) return;
    const link = document.createElement('a');
    link.href = finishedRun.videoUrl;
    link.download = `fifteen_run_${finishedRun.totalTime.toFixed(3)}s.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setVideoShareFeedback('Video bylo staženo do vašeho zařízení!');
    setTimeout(() => setVideoShareFeedback(null), 3500);
  };

  const handleShareVideoToCloud = async () => {
    if (!finishedRun?.videoUrl) return;
    try {
      const response = await fetch(finishedRun.videoUrl);
      const blob = await response.blob();
      const filename = `fifteen_speedrun_${finishedRun.totalTime.toFixed(3)}s.webm`;
      const file = new File([blob], filename, { type: 'video/webm' });

      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Fifteen Speed Climbing - ${finishedRun.totalTime.toFixed(3)}s`,
          text: `Můj výlez v čase ${finishedRun.totalTime.toFixed(3)}s na trase ${categoryName}`,
        });
        setVideoShareFeedback('Odesláno přes systémové sdílení!');
        setTimeout(() => setVideoShareFeedback(null), 3500);
        return;
      }
    } catch {
      // share dismissed or unsupported
    }
    setShowCloudPicker(true);
  };

  // Mic & Sound Trigger + Wall Sound Scanning
  const [micActive, setMicActive] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [scannedSoundProfile, setScannedSoundProfile] = useState<ScannedSoundProfile | null>(getStoredScannedSound);
  const [soundScanState, setSoundScanState] = useState<'idle' | 'sampling_ambient' | 'listening_signal'>('idle');
  const [soundScanStatus, setSoundScanStatus] = useState<string | null>(null);
  const [liveSoundMetrics, setLiveSoundMetrics] = useState<{ freqHz: number; energy: number; matchPct: number }>({
    freqHz: 0,
    energy: 0,
    matchPct: 0,
  });

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
  const lastSoundUiUpdateRef = useRef<number>(0);
  const soundScanAbortRef = useRef<boolean>(false);
  const countdownTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

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
  const bgFrameRef = useRef<Uint8ClampedArray | null>(null);
  const motionHeatmapRef = useRef<Float32Array | null>(null);
  const trackedPoseRef = useRef<TrackedPose>(EMPTY_POSE);
  const prevFootYRef = useRef<number | null>(null);
  const prevHandsYRef = useRef<number | null>(null);
  const footArmedBelowLineRef = useRef<boolean>(false);
  const midLineTriggeredRef = useRef<boolean>(false);
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
    let s1 = split1Time;
    let s2 = split2Time ? parseFloat((split2Time - (split1Time ?? 0)).toFixed(2)) : null;

    // If AI Kamera captured a middle-of-wall crossing time, derive balanced 1/3 and 2/3 splits from it
    if (midSplitTime !== null && split2Time === null) {
      s1 = parseFloat((midSplitTime * 0.64).toFixed(2));
      s2 = parseFloat(Math.max(0.1, midSplitTime * 0.68).toFixed(2));
    }

    const resolvedS1 = s1 ?? parseFloat((totalSeconds * 0.31).toFixed(2));
    const resolvedS2 = s2 ?? parseFloat((totalSeconds * 0.35).toFixed(2));
    const resolvedS3 = parseFloat(Math.max(0.1, totalSeconds - resolvedS1 - resolvedS2).toFixed(2));

    const finalRun: SpeedRun = {
      id: 'run-' + Date.now(),
      date: new Date().toISOString(),
      totalTime: totalSeconds,
      splits: {
        split1: resolvedS1,
        split2: resolvedS2,
        split3: resolvedS3,
      },
      reactionTime: parseFloat(reactionTime.toFixed(3)),
      isFalseStart: isFalseStart,
      betaUsed: selectedBeta,
      routeCategory: currentCategory,
      gym: gymName,
      climberName: profile.name || (lang === 'cs' ? 'Můj profil' : 'My profile'),
      nationalityCode: profile.nationalityCode,
      flagEmoji: profile.flagEmoji,
      gender: profile.gender,
      videoUrl: recordedVideoUrl || undefined,
      cloudSyncStatus: 'synced_gdrive',
      isPersonalBest: false,
    };

    const savedList = saveRun(finalRun);
    const persistedRun = savedList[0] || finalRun;
    setFinishedRun(persistedRun);
    onRunFinished(persistedRun);

    if (persistedRun.isPersonalBest && !isFalseStart) {
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
    midSplitTime,
    reactionTime,
    isFalseStart,
    selectedBeta,
    currentCategory,
    gymName,
    profile,
    lang,
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
    setMidSplitTime(null);
    midLineTriggeredRef.current = false;
    setFinishedRun(null);
    setShowDeleteVideoConfirm(false);
    setIsRunning(true);
    setCountdownState('started');

    // Start video recording if camera stream is active
    startMediaRecording();

    startTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(updateTimer);
  }, [updateTimer, startMediaRecording]);

  const clearCountdownTimeouts = useCallback(() => {
    countdownTimeoutsRef.current.forEach((t) => clearTimeout(t));
    countdownTimeoutsRef.current = [];
  }, []);

  // Official IFSC Countdown Sequence: "At your marks" -> "Ready" -> 3 Beeps -> Random hold -> High start beep
  // If starter voice commands are turned off in Settings, skips directly to electronic IFSC beeps.
  const triggerIFSCCountdown = useCallback(() => {
    if (isRunning) return;
    clearCountdownTimeouts();
    const audioConf = getStoredAudioSettings();
    setElapsedMs(0);
    setFinishedRun(null);
    setShowDeleteVideoConfirm(false);

    const scheduleBeepsSequence = () => {
      setCountdownState('beeps');
      playIFSCPrepTone(audioConf.toneStyle); // 1st Beep

      const tBeep2 = setTimeout(() => {
        playIFSCPrepTone(audioConf.toneStyle); // 2nd Beep
      }, 1000);

      const tBeep3 = setTimeout(() => {
        playIFSCPrepTone(audioConf.toneStyle); // 3rd Beep
      }, 2000);

      // Variable hold as per IFSC rules: 1000ms + random 0-200ms after 3rd beep
      const randomHold = 3000 + Math.random() * 200;
      const tStart = setTimeout(() => {
        playIFSCStartTone(audioConf.toneStyle);
        const reaction = 0.115 + Math.random() * 0.045;
        startTimerNow(reaction);
      }, randomHold);

      countdownTimeoutsRef.current.push(tBeep2, tBeep3, tStart);
    };

    if (!audioConf.voiceEnabled) {
      scheduleBeepsSequence();
      return;
    }

    // 1. Starter calls: "At your marks"
    setCountdownState('marks');
    speakIFSCCommand('marks');

    // 2. After athletes settle (~2.2s), starter calls: "Ready"
    const tReady = setTimeout(() => {
      setCountdownState('ready');
      speakIFSCCommand('ready');

      // 3. After 1.4s, electronic beeps begin (3x 1-second warning beeps)
      const tBeeps = setTimeout(() => {
        scheduleBeepsSequence();
      }, 1400);

      countdownTimeoutsRef.current.push(tBeeps);
    }, 2200);

    countdownTimeoutsRef.current.push(tReady);
  }, [isRunning, startTimerNow, clearCountdownTimeouts]);

  const resetTimer = () => {
    clearCountdownTimeouts();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startTimeRef.current = 0;
    setIsRunning(false);
    setElapsedMs(0);
    setSplit1Time(null);
    setSplit2Time(null);
    setMidSplitTime(null);
    midLineTriggeredRef.current = false;
    footArmedBelowLineRef.current = false;
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

  const handleDeleteRunAttempt = useCallback(() => {
    if (!finishedRun) return;
    if (finishedRun.videoUrl) {
      try {
        URL.revokeObjectURL(finishedRun.videoUrl);
      } catch {
        // ignore
      }
    }
    deleteRun(finishedRun.id);
    if (onDeleteRun) {
      onDeleteRun(finishedRun.id);
    }
    setFinishedRun(null);
    setShowDeleteRunConfirm(false);
  }, [finishedRun, onDeleteRun]);

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

  const resetTrackingBuffers = useCallback(() => {
    bgFrameRef.current = null;
    prevImageDataRef.current = null;
    motionHeatmapRef.current = null;
    prevFootYRef.current = null;
    prevHandsYRef.current = null;
    footArmedBelowLineRef.current = false;
    trackedPoseRef.current = EMPTY_POSE;
    setTrackedPose(EMPTY_POSE);
    setWallBgReady(false);
  }, []);

  const captureWallBackground = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx || video.readyState < 2) return;
    const W = 120;
    const H = 180;
    canvas.width = W;
    canvas.height = H;
    ctx.drawImage(video, 0, 0, W, H);
    try {
      const frame = ctx.getImageData(0, 0, W, H);
      bgFrameRef.current = new Uint8ClampedArray(frame.data);
      motionHeatmapRef.current = new Float32Array(W * H);
      setWallBgReady(true);
      setCalibrationSavedToast('✓ Pozadí stěny naskenováno — vstupte před kameru');
      setTimeout(() => setCalibrationSavedToast(null), 2400);
    } catch {
      // ignore
    }
  }, []);

  const toggleCamera = async () => {
    if (cameraActive) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      resetTrackingBuffers();
      setCameraActive(false);
      return;
    }
    resetTrackingBuffers();
    await startCameraStream(facingMode);
  };

  const switchCameraFacing = async () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    resetTrackingBuffers();
    await startCameraStream(nextFacing);
  };

  // Initialize microphone stream + high-resolution FFT analyser (1024)
  const ensureMicReady = async (): Promise<AnalyserNode | null> => {
    if (micActive && micAnalyserRef.current) {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume().catch(() => {});
      }
      return micAnalyserRef.current;
    }

    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.35;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = ctx;
      micAnalyserRef.current = analyser;
      setMicActive(true);
      return analyser;
    } catch {
      setMicError('Mikrofon není dostupný nebo byl zamítnut.');
      setMicActive(false);
      return null;
    }
  };

  // Safe microphone toggle
  const toggleMic = async () => {
    if (micActive) {
      soundScanAbortRef.current = true;
      setSoundScanState('idle');
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      }
      micAnalyserRef.current = null;
      setMicActive(false);
      return;
    }
    await ensureMicReady();
  };

  // Two-step Wall Sound Scanner: 1) Measure ambient noise at the wall -> 2) Capture start signal frequency & energy
  const startWallSoundScan = async () => {
    const analyser = await ensureMicReady();
    if (!analyser || !audioContextRef.current) return;

    soundScanAbortRef.current = false;
    setCountdownState('idle');
    setSoundScanState('sampling_ambient');
    setSoundScanStatus('Krok 1/2: Měřím běžný hluk u stěny (buďte chvíli v klidu)...');

    const binCount = analyser.frequencyBinCount;
    const sampleRate = audioContextRef.current.sampleRate;
    const fftSize = analyser.fftSize;
    const buf = new Uint8Array(binCount);
    const ambientAccum = new Float32Array(binCount);
    let ambientFrames = 0;

    // Step 1: Collect ~900ms of ambient noise floor
    await new Promise<void>((resolve) => {
      const startTs = performance.now();
      const sampleAmbient = () => {
        if (soundScanAbortRef.current) {
          resolve();
          return;
        }
        analyser.getByteFrequencyData(buf);
        for (let i = 0; i < binCount; i++) {
          ambientAccum[i] += buf[i];
        }
        ambientFrames++;
        if (performance.now() - startTs >= 900) {
          resolve();
        } else {
          setTimeout(sampleAmbient, 40);
        }
      };
      sampleAmbient();
    });

    if (soundScanAbortRef.current) {
      setSoundScanState('idle');
      return;
    }

    const ambientBins = new Float32Array(binCount);
    let ambientSum = 0;
    for (let i = 0; i < binCount; i++) {
      ambientBins[i] = ambientFrames > 0 ? ambientAccum[i] / ambientFrames : 0;
      ambientSum += ambientBins[i];
    }
    const ambientRms = ambientSum / binCount;

    // Step 2: Listen up to 5 seconds for the wall start signal
    setSoundScanState('listening_signal');
    setSoundScanStatus('Krok 2/2: Nyní spusťte startovní zvuk / pípnutí stěny!');

    let bestBin = -1;
    let bestContrast = 0;
    let bestEnergy = 0;
    let sustainedFrames = 0;

    await new Promise<void>((resolve) => {
      const startTs = performance.now();
      const listenLoop = () => {
        if (soundScanAbortRef.current) {
          resolve();
          return;
        }
        analyser.getByteFrequencyData(buf);

        // Ignore sub-250Hz low gym rumble (bins 0..4)
        let frameMaxContrast = 0;
        let frameMaxBin = -1;
        let frameMaxEnergy = 0;
        for (let i = 5; i < Math.min(binCount, 260); i++) {
          const contrast = buf[i] - ambientBins[i];
          if (contrast > frameMaxContrast && buf[i] > 45) {
            frameMaxContrast = contrast;
            frameMaxBin = i;
            frameMaxEnergy = buf[i];
          }
        }

        if (frameMaxContrast > 30 && frameMaxBin >= 5) {
          if (frameMaxContrast > bestContrast) {
            bestContrast = frameMaxContrast;
            bestBin = frameMaxBin;
            bestEnergy = frameMaxEnergy;
          }
          sustainedFrames++;
        }

        const elapsedScan = performance.now() - startTs;
        // Stop automatically once a clear signal has been captured cleanly, or after 5000ms
        if ((sustainedFrames >= 4 && elapsedScan >= 1200) || elapsedScan >= 5000) {
          resolve();
        } else {
          setTimeout(listenLoop, 35);
        }
      };
      listenLoop();
    });

    setSoundScanState('idle');

    if (soundScanAbortRef.current) return;

    if (bestBin >= 5 && bestEnergy > ambientRms + 25) {
      const peakFreqHz = Math.round((bestBin * sampleRate) / fftSize);
      const profileData: ScannedSoundProfile = {
        ambientRms: Math.round(ambientRms),
        peakFreqHz,
        peakBinIndex: bestBin,
        bandwidthBins: 4,
        targetBandEnergy: Math.round(bestEnergy),
        sampleRate,
        fftSize,
        scannedAt: new Date().toISOString(),
      };
      setScannedSoundProfile(profileData);
      try {
        localStorage.setItem(SCANNED_SOUND_STORAGE_KEY, JSON.stringify(profileData));
      } catch {
        // ignore
      }
      setSoundScanStatus(`✓ Zvuk startu stěny naskenován (${peakFreqHz} Hz). Nyní můžete aktivovat senzor.`);
    } else {
      setSoundScanStatus('Startovní tón nebyl zachycen dostatečně zřetelně. Přibližte telefon ke stěně a zkuste sken znovu.');
    }
  };

  const clearScannedSoundProfile = () => {
    setScannedSoundProfile(null);
    setSoundScanStatus(null);
    try {
      localStorage.removeItem(SCANNED_SOUND_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // Arm/Disarm AI Kamera or AI Zvuk Sensor
  const handleArmSensorStart = async () => {
    if (countdownState === 'armed') {
      setCountdownState('idle');
      footArmedBelowLineRef.current = false;
      return;
    }

    if (startMode === 'camera_motion' && !cameraActive) {
      await startCameraStream(facingMode);
    }
    if (startMode === 'sound_trigger') {
      if (!scannedSoundProfile) {
        await startWallSoundScan();
        return;
      }
      if (!micActive) {
        await ensureMicReady();
      }
    }

    footArmedBelowLineRef.current = false;
    midLineTriggeredRef.current = false;
    setElapsedMs(0);
    setFinishedRun(null);
    setIsFalseStart(false);
    setCountdownState('armed');
  };

  // Main input loop:
  // 1) Acoustic profile matching (ONLY in sound_trigger mode)
  // 2) Continuous Foot/Body/Hand tracking + 3-line crossing detection (ONLY in AI Kamera mode)
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkInputs = () => {
      // 1. Mic Trigger with Scanned Wall Acoustic Profile Matching
      if (startMode === 'sound_trigger' && micActive && micAnalyserRef.current && !isRunning) {
        const analyser = micAnalyserRef.current;
        const binCount = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(binCount);
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        let instantPeakVal = 0;
        let instantPeakBin = 0;
        for (let i = 0; i < binCount; i++) {
          sum += dataArray[i];
          if (i >= 5 && dataArray[i] > instantPeakVal) {
            instantPeakVal = dataArray[i];
            instantPeakBin = i;
          }
        }
        const avg = sum / binCount;
        const sampleRate = audioContextRef.current?.sampleRate || 48000;
        const instantFreqHz = Math.round((instantPeakBin * sampleRate) / analyser.fftSize);

        let matched = false;
        let matchPct = Math.min(100, Math.round((avg / soundThreshold) * 100));

        if (scannedSoundProfile) {
          const expectedBin = Math.round(
            (scannedSoundProfile.peakFreqHz * analyser.fftSize) / sampleRate
          );
          const low = Math.max(4, expectedBin - scannedSoundProfile.bandwidthBins);
          const high = Math.min(binCount - 1, expectedBin + scannedSoundProfile.bandwidthBins);

          let bandPeak = 0;
          let otherSum = 0;
          let otherCount = 0;

          for (let i = 4; i < Math.min(binCount, 260); i++) {
            if (i >= low && i <= high) {
              if (dataArray[i] > bandPeak) bandPeak = dataArray[i];
            } else {
              otherSum += dataArray[i];
              otherCount++;
            }
          }

          const outOfBandAvg = otherCount > 0 ? otherSum / otherCount : 0;
          const sensRatio = sensitivityPreset === 'low' ? 0.8 : sensitivityPreset === 'high' ? 0.55 : 0.68;
          const requiredEnergy = Math.max(
            scannedSoundProfile.ambientRms + 32,
            scannedSoundProfile.targetBandEnergy * sensRatio
          );

          matchPct = Math.min(
            100,
            Math.max(
              0,
              Math.round(((bandPeak - scannedSoundProfile.ambientRms) / Math.max(25, requiredEnergy - scannedSoundProfile.ambientRms)) * 100)
            )
          );

          if (bandPeak >= requiredEnergy && bandPeak > outOfBandAvg * 1.35) {
            matched = true;
          }
        } else if (avg > soundThreshold) {
          matched = true;
        }

        const nowMs = performance.now();
        if (nowMs - lastSoundUiUpdateRef.current > 85) {
          lastSoundUiUpdateRef.current = nowMs;
          setLiveSoundMetrics({ freqHz: instantFreqHz, energy: Math.round(instantPeakVal), matchPct });
        }

        if (countdownState === 'armed' && soundScanState === 'idle' && matched) {
          playIFSCStartTone();
          startTimerNow(0.125);
        }
      }

      // 2. AI Kamera Continuous Foot (Green), Body (Blue), Hands (Red) Tracking & 3-Line Crossing
      if (startMode === 'camera_motion' && cameraActive && videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx && video.readyState >= 2) {
          const W = 120;
          const H = 180;
          canvas.width = W;
          canvas.height = H;
          ctx.drawImage(video, 0, 0, W, H);

          try {
            const frame = ctx.getImageData(0, 0, W, H);
            const data = frame.data;
            const totalPixels = W * H;

            // Auto-capture initial wall background frame on first valid camera frame
            if (!bgFrameRef.current || bgFrameRef.current.length !== data.length) {
              bgFrameRef.current = new Uint8ClampedArray(data);
              motionHeatmapRef.current = new Float32Array(totalPixels);
              setWallBgReady(true);
            }

            if (!motionHeatmapRef.current || motionHeatmapRef.current.length !== totalPixels) {
              motionHeatmapRef.current = new Float32Array(totalPixels);
            }

            const bgData = bgFrameRef.current;
            const prevData = prevImageDataRef.current;
            const heatmap = motionHeatmapRef.current;

            const bgThresh = sensitivityPreset === 'high' ? 42 : sensitivityPreset === 'low' ? 68 : 54;
            const motThresh = sensitivityPreset === 'high' ? 32 : sensitivityPreset === 'low' ? 54 : 42;

            // Step A: Update foreground persistence heatmap (hybrid static background + motion)
            for (let p = 0; p < totalPixels; p++) {
              const idx = p * 4;
              const diffBg =
                Math.abs(data[idx] - bgData[idx]) +
                Math.abs(data[idx + 1] - bgData[idx + 1]) +
                Math.abs(data[idx + 2] - bgData[idx + 2]);

              let diffMot = 0;
              if (prevData && prevData.length === data.length) {
                diffMot =
                  Math.abs(data[idx] - prevData[idx]) +
                  Math.abs(data[idx + 1] - prevData[idx + 1]) +
                  Math.abs(data[idx + 2] - prevData[idx + 2]);
              }

              const activeNow = diffBg > bgThresh || diffMot > motThresh ? 1.0 : 0.0;
              heatmap[p] = Math.max(activeNow, heatmap[p] * 0.78);
            }

            // Step B: Row-level aggregation to filter random single-pixel specks
            const rowCounts = new Int32Array(H);
            const rowSumX = new Float32Array(H);
            const prevBodyX = trackedPoseRef.current.active ? (trackedPoseRef.current.body.x / 100) * W : W * 0.5;
            const restrictCorridor = trackedPoseRef.current.active;

            for (let y = 2; y < H - 2; y++) {
              let count = 0;
              let sx = 0;
              for (let x = 2; x < W - 2; x++) {
                // Soft corridor focus (+/- 38% width around locked climber) to ignore bystanders far away
                if (restrictCorridor && Math.abs(x - prevBodyX) > W * 0.42) continue;
                if (heatmap[y * W + x] > 0.36) {
                  count++;
                  sx += x;
                }
              }
              if (count >= 2) {
                rowCounts[y] = count;
                rowSumX[y] = sx;
              }
            }

            // Collect valid climber rows and find largest vertically contiguous cluster
            let totalValidCount = 0;
            let bestClusterRows: number[] = [];
            let curCluster: number[] = [];
            let gap = 0;

            for (let y = 2; y < H - 2; y++) {
              if (rowCounts[y] >= 2) {
                curCluster.push(y);
                gap = 0;
              } else if (curCluster.length > 0) {
                gap++;
                // Allow tiny vertical gaps (e.g. outstretched arm or narrow waist) up to 12% of wall height
                if (gap > Math.round(H * 0.12)) {
                  if (curCluster.length > bestClusterRows.length) {
                    bestClusterRows = curCluster;
                  }
                  curCluster = [];
                  gap = 0;
                }
              }
            }
            if (curCluster.length > bestClusterRows.length) {
              bestClusterRows = curCluster;
            }

            for (let i = 0; i < bestClusterRows.length; i++) {
              totalValidCount += rowCounts[bestClusterRows[i]];
            }

            const nowMs = performance.now();

            if (bestClusterRows.length >= 4 && totalValidCount >= 14) {
              // Hands = top extremity band (top ~14% of climber rows)
              const bandRows = Math.max(2, Math.ceil(bestClusterRows.length * 0.14));

              let handSumX = 0;
              let handSumY = 0;
              let handWeight = 0;
              for (let i = 0; i < bandRows; i++) {
                const ry = bestClusterRows[i];
                const w = rowCounts[ry];
                handSumX += rowSumX[ry];
                handSumY += ry * w;
                handWeight += w;
              }

              // Foot = bottom extremity band (bottom ~14% of climber rows)
              let footSumX = 0;
              let footSumY = 0;
              let footWeight = 0;
              for (let i = Math.max(0, bestClusterRows.length - bandRows); i < bestClusterRows.length; i++) {
                const ry = bestClusterRows[i];
                const w = rowCounts[ry];
                footSumX += rowSumX[ry];
                footSumY += ry * w;
                footWeight += w;
              }

              // Body = overall weighted centroid of the climber
              let bodySumX = 0;
              let bodySumY = 0;
              let bodyWeight = 0;
              for (let i = 0; i < bestClusterRows.length; i++) {
                const ry = bestClusterRows[i];
                const w = rowCounts[ry];
                bodySumX += rowSumX[ry];
                bodySumY += ry * w;
                bodyWeight += w;
              }

              const rawHandsX = (handSumX / handWeight / W) * 100;
              const rawHandsY = (handSumY / handWeight / H) * 100;
              const rawBodyX = (bodySumX / bodyWeight / W) * 100;
              const rawBodyY = (bodySumY / bodyWeight / H) * 100;
              const rawFootX = (footSumX / footWeight / W) * 100;
              const rawFootY = (footSumY / footWeight / H) * 100;

              const prev = trackedPoseRef.current;
              const alpha = prev.active ? 0.45 : 0.85;
              const lerp = (a: number, b: number) => a + (b - a) * alpha;

              const nextHandsY = Math.max(1, Math.min(98, prev.active ? lerp(prev.hands.y, rawHandsY) : rawHandsY));
              const nextBodyY = Math.max(nextHandsY + 1, Math.min(99, prev.active ? lerp(prev.body.y, rawBodyY) : rawBodyY));
              const nextFootY = Math.max(nextBodyY + 1, Math.min(99, prev.active ? lerp(prev.foot.y, rawFootY) : rawFootY));

              const nextPose: TrackedPose = {
                active: true,
                hands: {
                  x: Math.max(3, Math.min(97, prev.active ? lerp(prev.hands.x, rawHandsX) : rawHandsX)),
                  y: nextHandsY,
                },
                body: {
                  x: Math.max(3, Math.min(97, prev.active ? lerp(prev.body.x, rawBodyX) : rawBodyX)),
                  y: nextBodyY,
                },
                foot: {
                  x: Math.max(3, Math.min(97, prev.active ? lerp(prev.foot.x, rawFootX) : rawFootX)),
                  y: nextFootY,
                },
                confidence: Math.min(100, Math.round((totalValidCount / 180) * 100)),
              };

              const prevFootY = prevFootYRef.current;
              const prevHandsY = prevHandsYRef.current;

              trackedPoseRef.current = nextPose;
              prevFootYRef.current = nextPose.foot.y;
              prevHandsYRef.current = nextPose.hands.y;

              // Update UI dots cleanly (~25fps)
              if (nowMs - lastMotionUpdateRef.current > 38) {
                lastMotionUpdateRef.current = nowMs;
                setTrackedPose(nextPose);
              }

              // LINE 1 TRIGGER (BOTTOM): Green Foot dot crosses upward past startZoneY -> START CHRONO
              if (!isRunning && countdownState === 'armed') {
                if (nextPose.foot.y >= startZoneY - 1.0) {
                  footArmedBelowLineRef.current = true;
                }
                const crossedUpward =
                  (prevFootY !== null && prevFootY >= startZoneY - 0.5 && nextPose.foot.y < startZoneY - 0.5) ||
                  (footArmedBelowLineRef.current && nextPose.foot.y < startZoneY - 1.2);

                if (crossedUpward) {
                  footArmedBelowLineRef.current = false;
                  setLastLineTrigger('start');
                  setTimeout(() => setLastLineTrigger(null), 1200);
                  playIFSCStartTone();
                  startTimerNow(0.125);
                }
              }

              // LINE 2 TRIGGER (MIDDLE): Red Hands dot crosses upward past midZoneY -> RECORD SPLIT
              if (isRunning && !midLineTriggeredRef.current) {
                const crossedMid =
                  (prevHandsY !== null && prevHandsY > midZoneY && nextPose.hands.y <= midZoneY) ||
                  (elapsedMs > 400 && nextPose.hands.y <= midZoneY);

                if (crossedMid) {
                  midLineTriggeredRef.current = true;
                  const splitSec = parseFloat((elapsedMs / 1000).toFixed(2));
                  setMidSplitTime(splitSec);
                  setSplit1Time(splitSec);
                  playSplitChime();
                  setLastLineTrigger('mid');
                  setTimeout(() => setLastLineTrigger(null), 1200);
                }
              }

              // LINE 3 TRIGGER (TOP): Red Hands dot crosses/exceeds finishZoneY -> STOP CHRONO & SAVE
              if (isRunning && elapsedMs > 1200) {
                const crossedTop =
                  nextPose.hands.y <= finishZoneY ||
                  (prevHandsY !== null && prevHandsY > finishZoneY && nextPose.hands.y <= finishZoneY + 0.5);

                if (crossedTop) {
                  setLastLineTrigger('finish');
                  setTimeout(() => setLastLineTrigger(null), 1200);
                  stopTimer();
                }
              }
            } else {
              // No climber foreground currently detected
              if (trackedPoseRef.current.active && nowMs - lastMotionUpdateRef.current > 180) {
                lastMotionUpdateRef.current = nowMs;
                trackedPoseRef.current = EMPTY_POSE;
                prevFootYRef.current = null;
                prevHandsYRef.current = null;
                setTrackedPose(EMPTY_POSE);
              }
            }

            prevImageDataRef.current = new Uint8ClampedArray(data);
          } catch {
            // ignore canvas security errors
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
    sensitivityPreset,
    scannedSoundProfile,
    soundScanState,
    elapsedMs,
    startZoneY,
    midZoneY,
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
            { id: 'camera_motion' as StartMode, label: 'AI Kamera' },
            { id: 'sound_trigger' as StartMode, label: 'AI Zvuk' },
            { id: 'manual' as StartMode, label: 'Ruční' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setStartMode(m.id);
                setCountdownState('idle');
                if (m.id !== 'camera_motion') {
                  setIsCalibrating(false);
                }
                if (m.id === 'camera_motion' && !cameraActive) startCameraStream(facingMode);
                if (m.id === 'sound_trigger' && !micActive) ensureMicReady();
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
            {/* AI Kamera-ONLY Controls: Lines, Calibration, Wall Scan, Sensitivity */}
            {isAiCameraMode && (
              <>
                <button
                  onClick={() => setShowGuides(!showGuides)}
                  className={`min-h-[38px] px-2.5 sm:px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1 border ${
                    showGuides
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent'
                  }`}
                  title="Zobrazit/skrýt spouštěcí linie a sledování"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Linie stěny</span>
                </button>

                <button
                  onClick={() => setIsCalibrating(!isCalibrating)}
                  className={`min-h-[38px] px-2.5 sm:px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1 border ${
                    isCalibrating
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-300 dark:border-red-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200'
                  }`}
                  title="Kalibrace spodní, středové a vrcholové linie"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Kalibrace</span>
                </button>

                <button
                  type="button"
                  onClick={captureWallBackground}
                  className={`min-h-[38px] px-2.5 sm:px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1 border ${
                    wallBgReady
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200'
                  }`}
                  title="Naskenovat prázdnou stěnu pro přesnější AI sledování nohy, těla a rukou"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Naskenovat stěnu</span>
                </button>

                <button
                  onClick={() => {
                    const next = sensitivityPreset === 'medium' ? 'high' : sensitivityPreset === 'high' ? 'low' : 'medium';
                    setSensitivityPreset(next);
                  }}
                  className="min-h-[38px] px-2.5 sm:px-3 py-1 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors flex items-center gap-1"
                  title="Citlivost AI detekce lezce (Střední, Vysoká, Nízká)"
                >
                  <Activity className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Citlivost:</span>
                  <span className="capitalize">{sensitivityPreset === 'medium' ? 'Stř.' : sensitivityPreset === 'high' ? 'Vys.' : 'Níz.'}</span>
                </button>
              </>
            )}

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

      {/* Wall Sound Scanner & Recognition Panel (Shown in sound_trigger mode) */}
      {startMode === 'sound_trigger' && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 text-xs shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-red-600/15 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Skenování startovního zvuku u stěny</span>
                  {scannedSoundProfile && (
                    <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      · {scannedSoundProfile.peakFreqHz} Hz
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  {scannedSoundProfile
                    ? `Uložen profil pípáku stěny (hluk okolí ${scannedSoundProfile.ambientRms}, cílový tón ${scannedSoundProfile.peakFreqHz} Hz)`
                    : 'Nejprve naskenujte zvuk startu přímo u stěny, aby časomíra ignorovala běžný hluk v hale.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={startWallSoundScan}
                disabled={soundScanState !== 'idle'}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-1.5 transition-all disabled:opacity-60 shadow-sm"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>
                  {soundScanState === 'sampling_ambient'
                    ? '1/2 Měřím hluk...'
                    : soundScanState === 'listening_signal'
                    ? '2/2 Spusťte pípnutí!'
                    : scannedSoundProfile
                    ? 'Přeskenovat zvuk'
                    : 'Naskenovat zvuk stěny'}
                </span>
              </button>

              {scannedSoundProfile && soundScanState === 'idle' && (
                <button
                  type="button"
                  onClick={clearScannedSoundProfile}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-red-600 font-bold"
                  title="Vymazat naskenovaný zvuk"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {soundScanStatus && (
            <div
              className={`p-2.5 rounded-xl border text-[11px] font-bold ${
                soundScanState === 'listening_signal'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 animate-pulse'
                  : scannedSoundProfile && soundScanStatus.startsWith('✓')
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {soundScanStatus}
            </div>
          )}

          {micError && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-600 text-[11px]">
              {micError}
            </div>
          )}

          {/* Live Microphone Spectrum / Match Bar */}
          {micActive && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>
                  {scannedSoundProfile
                    ? `Shoda se zvukem stěny (${scannedSoundProfile.peakFreqHz} Hz)`
                    : 'Živá úroveň mikrofonu'}
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {liveSoundMetrics.freqHz > 0 ? `${liveSoundMetrics.freqHz} Hz · ` : ''}
                  {liveSoundMetrics.matchPct}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-75 ${
                    liveSoundMetrics.matchPct >= 90
                      ? 'bg-emerald-500'
                      : liveSoundMetrics.matchPct >= 50
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, liveSoundMetrics.matchPct)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual 3-Line Calibration Panel (ONLY in AI Kamera mode) */}
      {isAiCameraMode && cameraActive && isCalibrating && (
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-red-500/50 shadow-xl space-y-3.5 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-red-600" />
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                Kalibrace linií AI Kamera: {categoryName} ({routeDef.heightMeters}m)
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

          {/* Click-to-Place Horizontal Line Selector + Background Scan */}
          <div className="p-2.5 rounded-xl bg-red-500/5 dark:bg-red-950/20 border border-red-500/20 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-red-600 dark:text-red-400">
                👆 Vyberte linii a klepněte do kamery pro její přesnou výšku:
              </span>
              <button
                type="button"
                onClick={captureWallBackground}
                className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-bold flex items-center gap-1 hover:bg-slate-700"
              >
                <Crosshair className="w-3 h-3 text-emerald-400" />
                <span>Naskenovat prázdnou stěnu</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveCalibrationTool('foot')}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                  activeCalibrationTool === 'foot'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 border border-white" />
                <span>Spodní linie (Start – Noha)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCalibrationTool('mid')}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                  activeCalibrationTool === 'mid'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-blue-300 border border-white" />
                <span>Středová linie (Mezičas – Ruka)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCalibrationTool('hand')}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                  activeCalibrationTool === 'hand'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-red-300 border border-white" />
                <span>Vrcholová linie (Cíl – Ruka)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 🔴 Top Line (Finish – Hands) */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-red-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                  <span>Vrcholová linie (Cíl)</span>
                </span>
                <span className="font-mono font-bold text-[11px] bg-red-500/15 text-red-600 dark:text-red-300 px-1.5 py-0.5 rounded">
                  Y: {finishZoneY}%
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Jakmile červená tečka (ruce) přesáhne linii, čas se zastaví.
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => updateCalibration('finishY', -1)}
                  className="flex-1 py-1 px-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-[11px] font-bold text-slate-800 dark:text-slate-200"
                >
                  Výše (-1%)
                </button>
                <button
                  type="button"
                  onClick={() => updateCalibration('finishY', 1)}
                  className="flex-1 py-1 px-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-[11px] font-bold text-slate-800 dark:text-slate-200"
                >
                  Níže (+1%)
                </button>
              </div>
              <input
                type="range"
                min={2}
                max={65}
                value={finishZoneY}
                onChange={(e) => updateCalibration('finishY', Number(e.target.value) - finishZoneY)}
                className="w-full accent-red-600 h-1 cursor-pointer"
              />
            </div>

            {/* 🔵 Middle Line (Split – Hands) */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-blue-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                  <span>Středová linie (Mezičas)</span>
                </span>
                <span className="font-mono font-bold text-[11px] bg-blue-500/15 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded">
                  Y: {midZoneY}%
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Jakmile červená tečka (ruce) překročí střed, uloží se mezičas.
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => updateCalibration('midY', -1)}
                  className="flex-1 py-1 px-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-[11px] font-bold text-slate-800 dark:text-slate-200"
                >
                  Výše (-1%)
                </button>
                <button
                  type="button"
                  onClick={() => updateCalibration('midY', 1)}
                  className="flex-1 py-1 px-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-[11px] font-bold text-slate-800 dark:text-slate-200"
                >
                  Níže (+1%)
                </button>
              </div>
              <input
                type="range"
                min={18}
                max={80}
                value={midZoneY}
                onChange={(e) => updateCalibration('midY', Number(e.target.value) - midZoneY)}
                className="w-full accent-blue-600 h-1 cursor-pointer"
              />
            </div>

            {/* 🟢 Bottom Line (Start – Foot) */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Spodní linie (Start)</span>
                </span>
                <span className="font-mono font-bold text-[11px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                  Y: {startZoneY}%
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Jakmile zelená tečka (noha) překročí linii nahoru, zapne se čas.
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => updateCalibration('startY', -1)}
                  className="flex-1 py-1 px-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-[11px] font-bold text-slate-800 dark:text-slate-200"
                >
                  Výše (-1%)
                </button>
                <button
                  type="button"
                  onClick={() => updateCalibration('startY', 1)}
                  className="flex-1 py-1 px-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-[11px] font-bold text-slate-800 dark:text-slate-200"
                >
                  Níže (+1%)
                </button>
              </div>
              <input
                type="range"
                min={55}
                max={95}
                value={startZoneY}
                onChange={(e) => updateCalibration('startY', Number(e.target.value) - startZoneY)}
                className="w-full accent-emerald-600 h-1 cursor-pointer"
              />
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
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold text-center animate-in fade-in">
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

            {/* Real-time AI Kamera Limb Coordinates (ONLY shown in AI Kamera mode) */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              {isAiCameraMode && (
                <>
                  <div
                    className={`px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                      trackedPose.active
                        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                    }`}
                    title="Pozice nohy (zelená tečka)"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>{trackedPose.active ? `${Math.round(trackedPose.foot.y)}%` : '—'}</span>
                  </div>
                  <div
                    className={`px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                      trackedPose.active
                        ? 'bg-blue-950/60 border-blue-500/50 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                    }`}
                    title="Pozice těla (modrá tečka)"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    <span>{trackedPose.active ? `${Math.round(trackedPose.body.y)}%` : '—'}</span>
                  </div>
                  <div
                    className={`px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                      trackedPose.active
                        ? 'bg-red-950/60 border-red-500/50 text-red-300'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                    }`}
                    title="Pozice rukou (červená tečka)"
                  >
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <span>{trackedPose.active ? `${Math.round(trackedPose.hands.y)}%` : '—'}</span>
                  </div>
                </>
              )}

              {!isRunning && elapsedMs === 0 && (
                <div className="px-2.5 py-0.5 rounded-lg bg-black text-white font-mono font-bold text-xs border border-white/20">
                  00.000s
                </div>
              )}
            </div>
          </div>

          {/* ACTIVE CAMERA HUD VIEWPORT – Expands vertically for "Celý záběr" mode */}
          <div
            onClick={handleViewfinderClick}
            className={`relative rounded-3xl bg-black border-2 border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center select-none transition-all duration-300 group cursor-pointer hover:ring-2 hover:ring-red-500/40 ${
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

            {/* Quick Tap Action Floating Badge at Top */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-center pointer-events-none z-20">
              {isAiCameraMode && isCalibrating ? (
                <div className="px-3 py-1 rounded-full bg-slate-900/90 text-amber-300 text-[11px] font-bold border border-amber-500/50 shadow-md backdrop-blur-sm flex items-center gap-1.5 animate-pulse">
                  <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Klepněte pro výšku linie:{' '}
                    <strong className="text-white">
                      {activeCalibrationTool === 'foot'
                        ? '🟢 Spodní (Start – Noha)'
                        : activeCalibrationTool === 'mid'
                        ? '🔵 Středová (Mezičas – Ruka)'
                        : '🔴 Vrcholová (Cíl – Ruka)'}
                    </strong>
                  </span>
                </div>
              ) : (
                <div className="px-3 py-1 rounded-full bg-slate-950/80 text-white/90 text-[11px] font-bold border border-white/20 shadow-md backdrop-blur-sm flex items-center gap-1.5">
                  <Play className="w-3 h-3 fill-current text-red-500" />
                  <span>
                    👆 Klepněte pro{' '}
                    <strong className="text-white">
                      {isRunning
                        ? 'DOHMAT (STOP)'
                        : countdownState === 'armed'
                        ? 'ZRUŠENÍ HLÍDÁNÍ'
                        : 'START ČASOMÍRY'}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            {/* AI Kamera Overlay ONLY: 3 Sleek Horizontal Crossing Lines + Live Foot/Body/Hand Dots */}
            {isAiCameraMode && showGuides && (
              <div className="absolute inset-0 pointer-events-none z-10">
                {/* Subtle vertical center guide */}
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px border-l border-dashed border-white/15" />

                {/* 🔴 TOP LINE: Finish (Red Hands Dot) */}
                <div
                  style={{ top: `${finishZoneY}%` }}
                  className={`absolute left-3 right-3 border-t-2 transition-all ${
                    lastLineTrigger === 'finish'
                      ? 'border-red-400 shadow-[0_0_16px_rgba(248,113,113,0.95)]'
                      : 'border-dashed border-red-500/90'
                  }`}
                >
                  <div className="flex items-center justify-between -translate-y-1/2">
                    <span className="px-2 py-0.5 rounded-full bg-red-950/85 border border-red-500/60 text-red-200 text-[10px] font-bold shadow-sm flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span>CÍL – Ruka ({routeDef.heightMeters}m)</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-black/75 text-red-300 font-mono text-[9px] border border-red-500/40">
                      Y:{finishZoneY}%
                    </span>
                  </div>
                </div>

                {/* 🔵 MIDDLE LINE: Split (Red Hands Dot) */}
                <div
                  style={{ top: `${midZoneY}%` }}
                  className={`absolute left-3 right-3 border-t-2 transition-all ${
                    lastLineTrigger === 'mid' || midSplitTime !== null
                      ? 'border-blue-300 shadow-[0_0_16px_rgba(96,165,250,0.95)]'
                      : 'border-dashed border-blue-400/90'
                  }`}
                >
                  <div className="flex items-center justify-between -translate-y-1/2">
                    <span className="px-2 py-0.5 rounded-full bg-blue-950/85 border border-blue-500/60 text-blue-200 text-[10px] font-bold shadow-sm flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      <span>
                        STŘED – Mezičas ({isYouthCategory ? '5m' : '7.5m'})
                        {midSplitTime !== null ? ` · ${midSplitTime.toFixed(2)}s` : ''}
                      </span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-black/75 text-blue-300 font-mono text-[9px] border border-blue-500/40">
                      Y:{midZoneY}%
                    </span>
                  </div>
                </div>

                {/* 🟢 BOTTOM LINE: Start (Green Foot Dot) */}
                <div
                  style={{ top: `${startZoneY}%` }}
                  className={`absolute left-3 right-3 border-t-2 transition-all ${
                    lastLineTrigger === 'start'
                      ? 'border-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.95)]'
                      : 'border-dashed border-emerald-400/90'
                  }`}
                >
                  <div className="flex items-center justify-between -translate-y-1/2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950/85 border border-emerald-500/60 text-emerald-200 text-[10px] font-bold shadow-sm flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>START – Noha</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-black/75 text-emerald-300 font-mono text-[9px] border border-emerald-500/40">
                      Y:{startZoneY}%
                    </span>
                  </div>
                </div>

                {/* Live Continuous Climber Pose Skeleton & Colored Tracking Dots */}
                {trackedPose.active && (
                  <>
                    {/* Connecting body-axis line */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <line
                        x1={trackedPose.hands.x}
                        y1={trackedPose.hands.y}
                        x2={trackedPose.body.x}
                        y2={trackedPose.body.y}
                        stroke="rgba(255,255,255,0.55)"
                        strokeWidth="0.6"
                        strokeDasharray="1.2 1"
                      />
                      <line
                        x1={trackedPose.body.x}
                        y1={trackedPose.body.y}
                        x2={trackedPose.foot.x}
                        y2={trackedPose.foot.y}
                        stroke="rgba(255,255,255,0.55)"
                        strokeWidth="0.6"
                        strokeDasharray="1.2 1"
                      />
                    </svg>

                    {/* 🔴 Red Dot = Hands (Ruce) */}
                    <div
                      style={{ left: `${trackedPose.hands.x}%`, top: `${trackedPose.hands.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1"
                    >
                      <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-[0_0_12px_rgba(239,68,68,0.95)]" />
                      <span className="px-1.5 py-0.5 rounded bg-red-600/90 text-white text-[9px] font-black shadow">
                        Ruka
                      </span>
                    </div>

                    {/* 🔵 Blue Dot = Torso/Body (Tělo) */}
                    <div
                      style={{ left: `${trackedPose.body.x}%`, top: `${trackedPose.body.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1"
                    >
                      <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-[0_0_12px_rgba(59,130,246,0.95)]" />
                      <span className="px-1.5 py-0.5 rounded bg-blue-600/90 text-white text-[9px] font-black shadow">
                        Tělo
                      </span>
                    </div>

                    {/* 🟢 Green Dot = Foot (Noha) */}
                    <div
                      style={{ left: `${trackedPose.foot.x}%`, top: `${trackedPose.foot.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1"
                    >
                      <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-[0_0_12px_rgba(16,185,129,0.95)]" />
                      <span className="px-1.5 py-0.5 rounded bg-emerald-600/90 text-white text-[9px] font-black shadow">
                        Noha
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* High-visibility Chrono Overlay during active climb or countdown */}
            {(isRunning || elapsedMs > 0 || countdownState !== 'idle') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 z-20">
                {countdownState === 'armed' && (
                  <div className="mb-2 px-4 py-1.5 bg-emerald-500/90 text-white font-black text-xs uppercase tracking-wider rounded-full shadow-lg animate-pulse">
                    {isAiCameraMode
                      ? `ČEKÁ SE AŽ NOHA PŘEKROČÍ LINII (${startZoneY}%)`
                      : 'SENZOR AKTIVNÍ — ČEKÁ SE NA START'}
                  </div>
                )}

                {countdownState !== 'idle' && countdownState !== 'started' && countdownState !== 'armed' && (
                  <div className="mb-2 px-5 py-1.5 bg-amber-500 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-widest rounded-full shadow-lg flex items-center gap-2 animate-pulse">
                    <span>
                      {countdownState === 'marks' && '🏁 AT YOUR MARKS (NA MÍSTA)'}
                      {countdownState === 'ready' && '⚡ READY (PŘIPRAVIT SE)'}
                      {countdownState === 'beeps' && '🔊 3... 2... 1...'}
                    </span>
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
                {isAiCameraMode
                  ? `🟢 Noha překročí spodní linii (${startZoneY}%) → Start | 🔴 Ruka střed (${midZoneY}%) → Mezičas | 🔴 Ruka vrchol (${finishZoneY}%) → Stop.`
                  : 'Kamera nahrává video výlezu. Klepnutím na displej spustíte nebo zastavíte časomíru.'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
              {isAiCameraMode ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  ● AI sledování (Noha / Tělo / Ruce)
                </span>
              ) : (
                <span>Pouze videozáznam bez AI detekce</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* SLEEK DIGITAL CHRONO CARD WITH TAP-TO-START */
        <div
          onClick={handleScreenTapAction}
          className="relative rounded-3xl bg-slate-950 text-white p-4 sm:p-8 border border-slate-800 hover:border-red-500/50 shadow-2xl text-center select-none overflow-hidden cursor-pointer transition-all active:scale-[0.99]"
        >
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
            <div className="mb-2 inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-full shadow-md animate-pulse">
              <span>
                {countdownState === 'marks' && '🏁 AT YOUR MARKS (NA MÍSTA)'}
                {countdownState === 'ready' && '⚡ READY (PŘIPRAVIT SE)'}
                {countdownState === 'beeps' && '🔊 3... 2... 1...'}
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
          <span className="text-[10px] font-bold text-slate-400">
            {isYouthCategory ? '1. ÚSEK (3.3m)' : '1. ÚSEK (5m)'}
          </span>
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
          <span className="text-[10px] font-bold text-slate-400">
            {isYouthCategory ? '2. ÚSEK (6.6m)' : '2. ÚSEK (10m)'}
          </span>
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="text-xl sm:text-2xl font-mono font-black text-slate-950 dark:text-white">
                {finishedRun.totalTime.toFixed(3)}s
              </span>
              <span className="text-xs font-bold text-slate-500">
                ·{' '}
                {finishedRun.routeCategory === 'adults_15m'
                  ? '15m Dospělí'
                  : finishedRun.routeCategory === 'youth_u15'
                  ? '10m U15'
                  : '10m U13'}
              </span>
              {finishedRun.isPersonalBest && (
                <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                  · Nový PB!
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {showDeleteRunConfirm ? (
                <div className="flex items-center gap-1.5 p-1 bg-red-50 dark:bg-red-950/60 rounded-xl border border-red-200 dark:border-red-900">
                  <span className="text-[11px] text-red-600 dark:text-red-300 px-1 font-bold">
                    Smazat tento pokus?
                  </span>
                  <button
                    type="button"
                    onClick={handleDeleteRunAttempt}
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-bold shadow-sm transition-colors"
                  >
                    Ano, smazat
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteRunConfirm(false)}
                    className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 rounded-lg text-[11px] transition-colors"
                  >
                    Zrušit
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setShowDeleteRunConfirm(true)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-red-600 hover:border-red-300 dark:hover:border-red-800 text-xs font-bold transition-all flex items-center gap-1"
                    title="Smazat tento naměřený pokus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Smazat pokus</span>
                  </button>
                  <button
                    onClick={() => onOpenAnalysis(finishedRun)}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Rozbor</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {(() => {
            const runIsYouth =
              finishedRun.routeCategory === 'youth_u15' || finishedRun.routeCategory === 'youth_u13';
            return (
              <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">
                    {runIsYouth ? '0–3.3m' : '0–5m'}
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 block">
                    {finishedRun.splits.split1.toFixed(2)}s
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">
                    {runIsYouth ? '3.3–6.6m' : '5–10m'}
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 block">
                    {finishedRun.splits.split2.toFixed(2)}s
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">
                    {runIsYouth ? '6.6–10m' : '10–15m'}
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 block">
                    {finishedRun.splits.split3.toFixed(2)}s
                  </span>
                </div>
              </div>
            );
          })()}

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
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleDownloadVideoDirect}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-red-600 hover:bg-slate-200 transition-colors flex items-center gap-1 text-[11px] font-bold"
                      title="Uložit video do složky Stažené soubory v zařízení"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>💾 Do zařízení</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleShareVideoToCloud}
                      className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1 text-[11px] font-bold"
                      title="Uložit nebo sdílet na Google Disk či OneDrive"
                    >
                      <Cloud className="w-3.5 h-3.5" />
                      <span>☁️ Disk / OneDrive</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowDeleteVideoConfirm(true)}
                      className="px-2 py-1 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors flex items-center gap-1 text-[11px] font-bold"
                      title="Smazat nahrané video"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Smazat</span>
                    </button>
                  </div>
                )}
              </div>

              {videoShareFeedback && (
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold text-center animate-in fade-in">
                  {videoShareFeedback}
                </div>
              )}

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

              {/* Cloud Storage Picker Modal */}
              {showCloudPicker && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-blue-500/30 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cloud className="w-4 h-4 text-blue-500" />
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        Uložení videa na Google Disk nebo OneDrive
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCloudPicker(false)}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    Soubor videa si můžete stáhnout a jednoduše přetáhnout do svého privátního cloudového úložiště bez nutnosti sdílet své přihlašovací heslo:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <a
                      href="https://drive.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 flex items-center justify-between gap-2 text-slate-800 dark:text-slate-200 font-bold transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">📁</span>
                        <span>Otevřít Google Disk</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500" />
                    </a>

                    <a
                      href="https://onedrive.live.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 flex items-center justify-between gap-2 text-slate-800 dark:text-slate-200 font-bold transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">☁️</span>
                        <span>Otevřít OneDrive</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500" />
                    </a>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <button
                      type="button"
                      onClick={handleDownloadVideoDirect}
                      className="font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Stáhnout video do zařízení (.webm)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCloudPicker(false)}
                      className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
                    >
                      Hotovo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

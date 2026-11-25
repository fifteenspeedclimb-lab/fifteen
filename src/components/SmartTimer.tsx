import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { FilesetResolver, PoseLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision';
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
  Crosshair,
  Expand,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown
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

interface SkeletonSegment {
  from: TrackedPoint;
  to: TrackedPoint;
}

interface TrackedPose {
  active: boolean;
  hands: TrackedPoint;
  body: TrackedPoint;
  foot: TrackedPoint;
  confidence: number;
  source?: 'mediapipe' | 'fallback';
  skeleton?: SkeletonSegment[];
}

const EMPTY_POSE: TrackedPose = {
  active: false,
  hands: { x: 50, y: 20 },
  body: { x: 50, y: 50 },
  foot: { x: 50, y: 80 },
  confidence: 0,
  source: undefined,
  skeleton: undefined,
};

const POSE_BONE_PAIRS: [number, number][] = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [27, 31],
  [24, 26],
  [26, 28],
  [28, 32],
];

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
  const [startMode, setStartMode] = useState<StartMode>('manual');

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
  const [playbackVideoSec, setPlaybackVideoSec] = useState<number>(0);
  const [isPlaybackPlaying, setIsPlaybackPlaying] = useState<boolean>(false);
  const [showDeleteVideoConfirm, setShowDeleteVideoConfirm] = useState<boolean>(false);
  const [showDeleteRunConfirm, setShowDeleteRunConfirm] = useState<boolean>(false);

  // Viewfinder & Positioning Helpers (only active in AI Kamera mode)
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [cameraFit, setCameraFit] = useState<'contain' | 'cover'>('contain');
  const [isCameraExpanded, setIsCameraExpanded] = useState<boolean>(false);
  const [gestureToast, setGestureToast] = useState<string | null>(null);
  const [swipePreview, setSwipePreview] = useState<
    'save' | 'delete' | 'restart' | 'exit' | 'need_two_fingers' | null
  >(null);

  // Per-category Horizontal Trigger Lines (Bottom Foot, Middle Hand Split, Top Finish Hand)
  const [calibrations, setCalibrations] = useState<Record<RouteCategory, CategoryCalibration>>(getStoredCalibrations);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [calibrationSavedToast, setCalibrationSavedToast] = useState<string | null>(null);

  // Active line coordinates dynamically derived from active category
  const activeCalibration = calibrations[currentCategory] || DEFAULT_CATEGORY_CALIBRATIONS[currentCategory];
  const finishZoneY = activeCalibration.finishY;
  const midZoneY = activeCalibration.midY ?? (currentCategory === 'adults_15m' ? 44 : 60);
  const startZoneY = activeCalibration.startY;

  // Active calibration line tool & live drag state
  const [activeCalibrationTool, setActiveCalibrationTool] = useState<'foot' | 'mid' | 'hand'>('foot');
  const [draggingLine, setDraggingLine] = useState<'foot' | 'mid' | 'hand' | null>(null);

  // Video saving feedback & modal state
  const [videoShareFeedback, setVideoShareFeedback] = useState<string | null>(null);
  const [showCloudPicker, setShowCloudPicker] = useState<boolean>(false);
  const [isExportingVideo, setIsExportingVideo] = useState<boolean>(false);
  const [videoBoxRect, setVideoBoxRect] = useState<{ left: number; top: number; width: number; height: number }>({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
  });

  // Real-time AI Climber Pose Tracking (Green = Foot, Blue = Torso, Red = Hands)
  const [trackedPose, setTrackedPose] = useState<TrackedPose>(EMPTY_POSE);
  const [poseEngineState, setPoseEngineState] = useState<'idle' | 'loading' | 'mediapipe' | 'fallback'>('idle');
  const [wallBgReady, setWallBgReady] = useState<boolean>(false);
  const [lastLineTrigger, setLastLineTrigger] = useState<'start' | 'mid' | 'finish' | null>(null);

  // Sensitivity Presets: low = strict, medium = balanced, high = sensitive
  const [sensitivityPreset, setSensitivityPreset] = useState<'low' | 'medium' | 'high'>('medium');
  const soundThreshold = sensitivityPreset === 'low' ? 62 : sensitivityPreset === 'high' ? 32 : 46;

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

  // Direct Touch/Pointer Dragging on AI Kamera Lines
  const handleLinePointerDown = (line: 'foot' | 'mid' | 'hand', e: React.PointerEvent<HTMLDivElement>) => {
    if (!isAiCameraMode || !isCalibrating) return;
    e.stopPropagation();
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore if capture unsupported
    }
    setActiveCalibrationTool(line);
    setDraggingLine(line);
  };

  const handleLinePointerMove = (line: 'foot' | 'mid' | 'hand', e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingLine !== line || !lineDragBoxRef.current) return;
    e.stopPropagation();
    const boxRect = lineDragBoxRef.current.getBoundingClientRect();
    const rawPct = Math.round(((e.clientY - boxRect.top) / Math.max(1, boxRect.height)) * 100);

    if (line === 'foot') {
      updateCalibrationField('startY', Math.min(95, Math.max(55, rawPct)));
    } else if (line === 'hand') {
      updateCalibrationField('finishY', Math.min(65, Math.max(2, rawPct)));
    } else {
      updateCalibrationField('midY', Math.min(80, Math.max(18, rawPct)));
    }
  };

  const handleLinePointerUp = (line: 'foot' | 'mid' | 'hand', e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingLine !== line) return;
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    justDraggedRef.current = true;
    setTimeout(() => {
      justDraggedRef.current = false;
    }, 90);
    setDraggingLine(null);

    const val = line === 'foot' ? startZoneY : line === 'hand' ? finishZoneY : midZoneY;
    const label =
      line === 'foot'
        ? `🟢 Spodní linie (Start – Noha) nastavena na ${val}%`
        : line === 'hand'
        ? `🔴 Vrcholová linie (Cíl – Ruka) nastavena na ${val}%`
        : `🔵 Středová linie (Mezičas – Ruka) nastavena na ${val}%`;
    setCalibrationSavedToast(label);
    setTimeout(() => setCalibrationSavedToast(null), 2000);
  };

  // Viewfinder Click: in AI Kamera calibration mode, moves the selected horizontal line; otherwise starts/stops timer!
  const handleViewfinderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (justDraggedRef.current || draggingLine || justSwipedRef.current) return;

    if (isAiCameraMode && isCalibrating) {
      const boxRect = lineDragBoxRef.current?.getBoundingClientRect();
      let clickY: number;
      if (boxRect && boxRect.height > 0) {
        clickY = Math.round(((e.clientY - boxRect.top) / boxRect.height) * 100);
      } else {
        const rect = e.currentTarget.getBoundingClientRect();
        const boxTopPx = rect.top + (videoBoxRect.top / 100) * rect.height;
        const boxHeightPx = Math.max(1, (videoBoxRect.height / 100) * rect.height);
        clickY = Math.round(((e.clientY - boxTopPx) / boxHeightPx) * 100);
      }

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

  // Format safe export filename: ClimberName_YYYY-MM-DD_HH-mm_6.482s.webm
  const buildVideoFilename = (run: SpeedRun, ext: string): string => {
    const rawName = (run.climberName || 'lezec').trim();
    const safeName =
      rawName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'lezec';

    const d = run.date ? new Date(run.date) : new Date();
    const validDate = Number.isNaN(d.getTime()) ? new Date() : d;
    const yyyy = validDate.getFullYear();
    const mm = String(validDate.getMonth() + 1).padStart(2, '0');
    const dd = String(validDate.getDate()).padStart(2, '0');
    const hh = String(validDate.getHours()).padStart(2, '0');
    const min = String(validDate.getMinutes()).padStart(2, '0');

    const datePart = `${yyyy}-${mm}-${dd}_${hh}-${min}`;
    const timePart = `${run.totalTime.toFixed(3)}s`;
    return `${safeName}_${datePart}_${timePart}.${ext}`;
  };

  // Burn live running timer (00.000s -> final result) permanently into the top-right corner of saved video
  const getAnnotatedVideoBlob = async (run: SpeedRun): Promise<{ blob: Blob; ext: string; mimeType: string } | null> => {
    if (!run.videoUrl) return null;
    const cacheKey = `${run.id}_top_right_running_${run.totalTime.toFixed(3)}`;
    if (exportedVideoCacheRef.current?.key === cacheKey) {
      return exportedVideoCacheRef.current.result;
    }

    const runRouteLabel =
      run.routeCategory === 'adults_15m' ? '15m' : run.routeCategory === 'youth_u15' ? '10m U15' : '10m U13';
    const baseClimberLabel = `${(run.climberName || 'LEZEC').toUpperCase()} · ${runRouteLabel}`;

    const formatVideoTime = (sec: number) => {
      const clamped = Math.max(0, Math.min(run.totalTime, sec));
      const whole = Math.floor(clamped);
      const frac = Math.floor((clamped - whole) * 1000);
      return `${whole.toString().padStart(2, '0')}.${frac.toString().padStart(3, '0')} s`;
    };

    const maxTimeReference = formatVideoTime(run.totalTime);

    const fallbackRawBlob = async () => {
      try {
        const resp = await fetch(run.videoUrl!);
        const raw = await resp.blob();
        const ext = (raw.type || '').includes('mp4') ? 'mp4' : 'webm';
        return { blob: raw, ext, mimeType: raw.type || 'video/webm' };
      } catch {
        return null;
      }
    };

    if (typeof document === 'undefined' || typeof MediaRecorder === 'undefined') {
      return fallbackRawBlob();
    }

    try {
      const offscreenVideo = document.createElement('video');
      offscreenVideo.src = run.videoUrl;
      offscreenVideo.muted = true;
      offscreenVideo.playsInline = true;
      offscreenVideo.preload = 'auto';

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('video load timeout')), 6000);
        offscreenVideo.onloadeddata = () => {
          clearTimeout(timeout);
          resolve();
        };
        offscreenVideo.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('video load error'));
        };
        offscreenVideo.load();
      });

      const natW = offscreenVideo.videoWidth || 1280;
      const natH = offscreenVideo.videoHeight || 720;
      const scale = Math.min(1, 1280 / Math.max(natW, natH));
      const W = Math.max(320, Math.round(natW * scale));
      const H = Math.max(240, Math.round(natH * scale));

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = W;
      exportCanvas.height = H;
      const ctx = exportCanvas.getContext('2d');

      if (!ctx || typeof exportCanvas.captureStream !== 'function') {
        return fallbackRawBlob();
      }

      const stream = exportCanvas.captureStream(30);
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
      ];
      const mimeType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      const drawWatermarkFrame = (forceFinal = false) => {
        ctx.drawImage(offscreenVideo, 0, 0, W, H);

        let currentRunSec = offscreenVideo.currentTime || 0;
        const vidDur = offscreenVideo.duration;
        if (forceFinal) {
          currentRunSec = run.totalTime;
        } else if (Number.isFinite(vidDur) && vidDur > 0.25 && vidDur < run.totalTime) {
          currentRunSec = (currentRunSec / vidDur) * run.totalTime;
        }
        const displaySec = Math.min(run.totalTime, Math.max(0, currentRunSec));
        const isFinishedFrame = forceFinal || displaySec >= run.totalTime - 0.012;
        const timeText = isFinishedFrame ? maxTimeReference : formatVideoTime(displaySec);
        const topLabel = isFinishedFrame ? `${baseClimberLabel} · CÍL` : baseClimberLabel;

        // Top-right live chrono badge
        const minDim = Math.min(W, H);
        const padX = Math.round(W * 0.03);
        const padY = Math.round(H * 0.035);
        const timeFontSize = Math.max(22, Math.round(minDim * 0.068));
        const subFontSize = Math.max(11, Math.round(minDim * 0.024));

        ctx.font = `900 ${timeFontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
        const timeMetrics = ctx.measureText(maxTimeReference);
        ctx.font = `700 ${subFontSize}px system-ui, -apple-system, sans-serif`;
        const subMetrics = ctx.measureText(`${baseClimberLabel} · CÍL`);

        const innerPadX = Math.round(minDim * 0.026);
        const innerPadY = Math.round(minDim * 0.018);
        const accentW = Math.max(4, Math.round(minDim * 0.009));
        const boxW = Math.max(timeMetrics.width, subMetrics.width) + innerPadX * 2 + accentW + 8;
        const boxH = subFontSize + timeFontSize + innerPadY * 2 + Math.round(minDim * 0.012);
        const boxX = W - padX - boxW;
        const boxY = padY;
        const radius = Math.max(8, Math.round(minDim * 0.022));

        ctx.save();
        ctx.fillStyle = 'rgba(9, 13, 24, 0.84)';
        ctx.strokeStyle = isFinishedFrame ? 'rgba(16, 185, 129, 0.55)' : 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = Math.max(1, Math.round(minDim * 0.0025));
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(boxX, boxY, boxW, boxH, radius);
        } else {
          ctx.rect(boxX, boxY, boxW, boxH);
        }
        ctx.fill();
        ctx.stroke();

        // Accent strip: Red while climbing, Emerald once finish time locked
        ctx.fillStyle = isFinishedFrame ? '#10b981' : '#ef4444';
        ctx.fillRect(boxX + innerPadX * 0.5, boxY + innerPadY, accentW, boxH - innerPadY * 2);

        const textStartX = boxX + innerPadX * 0.5 + accentW + Math.round(innerPadX * 0.65);

        ctx.fillStyle = isFinishedFrame ? 'rgba(167, 243, 208, 0.98)' : 'rgba(203, 213, 225, 0.95)';
        ctx.font = `700 ${subFontSize}px system-ui, -apple-system, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(topLabel, textStartX, boxY + innerPadY);

        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${timeFontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
        ctx.fillText(timeText, textStartX, boxY + innerPadY + subFontSize + Math.round(minDim * 0.008));
        ctx.restore();
      };

      const exportedBlob = await new Promise<Blob>((resolve, reject) => {
        let exportRafId = 0;
        let stopped = false;

        const finishExport = () => {
          if (stopped) return;
          stopped = true;
          cancelAnimationFrame(exportRafId);
          if (recorder.state === 'recording') {
            try {
              recorder.stop();
            } catch {
              reject(new Error('recorder stop failed'));
            }
          }
        };

        const safetyTimer = setTimeout(finishExport, 35000);

        recorder.onstop = () => {
          clearTimeout(safetyTimer);
          const resolvedType = recorder.mimeType || mimeType || 'video/webm';
          const outBlob = new Blob(chunks, { type: resolvedType });
          if (outBlob.size > 0) {
            resolve(outBlob);
          } else {
            reject(new Error('empty exported blob'));
          }
        };

        recorder.onerror = () => {
          clearTimeout(safetyTimer);
          finishExport();
          reject(new Error('recorder error'));
        };

        const renderLoop = () => {
          if (stopped) return;
          drawWatermarkFrame(false);
          if (!offscreenVideo.ended && !offscreenVideo.paused) {
            exportRafId = requestAnimationFrame(renderLoop);
          }
        };

        offscreenVideo.onended = () => {
          drawWatermarkFrame(true);
          setTimeout(finishExport, 260);
        };

        offscreenVideo.currentTime = 0;
        drawWatermarkFrame(false);
        recorder.start(100);
        offscreenVideo
          .play()
          .then(() => {
            exportRafId = requestAnimationFrame(renderLoop);
          })
          .catch((err) => {
            clearTimeout(safetyTimer);
            finishExport();
            reject(err);
          });
      });

      stream.getTracks().forEach((tr) => tr.stop());
      const resolvedMime = exportedBlob.type || mimeType || 'video/webm';
      const ext = resolvedMime.includes('mp4') ? 'mp4' : 'webm';
      const result = { blob: exportedBlob, ext, mimeType: resolvedMime };
      exportedVideoCacheRef.current = { key: cacheKey, result };
      return result;
    } catch {
      return fallbackRawBlob();
    }
  };

  // Video saving handlers (Device download vs Cloud sharing) with burned-in top-right running timer
  const handleDownloadVideoDirect = async () => {
    if (!finishedRun?.videoUrl || isExportingVideo) return;
    setIsExportingVideo(true);
    setVideoShareFeedback('Vypisuji běžící časomíru do pravého horního rohu videa...');
    try {
      const exported = await getAnnotatedVideoBlob(finishedRun);
      if (!exported) return;
      const downloadUrl = URL.createObjectURL(exported.blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = buildVideoFilename(finishedRun, exported.ext);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 4000);
      setVideoShareFeedback(`Video ${buildVideoFilename(finishedRun, exported.ext)} bylo staženo!`);
      setTimeout(() => setVideoShareFeedback(null), 4000);
    } finally {
      setIsExportingVideo(false);
    }
  };

  const handleShareVideoToCloud = async () => {
    if (!finishedRun?.videoUrl || isExportingVideo) return;
    setIsExportingVideo(true);
    setVideoShareFeedback('Připravuji video s běžícím časem pro uložení...');
    try {
      const exported = await getAnnotatedVideoBlob(finishedRun);
      if (exported) {
        const filename = buildVideoFilename(finishedRun, exported.ext);
        const file = new File([exported.blob], filename, { type: exported.mimeType });

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
      }
    } catch {
      // share dismissed or unsupported
    } finally {
      setIsExportingVideo(false);
    }
    setVideoShareFeedback(null);
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
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const lineDragBoxRef = useRef<HTMLDivElement | null>(null);
  const justDraggedRef = useRef<boolean>(false);
  const justSwipedRef = useRef<boolean>(false);
  const gestureToastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchGestureRef = useRef<{
    active: boolean;
    maxTouches: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    twoStartX: number;
    twoStartY: number;
    twoLastX: number;
    twoLastY: number;
  }>({
    active: false,
    maxTouches: 0,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    twoStartX: 0,
    twoStartY: 0,
    twoLastX: 0,
    twoLastY: 0,
  });
  const exportedVideoCacheRef = useRef<{
    key: string;
    result: { blob: Blob; ext: string; mimeType: string };
  } | null>(null);
  const cameraStartTsRef = useRef<number>(0);
  const manualWallScanRef = useRef<boolean>(false);
  const split1TimeRef = useRef<number | null>(null);
  const split2TimeRef = useRef<number | null>(null);
  const midSplitTimeRef = useRef<number | null>(null);

  const recomputeVideoBox = useCallback(() => {
    const vp = viewportRef.current;
    const vid = videoRef.current;
    if (!vp || !vid || !vid.videoWidth || !vid.videoHeight) {
      setVideoBoxRect({ left: 0, top: 0, width: 100, height: 100 });
      return;
    }
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    if (!vw || !vh) return;
    const natW = vid.videoWidth;
    const natH = vid.videoHeight;
    const s = cameraFit === 'contain' ? Math.min(vw / natW, vh / natH) : Math.max(vw / natW, vh / natH);
    const drawW = natW * s;
    const drawH = natH * s;
    const offsetX = (vw - drawW) / 2;
    const offsetY = (vh - drawH) / 2;
    setVideoBoxRect({
      left: (offsetX / vw) * 100,
      top: (offsetY / vh) * 100,
      width: (drawW / vw) * 100,
      height: (drawH / vh) * 100,
    });
  }, [cameraFit]);

  useEffect(() => {
    recomputeVideoBox();
    window.addEventListener('resize', recomputeVideoBox);
    return () => window.removeEventListener('resize', recomputeVideoBox);
  }, [recomputeVideoBox, cameraActive, isCameraExpanded]);

  useEffect(() => {
    if (cameraActive && isCameraExpanded) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const t1 = setTimeout(recomputeVideoBox, 40);
      const t2 = setTimeout(recomputeVideoBox, 260);
      return () => {
        document.body.style.overflow = prevOverflow;
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    const t1 = setTimeout(recomputeVideoBox, 40);
    return () => clearTimeout(t1);
  }, [cameraActive, isCameraExpanded, recomputeVideoBox]);

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
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const poseInitInFlightRef = useRef<boolean>(false);
  const lastMediaPipeTsRef = useRef<number>(0);
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

  // Smooth 60fps time sync for in-app recorded video preview
  useEffect(() => {
    if (!isPlaybackPlaying) return;
    let rafId = 0;
    const tickPlayback = () => {
      const vid = playbackVideoRef.current;
      if (vid && !vid.paused && !vid.ended) {
        setPlaybackVideoSec(vid.currentTime);
        rafId = requestAnimationFrame(tickPlayback);
      }
    };
    rafId = requestAnimationFrame(tickPlayback);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaybackPlaying]);

  // Stop Timer
  const stopTimer = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const finalMs = startTimeRef.current > 0 ? performance.now() - startTimeRef.current : elapsedMs;
    startTimeRef.current = 0;
    setElapsedMs(finalMs);
    setIsRunning(false);
    setCountdownState('idle');
    playFinishFanfare();

    // Stop video recording
    stopMediaRecording();

    const totalSeconds = parseFloat((finalMs / 1000).toFixed(3));
    let s1 = split1TimeRef.current ?? split1Time;
    const rawS2 = split2TimeRef.current ?? split2Time;
    const rawMid = midSplitTimeRef.current ?? midSplitTime;
    let s2 = rawS2 ? parseFloat((rawS2 - (s1 ?? 0)).toFixed(2)) : null;

    // If AI Kamera captured a middle-of-wall crossing time, derive balanced 1/3 and 2/3 splits from it
    if (rawMid !== null && rawS2 === null) {
      s1 = parseFloat((rawMid * 0.64).toFixed(2));
      s2 = parseFloat(Math.max(0.1, rawMid * 0.68).toFixed(2));
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
      videoUrl: undefined,
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
    elapsedMs,
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
    split1TimeRef.current = null;
    split2TimeRef.current = null;
    midSplitTimeRef.current = null;
    midLineTriggeredRef.current = false;
    setRecordedVideoUrl(null);
    setPlaybackVideoSec(0);
    setIsPlaybackPlaying(false);
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
    const liveMs = startTimeRef.current > 0 ? performance.now() - startTimeRef.current : elapsedMs;
    const currentSec = parseFloat((liveMs / 1000).toFixed(2));
    playSplitChime();
    if (gate === 1 && !split1TimeRef.current) {
      split1TimeRef.current = currentSec;
      setSplit1Time(currentSec);
    } else if (gate === 2 && !split2TimeRef.current) {
      split2TimeRef.current = currentSec;
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
    manualWallScanRef.current = false;
    cameraStartTsRef.current = performance.now();
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
      manualWallScanRef.current = true;
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
      setIsCameraExpanded(false);
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

  // Initialize microphone stream + fast-response FFT analyser (1024)
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
      analyser.smoothingTimeConstant = 0.15;
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
  const startWallSoundScan = async (): Promise<boolean> => {
    const analyser = await ensureMicReady();
    if (!analyser || !audioContextRef.current) return false;

    soundScanAbortRef.current = false;
    setCountdownState('idle');
    setSoundScanState('sampling_ambient');
    setSoundScanStatus('Krok 1/2: Měřím běžný hluk u stěny (buďte chvíli v klidu)...');

    const binCount = analyser.frequencyBinCount;
    const sampleRate = audioContextRef.current.sampleRate;
    const fftSize = analyser.fftSize;
    const buf = new Uint8Array(binCount);
    const timeBuf = new Uint8Array(fftSize);
    const ambientAccum = new Float32Array(binCount);
    let ambientFrames = 0;

    // Step 1: Collect ~850ms of ambient noise floor
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
        if (performance.now() - startTs >= 850) {
          resolve();
        } else {
          setTimeout(sampleAmbient, 30);
        }
      };
      sampleAmbient();
    });

    if (soundScanAbortRef.current) {
      setSoundScanState('idle');
      return false;
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
        analyser.getByteTimeDomainData(timeBuf);

        let peakTimeDelta = 0;
        for (let i = 0; i < fftSize; i++) {
          const d = Math.abs(timeBuf[i] - 128);
          if (d > peakTimeDelta) peakTimeDelta = d;
        }

        // Ignore sub-200Hz rumble (bins 0..4)
        let frameMaxContrast = 0;
        let frameMaxBin = -1;
        let frameMaxEnergy = 0;
        for (let i = 5; i < Math.min(binCount, 280); i++) {
          const contrast = buf[i] - ambientBins[i];
          if (contrast > frameMaxContrast && buf[i] > 20) {
            frameMaxContrast = contrast;
            frameMaxBin = i;
            frameMaxEnergy = buf[i];
          }
        }

        if ((frameMaxContrast > 14 || peakTimeDelta > 16) && frameMaxBin >= 5) {
          if (frameMaxContrast > bestContrast) {
            bestContrast = frameMaxContrast;
            bestBin = frameMaxBin;
            bestEnergy = frameMaxEnergy;
          }
          sustainedFrames++;
        }

        const elapsedScan = performance.now() - startTs;
        if ((sustainedFrames >= 2 && bestContrast > 24 && elapsedScan >= 900) || elapsedScan >= 5000) {
          resolve();
        } else {
          setTimeout(listenLoop, 22);
        }
      };
      listenLoop();
    });

    setSoundScanState('idle');

    if (soundScanAbortRef.current) return false;

    if (bestBin >= 5 && bestEnergy > ambientRms + 12) {
      const peakFreqHz = Math.round((bestBin * sampleRate) / fftSize);
      const profileData: ScannedSoundProfile = {
        ambientRms: Math.round(ambientRms),
        peakFreqHz,
        peakBinIndex: bestBin,
        bandwidthBins: 6,
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
      return true;
    } else {
      setSoundScanStatus('Startovní tón nebyl zachycen dostatečně zřetelně. Přibližte telefon ke stěně nebo zkuste tlesknout.');
      return false;
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
      const analyser = await ensureMicReady();
      if (!analyser) return;
      if (!scannedSoundProfile) {
        const scannedOk = await startWallSoundScan();
        if (!scannedOk) return;
      }
    }

    footArmedBelowLineRef.current = false;
    midLineTriggeredRef.current = false;
    setElapsedMs(0);
    setFinishedRun(null);
    setIsFalseStart(false);
    setCountdownState('armed');
  };

  // Keep dynamic sensor state & callbacks in a mutable ref so the sensor loop NEVER restarts on every timer tick!
  const sensorStateRef = useRef({
    startMode,
    countdownState,
    isRunning,
    soundThreshold,
    sensitivityPreset,
    scannedSoundProfile,
    soundScanState,
    startZoneY,
    midZoneY,
    finishZoneY,
    startTimerNow,
    stopTimer,
  });

  sensorStateRef.current = {
    startMode,
    countdownState,
    isRunning,
    soundThreshold,
    sensitivityPreset,
    scannedSoundProfile,
    soundScanState,
    startZoneY,
    midZoneY,
    finishZoneY,
    startTimerNow,
    stopTimer,
  };

  // Stable Audio Sensor Loop (runs uninterrupted at 20ms whenever microphone is active)
  useEffect(() => {
    if (!micActive) return;

    let stopped = false;
    const freqArray = new Uint8Array(512);
    const timeArray = new Uint8Array(1024);

    const checkAudio = () => {
      if (stopped) return;
      const st = sensorStateRef.current;
      const analyser = micAnalyserRef.current;
      if (st.startMode !== 'sound_trigger' || !analyser || st.isRunning) return;

      const binCount = Math.min(analyser.frequencyBinCount, freqArray.length);
      analyser.getByteFrequencyData(freqArray);
      analyser.getByteTimeDomainData(timeArray);

      let sum = 0;
      let instantPeakVal = 0;
      let instantPeakBin = 0;
      for (let i = 0; i < binCount; i++) {
        sum += freqArray[i];
        if (i >= 5 && freqArray[i] > instantPeakVal) {
          instantPeakVal = freqArray[i];
          instantPeakBin = i;
        }
      }
      const avg = sum / binCount;

      let timePeak = 0;
      const tLen = Math.min(analyser.fftSize, timeArray.length);
      for (let i = 0; i < tLen; i++) {
        const amp = Math.abs(timeArray[i] - 128);
        if (amp > timePeak) timePeak = amp;
      }

      const sampleRate = audioContextRef.current?.sampleRate || 48000;
      const instantFreqHz = Math.round((instantPeakBin * sampleRate) / analyser.fftSize);

      let matched = false;
      let matchPct = Math.min(100, Math.round((instantPeakVal / Math.max(25, st.soundThreshold)) * 100));

      if (st.scannedSoundProfile) {
        const expectedBin = Math.round((st.scannedSoundProfile.peakFreqHz * analyser.fftSize) / sampleRate);
        const tol = Math.max(5, st.scannedSoundProfile.bandwidthBins || 6);
        const low = Math.max(4, expectedBin - tol);
        const high = Math.min(binCount - 1, expectedBin + tol);

        let bandPeak = 0;
        let otherSum = 0;
        let otherCount = 0;

        for (let i = 4; i < Math.min(binCount, 280); i++) {
          if (i >= low && i <= high) {
            if (freqArray[i] > bandPeak) bandPeak = freqArray[i];
          } else {
            otherSum += freqArray[i];
            otherCount++;
          }
        }

        const outOfBandAvg = otherCount > 0 ? otherSum / otherCount : 0;
        const sensRatio = st.sensitivityPreset === 'low' ? 0.72 : st.sensitivityPreset === 'high' ? 0.42 : 0.56;
        const requiredEnergy = Math.max(
          st.scannedSoundProfile.ambientRms + 18,
          Math.min(190, st.scannedSoundProfile.targetBandEnergy * sensRatio)
        );

        matchPct = Math.min(
          100,
          Math.max(
            0,
            Math.round(
              ((bandPeak - st.scannedSoundProfile.ambientRms) /
                Math.max(18, requiredEnergy - st.scannedSoundProfile.ambientRms)) *
                100
            )
          )
        );

        const broadbandSpike = instantPeakVal >= st.soundThreshold * 1.45 && timePeak > 28;
        if ((bandPeak >= requiredEnergy && bandPeak > outOfBandAvg * 1.15) || broadbandSpike) {
          matched = true;
        }
      } else if (instantPeakVal >= st.soundThreshold || (avg > st.soundThreshold * 0.65 && timePeak > 22)) {
        matched = true;
      }

      const nowMs = performance.now();
      if (nowMs - lastSoundUiUpdateRef.current > 75) {
        lastSoundUiUpdateRef.current = nowMs;
        setLiveSoundMetrics({ freqHz: instantFreqHz, energy: Math.round(instantPeakVal), matchPct });
      }

      if (st.countdownState === 'armed' && st.soundScanState === 'idle' && matched) {
        playIFSCStartTone();
        st.startTimerNow(0.125);
      }
    };

    const audioTimer = setInterval(checkAudio, 20);
    return () => {
      stopped = true;
      clearInterval(audioTimer);
    };
  }, [micActive]);

  // Initialize MediaPipe PoseLandmarker neural skeleton model when AI Kamera is active
  useEffect(() => {
    if (!cameraActive || !isAiCameraMode) return;
    if (poseLandmarkerRef.current || poseInitInFlightRef.current) return;

    let cancelled = false;
    poseInitInFlightRef.current = true;
    setPoseEngineState('loading');

    const initPoseLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
        const preset = sensorStateRef.current.sensitivityPreset;
        const minConf = preset === 'high' ? 0.25 : preset === 'low' ? 0.55 : 0.35;

        const modelCandidates = [
          {
            url: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
            delegate: 'GPU' as const,
          },
          {
            url: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
            delegate: 'CPU' as const,
          },
          {
            url: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'CPU' as const,
          },
        ];

        let created: PoseLandmarker | null = null;
        for (const candidate of modelCandidates) {
          if (cancelled) break;
          try {
            created = await PoseLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: candidate.url,
                delegate: candidate.delegate,
              },
              runningMode: 'VIDEO',
              numPoses: 1,
              minPoseDetectionConfidence: minConf,
              minPosePresenceConfidence: minConf,
              minTrackingConfidence: minConf,
            });
            break;
          } catch {
            // Try next model/delegate
          }
        }

        if (cancelled) {
          created?.close();
          return;
        }

        if (created) {
          poseLandmarkerRef.current = created;
          setPoseEngineState('mediapipe');
        } else {
          setPoseEngineState('fallback');
        }
      } catch {
        if (!cancelled) {
          setPoseEngineState('fallback');
        }
      } finally {
        poseInitInFlightRef.current = false;
      }
    };

    void initPoseLandmarker();

    return () => {
      cancelled = true;
    };
  }, [cameraActive, isAiCameraMode]);

  // Dynamically update MediaPipe confidence when user switches sensitivity preset
  useEffect(() => {
    const landmarker = poseLandmarkerRef.current;
    if (!landmarker) return;
    const minConf = sensitivityPreset === 'high' ? 0.25 : sensitivityPreset === 'low' ? 0.55 : 0.35;
    landmarker
      .setOptions({
        minPoseDetectionConfidence: minConf,
        minPosePresenceConfidence: minConf,
        minTrackingConfidence: minConf,
      })
      .catch(() => {});
  }, [sensitivityPreset]);

  // Stable AI Kamera Vision Loop (MediaPipe 33-Landmark Anatomical Skeleton + CV Fallback)
  useEffect(() => {
    if (!cameraActive) return;

    let stopped = false;

    const triggerLineEvents = (nextPose: TrackedPose, prevFootY: number | null, nowMs: number) => {
      const st = sensorStateRef.current;
      const liveElapsedMs = startTimeRef.current > 0 ? nowMs - startTimeRef.current : 0;

      // LINE 1 TRIGGER (BOTTOM): Green Foot dot crosses upward past startZoneY -> START CHRONO
      if (!st.isRunning && st.countdownState === 'armed') {
        if (nextPose.foot.y >= st.startZoneY - 2.0) {
          footArmedBelowLineRef.current = true;
        }
        const crossedUpward =
          (prevFootY !== null && prevFootY >= st.startZoneY - 1.5 && nextPose.foot.y < st.startZoneY - 0.5) ||
          (footArmedBelowLineRef.current && nextPose.foot.y < st.startZoneY - 1.0);

        if (crossedUpward) {
          footArmedBelowLineRef.current = false;
          setLastLineTrigger('start');
          setTimeout(() => setLastLineTrigger(null), 1200);
          playIFSCStartTone();
          st.startTimerNow(0.125);
        }
      }

      // LINE 2 TRIGGER (MIDDLE): Red Hands dot crosses upward past midZoneY -> RECORD SPLIT
      if (st.isRunning && liveElapsedMs > 250 && !midLineTriggeredRef.current) {
        if (nextPose.hands.y <= st.midZoneY + 0.5) {
          midLineTriggeredRef.current = true;
          const splitSec = parseFloat((liveElapsedMs / 1000).toFixed(2));
          midSplitTimeRef.current = splitSec;
          split1TimeRef.current = splitSec;
          setMidSplitTime(splitSec);
          setSplit1Time(splitSec);
          playSplitChime();
          setLastLineTrigger('mid');
          setTimeout(() => setLastLineTrigger(null), 1200);
        }
      }

      // LINE 3 TRIGGER (TOP): Red Hands dot crosses/exceeds finishZoneY -> STOP CHRONO & SAVE
      if (st.isRunning && liveElapsedMs > 900) {
        if (nextPose.hands.y <= st.finishZoneY + 0.5) {
          setLastLineTrigger('finish');
          setTimeout(() => setLastLineTrigger(null), 1200);
          st.stopTimer();
        }
      }
    };

    const extractFromLandmarks = (lms: NormalizedLandmark[]): TrackedPose | null => {
      if (!lms || lms.length < 25) return null;

      const isVisible = (idx: number, minVis = 0.14) => {
        const pt = lms[idx];
        return pt && (pt.visibility === undefined || pt.visibility >= minVis);
      };

      const clampPct = (v: number) => Math.max(1, Math.min(99, v * 100));

      // 1) Hands (Ruka): pick highest visible reaching hand (wrists 15/16, pinkies 17/18, index 19/20, fallback elbows 13/14)
      const handIndices = [19, 20, 17, 18, 15, 16];
      let bestHand: NormalizedLandmark | null = null;
      for (const idx of handIndices) {
        if (isVisible(idx, 0.14)) {
          const pt = lms[idx];
          if (!bestHand || pt.y < bestHand.y) bestHand = pt;
        }
      }
      if (!bestHand) {
        for (const idx of [13, 14]) {
          if (isVisible(idx, 0.12)) {
            const pt = lms[idx];
            if (!bestHand || pt.y < bestHand.y) bestHand = pt;
          }
        }
      }

      // 2) Body/Torso (Tělo): average of visible shoulders (11,12) and hips (23,24)
      const torsoIndices = [11, 12, 23, 24];
      let sumBodyX = 0;
      let sumBodyY = 0;
      let bodyCount = 0;
      for (const idx of torsoIndices) {
        if (isVisible(idx, 0.14)) {
          sumBodyX += lms[idx].x;
          sumBodyY += lms[idx].y;
          bodyCount++;
        }
      }

      // 3) Foot (Noha): pick lowest/trailing visible foot point (toes 31/32, heels 29/30, ankles 27/28, fallback knees 25/26)
      const footIndices = [31, 32, 29, 30, 27, 28];
      let bestFoot: NormalizedLandmark | null = null;
      for (const idx of footIndices) {
        if (isVisible(idx, 0.12)) {
          const pt = lms[idx];
          if (!bestFoot || pt.y > bestFoot.y) bestFoot = pt;
        }
      }
      if (!bestFoot) {
        for (const idx of [25, 26]) {
          if (isVisible(idx, 0.12)) {
            const pt = lms[idx];
            if (!bestFoot || pt.y > bestFoot.y) bestFoot = pt;
          }
        }
      }

      if (!bestHand && bodyCount === 0 && !bestFoot) return null;

      const rawBodyX = bodyCount > 0 ? clampPct(sumBodyX / bodyCount) : clampPct((bestHand || bestFoot)!.x);
      const rawBodyY = bodyCount > 0 ? clampPct(sumBodyY / bodyCount) : clampPct((bestHand || bestFoot)!.y);
      const rawHandsX = bestHand ? clampPct(bestHand.x) : rawBodyX;
      const rawHandsY = bestHand ? clampPct(bestHand.y) : Math.max(2, rawBodyY - 14);
      const rawFootX = bestFoot ? clampPct(bestFoot.x) : rawBodyX;
      const rawFootY = bestFoot ? clampPct(bestFoot.y) : Math.min(98, rawBodyY + 18);

      const prev = trackedPoseRef.current;
      const usePrev = prev.active && prev.source === 'mediapipe';
      const alpha = usePrev ? 0.72 : 1.0;
      const lerp = (a: number, b: number) => a + (b - a) * alpha;

      const skeleton: SkeletonSegment[] = [];
      for (const [aIdx, bIdx] of POSE_BONE_PAIRS) {
        if (isVisible(aIdx, 0.18) && isVisible(bIdx, 0.18)) {
          skeleton.push({
            from: { x: clampPct(lms[aIdx].x), y: clampPct(lms[aIdx].y) },
            to: { x: clampPct(lms[bIdx].x), y: clampPct(lms[bIdx].y) },
          });
        }
      }

      const visValues = [11, 12, 15, 16, 23, 24, 27, 28].map((i) => lms[i]?.visibility ?? 0.5);
      const avgVis = visValues.reduce((acc, v) => acc + v, 0) / visValues.length;

      return {
        active: true,
        hands: {
          x: usePrev ? lerp(prev.hands.x, rawHandsX) : rawHandsX,
          y: usePrev ? lerp(prev.hands.y, rawHandsY) : rawHandsY,
        },
        body: {
          x: usePrev ? lerp(prev.body.x, rawBodyX) : rawBodyX,
          y: usePrev ? lerp(prev.body.y, rawBodyY) : rawBodyY,
        },
        foot: {
          x: usePrev ? lerp(prev.foot.x, rawFootX) : rawFootX,
          y: usePrev ? lerp(prev.foot.y, rawFootY) : rawFootY,
        },
        confidence: Math.min(100, Math.round(avgVis * 100)),
        source: 'mediapipe',
        skeleton,
      };
    };

    const processCameraFrame = () => {
      if (stopped) return;
      const st = sensorStateRef.current;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (st.startMode !== 'camera_motion' || !video || video.readyState < 2 || video.videoWidth === 0) {
        return;
      }

      const nowMs = performance.now();

      // Primary Engine: Google MediaPipe PoseLandmarker (33 anatomical landmarks)
      const landmarker = poseLandmarkerRef.current;
      if (landmarker) {
        try {
          const monotonicTs = Math.max(lastMediaPipeTsRef.current + 1, Math.round(nowMs));
          lastMediaPipeTsRef.current = monotonicTs;
          const result = landmarker.detectForVideo(video, monotonicTs);
          if (result.landmarks && result.landmarks.length > 0) {
            const pose = extractFromLandmarks(result.landmarks[0]);
            if (pose) {
              const prevFootY = prevFootYRef.current;
              trackedPoseRef.current = pose;
              prevFootYRef.current = pose.foot.y;
              prevHandsYRef.current = pose.hands.y;

              if (nowMs - lastMotionUpdateRef.current > 30) {
                lastMotionUpdateRef.current = nowMs;
                setTrackedPose(pose);
              }

              triggerLineEvents(pose, prevFootY, nowMs);
              return;
            }
          }
        } catch {
          // Fall through cleanly to CV fallback for this frame
        }
      }

      // Secondary Fallback: Static-wall silhouette + motion heatmap (when MediaPipe is loading/offline or climber too far)
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const W = 120;
      const H = 180;
      canvas.width = W;
      canvas.height = H;
      ctx.drawImage(video, 0, 0, W, H);

      try {
        const frame = ctx.getImageData(0, 0, W, H);
        const data = frame.data;
        const totalPixels = W * H;

        const cameraSettled = nowMs - cameraStartTsRef.current > 500;
        if ((!bgFrameRef.current || bgFrameRef.current.length !== data.length) && cameraSettled) {
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

        const bgThresh = st.sensitivityPreset === 'high' ? 32 : st.sensitivityPreset === 'low' ? 58 : 44;
        const motThresh = st.sensitivityPreset === 'high' ? 22 : st.sensitivityPreset === 'low' ? 44 : 32;

        let movingPixelsCount = 0;

        for (let p = 0; p < totalPixels; p++) {
          const idx = p * 4;
          let diffBg = 0;
          if (bgData && bgData.length === data.length) {
            diffBg =
              Math.abs(data[idx] - bgData[idx]) +
              Math.abs(data[idx + 1] - bgData[idx + 1]) +
              Math.abs(data[idx + 2] - bgData[idx + 2]);
          }

          let diffMot = 0;
          if (prevData && prevData.length === data.length) {
            diffMot =
              Math.abs(data[idx] - prevData[idx]) +
              Math.abs(data[idx + 1] - prevData[idx + 1]) +
              Math.abs(data[idx + 2] - prevData[idx + 2]);
          }

          const hasMot = diffMot > motThresh;
          if (hasMot) movingPixelsCount++;

          const activeNow = diffBg > bgThresh || hasMot ? 1.0 : 0.0;
          heatmap[p] = activeNow > 0 ? 1.0 : heatmap[p] * 0.84;
        }

        // Only slowly adapt idle background when NOT armed or running so waiting climber is never erased
        if (bgData && !manualWallScanRef.current && !st.isRunning && st.countdownState === 'idle') {
          const rate = movingPixelsCount < totalPixels * 0.02 ? 0.06 : 0.015;
          const keep = 1 - rate;
          for (let p = 0; p < totalPixels; p++) {
            if (heatmap[p] < 0.85) {
              const i = p * 4;
              bgData[i] = Math.round(bgData[i] * keep + data[i] * rate);
              bgData[i + 1] = Math.round(bgData[i + 1] * keep + data[i + 1] * rate);
              bgData[i + 2] = Math.round(bgData[i + 2] * keep + data[i + 2] * rate);
            }
          }
        }

        const rawRowCounts = new Int32Array(H);
        const rawRowSumX = new Float32Array(H);
        const prevBodyX = trackedPoseRef.current.active ? (trackedPoseRef.current.body.x / 100) * W : W * 0.5;
        const restrictCorridor = trackedPoseRef.current.active;

        for (let y = 1; y < H - 1; y++) {
          let count = 0;
          let sx = 0;
          for (let x = 2; x < W - 2; x++) {
            if (restrictCorridor && Math.abs(x - prevBodyX) > W * 0.44) continue;
            if (heatmap[y * W + x] > 0.32) {
              count++;
              sx += x;
            }
          }
          rawRowCounts[y] = count;
          rawRowSumX[y] = sx;
        }

        const rowCounts = new Int32Array(H);
        const rowSumX = new Float32Array(H);
        for (let y = 1; y < H - 1; y++) {
          const c = rawRowCounts[y];
          if (c >= 2 || (c === 1 && (rawRowCounts[y - 1] >= 1 || rawRowCounts[y + 1] >= 1))) {
            rowCounts[y] = c;
            rowSumX[y] = rawRowSumX[y];
          }
        }

        let totalValidCount = 0;
        let bestClusterRows: number[] = [];
        let curCluster: number[] = [];
        let gap = 0;

        for (let y = 1; y < H - 1; y++) {
          if (rowCounts[y] >= 1) {
            curCluster.push(y);
            gap = 0;
          } else if (curCluster.length > 0) {
            gap++;
            if (gap > Math.round(H * 0.14)) {
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

        if (bestClusterRows.length >= 3 && totalValidCount >= 6) {
          const bandRows = Math.max(1, Math.ceil(bestClusterRows.length * 0.14));

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
          const alpha = prev.active ? 0.55 : 1.0;
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
            confidence: Math.min(100, Math.round((totalValidCount / 140) * 100)),
            source: 'fallback',
            skeleton: undefined,
          };

          const prevFootY = prevFootYRef.current;
          trackedPoseRef.current = nextPose;
          prevFootYRef.current = nextPose.foot.y;
          prevHandsYRef.current = nextPose.hands.y;

          if (nowMs - lastMotionUpdateRef.current > 35) {
            lastMotionUpdateRef.current = nowMs;
            setTrackedPose(nextPose);
          }

          triggerLineEvents(nextPose, prevFootY, nowMs);
        } else {
          if (trackedPoseRef.current.active && nowMs - lastMotionUpdateRef.current > 240) {
            lastMotionUpdateRef.current = nowMs;
            trackedPoseRef.current = EMPTY_POSE;
            prevFootYRef.current = null;
            prevHandsYRef.current = null;
            setTrackedPose(EMPTY_POSE);
          }
        }

        prevImageDataRef.current = new Uint8ClampedArray(data);
      } catch {
        // ignore canvas errors
      }
    };

    const camTimer = setInterval(processCameraFrame, 33);
    return () => {
      stopped = true;
      clearInterval(camTimer);
    };
  }, [cameraActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      if (micStreamRef.current) micStreamRef.current.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (poseLandmarkerRef.current) {
        try {
          poseLandmarkerRef.current.close();
        } catch {
          // ignore
        }
        poseLandmarkerRef.current = null;
      }
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

  const showGestureFeedback = (msg: string) => {
    setGestureToast(msg);
    if (gestureToastTimerRef.current) {
      clearTimeout(gestureToastTimerRef.current);
    }
    gestureToastTimerRef.current = setTimeout(() => {
      setGestureToast(null);
    }, 2600);
  };

  // Gesture 1: Swipe Left (1 finger) -> Save Run / Video (or Calibration)
  const handleGestureSave = async () => {
    if (isRunning) {
      showGestureFeedback('Nejprve dokončete výlez (stop), poté přejetím doleva uložíte.');
      return;
    }
    if (finishedRun) {
      saveRun(finishedRun);
      if (finishedRun.videoUrl) {
        showGestureFeedback('💾 Ukládám pokus i video...');
        await handleDownloadVideoDirect();
        showGestureFeedback(`✓ Pokus (${finishedRun.totalTime.toFixed(3)}s) i video uloženy!`);
      } else {
        showGestureFeedback(`✓ Pokus (${finishedRun.totalTime.toFixed(3)}s) uložen!`);
      }
      return;
    }
    if (isAiCameraMode && isCalibrating) {
      saveCalibrationExplicit();
      showGestureFeedback(`✓ Kalibrace linií uložena`);
      return;
    }
    showGestureFeedback('Žádný dokončený pokus k uložení.');
  };

  // Gesture 2: Two-finger Swipe Right -> Delete Run & Video
  const handleGestureDelete = () => {
    if (isRunning) {
      resetTimer();
      recordedChunksRef.current = [];
      setFinishedRun(null);
      setRecordedVideoUrl(null);
      showGestureFeedback('🗑️ Rozběhnutý pokus zrušen a smazán');
      return;
    }
    if (finishedRun) {
      handleDeleteRunAttempt();
      setElapsedMs(0);
      setRecordedVideoUrl(null);
      recordedChunksRef.current = [];
      showGestureFeedback('🗑️ Pokus i videozáznam smazány');
      return;
    }
    showGestureFeedback('Žádný pokus ke smazání.');
  };

  // Gesture 3: Swipe Up (1 finger) -> Restart Timer
  const handleGestureRestart = () => {
    resetTimer();
    setFinishedRun(null);
    setRecordedVideoUrl(null);
    setLastLineTrigger(null);
    split1TimeRef.current = null;
    split2TimeRef.current = null;
    midSplitTimeRef.current = null;
    prevFootYRef.current = null;
    prevHandsYRef.current = null;
    showGestureFeedback('🔄 Časomíra restartována (00.000s)');
  };

  // Gesture 4: Swipe Down (1 finger) -> Exit Fullscreen Camera / Exit Camera Mode
  const handleGestureExitMode = () => {
    if (isCameraExpanded) {
      setIsCameraExpanded(false);
      showGestureFeedback('↙️ Zmenšeno z celé obrazovky');
      return;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    resetTrackingBuffers();
    setCameraActive(false);
    setIsCalibrating(false);
    if (startMode === 'camera_motion') {
      setStartMode('manual');
    }
    showGestureFeedback('📷 Režim kamery ukončen');
  };

  const handleViewportTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (
      draggingLine ||
      justDraggedRef.current ||
      target?.closest('[data-calibration-line="true"]') ||
      target?.closest('[data-no-gesture="true"]')
    ) {
      touchGestureRef.current.active = false;
      return;
    }

    const touches = e.touches;
    const state = touchGestureRef.current;

    if (touches.length === 1) {
      const t0 = touches[0];
      state.active = true;
      state.maxTouches = 1;
      state.startX = t0.clientX;
      state.startY = t0.clientY;
      state.lastX = t0.clientX;
      state.lastY = t0.clientY;
      state.twoStartX = t0.clientX;
      state.twoStartY = t0.clientY;
      state.twoLastX = t0.clientX;
      state.twoLastY = t0.clientY;
    } else if (touches.length >= 2) {
      const midX = (touches[0].clientX + touches[1].clientX) / 2;
      const midY = (touches[0].clientY + touches[1].clientY) / 2;
      state.active = true;
      state.maxTouches = Math.max(state.maxTouches, touches.length);
      state.twoStartX = midX;
      state.twoStartY = midY;
      state.twoLastX = midX;
      state.twoLastY = midY;
    }
  };

  const handleViewportTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const state = touchGestureRef.current;
    if (!state.active || draggingLine) return;

    const touches = e.touches;
    state.maxTouches = Math.max(state.maxTouches, touches.length);

    if (touches.length >= 2) {
      const midX = (touches[0].clientX + touches[1].clientX) / 2;
      const midY = (touches[0].clientY + touches[1].clientY) / 2;
      state.twoLastX = midX;
      state.twoLastY = midY;
      const dx = midX - state.twoStartX;
      const dy = midY - state.twoStartY;
      if (dx > 36 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        setSwipePreview('delete');
      } else {
        setSwipePreview(null);
      }
      return;
    }

    if (touches.length === 1 && state.maxTouches === 1) {
      const t0 = touches[0];
      state.lastX = t0.clientX;
      state.lastY = t0.clientY;
      const dx = t0.clientX - state.startX;
      const dy = t0.clientY - state.startY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (absX > 36 && absX > absY * 1.2) {
        setSwipePreview(dx < 0 ? 'save' : 'need_two_fingers');
      } else if (absY > 36 && absY > absX * 1.2) {
        setSwipePreview(dy < 0 ? 'restart' : 'exit');
      } else {
        setSwipePreview(null);
      }
    }
  };

  const handleViewportTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const state = touchGestureRef.current;
    if (!state.active) return;

    // Wait until all fingers lift
    if (e.touches.length > 0) return;

    state.active = false;
    setSwipePreview(null);

    if (draggingLine || justDraggedRef.current) return;

    if (state.maxTouches >= 2) {
      const dx = state.twoLastX - state.twoStartX;
      const dy = state.twoLastY - state.twoStartY;
      if (Math.hypot(dx, dy) > 22) {
        justSwipedRef.current = true;
        setTimeout(() => {
          justSwipedRef.current = false;
        }, 260);
      }
      if (dx >= 60 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        handleGestureDelete();
      }
      return;
    }

    if (state.maxTouches === 1) {
      const dx = state.lastX - state.startX;
      const dy = state.lastY - state.startY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (Math.hypot(dx, dy) > 22) {
        justSwipedRef.current = true;
        setTimeout(() => {
          justSwipedRef.current = false;
        }, 260);
      }

      if (absX >= 65 && absX > absY * 1.25) {
        if (dx < 0) {
          void handleGestureSave();
        } else {
          showGestureFeedback('Pro smazání přejeďte DOPRAVA DVĚMA prsty 👉👉');
        }
      } else if (absY >= 65 && absY > absX * 1.25) {
        if (dy < 0) {
          handleGestureRestart();
        } else {
          handleGestureExitMode();
        }
      }
    }
  };

  const handleViewportTouchCancel = () => {
    touchGestureRef.current.active = false;
    setSwipePreview(null);
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

        {/* Start Mode Icons Grid: Manual -> Beeps -> AI Camera -> AI Sound */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/80 dark:bg-slate-900 rounded-2xl text-xs font-bold">
          {[
            {
              id: 'manual' as StartMode,
              label: lang === 'cs' ? 'Ruční' : lang === 'de' ? 'Manuell' : 'Manual',
            },
            {
              id: 'ifsc_countdown' as StartMode,
              label: lang === 'cs' ? 'Pípnutí' : lang === 'de' ? 'Piepton' : 'Beeps',
            },
            { id: 'camera_motion' as StartMode, label: t.startCamera },
            { id: 'sound_trigger' as StartMode, label: t.startSound },
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
                  onClick={() => {
                    const next = !isCalibrating;
                    setIsCalibrating(next);
                    if (next) setShowGuides(true);
                  }}
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

            {/* Fullscreen Camera Expansion (fills screen between TopBar & BottomTabBar) */}
            <button
              type="button"
              onClick={() => setIsCameraExpanded((prev) => !prev)}
              className={`min-h-[38px] px-2.5 sm:px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1 border ${
                isCameraExpanded
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                  : 'bg-slate-900 dark:bg-slate-800 text-white border-slate-700 hover:bg-slate-800'
              }`}
              title="Roztáhnout kameru přes celý displej (kromě horní lišty a spodní navigace)"
            >
              {isCameraExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Expand className="w-3.5 h-3.5" />}
              <span>{isCameraExpanded ? 'Zmenšit' : 'Celý displej'}</span>
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
                👆 Chyťte a přetáhněte prstem kteroukoli linii přímo na obraze kamery (nebo klepněte):
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
        <div
          ref={cameraContainerRef}
          className={
            isCameraExpanded
              ? 'fixed top-16 sm:top-20 bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0 left-0 right-0 z-30 bg-black flex flex-col overflow-hidden'
              : 'space-y-2'
          }
        >
          {/* Status Bar OUTSIDE the video frame (removed cleanly when expanded fullscreen) */}
          {!isCameraExpanded && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 border-slate-800 text-xs p-2.5 rounded-2xl border">
              <div className="flex items-center gap-2">
                {isRecording ? (
                  <div className="px-2.5 py-1 rounded-full bg-red-600 text-white font-mono font-black text-xs uppercase flex items-center gap-1.5 shadow-sm animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <span>REC {(elapsedMs / 1000).toFixed(1)}s</span>
                  </div>
                ) : (
                  <div className="px-2.5 py-1 rounded-full bg-slate-800 text-emerald-400 font-mono text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>HLEDÁČEK ({facingMode === 'environment' ? 'Zadní' : 'Přední'})</span>
                  </div>
                )}

                {isAiCameraMode && (
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                      poseEngineState === 'mediapipe'
                        ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                        : poseEngineState === 'loading'
                        ? 'bg-amber-950/70 border-amber-500/40 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {poseEngineState === 'mediapipe'
                      ? '🧠 AI Kostra'
                      : poseEngineState === 'loading'
                      ? '⏳ Načítám AI...'
                      : 'Záložní detekce'}
                  </span>
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

              {/* Real-time AI Kamera Limb Coordinates */}
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
          )}

          {/* ACTIVE CAMERA HUD VIEWPORT – Supports Fullscreen between TopBar & BottomTabBar + Touch Gestures */}
          <div
            ref={viewportRef}
            onClick={handleViewfinderClick}
            onTouchStart={handleViewportTouchStart}
            onTouchMove={handleViewportTouchMove}
            onTouchEnd={handleViewportTouchEnd}
            onTouchCancel={handleViewportTouchCancel}
            className={`relative bg-black overflow-hidden flex items-center justify-center select-none touch-none transition-all duration-300 group cursor-pointer ${
              isCameraExpanded
                ? 'flex-1 min-h-0 w-full rounded-none border-0'
                : cameraFit === 'contain'
                ? 'w-full h-[68vh] min-h-[520px] max-h-[820px] rounded-3xl border-2 border-slate-800 shadow-2xl hover:ring-2 hover:ring-red-500/40'
                : 'w-full aspect-[4/3] sm:aspect-video rounded-3xl border-2 border-slate-800 shadow-2xl hover:ring-2 hover:ring-red-500/40'
            }`}
          >
            <video
              ref={setVideoElement}
              onLoadedMetadata={recomputeVideoBox}
              onResize={recomputeVideoBox}
              playsInline
              muted
              autoPlay
              className={`w-full h-full transition-all duration-200 ${
                cameraFit === 'contain' ? 'object-contain bg-black' : 'object-cover'
              }`}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Live Swipe Direction Preview Badge */}
            {swipePreview && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm font-black shadow-2xl border backdrop-blur-md flex items-center gap-2 ${
                    swipePreview === 'save'
                      ? 'bg-emerald-600/95 text-white border-emerald-300'
                      : swipePreview === 'delete'
                      ? 'bg-red-600/95 text-white border-red-300'
                      : swipePreview === 'restart'
                      ? 'bg-amber-500/95 text-slate-950 border-amber-200'
                      : swipePreview === 'need_two_fingers'
                      ? 'bg-slate-900/95 text-amber-300 border-amber-500/60'
                      : 'bg-slate-900/95 text-white border-white/30'
                  }`}
                >
                  {swipePreview === 'save' && (
                    <>
                      <ArrowLeft className="w-4 h-4" />
                      <span>Uložit pokus</span>
                    </>
                  )}
                  {swipePreview === 'delete' && (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      <span>Smazat pokus (2 prsty)</span>
                    </>
                  )}
                  {swipePreview === 'need_two_fingers' && (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      <span>Pro smazání použijte 2 prsty!</span>
                    </>
                  )}
                  {swipePreview === 'restart' && (
                    <>
                      <ArrowUp className="w-4 h-4" />
                      <span>Restart časomíry</span>
                    </>
                  )}
                  {swipePreview === 'exit' && (
                    <>
                      <ArrowDown className="w-4 h-4" />
                      <span>{isCameraExpanded ? 'Zmenšit kameru' : 'Ukončit režim kamery'}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Gesture Action Toast Feedback */}
            {gestureToast && !swipePreview && (
              <div className="absolute top-12 left-3 right-3 flex justify-center pointer-events-none z-40">
                <div className="px-3.5 py-1.5 rounded-full bg-slate-950/90 text-white text-xs font-bold border border-white/25 shadow-xl backdrop-blur-md">
                  {gestureToast}
                </div>
              </div>
            )}

            {/* Quick Tap Action Floating Badge at Top (hidden during fullscreen expanded mode and calibration) */}
            {!isCameraExpanded && !(isAiCameraMode && isCalibrating) && (
              <div className="absolute top-3 left-3 right-3 flex items-center justify-center pointer-events-none z-20">
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
              </div>
            )}

            {/* Floating Expand/Collapse Button right inside Viewfinder for easy 1-tap reach on phone */}
            {!isCameraExpanded && (
              <button
                type="button"
                data-no-gesture="true"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCameraExpanded(true);
                }}
                className="absolute bottom-3 right-3 z-30 px-2.5 py-1.5 rounded-xl bg-slate-950/85 hover:bg-slate-900 text-white text-[11px] font-bold border border-white/20 shadow-lg backdrop-blur-sm flex items-center gap-1.5 transition-all active:scale-95"
                title="Roztáhnout kameru přes celý displej"
              >
                <Expand className="w-3.5 h-3.5 text-emerald-400" />
                <span>Celý displej</span>
              </button>
            )}

            {/* AI Kamera Overlay ONLY: Aligned 1:1 with rendered video pixels */}
            {isAiCameraMode && showGuides && (
              <div
                ref={lineDragBoxRef}
                style={{
                  left: `${videoBoxRect.left}%`,
                  top: `${videoBoxRect.top}%`,
                  width: `${videoBoxRect.width}%`,
                  height: `${videoBoxRect.height}%`,
                }}
                className="absolute pointer-events-none z-10"
              >
                {/* Subtle vertical center guide */}
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px border-l border-dashed border-white/15" />

                {/* 🔴 TOP LINE: Finish (Red Hands Dot) - Draggable when calibrating */}
                <div
                  data-calibration-line="true"
                  style={{ top: `${finishZoneY}%` }}
                  onPointerDown={(e) => handleLinePointerDown('hand', e)}
                  onPointerMove={(e) => handleLinePointerMove('hand', e)}
                  onPointerUp={(e) => handleLinePointerUp('hand', e)}
                  onPointerCancel={(e) => handleLinePointerUp('hand', e)}
                  onClick={(e) => {
                    if (isCalibrating) e.stopPropagation();
                  }}
                  className={`absolute left-2 right-2 -translate-y-1/2 py-4 flex items-center ${
                    isCalibrating
                      ? 'pointer-events-auto cursor-ns-resize touch-none'
                      : 'pointer-events-none'
                  }`}
                >
                  <div
                    className={`w-full border-t-2 relative transition-shadow ${
                      draggingLine === 'hand'
                        ? 'border-red-300 shadow-[0_0_20px_rgba(248,113,113,1)]'
                        : lastLineTrigger === 'finish'
                        ? 'border-red-400 shadow-[0_0_16px_rgba(248,113,113,0.95)]'
                        : isCalibrating
                        ? 'border-red-500'
                        : 'border-dashed border-red-500/90'
                    }`}
                  >
                    <div className="flex items-center justify-between -translate-y-1/2 px-1">
                      <span
                        className={`px-2 py-0.5 rounded-full bg-red-950/90 border text-red-100 text-[10px] font-bold shadow-md flex items-center gap-1.5 transition-transform ${
                          draggingLine === 'hand'
                            ? 'border-white scale-105 ring-2 ring-red-400'
                            : isCalibrating
                            ? 'border-red-400 ring-1 ring-red-400/50'
                            : 'border-red-500/60'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span>CÍL – Ruka ({routeDef.heightMeters}m)</span>
                        {isCalibrating && <span className="text-red-300 font-black">↕</span>}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-black/85 text-red-300 font-mono text-[9px] border border-red-500/50">
                        Y:{finishZoneY}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* 🔵 MIDDLE LINE: Split (Red Hands Dot) - Draggable when calibrating */}
                <div
                  data-calibration-line="true"
                  style={{ top: `${midZoneY}%` }}
                  onPointerDown={(e) => handleLinePointerDown('mid', e)}
                  onPointerMove={(e) => handleLinePointerMove('mid', e)}
                  onPointerUp={(e) => handleLinePointerUp('mid', e)}
                  onPointerCancel={(e) => handleLinePointerUp('mid', e)}
                  onClick={(e) => {
                    if (isCalibrating) e.stopPropagation();
                  }}
                  className={`absolute left-2 right-2 -translate-y-1/2 py-4 flex items-center ${
                    isCalibrating
                      ? 'pointer-events-auto cursor-ns-resize touch-none'
                      : 'pointer-events-none'
                  }`}
                >
                  <div
                    className={`w-full border-t-2 relative transition-shadow ${
                      draggingLine === 'mid'
                        ? 'border-blue-200 shadow-[0_0_20px_rgba(96,165,250,1)]'
                        : lastLineTrigger === 'mid' || midSplitTime !== null
                        ? 'border-blue-300 shadow-[0_0_16px_rgba(96,165,250,0.95)]'
                        : isCalibrating
                        ? 'border-blue-400'
                        : 'border-dashed border-blue-400/90'
                    }`}
                  >
                    <div className="flex items-center justify-between -translate-y-1/2 px-1">
                      <span
                        className={`px-2 py-0.5 rounded-full bg-blue-950/90 border text-blue-100 text-[10px] font-bold shadow-md flex items-center gap-1.5 transition-transform ${
                          draggingLine === 'mid'
                            ? 'border-white scale-105 ring-2 ring-blue-400'
                            : isCalibrating
                            ? 'border-blue-400 ring-1 ring-blue-400/50'
                            : 'border-blue-500/60'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        <span>
                          STŘED – Mezičas ({isYouthCategory ? '5m' : '7.5m'})
                          {midSplitTime !== null ? ` · ${midSplitTime.toFixed(2)}s` : ''}
                        </span>
                        {isCalibrating && <span className="text-blue-300 font-black">↕</span>}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-black/85 text-blue-300 font-mono text-[9px] border border-blue-500/50">
                        Y:{midZoneY}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* 🟢 BOTTOM LINE: Start (Green Foot Dot) - Draggable when calibrating */}
                <div
                  data-calibration-line="true"
                  style={{ top: `${startZoneY}%` }}
                  onPointerDown={(e) => handleLinePointerDown('foot', e)}
                  onPointerMove={(e) => handleLinePointerMove('foot', e)}
                  onPointerUp={(e) => handleLinePointerUp('foot', e)}
                  onPointerCancel={(e) => handleLinePointerUp('foot', e)}
                  onClick={(e) => {
                    if (isCalibrating) e.stopPropagation();
                  }}
                  className={`absolute left-2 right-2 -translate-y-1/2 py-4 flex items-center ${
                    isCalibrating
                      ? 'pointer-events-auto cursor-ns-resize touch-none'
                      : 'pointer-events-none'
                  }`}
                >
                  <div
                    className={`w-full border-t-2 relative transition-shadow ${
                      draggingLine === 'foot'
                        ? 'border-emerald-200 shadow-[0_0_20px_rgba(52,211,153,1)]'
                        : lastLineTrigger === 'start'
                        ? 'border-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.95)]'
                        : isCalibrating
                        ? 'border-emerald-400'
                        : 'border-dashed border-emerald-400/90'
                    }`}
                  >
                    <div className="flex items-center justify-between -translate-y-1/2 px-1">
                      <span
                        className={`px-2 py-0.5 rounded-full bg-emerald-950/90 border text-emerald-100 text-[10px] font-bold shadow-md flex items-center gap-1.5 transition-transform ${
                          draggingLine === 'foot'
                            ? 'border-white scale-105 ring-2 ring-emerald-400'
                            : isCalibrating
                            ? 'border-emerald-400 ring-1 ring-emerald-400/50'
                            : 'border-emerald-500/60'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>START – Noha</span>
                        {isCalibrating && <span className="text-emerald-300 font-black">↕</span>}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-black/85 text-emerald-300 font-mono text-[9px] border border-emerald-500/50">
                        Y:{startZoneY}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live Continuous Climber Pose Skeleton & Colored Tracking Dots */}
                {trackedPose.active && (
                  <>
                    {/* Anatomical MediaPipe skeleton or body-axis fallback line */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {trackedPose.skeleton && trackedPose.skeleton.length > 0 ? (
                        trackedPose.skeleton.map((seg, i) => (
                          <line
                            key={i}
                            x1={seg.from.x}
                            y1={seg.from.y}
                            x2={seg.to.x}
                            y2={seg.to.y}
                            stroke="rgba(255,255,255,0.75)"
                            strokeWidth="0.7"
                            strokeLinecap="round"
                          />
                        ))
                      ) : (
                        <>
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
                        </>
                      )}
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

            {/* Expanded Mode Overlay Controls: Finished Run Quick Card + Calibrate Pill */}
            {isCameraExpanded && isAiCameraMode && isCalibrating && (
              <div
                data-no-gesture="true"
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-3 left-3 right-3 z-30 p-2 rounded-2xl bg-slate-950/90 border border-white/15 backdrop-blur-md flex flex-wrap items-center justify-between gap-2 text-[11px]"
              >
                <span className="text-slate-300 font-bold">
                  Přetáhněte linie prstem ({finishZoneY}% / {midZoneY}% / {startZoneY}%)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={saveCalibrationExplicit}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold"
                  >
                    Uložit linie
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCalibrating(false)}
                    className="px-2 py-1 rounded-lg bg-slate-800 text-slate-200 font-bold"
                  >
                    Hotovo
                  </button>
                </div>
              </div>
            )}

            {isCameraExpanded && finishedRun && !isRunning && (
              <div
                data-no-gesture="true"
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-3 left-3 right-3 z-30 p-3 rounded-2xl bg-slate-950/90 border border-emerald-500/40 backdrop-blur-md flex flex-wrap items-center justify-between gap-2 shadow-2xl"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-lg font-mono font-black text-white leading-none">
                      {finishedRun.totalTime.toFixed(3)}s
                    </div>
                    <div className="text-[10px] text-slate-300 font-mono mt-0.5">
                      {finishedRun.splits.split1.toFixed(2)}s · {finishedRun.splits.split2.toFixed(2)}s ·{' '}
                      {finishedRun.splits.split3.toFixed(2)}s
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => void handleGestureSave()}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Uložit</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGestureDelete}
                    className="px-2.5 py-1.5 rounded-xl bg-red-600/80 text-white flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Smazat</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGestureRestart}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-white flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Helper Banner OUTSIDE the video frame (no hint strip in fullscreen expanded mode) */}
          {!isCameraExpanded && (
            <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
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
                      {poseEngineState === 'mediapipe'
                        ? '● AI Kostra (MediaPipe: Noha / Tělo / Ruka)'
                        : poseEngineState === 'loading'
                        ? '● Načítám AI rozpoznávání postavy...'
                        : '● Záložní detekce pohybu'}
                    </span>
                  ) : (
                    <span>Pouze videozáznam bez AI detekce</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                <span>Gesta na kameře:</span>
                <span>← Doleva: Uložit</span>
                <span>2× → Dvěma prsty doprava: Smazat</span>
                <span>↑ Nahoru: Restart</span>
                <span>↓ Dolů: Vyskočit z režimu</span>
              </div>
            </div>
          )}
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
                      disabled={isExportingVideo}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-red-600 hover:bg-slate-200 transition-colors flex items-center gap-1 text-[11px] font-bold disabled:opacity-60"
                      title="Uložit video s běžícím časem v pravém horním rohu do zařízení"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isExportingVideo ? 'Připravuji...' : '💾 Do zařízení'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleShareVideoToCloud}
                      disabled={isExportingVideo}
                      className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1 text-[11px] font-bold disabled:opacity-60"
                      title="Uložit nebo sdílet video s časem na Google Disk či OneDrive"
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
                  onPlay={() => setIsPlaybackPlaying(true)}
                  onPause={() => {
                    setIsPlaybackPlaying(false);
                    if (playbackVideoRef.current) {
                      setPlaybackVideoSec(playbackVideoRef.current.currentTime);
                    }
                  }}
                  onEnded={() => {
                    setIsPlaybackPlaying(false);
                    setPlaybackVideoSec(finishedRun.totalTime);
                  }}
                  onTimeUpdate={() => {
                    if (playbackVideoRef.current) {
                      setPlaybackVideoSec(playbackVideoRef.current.currentTime);
                    }
                  }}
                  onSeeked={() => {
                    if (playbackVideoRef.current) {
                      setPlaybackVideoSec(playbackVideoRef.current.currentTime);
                    }
                  }}
                  className="w-full h-full object-contain"
                />
                {/* Top-left Live Running / Final Chrono Overlay */}
                {(() => {
                  const vid = playbackVideoRef.current;
                  const vidDur = vid?.duration;
                  let mappedSec = playbackVideoSec;
                  if (vidDur && Number.isFinite(vidDur) && vidDur > 0.25 && vidDur < finishedRun.totalTime) {
                    mappedSec = (playbackVideoSec / vidDur) * finishedRun.totalTime;
                  }
                  const showLiveRunning = isPlaybackPlaying || (playbackVideoSec > 0.01 && !vid?.ended);
                  const displaySec = showLiveRunning
                    ? Math.min(finishedRun.totalTime, Math.max(0, mappedSec))
                    : finishedRun.totalTime;
                  const isAtFinish = !showLiveRunning || displaySec >= finishedRun.totalTime - 0.012;
                  const formatted = `${Math.floor(displaySec)
                    .toString()
                    .padStart(2, '0')}.${Math.floor((displaySec % 1) * 1000)
                    .toString()
                    .padStart(3, '0')} s`;

                  return (
                    <div
                      className={`pointer-events-none absolute top-3 right-3 px-2.5 py-1.5 rounded-xl bg-slate-950/85 border border-l-4 shadow-lg backdrop-blur-sm ${
                        isAtFinish
                          ? 'border-emerald-400/50 border-l-emerald-500'
                          : 'border-white/20 border-l-red-500'
                      }`}
                    >
                      <div
                        className={`text-[9px] font-bold uppercase tracking-wider leading-tight ${
                          isAtFinish ? 'text-emerald-300' : 'text-slate-300'
                        }`}
                      >
                        {(finishedRun.climberName || 'LEZEC').toUpperCase()} ·{' '}
                        {finishedRun.routeCategory === 'adults_15m'
                          ? '15m'
                          : finishedRun.routeCategory === 'youth_u15'
                          ? '10m U15'
                          : '10m U13'}
                        {isAtFinish ? ' · CÍL' : ''}
                      </div>
                      <div className="text-lg sm:text-xl font-mono font-black text-white tabular-nums leading-tight">
                        {formatted}
                      </div>
                    </div>
                  );
                })()}
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

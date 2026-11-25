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
  ArrowDown,
  Lock,
  Unlock,
  Zap,
  Users,
  ChevronDown,
  UserPlus,
  Loader2
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
import {
  RouteCategory,
  SpeedRun,
  VideoTimingMeta,
  VideoCalibrationLines,
  RecordedPoseSample,
} from '../types/climbing';
import {
  saveRun,
  getStoredRuns,
  getUserProfile,
  getAllProfiles,
  setActiveProfileId,
  createProfile,
  updateRunVideo,
  removeRunVideo,
  deleteRun,
  UserProfile,
  AppSettings,
  VideoTimeOverlayMode,
  getAppSettings,
} from '../utils/storage';
import { ROUTE_DEFINITIONS } from '../data/speedWallData';
import { Language, TRANSLATIONS } from '../utils/i18n';

export interface CategoryCalibration {
  finishY: number; // percentage from top (e.g. 6% for 15m, 38% for U15/U13)
  split2Y: number; // 2nd split line: 10m (adults) or 6.6m (youth)
  split1Y: number; // 1st split line: 5m (adults) or 3.3m (youth)
  startY: number;  // percentage from top (e.g. 82%)
  footPadX: number; // horizontal % for foot hold sensor (default 48%)
  handPadX: number; // horizontal % for top finish pad sensor (default 50%)
  padFocusMode: boolean; // if true, watches strictly foot pad & hand pad for 0 false triggers
}

export const DEFAULT_CATEGORY_CALIBRATIONS: Record<RouteCategory, CategoryCalibration> = {
  adults_15m: { finishY: 6, split2Y: 32, split1Y: 58, startY: 82, footPadX: 48, handPadX: 50, padFocusMode: true },
  youth_u15: { finishY: 38, split2Y: 53, split1Y: 68, startY: 82, footPadX: 48, handPadX: 50, padFocusMode: true },
  youth_u13: { finishY: 38, split2Y: 53, split1Y: 68, startY: 82, footPadX: 48, handPadX: 50, padFocusMode: true },
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
          split2Y: Number(parsed.adults_15m?.split2Y ?? DEFAULT_CATEGORY_CALIBRATIONS.adults_15m.split2Y),
          split1Y: Number(parsed.adults_15m?.split1Y ?? DEFAULT_CATEGORY_CALIBRATIONS.adults_15m.split1Y),
          startY: Number(parsed.adults_15m?.startY ?? DEFAULT_CATEGORY_CALIBRATIONS.adults_15m.startY),
          footPadX: Number(parsed.adults_15m?.footPadX ?? DEFAULT_CATEGORY_CALIBRATIONS.adults_15m.footPadX),
          handPadX: Number(parsed.adults_15m?.handPadX ?? DEFAULT_CATEGORY_CALIBRATIONS.adults_15m.handPadX),
          padFocusMode: parsed.adults_15m?.padFocusMode ?? true,
        },
        youth_u15: {
          finishY: Number(parsed.youth_u15?.finishY ?? DEFAULT_CATEGORY_CALIBRATIONS.youth_u15.finishY),
          split2Y: Number(parsed.youth_u15?.split2Y ?? DEFAULT_CATEGORY_CALIBRATIONS.youth_u15.split2Y),
          split1Y: Number(parsed.youth_u15?.split1Y ?? DEFAULT_CATEGORY_CALIBRATIONS.youth_u15.split1Y),
          startY: Number(parsed.youth_u15?.startY ?? DEFAULT_CATEGORY_CALIBRATIONS.youth_u15.startY),
          footPadX: Number(parsed.youth_u15?.footPadX ?? DEFAULT_CATEGORY_CALIBRATIONS.youth_u15.footPadX),
          handPadX: Number(parsed.youth_u15?.handPadX ?? DEFAULT_CATEGORY_CALIBRATIONS.youth_u15.handPadX),
          padFocusMode: parsed.youth_u15?.padFocusMode ?? true,
        },
        youth_u13: {
          finishY: Number(parsed.youth_u13?.finishY ?? DEFAULT_CATEGORY_CALIBRATIONS.youth_u13.finishY),
          split2Y: Number(parsed.youth_u13?.split2Y ?? DEFAULT_CATEGORY_CALIBRATIONS.youth_u13.split2Y),
          split1Y: Number(parsed.youth_u13?.split1Y ?? DEFAULT_CATEGORY_CALIBRATIONS.youth_u13.split1Y),
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
  appSettings?: AppSettings;
  onProfileSwitched?: (profile: UserProfile) => void;
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
  appSettings,
  onProfileSwitched,
  onDeleteRun,
}) => {
  const profile = userProfile || getUserProfile();
  const effectiveSettings = appSettings || getAppSettings();
  const t = TRANSLATIONS[lang];
  const routeDef = ROUTE_DEFINITIONS[currentCategory];

  // Unified Pre-configured Settings (controlled from SettingsModal)
  const recordVideoOnRun = effectiveSettings.recordVideoOnRun;
  const videoTargetFps = effectiveSettings.videoFps;
  const includePoseInVideo = effectiveSettings.includePoseInVideo;
  const videoTimeMode = effectiveSettings.videoTimeMode;
  const videoTrimMarginSec = effectiveSettings.videoTrimMarginSec;
  const autoSaveVideoOnFinish = effectiveSettings.autoSaveVideoOnFinish;
  const ifscStartWithCamera = effectiveSettings.ifscStartWithCamera;
  const sensitivityPreset = effectiveSettings.sensitivityPreset;
  const showGuides = effectiveSettings.showGuides;
  const cameraFit = effectiveSettings.cameraFit;
  const showTimerHints = effectiveSettings.showTimerHints;

  // Quick 1-Tap Climber Switcher
  const [climberProfiles, setClimberProfiles] = useState<UserProfile[]>(getAllProfiles);
  const [showClimberSwitcher, setShowClimberSwitcher] = useState<boolean>(false);
  const [newClimberName, setNewClimberName] = useState<string>('');

  // Timer states
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [countdownState, setCountdownState] = useState<CountdownState>('idle');
  const [startMode, setStartMode] = useState<StartMode>(() => effectiveSettings.defaultStartMode);

  // Splits & Reaction
  const [split1Time, setSplit1Time] = useState<number | null>(null);
  const [split2Time, setSplit2Time] = useState<number | null>(null);
  const [reactionTime, setReactionTime] = useState<number>(0.138);
  const [isFalseStart, setIsFalseStart] = useState<boolean>(false);
  const [falseStartReason, setFalseStartReason] = useState<string | null>(null);
  const [finishedRun, setFinishedRun] = useState<SpeedRun | null>(null);

  // Active Camera & Video Recording
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(() => effectiveSettings.defaultFacingMode);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [videoPlaybackRate, setVideoPlaybackRate] = useState<number>(1.0);
  const [playbackVideoSec, setPlaybackVideoSec] = useState<number>(0);
  const [isPlaybackPlaying, setIsPlaybackPlaying] = useState<boolean>(false);
  const [showDeleteVideoConfirm, setShowDeleteVideoConfirm] = useState<boolean>(false);
  const [showDeleteRunConfirm, setShowDeleteRunConfirm] = useState<boolean>(false);

  // Viewfinder & Positioning Helpers (only active in AI Kamera mode)
  const [isCameraExpanded, setIsCameraExpanded] = useState<boolean>(false);
  const [gestureToast, setGestureToast] = useState<string | null>(null);
  const [swipePreview, setSwipePreview] = useState<
    'save' | 'delete' | 'restart' | 'exit' | 'need_two_fingers' | null
  >(null);

  // Per-category Horizontal Trigger Lines (Bottom Foot, 5m/3.3m Split 1, 10m/6.6m Split 2, Top Finish Hand)
  const [calibrations, setCalibrations] = useState<Record<RouteCategory, CategoryCalibration>>(getStoredCalibrations);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [calibrationSavedToast, setCalibrationSavedToast] = useState<string | null>(null);

  // Active line coordinates dynamically derived from active category
  const activeCalibration = calibrations[currentCategory] || DEFAULT_CATEGORY_CALIBRATIONS[currentCategory];
  const finishZoneY = activeCalibration.finishY;
  const split2ZoneY = activeCalibration.split2Y ?? (currentCategory === 'adults_15m' ? 32 : 53);
  const split1ZoneY = activeCalibration.split1Y ?? (currentCategory === 'adults_15m' ? 58 : 68);
  const startZoneY = activeCalibration.startY;

  // Active inline long-press editor & live drag state
  const [editingLine, setEditingLine] = useState<'foot' | 'split1' | 'split2' | 'hand' | null>(null);
  const [draggingLine, setDraggingLine] = useState<'foot' | 'split1' | 'split2' | 'hand' | null>(null);

  // Video saving feedback & background queue state
  const [videoShareFeedback, setVideoShareFeedback] = useState<string | null>(null);
  const [showCloudPicker, setShowCloudPicker] = useState<boolean>(false);
  const [actualCameraFps, setActualCameraFps] = useState<number | null>(null);
  const [isPostRollRecording, setIsPostRollRecording] = useState<boolean>(false);
  const [postRollRemainingSec, setPostRollRemainingSec] = useState<number>(0);
  const [bgExportUi, setBgExportUi] = useState<{
    pendingCount: number;
    activeLabel: string | null;
    finishedToast: string | null;
    readyShareJob: {
      id: string;
      filename: string;
      blob: Blob;
      mimeType: string;
      run: SpeedRun;
    } | null;
  }>({
    pendingCount: 0,
    activeLabel: null,
    finishedToast: null,
    readyShareJob: null,
  });
  const [videoBoxRect, setVideoBoxRect] = useState<{ left: number; top: number; width: number; height: number }>({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
  });

  // Real-time AI Climber Pose Tracking (Green = Foot, Blue = Torso, Red = Hands) + Tap-to-Lock
  const [trackedPose, setTrackedPose] = useState<TrackedPose>(EMPTY_POSE);
  const [secondaryPoses, setSecondaryPoses] = useState<TrackedPoint[]>([]);
  const [lockedClimber, setLockedClimber] = useState<{ laneX: number; lastX: number; lastY: number } | null>(null);
  const [isPickingClimber, setIsPickingClimber] = useState<boolean>(false);
  const [poseEngineState, setPoseEngineState] = useState<'idle' | 'loading' | 'mediapipe' | 'fallback'>('idle');
  const [wallBgReady, setWallBgReady] = useState<boolean>(false);
  const [lastLineTrigger, setLastLineTrigger] = useState<'start' | 'split1' | 'split2' | 'finish' | null>(null);

  const soundThreshold = sensitivityPreset === 'low' ? 62 : sensitivityPreset === 'high' ? 32 : 46;

  const categoryName = lang === 'cs' ? routeDef.nameCs : lang === 'de' ? routeDef.nameDe : routeDef.nameEn;
  const isYouthCategory = currentCategory === 'youth_u15' || currentCategory === 'youth_u13';
  const isAiCameraMode = startMode === 'camera_motion';

  // Refresh saved climber profiles whenever userProfile changes
  useEffect(() => {
    setClimberProfiles(getAllProfiles());
  }, [userProfile]);

  // Sync defaultStartMode / defaultFacingMode when changed in SettingsModal
  useEffect(() => {
    setStartMode(effectiveSettings.defaultStartMode);
  }, [effectiveSettings.defaultStartMode]);

  useEffect(() => {
    if (!cameraActive) {
      setFacingMode(effectiveSettings.defaultFacingMode);
    }
  }, [effectiveSettings.defaultFacingMode, cameraActive]);

  const handleSwitchClimber = useCallback(
    (targetId: string) => {
      const switched = setActiveProfileId(targetId);
      setClimberProfiles(getAllProfiles());
      setShowClimberSwitcher(false);
      onProfileSwitched?.(switched);
      setCalibrationSavedToast(`🧗 Lezec: ${switched.flagEmoji || ''} ${switched.name}`);
      setTimeout(() => setCalibrationSavedToast(null), 2000);
    },
    [onProfileSwitched]
  );

  const handleQuickCreateClimber = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = newClimberName.trim();
      if (!trimmed) return;
      const created = createProfile({
        name: trimmed,
        defaultCategory: currentCategory,
      });
      setNewClimberName('');
      setClimberProfiles(getAllProfiles());
      setShowClimberSwitcher(false);
      onProfileSwitched?.(created);
      setCalibrationSavedToast(`✓ Přidán a přepnut: ${created.name}`);
      setTimeout(() => setCalibrationSavedToast(null), 2200);
    },
    [newClimberName, currentCategory, onProfileSwitched]
  );

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

  const updateCalibration = (
    field: 'finishY' | 'startY' | 'split1Y' | 'split2Y' | 'footPadX' | 'handPadX',
    delta: number
  ) => {
    setCalibrations((prev) => {
      const current = prev[currentCategory] || DEFAULT_CATEGORY_CALIBRATIONS[currentCategory];
      const currentVal = Number(current[field] ?? 50);
      const minVal =
        field === 'finishY'
          ? 2
          : field === 'split2Y'
          ? 12
          : field === 'split1Y'
          ? 25
          : field === 'startY'
          ? 55
          : 10;
      const maxVal =
        field === 'finishY'
          ? 60
          : field === 'split2Y'
          ? 75
          : field === 'split1Y'
          ? 85
          : field === 'startY'
          ? 95
          : 90;
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
    if (countdownState === 'armed' || countdownState === 'marks' || countdownState === 'ready' || countdownState === 'beeps') {
      clearCountdownTimeouts();
      ifscReactionPendingRef.current = false;
      footArmedBelowLineRef.current = false;
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

  const getLineToastLabel = (line: 'foot' | 'split1' | 'split2' | 'hand', val: number) => {
    if (line === 'foot') return `🟢 Start – Noha nastaven na ${val}%`;
    if (line === 'hand') return `🔴 Cíl – Ruka nastaven na ${val}%`;
    if (line === 'split1') return `🔵 Mezičas 1 (${isYouthCategory ? '3.3m' : '5m'}) nastaven na ${val}%`;
    return `🟣 Mezičas 2 (${isYouthCategory ? '6.6m' : '10m'}) nastaven na ${val}%`;
  };

  const getLinePercentValue = (line: 'foot' | 'split1' | 'split2' | 'hand') => {
    if (line === 'foot') return startZoneY;
    if (line === 'hand') return finishZoneY;
    if (line === 'split1') return split1ZoneY;
    return split2ZoneY;
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressMetaRef.current = null;
  };

  // Direct Touch/Pointer Dragging on AI Kamera Lines (with 280ms Long-Press Activation)
  const handleLinePointerDown = (
    line: 'foot' | 'split1' | 'split2' | 'hand',
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!isAiCameraMode || isRunning || isPickingClimber) return;

    // If this line is already open for editing or calibration mode is active, start dragging immediately
    if (isCalibrating || editingLine === line) {
      clearLongPressTimer();
      e.stopPropagation();
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore if capture unsupported
      }
      setEditingLine(line);
      setDraggingLine(line);
      return;
    }

    // Otherwise start a 280ms hold timer so normal vertical scrolling still works if finger moves immediately
    clearLongPressTimer();
    const targetEl = e.currentTarget;
    const pointerId = e.pointerId;
    longPressMetaRef.current = {
      line,
      startX: e.clientX,
      startY: e.clientY,
      pointerId,
      targetEl,
    };

    longPressTimerRef.current = window.setTimeout(() => {
      const meta = longPressMetaRef.current;
      longPressTimerRef.current = null;
      if (!meta || meta.line !== line) return;
      try {
        meta.targetEl?.setPointerCapture(meta.pointerId);
      } catch {
        // ignore if capture unsupported
      }
      try {
        navigator.vibrate?.(18);
      } catch {
        // ignore
      }
      justDraggedRef.current = true;
      setEditingLine(line);
      setDraggingLine(line);
    }, 280);
  };

  const handleLinePointerMove = (
    line: 'foot' | 'split1' | 'split2' | 'hand',
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    if (draggingLine === line && lineDragBoxRef.current) {
      e.stopPropagation();
      const boxRect = lineDragBoxRef.current.getBoundingClientRect();
      const rawPct = Math.round(((e.clientY - boxRect.top) / Math.max(1, boxRect.height)) * 100);

      if (line === 'foot') {
        updateCalibrationField('startY', Math.min(95, Math.max(55, rawPct)));
      } else if (line === 'hand') {
        updateCalibrationField('finishY', Math.min(60, Math.max(2, rawPct)));
      } else if (line === 'split1') {
        updateCalibrationField('split1Y', Math.min(85, Math.max(25, rawPct)));
      } else {
        updateCalibrationField('split2Y', Math.min(75, Math.max(12, rawPct)));
      }
      return;
    }

    // Cancel pending long-press if user moves finger > 10px (e.g. scrolling the page)
    const meta = longPressMetaRef.current;
    if (meta && meta.line === line) {
      const dist = Math.hypot(e.clientX - meta.startX, e.clientY - meta.startY);
      if (dist > 10) {
        clearLongPressTimer();
      }
    }
  };

  const handleLinePointerUp = (
    line: 'foot' | 'split1' | 'split2' | 'hand',
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    clearLongPressTimer();
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
    }, 120);
    setDraggingLine(null);

    const val = getLinePercentValue(line);
    setCalibrationSavedToast(getLineToastLabel(line, val));
    setTimeout(() => setCalibrationSavedToast(null), 1800);
  };

  // Lock / Unlock specific climber by coordinates so passersby cannot steal tracking
  const lockOntoPoint = useCallback((rawX: number, rawY: number) => {
    const x = Math.max(4, Math.min(96, rawX));
    const y = Math.max(4, Math.min(96, rawY));
    const nextLock = { laneX: x, lastX: x, lastY: y };
    lockedClimberRef.current = nextLock;
    setLockedClimber(nextLock);
    setIsPickingClimber(false);
    prevFootYRef.current = null;
    footArmedBelowLineRef.current = false;
    setCalibrationSavedToast('🔒 Lezec zafixován — kolemjdoucí budou ignorováni');
    setTimeout(() => setCalibrationSavedToast(null), 2500);
  }, []);

  const unlockClimber = useCallback(() => {
    lockedClimberRef.current = null;
    setLockedClimber(null);
    setIsPickingClimber(false);
    setCalibrationSavedToast('🔓 Fixace lezce zrušena');
    setTimeout(() => setCalibrationSavedToast(null), 1800);
  }, []);

  // Viewfinder Click: handles climber tap-to-lock, closing active line editor, or starts/stops timer
  const handleViewfinderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (justDraggedRef.current || draggingLine || justSwipedRef.current) return;

    const getBoxPercentCoords = () => {
      const boxRect = lineDragBoxRef.current?.getBoundingClientRect();
      if (boxRect && boxRect.width > 0 && boxRect.height > 0) {
        return {
          x: Math.max(1, Math.min(99, ((e.clientX - boxRect.left) / boxRect.width) * 100)),
          y: Math.max(1, Math.min(99, ((e.clientY - boxRect.top) / boxRect.height) * 100)),
        };
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const boxLeftPx = rect.left + (videoBoxRect.left / 100) * rect.width;
      const boxWidthPx = Math.max(1, (videoBoxRect.width / 100) * rect.width);
      const boxTopPx = rect.top + (videoBoxRect.top / 100) * rect.height;
      const boxHeightPx = Math.max(1, (videoBoxRect.height / 100) * rect.height);
      return {
        x: Math.max(1, Math.min(99, ((e.clientX - boxLeftPx) / boxWidthPx) * 100)),
        y: Math.max(1, Math.min(99, ((e.clientY - boxTopPx) / boxHeightPx) * 100)),
      };
    };

    if (isAiCameraMode && isPickingClimber) {
      const pt = getBoxPercentCoords();
      let targetX = pt.x;
      let targetY = pt.y;
      let bestDist = 26;
      for (const cand of candidateBodiesRef.current) {
        const d = Math.hypot(cand.x - pt.x, cand.y - pt.y);
        if (d < bestDist) {
          bestDist = d;
          targetX = cand.x;
          targetY = cand.y;
        }
      }
      lockOntoPoint(targetX, targetY);
      return;
    }

    if (isAiCameraMode && (editingLine || isCalibrating)) {
      setEditingLine(null);
      setIsCalibrating(false);
      saveCalibrationExplicit();
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

  // Helper: find nearest recorded AI pose sample to a video timestamp (for preview & export)
  const findPoseSampleAtTime = useCallback(
    (timeline: RecordedPoseSample[] | undefined, tSec: number): RecordedPoseSample | null => {
      if (!timeline || timeline.length === 0) return null;
      let lo = 0;
      let hi = timeline.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (timeline[mid].tSec < tSec) lo = mid + 1;
        else hi = mid;
      }
      let best = timeline[lo];
      if (lo > 0 && Math.abs(timeline[lo - 1].tSec - tSec) < Math.abs(best.tSec - tSec)) {
        best = timeline[lo - 1];
      }
      return Math.abs(best.tSec - tSec) <= 0.45 ? best : null;
    },
    []
  );

  // Burn timer overlay ('running' | 'final' | 'none') + trimmed margins + optional AI pose overlay into exported video
  // IMPORTANT: Never pauses live camera so the next climber can immediately start while this encodes in the background.
  const getAnnotatedVideoBlob = async (
    run: SpeedRun,
    options?: {
      withPoseOverlay?: boolean;
      videoTimeMode?: VideoTimeOverlayMode;
      exportFps?: 30 | 60;
      trimMarginSec?: 0 | 1 | 3;
    }
  ): Promise<{ blob: Blob; ext: string; mimeType: string } | null> => {
    const savedMem = recordedPoseDataMapRef.current.get(run.id);
    const resolvedVideoUrl = run.videoUrl || savedMem?.videoUrl;
    if (!resolvedVideoUrl) return null;

    const timing = run.videoTiming || savedMem?.timing;
    const calLines = run.videoCalibration || savedMem?.calibration;
    const poseTimeline = run.poseTimeline || savedMem?.poseTimeline;

    const withPoseOverlay = options?.withPoseOverlay ?? includePoseInVideo;
    const mode: VideoTimeOverlayMode = options?.videoTimeMode ?? videoTimeMode;
    const exportFps = options?.exportFps ?? videoTargetFps;
    const hasPoseData = Boolean(withPoseOverlay && poseTimeline && poseTimeline.length > 0);

    const cacheKey = `${run.id}_v6_${exportFps}fps_${mode}_${hasPoseData ? 'pose' : 'clean'}_${run.totalTime.toFixed(3)}`;
    if (exportedVideoCacheRef.current?.key === cacheKey) {
      return exportedVideoCacheRef.current.result;
    }

    const fallbackRawBlob = async () => {
      try {
        const resp = await fetch(resolvedVideoUrl);
        const raw = await resp.blob();
        const ext = (raw.type || '').includes('mp4') ? 'mp4' : 'webm';
        const res = { blob: raw, ext, mimeType: raw.type || 'video/webm' };
        exportedVideoCacheRef.current = { key: cacheKey, result: res };
        return res;
      } catch {
        return null;
      }
    };

    // Instant <50ms save when no timer overlay and no AI pose dots are requested
    if (mode === 'none' && !hasPoseData) {
      return fallbackRawBlob();
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

    if (typeof document === 'undefined' || typeof MediaRecorder === 'undefined') {
      return fallbackRawBlob();
    }

    // Only gently throttle idle background AI detection during export (live camera stays running!)
    isExportingVideoRef.current = true;

    try {
      const offscreenVideo = document.createElement('video');
      offscreenVideo.src = resolvedVideoUrl;
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

      const vidDurLimit =
        Number.isFinite(offscreenVideo.duration) && offscreenVideo.duration > 0.4
          ? offscreenVideo.duration - 0.3
          : Number.POSITIVE_INFINITY;
      const trimStartSec = timing ? Math.max(0, Math.min(timing.preRollStartSec, vidDurLimit)) : 0;
      const trimEndSec = timing ? timing.postRollEndSec : Number.POSITIVE_INFINITY;
      if (trimStartSec > 0.12) {
        await new Promise<void>((resolve) => {
          const seekWait = setTimeout(resolve, 650);
          offscreenVideo.onseeked = () => {
            clearTimeout(seekWait);
            resolve();
          };
          try {
            offscreenVideo.currentTime = trimStartSec;
          } catch {
            clearTimeout(seekWait);
            resolve();
          }
        });
      }

      const natW = offscreenVideo.videoWidth || 1280;
      const natH = offscreenVideo.videoHeight || 720;
      const scale = Math.min(1, 1280 / Math.max(natW, natH));
      const W = Math.max(320, Math.round(natW * scale));
      const H = Math.max(240, Math.round(natH * scale));

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = W;
      exportCanvas.height = H;
      const ctx = exportCanvas.getContext('2d', { alpha: false });

      if (!ctx || typeof exportCanvas.captureStream !== 'function') {
        return fallbackRawBlob();
      }

      let stream = exportCanvas.captureStream(0);
      let videoTrack = stream.getVideoTracks()[0] as (MediaStreamTrack & { requestFrame?: () => void }) | undefined;
      const supportsManualFrame = typeof videoTrack?.requestFrame === 'function';
      if (!supportsManualFrame) {
        stream.getTracks().forEach((tr) => tr.stop());
        stream = exportCanvas.captureStream(exportFps);
        videoTrack = stream.getVideoTracks()[0] as (MediaStreamTrack & { requestFrame?: () => void }) | undefined;
      }

      const mimeTypes = [
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=vp8',
        'video/webm;codecs=vp9',
        'video/webm',
        'video/webm;codecs=h264',
      ];
      const mimeType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
      const recOptions: MediaRecorderOptions = {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: exportFps === 60 ? 6_000_000 : 4_200_000,
      };
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, recOptions);
      } catch {
        recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      }
      const chunks: Blob[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      // Pre-compute static HUD dimensions
      const minDim = Math.min(W, H);
      const padX = Math.round(W * 0.03);
      const padY = Math.round(H * 0.035);
      const timeFontSize = Math.max(22, Math.round(minDim * 0.068));
      const subFontSize = Math.max(11, Math.round(minDim * 0.024));
      const timeFontStr = `900 ${timeFontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
      const subFontStr = `700 ${subFontSize}px system-ui, -apple-system, sans-serif`;

      ctx.font = timeFontStr;
      const timeMetrics = ctx.measureText(maxTimeReference);
      ctx.font = subFontStr;
      const subMetrics = ctx.measureText(`${baseClimberLabel} · START`);

      const innerPadX = Math.round(minDim * 0.026);
      const innerPadY = Math.round(minDim * 0.018);
      const accentW = Math.max(4, Math.round(minDim * 0.009));
      const boxW = Math.max(timeMetrics.width, subMetrics.width) + innerPadX * 2 + accentW + 8;
      const boxH = subFontSize + timeFontSize + innerPadY * 2 + Math.round(minDim * 0.012);
      const boxX = W - padX - boxW;
      const boxY = padY;
      const radius = Math.max(8, Math.round(minDim * 0.022));
      const textStartX = boxX + innerPadX * 0.5 + accentW + Math.round(innerPadX * 0.65);
      const timeTextY = boxY + innerPadY + subFontSize + Math.round(minDim * 0.008);

      const drawPoseDot = (
        pxPct: number,
        pyPct: number,
        color: string,
        labelText: string,
        minD: number
      ) => {
        const cx = (pxPct / 100) * W;
        const cy = (pyPct / 100) * H;
        const r = Math.max(5, Math.round(minD * 0.011));

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        const fontSize = Math.max(10, Math.round(minD * 0.02));
        ctx.font = `800 ${fontSize}px system-ui, -apple-system, sans-serif`;
        const tw = ctx.measureText(labelText).width;
        const px = 6;
        const py = 3;
        const lx = Math.min(W - tw - px * 2 - 4, cx + r + 5);
        const ly = Math.max(4, Math.min(H - fontSize - py * 2 - 4, cy - (fontSize + py * 2) / 2));

        ctx.fillStyle = 'rgba(9, 13, 24, 0.82)';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(lx, ly, tw + px * 2, fontSize + py * 2, 5);
        } else {
          ctx.rect(lx, ly, tw + px * 2, fontSize + py * 2);
        }
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'top';
        ctx.fillText(labelText, lx + px, ly + py);
        ctx.restore();
      };

      const drawWatermarkFrame = (forceFinal = false, frameMediaTime?: number) => {
        ctx.drawImage(offscreenVideo, 0, 0, W, H);
        const vidTime =
          typeof frameMediaTime === 'number' && Number.isFinite(frameMediaTime)
            ? frameMediaTime
            : offscreenVideo.currentTime || 0;

        if (hasPoseData) {
          if (calLines) {
            const lines: { yPct: number; color: string }[] = [
              { yPct: calLines.finishY, color: 'rgba(239, 68, 68, 0.55)' },
              ...(typeof calLines.split2Y === 'number'
                ? [{ yPct: calLines.split2Y, color: 'rgba(167, 139, 250, 0.55)' }]
                : []),
              ...(typeof calLines.split1Y === 'number'
                ? [{ yPct: calLines.split1Y, color: 'rgba(59, 130, 246, 0.55)' }]
                : typeof calLines.midY === 'number'
                ? [{ yPct: calLines.midY, color: 'rgba(59, 130, 246, 0.5)' }]
                : []),
              { yPct: calLines.startY, color: 'rgba(16, 185, 129, 0.55)' },
            ];
            ctx.save();
            ctx.setLineDash([8, 6]);
            ctx.lineWidth = Math.max(1.5, minDim * 0.003);
            for (const ln of lines) {
              const ly = (ln.yPct / 100) * H;
              ctx.strokeStyle = ln.color;
              ctx.beginPath();
              ctx.moveTo(W * 0.04, ly);
              ctx.lineTo(W * 0.96, ly);
              ctx.stroke();
            }
            ctx.restore();
          }

          const sample = findPoseSampleAtTime(poseTimeline, vidTime);
          if (sample) {
            if (sample.skeleton && sample.skeleton.length > 0) {
              ctx.save();
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
              ctx.lineWidth = Math.max(2, minDim * 0.0045);
              ctx.lineCap = 'round';
              for (const seg of sample.skeleton) {
                ctx.beginPath();
                ctx.moveTo((seg.from.x / 100) * W, (seg.from.y / 100) * H);
                ctx.lineTo((seg.to.x / 100) * W, (seg.to.y / 100) * H);
                ctx.stroke();
              }
              ctx.restore();
            }
            drawPoseDot(sample.hands.x, sample.hands.y, '#ef4444', 'Ruka', minDim);
            drawPoseDot(sample.body.x, sample.body.y, '#3b82f6', 'Tělo', minDim);
            drawPoseDot(sample.foot.x, sample.foot.y, '#10b981', 'Noha', minDim);
          }
        }

        if (mode === 'none') {
          return;
        }

        let isPreStart = false;
        let isFinishedFrame = mode === 'final' || forceFinal;
        let timeText = maxTimeReference;

        if (mode === 'running') {
          let currentRunSec = vidTime;
          if (timing) {
            if (forceFinal || vidTime >= timing.climbEndSec) {
              currentRunSec = run.totalTime;
              isFinishedFrame = true;
            } else if (vidTime < timing.climbStartSec) {
              currentRunSec = 0;
              isPreStart = true;
              isFinishedFrame = false;
            } else {
              const climbSpan = Math.max(0.05, timing.climbEndSec - timing.climbStartSec);
              currentRunSec = ((vidTime - timing.climbStartSec) / climbSpan) * run.totalTime;
              isFinishedFrame = currentRunSec >= run.totalTime - 0.012;
            }
          } else {
            const vidDur = offscreenVideo.duration;
            if (forceFinal) {
              currentRunSec = run.totalTime;
            } else if (Number.isFinite(vidDur) && vidDur > 0.25 && vidDur < run.totalTime) {
              currentRunSec = (currentRunSec / vidDur) * run.totalTime;
            }
            isFinishedFrame = forceFinal || currentRunSec >= run.totalTime - 0.012;
          }
          const displaySec = Math.min(run.totalTime, Math.max(0, currentRunSec));
          timeText = isFinishedFrame ? maxTimeReference : formatVideoTime(displaySec);
        }

        const topLabel = isFinishedFrame
          ? `${baseClimberLabel} · CÍL`
          : isPreStart
          ? `${baseClimberLabel} · START`
          : baseClimberLabel;

        ctx.save();
        ctx.fillStyle = 'rgba(9, 13, 24, 0.84)';
        ctx.strokeStyle = isFinishedFrame
          ? 'rgba(16, 185, 129, 0.55)'
          : isPreStart
          ? 'rgba(245, 158, 11, 0.55)'
          : 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = Math.max(1, Math.round(minDim * 0.0025));
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(boxX, boxY, boxW, boxH, radius);
        } else {
          ctx.rect(boxX, boxY, boxW, boxH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isFinishedFrame ? '#10b981' : isPreStart ? '#f59e0b' : '#ef4444';
        ctx.fillRect(boxX + innerPadX * 0.5, boxY + innerPadY, accentW, boxH - innerPadY * 2);

        ctx.fillStyle = isFinishedFrame
          ? 'rgba(167, 243, 208, 0.98)'
          : isPreStart
          ? 'rgba(253, 230, 138, 0.98)'
          : 'rgba(203, 213, 225, 0.95)';
        ctx.font = subFontStr;
        ctx.textBaseline = 'top';
        ctx.fillText(topLabel, textStartX, boxY + innerPadY);

        ctx.fillStyle = '#ffffff';
        ctx.font = timeFontStr;
        ctx.fillText(timeText, textStartX, timeTextY);
        ctx.restore();
      };

      const exportedBlob = await new Promise<Blob>((resolve, reject) => {
        let exportRafId = 0;
        let exportRvfcId = 0;
        let stopped = false;
        let recordingStarted = false;
        let lastDrawnMediaTime = -1;

        type VideoWithRVFC = HTMLVideoElement & {
          requestVideoFrameCallback?: (cb: (now: number, metadata: { mediaTime: number }) => void) => number;
          cancelVideoFrameCallback?: (id: number) => void;
        };
        const vidWithRvfc = offscreenVideo as VideoWithRVFC;
        const hasRVFC = typeof vidWithRvfc.requestVideoFrameCallback === 'function';

        const finishExport = () => {
          if (stopped) return;
          stopped = true;
          cancelAnimationFrame(exportRafId);
          if (hasRVFC && exportRvfcId && typeof vidWithRvfc.cancelVideoFrameCallback === 'function') {
            try {
              vidWithRvfc.cancelVideoFrameCallback(exportRvfcId);
            } catch {
              // ignore
            }
          }
          try {
            offscreenVideo.pause();
          } catch {
            // ignore
          }
          if (recorder.state === 'recording') {
            try {
              recorder.stop();
            } catch {
              reject(new Error('recorder stop failed'));
            }
          } else {
            reject(new Error('recorder not started'));
          }
        };

        const safetyTimer = setTimeout(finishExport, 45000);

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

        const pushCanvasFrame = () => {
          if (supportsManualFrame && videoTrack?.requestFrame) {
            try {
              videoTrack.requestFrame();
            } catch {
              // ignore
            }
          }
        };

        const handleDecodedFrame = (tNow: number) => {
          if (stopped) return false;

          if (!recordingStarted && tNow >= Math.max(0, trimStartSec - 0.12)) {
            recordingStarted = true;
            try {
              recorder.start();
            } catch {
              // ignore
            }
          }

          drawWatermarkFrame(false, tNow);
          if (recordingStarted) {
            pushCanvasFrame();
          }

          if (tNow >= trimEndSec) {
            drawWatermarkFrame(true, tNow);
            if (recordingStarted) pushCanvasFrame();
            setTimeout(finishExport, 140);
            return true;
          }
          return false;
        };

        const rvfcLoop = (_now: number, metadata: { mediaTime: number }) => {
          if (stopped) return;
          const tNow = metadata?.mediaTime ?? offscreenVideo.currentTime ?? 0;
          if (tNow > lastDrawnMediaTime + 0.0005 || !recordingStarted) {
            lastDrawnMediaTime = tNow;
            if (handleDecodedFrame(tNow)) return;
          }
          if (!offscreenVideo.ended && !offscreenVideo.paused && vidWithRvfc.requestVideoFrameCallback) {
            exportRvfcId = vidWithRvfc.requestVideoFrameCallback(rvfcLoop);
          }
        };

        const rafLoop = () => {
          if (stopped) return;
          const tNow = offscreenVideo.currentTime || 0;
          if (tNow > lastDrawnMediaTime + 0.001 || !recordingStarted) {
            lastDrawnMediaTime = tNow;
            if (handleDecodedFrame(tNow)) return;
          }
          if (!offscreenVideo.ended && !offscreenVideo.paused) {
            exportRafId = requestAnimationFrame(rafLoop);
          }
        };

        offscreenVideo.onended = () => {
          if (!recordingStarted) {
            recordingStarted = true;
            try {
              recorder.start();
            } catch {
              // ignore
            }
          }
          drawWatermarkFrame(true, offscreenVideo.currentTime || trimEndSec);
          pushCanvasFrame();
          setTimeout(finishExport, 180);
        };

        drawWatermarkFrame(false, offscreenVideo.currentTime || trimStartSec);

        if (hasRVFC && vidWithRvfc.requestVideoFrameCallback) {
          exportRvfcId = vidWithRvfc.requestVideoFrameCallback(rvfcLoop);
        }

        offscreenVideo
          .play()
          .then(() => {
            if (!hasRVFC) {
              exportRafId = requestAnimationFrame(rafLoop);
            }
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
    } finally {
      isExportingVideoRef.current = false;
    }
  };

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 4000);
  };

  const processExportQueue = useCallback(async () => {
    if (isProcessingQueueRef.current) return;
    isProcessingQueueRef.current = true;

    try {
      while (exportQueueRef.current.length > 0) {
        const job = exportQueueRef.current.shift()!;
        activeExportRunIdRef.current = job.run.id;
        const jobLabel = `${job.run.climberName || 'Lezec'} (${job.run.totalTime.toFixed(3)}s)`;
        setBgExportUi((prev) => ({
          ...prev,
          pendingCount: exportQueueRef.current.length + 1,
          activeLabel: jobLabel,
        }));

        try {
          const pendingPostRoll = postRollPromisesByRunRef.current.get(job.run.id);
          if (pendingPostRoll) {
            await pendingPostRoll;
          }

          const mem = recordedPoseDataMapRef.current.get(job.run.id);
          const resolvedRun: SpeedRun = mem
            ? {
                ...job.run,
                videoUrl: job.run.videoUrl || mem.videoUrl,
                videoTiming: job.run.videoTiming || mem.timing,
                videoCalibration: job.run.videoCalibration || mem.calibration,
                poseTimeline: job.run.poseTimeline || mem.poseTimeline,
              }
            : job.run;

          if (!resolvedRun.videoUrl) {
            setBgExportUi((prev) => ({
              ...prev,
              finishedToast: `✓ Pokus ${jobLabel} uložen`,
            }));
            setTimeout(() => {
              setBgExportUi((prev) =>
                prev.finishedToast?.includes(jobLabel) ? { ...prev, finishedToast: null } : prev
              );
            }, 2800);
            continue;
          }

          const exported = await getAnnotatedVideoBlob(resolvedRun, {
            withPoseOverlay: job.withPose,
            videoTimeMode: job.videoTimeMode,
            exportFps: job.exportFps,
            trimMarginSec: job.trimMarginSec,
          });

          if (!exported) continue;
          const filename = buildVideoFilename(resolvedRun, exported.ext);

          if (job.action === 'download') {
            triggerBlobDownload(exported.blob, filename);
            setBgExportUi((prev) => ({
              ...prev,
              finishedToast: `✓ Uloženo na pozadí: ${filename}`,
            }));
            setTimeout(() => {
              setBgExportUi((prev) =>
                prev.finishedToast?.includes(filename) ? { ...prev, finishedToast: null } : prev
              );
            }, 3400);
          } else {
            const file = new File([exported.blob], filename, { type: exported.mimeType });
            let sharedOk = false;
            if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
              try {
                await navigator.share({
                  files: [file],
                  title: `Fifteen Speed Climbing - ${resolvedRun.totalTime.toFixed(3)}s`,
                  text: `Výlez ${resolvedRun.climberName || 'lezce'} v čase ${resolvedRun.totalTime.toFixed(3)}s`,
                });
                sharedOk = true;
              } catch {
                sharedOk = false;
              }
            }

            if (sharedOk) {
              setBgExportUi((prev) => ({
                ...prev,
                finishedToast: `☁️ Odesláno na Disk: ${filename}`,
              }));
              setTimeout(() => {
                setBgExportUi((prev) =>
                  prev.finishedToast?.includes(filename) ? { ...prev, finishedToast: null } : prev
                );
              }, 3400);
            } else {
              // User gesture likely expired during async encoding — keep ready for 1-tap share or download
              setBgExportUi((prev) => ({
                ...prev,
                readyShareJob: {
                  id: job.id,
                  filename,
                  blob: exported.blob,
                  mimeType: exported.mimeType,
                  run: resolvedRun,
                },
              }));
            }
          }
        } finally {
          activeExportRunIdRef.current = null;
        }
      }
    } finally {
      isProcessingQueueRef.current = false;
      activeExportRunIdRef.current = null;
      setBgExportUi((prev) => ({
        ...prev,
        pendingCount: 0,
        activeLabel: null,
      }));
    }
  }, [includePoseInVideo, videoTimeMode, videoTargetFps]);

  const enqueueVideoExport = useCallback(
    (run: SpeedRun, action: 'download' | 'share') => {
      if (!getStoredRuns().some((r) => r.id === run.id)) {
        saveRun(run);
      }
      const settingsNow = sensorStateRef.current;
      exportQueueRef.current.push({
        id: `exp-${run.id}-${Date.now()}`,
        run,
        action,
        withPose: settingsNow.includePoseInVideo,
        videoTimeMode: settingsNow.videoTimeMode,
        exportFps: settingsNow.videoTargetFps,
        trimMarginSec: settingsNow.videoTrimMarginSec,
      });
      setBgExportUi((prev) => ({
        ...prev,
        pendingCount: exportQueueRef.current.length + (isProcessingQueueRef.current ? 1 : 0),
        activeLabel: prev.activeLabel || `${run.climberName || 'Lezec'} (${run.totalTime.toFixed(3)}s)`,
      }));
      void processExportQueue();
    },
    [processExportQueue]
  );

  // Save/Export in background AND immediately unlock UI so coach can switch climber & start next attempt!
  const enqueueRunSaveAndReadyNext = useCallback(
    (action: 'download' | 'share', runOverride?: SpeedRun) => {
      const targetRun = runOverride || finishedRunRef.current;
      if (!targetRun) return;

      const mem = recordedPoseDataMapRef.current.get(targetRun.id);
      const snapshotRun: SpeedRun = mem
        ? {
            ...targetRun,
            videoUrl: targetRun.videoUrl || mem.videoUrl,
            videoTiming: targetRun.videoTiming || mem.timing,
            videoCalibration: targetRun.videoCalibration || mem.calibration,
            poseTimeline: targetRun.poseTimeline || mem.poseTimeline,
          }
        : targetRun;

      const hasOrExpectsVideo = Boolean(
        snapshotRun.videoUrl || postRollPromisesByRunRef.current.has(snapshotRun.id) || postRollActiveRef.current
      );

      if (hasOrExpectsVideo) {
        enqueueVideoExport(snapshotRun, action);
      } else if (!getStoredRuns().some((r) => r.id === snapshotRun.id)) {
        saveRun(snapshotRun);
      }

      // Clear finished UI immediately for instant next climber start
      setFinishedRun(null);
      setElapsedMs(0);
      setSplit1Time(null);
      setSplit2Time(null);
      split1TimeRef.current = null;
      split2TimeRef.current = null;
      setRecordedVideoUrl(null);
      setShowDeleteVideoConfirm(false);
      setShowDeleteRunConfirm(false);
      setShowCloudPicker(false);
      setLastLineTrigger(null);
      setVideoShareFeedback(null);

      showGestureFeedback(
        hasOrExpectsVideo
          ? action === 'share'
            ? '☁️ Ukládá se na pozadí pro Disk — další lezec může startovat!'
            : '💾 Ukládá se na pozadí — další lezec může startovat!'
          : `✓ Pokus (${snapshotRun.totalTime.toFixed(3)}s) uložen — připraveno pro dalšího lezce`
      );
    },
    [enqueueVideoExport]
  );

  const handleTriggerReadyShare = async () => {
    const ready = bgExportUi.readyShareJob;
    if (!ready) return;
    const file = new File([ready.blob], ready.filename, { type: ready.mimeType });
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Fifteen Speed Climbing - ${ready.run.totalTime.toFixed(3)}s`,
          text: `Výlez ${ready.run.climberName || 'lezce'} v čase ${ready.run.totalTime.toFixed(3)}s`,
        });
        setBgExportUi((prev) => ({
          ...prev,
          readyShareJob: null,
          finishedToast: `☁️ Odesláno na Disk: ${ready.filename}`,
        }));
        setTimeout(() => {
          setBgExportUi((prev) => ({ ...prev, finishedToast: null }));
        }, 3200);
        return;
      } catch {
        // user dismissed or blocked
      }
    }
    triggerBlobDownload(ready.blob, ready.filename);
    setBgExportUi((prev) => ({
      ...prev,
      readyShareJob: null,
      finishedToast: `💾 Video staženo (${ready.filename}) — nahrajte na Disk`,
    }));
    setTimeout(() => {
      setBgExportUi((prev) => ({ ...prev, finishedToast: null }));
    }, 3600);
  };

  const handleDownloadReadyShare = () => {
    const ready = bgExportUi.readyShareJob;
    if (!ready) return;
    triggerBlobDownload(ready.blob, ready.filename);
    setBgExportUi((prev) => ({
      ...prev,
      readyShareJob: null,
      finishedToast: `✓ Video staženo: ${ready.filename}`,
    }));
    setTimeout(() => {
      setBgExportUi((prev) => ({ ...prev, finishedToast: null }));
    }, 3200);
  };

  const handleDownloadVideoDirect = async (runOverride?: SpeedRun) => {
    enqueueRunSaveAndReadyNext('download', runOverride);
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
  const longPressTimerRef = useRef<number | null>(null);
  const longPressMetaRef = useRef<{
    line: 'foot' | 'split1' | 'split2' | 'hand';
    startX: number;
    startY: number;
    pointerId: number;
    targetEl: HTMLDivElement | null;
  } | null>(null);
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
  const isExportingVideoRef = useRef<boolean>(false);
  const cameraStartTsRef = useRef<number>(0);
  const manualWallScanRef = useRef<boolean>(false);
  const split1TimeRef = useRef<number | null>(null);
  const split2TimeRef = useRef<number | null>(null);
  const reactionTimeRef = useRef<number>(0.138);
  const isFalseStartRef = useRef<boolean>(false);
  const ifscReactionPendingRef = useRef<boolean>(false);

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
  const lockedClimberRef = useRef<{ laneX: number; lastX: number; lastY: number } | null>(null);
  const candidateBodiesRef = useRef<TrackedPoint[]>([]);
  const prevFootYRef = useRef<number | null>(null);
  const prevHandsYRef = useRef<number | null>(null);
  const footArmedBelowLineRef = useRef<boolean>(false);
  const split1LineTriggeredRef = useRef<boolean>(false);
  const split2LineTriggeredRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Rolling Pre-Roll + +3s Post-Roll MediaRecorder System + Timestamped Pose History
  type RecorderSlot = {
    recorder: MediaRecorder;
    chunks: Blob[];
    startTs: number;
    mimeType: string;
    discarded: boolean;
  };
  type TimedPoseSample = Omit<RecordedPoseSample, 'tSec'> & { absTs: number };

  const primaryRecSlotRef = useRef<RecorderSlot | null>(null);
  const standbyRecSlotRef = useRef<RecorderSlot | null>(null);
  const activeRunRecRef = useRef<{ slot: RecorderSlot; climbStartTs: number } | null>(null);
  const postRollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const postRollCountdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const postRollActiveRef = useRef<boolean>(false);
  const postRollPromiseRef = useRef<Promise<void> | null>(null);
  const postRollPromisesByRunRef = useRef<Map<string, Promise<void>>>(new Map());
  const finalizePostRollNowRef = useRef<(() => void) | null>(null);
  const poseHistoryBufferRef = useRef<TimedPoseSample[]>([]);
  const recordedPoseDataMapRef = useRef<
    Map<
      string,
      { videoUrl?: string; timing: VideoTimingMeta; calibration: VideoCalibrationLines; poseTimeline: RecordedPoseSample[] }
    >
  >(new Map());
  const exportQueueRef = useRef<
    {
      id: string;
      run: SpeedRun;
      action: 'download' | 'share';
      withPose: boolean;
      videoTimeMode: VideoTimeOverlayMode;
      exportFps: 30 | 60;
      trimMarginSec: 0 | 1 | 3;
    }[]
  >([]);
  const isProcessingQueueRef = useRef<boolean>(false);
  const activeExportRunIdRef = useRef<string | null>(null);
  const lastBgThrottleRef = useRef<number>(0);
  const finishedRunRef = useRef<SpeedRun | null>(null);
  finishedRunRef.current = finishedRun;

  const pickRecorderMime = () => {
    const mimeTypes = [
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=vp8',
      'video/webm;codecs=vp9',
      'video/webm',
      'video/webm;codecs=h264',
    ];
    return (
      mimeTypes.find((type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) || ''
    );
  };

  const createRecorderSlot = useCallback((stream: MediaStream): RecorderSlot | null => {
    if (typeof MediaRecorder === 'undefined') return null;
    try {
      const mimeType = pickRecorderMime();
      const opts: MediaRecorderOptions = {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 6_500_000,
      };
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, opts);
      } catch {
        recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      }
      const slot: RecorderSlot = {
        recorder,
        chunks: [],
        startTs: performance.now(),
        mimeType: recorder.mimeType || mimeType || 'video/webm',
        discarded: false,
      };
      recorder.ondataavailable = (e) => {
        if (!slot.discarded && e.data && e.data.size > 0) {
          slot.chunks.push(e.data);
        }
      };
      recorder.start(1000);
      return slot;
    } catch {
      return null;
    }
  }, []);

  const discardRecorderSlot = useCallback((slot: RecorderSlot | null) => {
    if (!slot) return;
    slot.discarded = true;
    slot.chunks = [];
    if (slot.recorder.state === 'recording') {
      try {
        slot.recorder.stop();
      } catch {
        // ignore
      }
    }
  }, []);

  const cancelPendingPostRoll = useCallback(() => {
    if (postRollTimerRef.current) {
      clearTimeout(postRollTimerRef.current);
      postRollTimerRef.current = null;
    }
    if (postRollCountdownTimerRef.current) {
      clearInterval(postRollCountdownTimerRef.current);
      postRollCountdownTimerRef.current = null;
    }
    finalizePostRollNowRef.current = null;
    postRollActiveRef.current = false;
    postRollPromiseRef.current = null;
    setIsPostRollRecording(false);
    setPostRollRemainingSec(0);
    if (activeRunRecRef.current) {
      discardRecorderSlot(activeRunRecRef.current.slot);
      activeRunRecRef.current = null;
    }
    setIsRecording(false);
  }, [discardRecorderSlot]);

  // Live-update camera FPS constraint whenever user changes videoFps in Settings while camera is active
  useEffect(() => {
    if (!cameraActive || !mediaStreamRef.current) return;
    const track = mediaStreamRef.current.getVideoTracks?.()[0];
    if (track && typeof track.applyConstraints === 'function') {
      track
        .applyConstraints({ frameRate: { ideal: videoTargetFps, min: 30 } })
        .then(() => {
          const fpsNow = track.getSettings?.().frameRate;
          if (fpsNow) setActualCameraFps(Math.round(fpsNow));
        })
        .catch(() => {});
    }
  }, [cameraActive, videoTargetFps]);

  // Background Rolling Pre-Roll Buffer: always keeps 3.2s - 6.7s of video BEFORE start line is crossed!
  useEffect(() => {
    if (!cameraActive || !recordVideoOnRun) {
      cancelPendingPostRoll();
      discardRecorderSlot(primaryRecSlotRef.current);
      discardRecorderSlot(standbyRecSlotRef.current);
      primaryRecSlotRef.current = null;
      standbyRecSlotRef.current = null;
      return;
    }

    const maintainPreRoll = () => {
      const stream = mediaStreamRef.current;
      if (!stream || sensorStateRef.current.isRunning || postRollActiveRef.current) return;

      const now = performance.now();
      if (!primaryRecSlotRef.current) {
        primaryRecSlotRef.current = createRecorderSlot(stream);
        return;
      }

      const primaryAge = now - primaryRecSlotRef.current.startTs;
      if (primaryAge >= 3500 && !standbyRecSlotRef.current) {
        standbyRecSlotRef.current = createRecorderSlot(stream);
      }

      if (standbyRecSlotRef.current && now - standbyRecSlotRef.current.startTs >= 3200) {
        discardRecorderSlot(primaryRecSlotRef.current);
        primaryRecSlotRef.current = standbyRecSlotRef.current;
        standbyRecSlotRef.current = null;
      }
    };

    maintainPreRoll();
    const rollTimer = setInterval(maintainPreRoll, 450);
    return () => {
      clearInterval(rollTimer);
      cancelPendingPostRoll();
      discardRecorderSlot(primaryRecSlotRef.current);
      discardRecorderSlot(standbyRecSlotRef.current);
      primaryRecSlotRef.current = null;
      standbyRecSlotRef.current = null;
    };
  }, [cameraActive, recordVideoOnRun, createRecorderSlot, discardRecorderSlot, cancelPendingPostRoll]);

  // Lock active pre-roll slot onto the current run when timer starts.
  // If a previous climber's post-roll is still wrapping up, finalize it cleanly instead of discarding it!
  const startMediaRecording = useCallback(
    (climbStartTs: number) => {
      if (!mediaStreamRef.current || !recordVideoOnRun) return;
      if (finalizePostRollNowRef.current) {
        finalizePostRollNowRef.current();
      } else {
        cancelPendingPostRoll();
      }
      if (standbyRecSlotRef.current) {
        discardRecorderSlot(standbyRecSlotRef.current);
        standbyRecSlotRef.current = null;
      }
      if (!primaryRecSlotRef.current) {
        primaryRecSlotRef.current = createRecorderSlot(mediaStreamRef.current);
      }
      if (primaryRecSlotRef.current) {
        activeRunRecRef.current = {
          slot: primaryRecSlotRef.current,
          climbStartTs,
        };
        setIsRecording(true);
      }
    },
    [recordVideoOnRun, cancelPendingPostRoll, discardRecorderSlot, createRecorderSlot]
  );

  // Continue recording for configured margin (3s / 1s / 0s) AFTER crossing finish line, then attach clip & pose timeline
  const schedulePostRollStop = useCallback(
    (runSnapshot: SpeedRun, stopTs: number, calSnapshot: VideoCalibrationLines) => {
      const runId = runSnapshot.id;
      const capture = activeRunRecRef.current;
      if (!capture) {
        setIsRecording(false);
        return;
      }

      activeRunRecRef.current = null;
      if (primaryRecSlotRef.current === capture.slot) {
        primaryRecSlotRef.current = null;
      }

      const marginSec = sensorStateRef.current.videoTrimMarginSec;
      const recStartTs = capture.slot.startTs;
      const climbStartSec = Math.max(0, (capture.climbStartTs - recStartTs) / 1000);
      const climbEndSec = Math.max(climbStartSec + 0.05, (stopTs - recStartTs) / 1000);
      const timing: VideoTimingMeta = {
        preRollStartSec: Math.max(0, climbStartSec - marginSec),
        climbStartSec,
        climbEndSec,
        postRollEndSec: climbEndSec + marginSec,
      };

      postRollActiveRef.current = true;
      setIsPostRollRecording(marginSec > 0);
      setPostRollRemainingSec(marginSec);

      let finalized = false;
      const postRollPromise = new Promise<void>((resolvePostRoll) => {
        const finalizeNow = () => {
          if (finalized) return;
          finalized = true;
          if (postRollTimerRef.current) {
            clearTimeout(postRollTimerRef.current);
            postRollTimerRef.current = null;
          }
          if (postRollCountdownTimerRef.current) {
            clearInterval(postRollCountdownTimerRef.current);
            postRollCountdownTimerRef.current = null;
          }
          finalizePostRollNowRef.current = null;

          const finishWallTs = performance.now();
          const finalEndSec = Math.max(timing.climbEndSec + 0.2, (finishWallTs - recStartTs) / 1000);
          const resolvedTiming: VideoTimingMeta = {
            ...timing,
            postRollEndSec: Math.min(timing.postRollEndSec, finalEndSec),
          };

          const minAbs = recStartTs + (resolvedTiming.preRollStartSec - 0.15) * 1000;
          const maxAbs = recStartTs + (resolvedTiming.postRollEndSec + 0.25) * 1000;
          const poseTimeline: RecordedPoseSample[] = poseHistoryBufferRef.current
            .filter((s) => s.absTs >= minAbs && s.absTs <= maxAbs)
            .map((s) => ({
              tSec: Number(((s.absTs - recStartTs) / 1000).toFixed(3)),
              hands: s.hands,
              body: s.body,
              foot: s.foot,
              skeleton: s.skeleton,
            }));

          const slot = capture.slot;
          slot.recorder.onstop = () => {
            postRollActiveRef.current = false;
            if (postRollPromiseRef.current === postRollPromise) {
              postRollPromiseRef.current = null;
            }
            postRollPromisesByRunRef.current.delete(runId);
            setIsPostRollRecording(false);
            setPostRollRemainingSec(0);
            setIsRecording(false);

            if (slot.discarded) {
              resolvePostRoll();
              return;
            }

            const blob = new Blob(slot.chunks, { type: slot.mimeType || 'video/webm' });
            const videoUrl = URL.createObjectURL(blob);
            recordedPoseDataMapRef.current.set(runId, {
              videoUrl,
              timing: resolvedTiming,
              calibration: calSnapshot,
              poseTimeline,
            });
            updateRunVideo(runId, videoUrl);
            setRecordedVideoUrl((prevUrl) => (sensorStateRef.current.isRunning ? prevUrl : videoUrl));
            setFinishedRun((prev) => {
              if (!prev || prev.id !== runId) return prev;
              return {
                ...prev,
                videoUrl,
                videoTiming: resolvedTiming,
                videoCalibration: calSnapshot,
                poseTimeline,
              };
            });

            // Auto-save to background queue if enabled in Settings
            if (sensorStateRef.current.autoSaveVideoOnFinish) {
              const autoRun: SpeedRun = {
                ...runSnapshot,
                videoUrl,
                videoTiming: resolvedTiming,
                videoCalibration: calSnapshot,
                poseTimeline,
              };
              sensorStateRef.current.enqueueVideoExport(autoRun, 'download');
            }

            // Spin up rolling pre-roll recorder for the next attempt if idle
            if (mediaStreamRef.current && !sensorStateRef.current.isRunning && !primaryRecSlotRef.current) {
              primaryRecSlotRef.current = createRecorderSlot(mediaStreamRef.current);
            }
            resolvePostRoll();
          };

          if (slot.recorder.state === 'recording') {
            try {
              slot.recorder.stop();
            } catch {
              postRollActiveRef.current = false;
              postRollPromiseRef.current = null;
              postRollPromisesByRunRef.current.delete(runId);
              setIsPostRollRecording(false);
              setIsRecording(false);
              resolvePostRoll();
            }
          } else {
            postRollActiveRef.current = false;
            postRollPromiseRef.current = null;
            postRollPromisesByRunRef.current.delete(runId);
            setIsPostRollRecording(false);
            setIsRecording(false);
            resolvePostRoll();
          }
        };

        finalizePostRollNowRef.current = finalizeNow;

        if (marginSec <= 0) {
          postRollTimerRef.current = setTimeout(finalizeNow, 50);
        } else {
          let secsLeft: number = marginSec;
          postRollCountdownTimerRef.current = setInterval(() => {
            secsLeft = Math.max(1, secsLeft - 1);
            setPostRollRemainingSec(secsLeft);
          }, 980);
          postRollTimerRef.current = setTimeout(finalizeNow, marginSec * 1000);
        }
      });

      postRollPromiseRef.current = postRollPromise;
      postRollPromisesByRunRef.current.set(runId, postRollPromise);
    },
    [createRecorderSlot]
  );

  // Stop MediaRecorder cleanly (discarding if reset)
  const stopMediaRecording = useCallback(() => {
    cancelPendingPostRoll();
  }, [cancelPendingPostRoll]);

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
    const stopTs = performance.now();
    const finalMs = startTimeRef.current > 0 ? stopTs - startTimeRef.current : elapsedMs;
    startTimeRef.current = 0;
    ifscReactionPendingRef.current = false;
    setElapsedMs(finalMs);
    setIsRunning(false);
    setCountdownState('idle');
    playFinishFanfare();

    const totalSeconds = parseFloat((finalMs / 1000).toFixed(3));
    let s1 = split1TimeRef.current ?? split1Time;
    const rawS2 = split2TimeRef.current ?? split2Time;
    let s2: number | null = null;

    if (s1 !== null && rawS2 !== null) {
      s2 = parseFloat(Math.max(0.1, rawS2 - s1).toFixed(2));
    } else if (s1 === null && rawS2 !== null) {
      // Gate 2 crossed cleanly even if Gate 1 was missed — derive Gate 1 & Gate 2 from actual 10m/6.6m mark
      s1 = parseFloat((rawS2 * 0.48).toFixed(2));
      s2 = parseFloat(Math.max(0.1, rawS2 - s1).toFixed(2));
    } else if (s1 !== null && rawS2 === null) {
      const remaining = Math.max(0.2, totalSeconds - s1);
      s2 = parseFloat((remaining * 0.52).toFixed(2));
    }

    const resolvedS1 = s1 ?? parseFloat((totalSeconds * 0.31).toFixed(2));
    const resolvedS2 = s2 ?? parseFloat((totalSeconds * 0.35).toFixed(2));
    const resolvedS3 = parseFloat(Math.max(0.1, totalSeconds - resolvedS1 - resolvedS2).toFixed(2));

    const resolvedReaction = parseFloat((reactionTimeRef.current ?? reactionTime).toFixed(3));
    const resolvedFalseStart = Boolean(isFalseStartRef.current || isFalseStart);

    const finalRun: SpeedRun = {
      id: 'run-' + Date.now(),
      date: new Date().toISOString(),
      totalTime: totalSeconds,
      splits: {
        split1: resolvedS1,
        split2: resolvedS2,
        split3: resolvedS3,
      },
      reactionTime: resolvedReaction,
      isFalseStart: resolvedFalseStart,
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

    // Record configured post-roll margin after crossing red top finish line before finalizing clip
    schedulePostRollStop(persistedRun, stopTs, {
      startY: startZoneY,
      split1Y: split1ZoneY,
      split2Y: split2ZoneY,
      finishY: finishZoneY,
    });

    if (persistedRun.isPersonalBest && !resolvedFalseStart) {
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
    reactionTime,
    isFalseStart,
    selectedBeta,
    currentCategory,
    gymName,
    profile,
    lang,
    onRunFinished,
    schedulePostRollStop,
    startZoneY,
    split1ZoneY,
    split2ZoneY,
    finishZoneY,
  ]);

  // Start Timer Execution
  const startTimerNow = useCallback(
    (measuredReaction: number = 0.135, pendingCameraReaction: boolean = false) => {
      const isDQ = !pendingCameraReaction && measuredReaction < 0.100;
      isFalseStartRef.current = isDQ;
      ifscReactionPendingRef.current = pendingCameraReaction;
      reactionTimeRef.current = measuredReaction;

      if (isDQ) {
        setIsFalseStart(true);
        setFalseStartReason(`Ulilý start (${measuredReaction.toFixed(3)}s < 0.100s)`);
        playFalseStartAlarm();
      } else {
        setIsFalseStart(false);
        setFalseStartReason(null);
      }

      const startTs = performance.now();
      setReactionTime(measuredReaction);
      setElapsedMs(0);
      setSplit1Time(null);
      setSplit2Time(null);
      split1TimeRef.current = null;
      split2TimeRef.current = null;
      split1LineTriggeredRef.current = false;
      split2LineTriggeredRef.current = false;
      setRecordedVideoUrl(null);
      setPlaybackVideoSec(0);
      setIsPlaybackPlaying(false);
      setFinishedRun(null);
      setShowDeleteVideoConfirm(false);
      setEditingLine(null);
      setIsCalibrating(false);
      setDraggingLine(null);
      setIsRunning(true);
      setCountdownState('started');

      // Lock active pre-roll video recording onto this run
      startMediaRecording(startTs);

      startTimeRef.current = startTs;
      rafRef.current = requestAnimationFrame(updateTimer);
    },
    [updateTimer, startMediaRecording]
  );

  const clearCountdownTimeouts = useCallback(() => {
    countdownTimeoutsRef.current.forEach((t) => clearTimeout(t));
    countdownTimeoutsRef.current = [];
  }, []);

  const handlePreBeepFalseStart = useCallback(() => {
    clearCountdownTimeouts();
    ifscReactionPendingRef.current = false;
    footArmedBelowLineRef.current = false;
    isFalseStartRef.current = true;
    reactionTimeRef.current = 0;
    setReactionTime(0);
    setIsFalseStart(true);
    setFalseStartReason('Ulilý start! Noha opustila start před pípnutím.');
    setCountdownState('idle');
    playFalseStartAlarm();
    setCalibrationSavedToast('🚨 ULILÝ START! Noha opustila blok před pípnutím');
    setTimeout(() => setCalibrationSavedToast(null), 3500);
  }, [clearCountdownTimeouts]);

  // Official IFSC Countdown Sequence: "At your marks" -> "Ready" -> 3 Beeps -> Random hold -> High start beep
  // If starter voice commands are turned off in Settings, skips directly to electronic IFSC beeps.
  const triggerIFSCCountdown = useCallback(() => {
    if (isRunning) return;
    clearCountdownTimeouts();
    const audioConf = getStoredAudioSettings();
    isFalseStartRef.current = false;
    ifscReactionPendingRef.current = false;
    setIsFalseStart(false);
    setFalseStartReason(null);
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
        if (sensorStateRef.current.startMode === 'camera_motion') {
          startTimerNow(0.0, true);
        } else {
          const reaction = 0.115 + Math.random() * 0.045;
          startTimerNow(reaction, false);
        }
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
    ifscReactionPendingRef.current = false;
    isFalseStartRef.current = false;
    reactionTimeRef.current = 0.138;
    setIsRunning(false);
    setElapsedMs(0);
    setSplit1Time(null);
    setSplit2Time(null);
    split1LineTriggeredRef.current = false;
    split2LineTriggeredRef.current = false;
    footArmedBelowLineRef.current = false;
    setCountdownState('idle');
    setIsFalseStart(false);
    setFalseStartReason(null);
    setShowDeleteVideoConfirm(false);
    setEditingLine(null);
    setDraggingLine(null);
    stopMediaRecording();
  };

  const handleDeleteVideo = useCallback(() => {
    if (!finishedRun?.videoUrl) return;
    const isQueued =
      exportQueueRef.current.some((j) => j.run.id === finishedRun.id) ||
      activeExportRunIdRef.current === finishedRun.id;
    if (!isQueued) {
      try {
        URL.revokeObjectURL(finishedRun.videoUrl);
      } catch {
        // ignore
      }
      recordedPoseDataMapRef.current.delete(finishedRun.id);
    }
    removeRunVideo(finishedRun.id);
    setRecordedVideoUrl(null);
    setFinishedRun((prev) => (prev ? { ...prev, videoUrl: undefined } : null));
    setShowDeleteVideoConfirm(false);
  }, [finishedRun]);

  const handleDeleteRunAttempt = useCallback(() => {
    if (!finishedRun) return;
    const isQueued =
      exportQueueRef.current.some((j) => j.run.id === finishedRun.id) ||
      activeExportRunIdRef.current === finishedRun.id;
    if (finishedRun.videoUrl && !isQueued) {
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
            frameRate: { ideal: videoTargetFps, min: 30 },
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
      const trackSettings = stream.getVideoTracks()[0]?.getSettings?.();
      setActualCameraFps(trackSettings?.frameRate ? Math.round(trackSettings.frameRate) : null);
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
    lockedClimberRef.current = null;
    candidateBodiesRef.current = [];
    setTrackedPose(EMPTY_POSE);
    setSecondaryPoses([]);
    setLockedClimber(null);
    setIsPickingClimber(false);
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

  // Arm/Disarm AI Kamera or AI Zvuk Sensor (optionally runs IFSC Countdown in AI Kamera)
  const handleArmSensorStart = async () => {
    if (
      countdownState === 'armed' ||
      countdownState === 'marks' ||
      countdownState === 'ready' ||
      countdownState === 'beeps'
    ) {
      clearCountdownTimeouts();
      ifscReactionPendingRef.current = false;
      footArmedBelowLineRef.current = false;
      setCountdownState('idle');
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
    split1LineTriggeredRef.current = false;
    split2LineTriggeredRef.current = false;
    ifscReactionPendingRef.current = false;
    isFalseStartRef.current = false;
    setElapsedMs(0);
    setFinishedRun(null);
    setIsFalseStart(false);
    setFalseStartReason(null);

    if (startMode === 'camera_motion' && ifscStartWithCamera) {
      if (trackedPoseRef.current.active && trackedPoseRef.current.foot.y >= startZoneY - 2.0) {
        footArmedBelowLineRef.current = true;
      }
      triggerIFSCCountdown();
      return;
    }

    setCountdownState('armed');
  };

  // Keep dynamic sensor state & callbacks in a mutable ref so the sensor loop NEVER restarts on every timer tick!
  const sensorStateRef = useRef({
    startMode,
    ifscStartWithCamera,
    countdownState,
    isRunning,
    soundThreshold,
    sensitivityPreset,
    scannedSoundProfile,
    soundScanState,
    startZoneY,
    split1ZoneY,
    split2ZoneY,
    finishZoneY,
    videoTrimMarginSec,
    autoSaveVideoOnFinish,
    includePoseInVideo,
    videoTimeMode,
    videoTargetFps,
    enqueueVideoExport,
    startTimerNow,
    stopTimer,
    handlePreBeepFalseStart,
  });

  sensorStateRef.current = {
    startMode,
    ifscStartWithCamera,
    countdownState,
    isRunning,
    soundThreshold,
    sensitivityPreset,
    scannedSoundProfile,
    soundScanState,
    startZoneY,
    split1ZoneY,
    split2ZoneY,
    finishZoneY,
    videoTrimMarginSec,
    autoSaveVideoOnFinish,
    includePoseInVideo,
    videoTimeMode,
    videoTargetFps,
    enqueueVideoExport,
    startTimerNow,
    stopTimer,
    handlePreBeepFalseStart,
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
              numPoses: 4,
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

      // PRE-START FOOT MONITORING (False Start detection during IFSC countdown OR Instant Start when armed)
      if (!st.isRunning && st.startMode === 'camera_motion') {
        if (nextPose.foot.y >= st.startZoneY - 2.0) {
          footArmedBelowLineRef.current = true;
        }
        const footCrossedUpward =
          (prevFootY !== null && prevFootY >= st.startZoneY - 1.5 && nextPose.foot.y < st.startZoneY - 0.8) ||
          (footArmedBelowLineRef.current && nextPose.foot.y < st.startZoneY - 1.1);

        const isIfscPreStart =
          st.ifscStartWithCamera &&
          (st.countdownState === 'marks' || st.countdownState === 'ready' || st.countdownState === 'beeps');

        if (isIfscPreStart && footCrossedUpward) {
          setLastLineTrigger('start');
          setTimeout(() => setLastLineTrigger(null), 1500);
          st.handlePreBeepFalseStart();
          return;
        }

        if (st.countdownState === 'armed' && footCrossedUpward) {
          footArmedBelowLineRef.current = false;
          setLastLineTrigger('start');
          setTimeout(() => setLastLineTrigger(null), 1200);
          playIFSCStartTone();
          st.startTimerNow(0.125, false);
        }
      }

      // POST-BEEP REACTION MEASUREMENT: capture exact time when green foot dot leaves startZoneY
      if (st.isRunning && ifscReactionPendingRef.current) {
        if (nextPose.foot.y >= st.startZoneY - 2.0) {
          footArmedBelowLineRef.current = true;
        }
        const leftAfterBeep =
          (prevFootY !== null && prevFootY >= st.startZoneY - 1.5 && nextPose.foot.y < st.startZoneY - 0.8) ||
          (footArmedBelowLineRef.current && nextPose.foot.y < st.startZoneY - 1.0) ||
          (liveElapsedMs > 60 && nextPose.foot.y < st.startZoneY - 2.0);

        if (leftAfterBeep) {
          ifscReactionPendingRef.current = false;
          footArmedBelowLineRef.current = false;
          const measuredRt = Math.max(0.015, parseFloat((liveElapsedMs / 1000).toFixed(3)));
          reactionTimeRef.current = measuredRt;
          setReactionTime(measuredRt);
          setLastLineTrigger('start');
          setTimeout(() => setLastLineTrigger(null), 1200);

          if (measuredRt < 0.100) {
            isFalseStartRef.current = true;
            setIsFalseStart(true);
            setFalseStartReason(`Ulilý start (${measuredRt.toFixed(3)}s < 0.100s)`);
            playFalseStartAlarm();
            setCalibrationSavedToast(`🚨 ULILÝ START! Reakce ${measuredRt.toFixed(3)}s (< 0.100s)`);
          } else {
            setCalibrationSavedToast(`⚡ Reakce na startu: ${measuredRt.toFixed(3)}s`);
          }
          setTimeout(() => setCalibrationSavedToast(null), 2600);
        }
      }

      // LINE 2 TRIGGER (SPLIT 1 - 5m / 3.3m): Red Hands dot crosses upward past split1ZoneY
      if (st.isRunning && liveElapsedMs > 180 && !split1LineTriggeredRef.current) {
        if (nextPose.hands.y <= st.split1ZoneY + 0.5) {
          split1LineTriggeredRef.current = true;
          const splitSec = parseFloat((liveElapsedMs / 1000).toFixed(2));
          split1TimeRef.current = splitSec;
          setSplit1Time(splitSec);
          playSplitChime();
          setLastLineTrigger('split1');
          setTimeout(() => setLastLineTrigger(null), 1200);
        }
      }

      // LINE 3 TRIGGER (SPLIT 2 - 10m / 6.6m): Red Hands dot crosses upward past split2ZoneY
      if (st.isRunning && liveElapsedMs > 450 && !split2LineTriggeredRef.current) {
        if (nextPose.hands.y <= st.split2ZoneY + 0.5) {
          split2LineTriggeredRef.current = true;
          const cumulativeSec = parseFloat((liveElapsedMs / 1000).toFixed(2));
          split2TimeRef.current = cumulativeSec;
          setSplit2Time(cumulativeSec);
          playSplitChime();
          setLastLineTrigger('split2');
          setTimeout(() => setLastLineTrigger(null), 1200);
        }
      }

      // LINE 4 TRIGGER (TOP FINISH - 15m / 10m): Red Hands dot crosses/exceeds finishZoneY -> STOP CHRONO & SAVE
      if (st.isRunning && liveElapsedMs > 900) {
        if (nextPose.hands.y <= st.finishZoneY + 0.5) {
          setLastLineTrigger('finish');
          setTimeout(() => setLastLineTrigger(null), 1200);
          st.stopTimer();
        }
      }
    };

    const extractRawFromLandmarks = (lms: NormalizedLandmark[]): TrackedPose | null => {
      if (!lms || lms.length < 25) return null;

      const isVisible = (idx: number, minVis = 0.14) => {
        const pt = lms[idx];
        return pt && (pt.visibility === undefined || pt.visibility >= minVis);
      };

      const clampPct = (v: number) => Math.max(1, Math.min(99, v * 100));

      // 1) Hands (Ruka): pick highest visible reaching hand
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

      // 3) Foot (Noha): pick lowest/trailing visible foot point
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
        hands: { x: rawHandsX, y: rawHandsY },
        body: { x: rawBodyX, y: rawBodyY },
        foot: { x: rawFootX, y: rawFootY },
        confidence: Math.min(100, Math.round(avgVis * 100)),
        source: 'mediapipe',
        skeleton,
      };
    };

    const smoothPose = (rawPose: TrackedPose): TrackedPose => {
      const prev = trackedPoseRef.current;
      const isContinuous =
        prev.active &&
        prev.source === 'mediapipe' &&
        Math.hypot(prev.body.x - rawPose.body.x, prev.body.y - rawPose.body.y) < 28;
      if (!isContinuous) return rawPose;
      const alpha = 0.72;
      const lerp = (a: number, b: number) => a + (b - a) * alpha;
      return {
        ...rawPose,
        hands: { x: lerp(prev.hands.x, rawPose.hands.x), y: lerp(prev.hands.y, rawPose.hands.y) },
        body: { x: lerp(prev.body.x, rawPose.body.x), y: lerp(prev.body.y, rawPose.body.y) },
        foot: { x: lerp(prev.foot.x, rawPose.foot.x), y: lerp(prev.foot.y, rawPose.foot.y) },
      };
    };

    const processCameraFrame = () => {
      if (stopped) return;
      const st = sensorStateRef.current;
      const nowMs = performance.now();
      // During background export while idle, throttle MediaPipe slightly; full speed whenever a run/countdown is active!
      if (isExportingVideoRef.current && !st.isRunning && st.countdownState === 'idle') {
        if (nowMs - lastBgThrottleRef.current < 110) return;
        lastBgThrottleRef.current = nowMs;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (st.startMode !== 'camera_motion' || !video || video.readyState < 2 || video.videoWidth === 0) {
        return;
      }

      // Primary Engine: Google MediaPipe PoseLandmarker (multi-pose + locked lane support)
      const landmarker = poseLandmarkerRef.current;
      if (landmarker) {
        try {
          const monotonicTs = Math.max(lastMediaPipeTsRef.current + 1, Math.round(nowMs));
          lastMediaPipeTsRef.current = monotonicTs;
          const result = landmarker.detectForVideo(video, monotonicTs);
          if (result.landmarks && result.landmarks.length > 0) {
            const rawPoses: TrackedPose[] = [];
            for (const lmSet of result.landmarks) {
              const extracted = extractRawFromLandmarks(lmSet);
              if (extracted) rawPoses.push(extracted);
            }

            if (rawPoses.length > 0) {
              candidateBodiesRef.current = rawPoses.map((p) => p.body);
              const lock = lockedClimberRef.current;
              let selectedIdx = -1;

              if (lock) {
                // Only match poses inside the locked climber's vertical climbing corridor (±20%)
                let bestScore = Infinity;
                for (let i = 0; i < rawPoses.length; i++) {
                  const p = rawPoses[i];
                  if (Math.abs(p.body.x - lock.laneX) <= 20) {
                    const distToLast = Math.hypot(p.body.x - lock.lastX, p.body.y - lock.lastY);
                    if (distToLast < bestScore) {
                      bestScore = distToLast;
                      selectedIdx = i;
                    }
                  }
                }
              } else if (trackedPoseRef.current.active && trackedPoseRef.current.source === 'mediapipe') {
                // Continuous nearest-person preference when unlocked
                let bestDist = Infinity;
                for (let i = 0; i < rawPoses.length; i++) {
                  const d = Math.hypot(
                    rawPoses[i].body.x - trackedPoseRef.current.body.x,
                    rawPoses[i].body.y - trackedPoseRef.current.body.y
                  );
                  if (d < bestDist) {
                    bestDist = d;
                    selectedIdx = i;
                  }
                }
              } else {
                selectedIdx = 0;
              }

              if (selectedIdx >= 0) {
                const chosenRaw = rawPoses[selectedIdx];
                if (lock) {
                  lock.lastX = chosenRaw.body.x;
                  lock.lastY = chosenRaw.body.y;
                  if (Math.abs(chosenRaw.body.x - lock.laneX) <= 12) {
                    lock.laneX = lock.laneX * 0.96 + chosenRaw.body.x * 0.04;
                  }
                }

                const pose = smoothPose(chosenRaw);
                const others = rawPoses.filter((_, idx) => idx !== selectedIdx).map((p) => p.body);
                const prevFootY = prevFootYRef.current;
                trackedPoseRef.current = pose;
                prevFootYRef.current = pose.foot.y;
                prevHandsYRef.current = pose.hands.y;

                // Record timestamped pose trajectory for optional video overlay export
                poseHistoryBufferRef.current.push({
                  absTs: nowMs,
                  hands: pose.hands,
                  body: pose.body,
                  foot: pose.foot,
                  skeleton: pose.skeleton,
                });
                if (!st.isRunning && !postRollActiveRef.current && poseHistoryBufferRef.current.length > 30) {
                  const cutoff = nowMs - 22000;
                  if (poseHistoryBufferRef.current[0].absTs < cutoff) {
                    poseHistoryBufferRef.current = poseHistoryBufferRef.current.filter((s) => s.absTs >= cutoff);
                  }
                }

                if (nowMs - lastMotionUpdateRef.current > 30) {
                  lastMotionUpdateRef.current = nowMs;
                  setTrackedPose(pose);
                  setSecondaryPoses(others);
                }

                triggerLineEvents(pose, prevFootY, nowMs);
                return;
              } else if (lock) {
                // Locked climber temporarily occluded while passerby walks outside corridor: DO NOT switch to passerby!
                if (nowMs - lastMotionUpdateRef.current > 180) {
                  lastMotionUpdateRef.current = nowMs;
                  trackedPoseRef.current = EMPTY_POSE;
                  prevFootYRef.current = null;
                  prevHandsYRef.current = null;
                  setTrackedPose(EMPTY_POSE);
                  setSecondaryPoses(rawPoses.map((p) => p.body));
                }
                return;
              }
            }
          } else {
            candidateBodiesRef.current = [];
            if (trackedPoseRef.current.active && nowMs - lastMotionUpdateRef.current > 240) {
              lastMotionUpdateRef.current = nowMs;
              trackedPoseRef.current = EMPTY_POSE;
              prevFootYRef.current = null;
              prevHandsYRef.current = null;
              setTrackedPose(EMPTY_POSE);
              setSecondaryPoses([]);
            }
            return;
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
        const activeLock = lockedClimberRef.current;
        const corridorCenterX = activeLock
          ? (activeLock.laneX / 100) * W
          : trackedPoseRef.current.active
          ? (trackedPoseRef.current.body.x / 100) * W
          : W * 0.5;
        const corridorHalfW = activeLock ? W * 0.2 : W * 0.44;
        const restrictCorridor = Boolean(activeLock) || trackedPoseRef.current.active;

        for (let y = 1; y < H - 1; y++) {
          let count = 0;
          let sx = 0;
          for (let x = 2; x < W - 2; x++) {
            if (restrictCorridor && Math.abs(x - corridorCenterX) > corridorHalfW) continue;
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

          candidateBodiesRef.current = [nextPose.body];
          const prevFootY = prevFootYRef.current;
          trackedPoseRef.current = nextPose;
          prevFootYRef.current = nextPose.foot.y;
          prevHandsYRef.current = nextPose.hands.y;

          poseHistoryBufferRef.current.push({
            absTs: nowMs,
            hands: nextPose.hands,
            body: nextPose.body,
            foot: nextPose.foot,
            skeleton: nextPose.skeleton,
          });
          if (!st.isRunning && !postRollActiveRef.current && poseHistoryBufferRef.current.length > 30) {
            const cutoff = nowMs - 22000;
            if (poseHistoryBufferRef.current[0].absTs < cutoff) {
              poseHistoryBufferRef.current = poseHistoryBufferRef.current.filter((s) => s.absTs >= cutoff);
            }
          }

          if (nowMs - lastMotionUpdateRef.current > 35) {
            lastMotionUpdateRef.current = nowMs;
            setTrackedPose(nextPose);
            setSecondaryPoses([]);
          }

          triggerLineEvents(nextPose, prevFootY, nowMs);
        } else {
          candidateBodiesRef.current = [];
          if (trackedPoseRef.current.active && nowMs - lastMotionUpdateRef.current > 240) {
            lastMotionUpdateRef.current = nowMs;
            trackedPoseRef.current = EMPTY_POSE;
            prevFootYRef.current = null;
            prevHandsYRef.current = null;
            setTrackedPose(EMPTY_POSE);
            setSecondaryPoses([]);
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
      if (postRollTimerRef.current) clearTimeout(postRollTimerRef.current);
      if (postRollCountdownTimerRef.current) clearInterval(postRollCountdownTimerRef.current);
      discardRecorderSlot(primaryRecSlotRef.current);
      discardRecorderSlot(standbyRecSlotRef.current);
      if (activeRunRecRef.current) discardRecorderSlot(activeRunRecRef.current.slot);
    };
  }, [discardRecorderSlot]);

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

  // Gesture 1: Swipe Left (1 finger) -> Save Run / Video in Background (or Calibration)
  const handleGestureSave = async () => {
    if (isRunning) {
      showGestureFeedback('Nejprve dokončete výlez (stop), poté přejetím doleva uložíte.');
      return;
    }
    if (finishedRun) {
      enqueueRunSaveAndReadyNext('download', finishedRun);
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
      setFinishedRun(null);
      setRecordedVideoUrl(null);
      showGestureFeedback('🗑️ Rozběhnutý pokus zrušen a smazán');
      return;
    }
    if (finishedRun) {
      cancelPendingPostRoll();
      handleDeleteRunAttempt();
      setElapsedMs(0);
      setRecordedVideoUrl(null);
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
    if (!isCameraExpanded) {
      touchGestureRef.current.active = false;
      return;
    }
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
    if (!isCameraExpanded) return;
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
    if (!isCameraExpanded || !state.active) {
      state.active = false;
      setSwipePreview(null);
      return;
    }

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

      {/* Quick 1-Tap Climber Switcher Bar (fast changeover while video exports in background) */}
      <div className="relative flex flex-wrap items-center justify-between gap-2 px-2.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <Users className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">Lezec:</span>
          {climberProfiles.slice(0, 4).map((p) => {
            const isActive = p.id === profile.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={isRunning}
                onClick={() => handleSwitchClimber(p.id)}
                className={`min-h-[32px] px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1 border disabled:opacity-50 ${
                  isActive
                    ? 'bg-red-600 text-white border-red-500 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{p.flagEmoji || '🧗'}</span>
                <span className="truncate max-w-[96px]">{p.name}</span>
              </button>
            );
          })}
          <button
            type="button"
            disabled={isRunning}
            onClick={() => {
              setClimberProfiles(getAllProfiles());
              setShowClimberSwitcher((prev) => !prev);
            }}
            className="min-h-[32px] px-2.5 py-1 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 disabled:opacity-50"
            title="Další lezci nebo rychlé přidání lezce"
          >
            {climberProfiles.length > 4 ? (
              <>
                <span>+{climberProfiles.length - 4}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Další</span>
              </>
            )}
          </button>
        </div>

        {/* Camera Live Toggle & Live Scene Actions (other camera/video preferences live in Settings) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={toggleCamera}
            className={`min-h-[36px] px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              cameraActive
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>{cameraActive ? 'Kamera aktivní' : 'Aktivovat kameru'}</span>
          </button>

          {cameraActive && (
            <>
              {isAiCameraMode && (
                <>
                  <button
                    onClick={() => {
                      const next = !isCalibrating;
                      setIsCalibrating(next);
                      if (!next) {
                        setEditingLine(null);
                      }
                    }}
                    className={`min-h-[36px] px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1 border ${
                      isCalibrating
                        ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-300 dark:border-red-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200'
                    }`}
                    title="Kalibrace linií Start, 5m/3.3m, 10m/6.6m a Cíl"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Kalibrace</span>
                  </button>

                  <button
                    type="button"
                    onClick={captureWallBackground}
                    className={`min-h-[36px] px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1 border ${
                      wallBgReady
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200'
                    }`}
                    title="Naskenovat prázdnou stěnu pro přesnější AI sledování"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Naskenovat stěnu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (lockedClimber) {
                        unlockClimber();
                      } else {
                        setIsPickingClimber((prev) => !prev);
                      }
                    }}
                    className={`min-h-[36px] px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1 border ${
                      lockedClimber
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-400 dark:border-emerald-700'
                        : isPickingClimber
                        ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-400 animate-pulse'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200'
                    }`}
                    title="Kliknutím na osobu v obraze ji zafixujete, aby kolemjdoucí nenarušili sledování"
                  >
                    {lockedClimber ? <Lock className="w-3.5 h-3.5 text-emerald-500" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span>
                      {lockedClimber
                        ? 'Zafixováno'
                        : isPickingClimber
                        ? 'Klepni na lezce'
                        : 'Zafixovat osobu'}
                    </span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setIsCameraExpanded((prev) => !prev)}
                className={`min-h-[36px] px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1 border ${
                  isCameraExpanded
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-900 dark:bg-slate-800 text-white border-slate-700 hover:bg-slate-800'
                }`}
                title="Roztáhnout kameru přes celý displej"
              >
                {isCameraExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Expand className="w-3.5 h-3.5" />}
                <span>{isCameraExpanded ? 'Zmenšit' : 'Celý displej'}</span>
              </button>

              <button
                onClick={switchCameraFacing}
                title="Otočit kameru (Přední / Zadní)"
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Climber Picker + Quick Add Dropdown */}
        {showClimberSwitcher && !isCameraExpanded && (
          <div className="w-full pt-2 mt-1 border-t border-slate-200 dark:border-slate-800 space-y-2 animate-in fade-in">
            <div className="flex flex-wrap gap-1.5">
              {climberProfiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSwitchClimber(p.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                    p.id === profile.id
                      ? 'bg-red-600 text-white border-red-500'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-transparent hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span>{p.flagEmoji || '🧗'}</span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
            <form onSubmit={handleQuickCreateClimber} className="flex items-center gap-1.5">
              <input
                type="text"
                value={newClimberName}
                onChange={(e) => setNewClimberName(e.target.value)}
                placeholder="Nový lezec (např. Jana Nová)..."
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Přidat</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Non-blocking Background Video Export & Cloud Ready Banner (normal view) */}
      {(bgExportUi.pendingCount > 0 || bgExportUi.finishedToast || bgExportUi.readyShareJob) && !isCameraExpanded && (
        <div className="px-3 py-2 rounded-2xl bg-slate-900 text-white border border-slate-700/80 shadow-md flex flex-wrap items-center justify-between gap-2 text-xs">
          {bgExportUi.pendingCount > 0 ? (
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>
                Ukládám video na pozadí ({bgExportUi.pendingCount}): {bgExportUi.activeLabel}
              </span>
            </div>
          ) : bgExportUi.readyShareJob ? (
            <div className="flex flex-wrap items-center justify-between gap-2 w-full">
              <span className="font-bold text-blue-200">
                ☁️ Připraveno pro Disk: {bgExportUi.readyShareJob.filename}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void handleTriggerReadyShare()}
                  className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Odeslat</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadReadyShare}
                  className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Stáhnout</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBgExportUi((prev) => ({ ...prev, readyShareJob: null }))}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 font-bold text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{bgExportUi.finishedToast}</span>
            </div>
          )}
        </div>
      )}

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

      {/* Direct On-Screen Calibration Active — controls sit inside the camera viewfinder (zero scrolling needed!) */}

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
            className={`relative bg-black overflow-hidden flex items-center justify-center select-none transition-all duration-300 group cursor-pointer ${
              isCameraExpanded
                ? 'flex-1 min-h-0 w-full rounded-none border-0 touch-none'
                : cameraFit === 'contain'
                ? `w-full h-[68vh] min-h-[520px] max-h-[820px] rounded-3xl border-2 border-slate-800 shadow-2xl hover:ring-2 hover:ring-red-500/40 ${
                    draggingLine ? 'touch-none' : 'touch-pan-y'
                  }`
                : `w-full aspect-[4/3] sm:aspect-video rounded-3xl border-2 border-slate-800 shadow-2xl hover:ring-2 hover:ring-red-500/40 ${
                    draggingLine ? 'touch-none' : 'touch-pan-y'
                  }`
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

            {/* Quick Tap Action Floating Badge at Top (hidden during fullscreen expanded mode and line calibration) */}
            {!isCameraExpanded && !(isAiCameraMode && (isCalibrating || editingLine)) && (
              <div className="absolute top-3 left-3 right-3 flex items-center justify-center pointer-events-none z-20">
                <div className="px-3 py-1 rounded-full bg-slate-950/80 text-white/90 text-[11px] font-bold border border-white/20 shadow-md backdrop-blur-sm flex items-center gap-1.5">
                  <Play className="w-3 h-3 fill-current text-red-500" />
                  <span>
                    👆 Klepněte pro{' '}
                    <strong className="text-white">
                      {isRunning
                        ? 'DOHMAT (STOP)'
                        : countdownState === 'armed' ||
                          countdownState === 'marks' ||
                          countdownState === 'ready' ||
                          countdownState === 'beeps'
                        ? 'ZRUŠENÍ STARTU'
                        : isAiCameraMode && ifscStartWithCamera
                        ? 'IFSC START + AI'
                        : 'START ČASOMÍRY'}
                    </strong>
                  </span>
                </div>
              </div>
            )}

            {/* Calibration Live Toast inside Viewfinder (no scrolling to read confirmation) */}
            {calibrationSavedToast && !swipePreview && (
              <div className="absolute top-3 left-3 right-3 flex justify-center pointer-events-none z-40">
                <div className="px-3 py-1.5 rounded-full bg-emerald-950/90 text-emerald-200 text-[11px] font-bold border border-emerald-400/50 shadow-xl backdrop-blur-md">
                  {calibrationSavedToast}
                </div>
              </div>
            )}

            {/* Floating Expand/Collapse Button right inside Viewfinder for easy 1-tap reach on phone */}
            {!isCameraExpanded && !isCalibrating && !editingLine && (
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

            {/* Picking Climber Prompt Toast */}
            {isAiCameraMode && isPickingClimber && (
              <div className="absolute top-3 left-3 right-3 flex justify-center pointer-events-none z-40">
                <div className="px-3.5 py-1.5 rounded-full bg-amber-500 text-slate-950 text-xs font-black shadow-xl animate-pulse">
                  👆 Klepněte přímo na lezce, kterého chcete zafixovat
                </div>
              </div>
            )}

            {/* Fullscreen Floating Background Export Status Pill */}
            {isCameraExpanded && (bgExportUi.pendingCount > 0 || bgExportUi.finishedToast || bgExportUi.readyShareJob) && (
              <div
                data-no-gesture="true"
                onClick={(e) => e.stopPropagation()}
                className="absolute top-3 left-3 right-3 z-40 flex justify-center pointer-events-auto"
              >
                {bgExportUi.pendingCount > 0 ? (
                  <div className="px-3 py-1.5 rounded-full bg-slate-950/90 border border-amber-400/50 text-amber-200 text-[11px] font-bold shadow-xl backdrop-blur-md flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>
                      Ukládám na pozadí ({bgExportUi.pendingCount}): {bgExportUi.activeLabel}
                    </span>
                  </div>
                ) : bgExportUi.readyShareJob ? (
                  <div className="px-3 py-1.5 rounded-2xl bg-slate-950/95 border border-blue-400/60 text-white text-[11px] font-bold shadow-xl backdrop-blur-md flex flex-wrap items-center gap-2">
                    <span className="text-blue-200">☁️ Připraveno pro Disk</span>
                    <button
                      type="button"
                      onClick={() => void handleTriggerReadyShare()}
                      className="px-2 py-0.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold"
                    >
                      Odeslat
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadReadyShare}
                      className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                    >
                      Stáhnout
                    </button>
                    <button
                      type="button"
                      onClick={() => setBgExportUi((prev) => ({ ...prev, readyShareJob: null }))}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="px-3 py-1.5 rounded-full bg-emerald-950/90 border border-emerald-400/50 text-emerald-200 text-[11px] font-bold shadow-xl backdrop-blur-md">
                    {bgExportUi.finishedToast}
                  </div>
                )}
              </div>
            )}

            {/* Floating Lock/Unlock & 1-Tap Climber Switcher inside Fullscreen Camera */}
            {isCameraExpanded && !isCalibrating && !editingLine && !finishedRun && (
              <div
                data-no-gesture="true"
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-3 left-3 z-30 flex flex-wrap items-center gap-1.5"
              >
                {showClimberSwitcher && (
                  <div className="absolute bottom-full mb-2 left-0 w-64 p-2 rounded-2xl bg-slate-950/95 border border-white/20 backdrop-blur-md shadow-2xl space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase px-1">Přepnout lezce</div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {climberProfiles.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSwitchClimber(p.id)}
                          className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold flex items-center justify-between ${
                            p.id === profile.id
                              ? 'bg-red-600 text-white'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-200'
                          }`}
                        >
                          <span className="truncate">
                            {p.flagEmoji || '🧗'} {p.name}
                          </span>
                          {p.id === profile.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  disabled={isRunning}
                  onClick={() => {
                    setClimberProfiles(getAllProfiles());
                    setShowClimberSwitcher((prev) => !prev);
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-white/20 bg-slate-950/85 hover:bg-slate-900 text-white shadow-lg backdrop-blur-sm flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                  title="Rychle přepnout lezce pro další pokus"
                >
                  <span>{profile.flagEmoji || '🧗'}</span>
                  <span className="max-w-[90px] truncate">{profile.name}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isAiCameraMode && (
                  <button
                    type="button"
                    onClick={() => {
                      if (lockedClimber) {
                        unlockClimber();
                      } else {
                        setIsPickingClimber((prev) => !prev);
                      }
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border shadow-lg backdrop-blur-sm flex items-center gap-1.5 transition-all active:scale-95 ${
                      lockedClimber
                        ? 'bg-emerald-950/85 text-emerald-200 border-emerald-400/60'
                        : isPickingClimber
                        ? 'bg-amber-500 text-slate-950 border-amber-200 animate-pulse'
                        : 'bg-slate-950/85 hover:bg-slate-900 text-white border-white/20'
                    }`}
                    title="Klepněte na osobu v obraze pro zafixování sledování"
                  >
                    {lockedClimber ? (
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {lockedClimber
                        ? 'Zafixováno · Odemknout'
                        : isPickingClimber
                        ? 'Klepni na osobu...'
                        : 'Zafixovat osobu'}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* AI Kamera Overlay ONLY: Aligned 1:1 with rendered video pixels */}
            {isAiCameraMode && (showGuides || isCalibrating) && (
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
                {/* Locked Climber Vertical Corridor Indicator */}
                {lockedClimber && (
                  <div
                    style={{
                      left: `${Math.max(0, lockedClimber.laneX - 20)}%`,
                      width: `${Math.min(100, lockedClimber.laneX + 20) - Math.max(0, lockedClimber.laneX - 20)}%`,
                    }}
                    className="absolute top-0 bottom-0 border-x border-dashed border-emerald-400/45 bg-emerald-500/[0.04]"
                  />
                )}

                {/* Subtle vertical center guide */}
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px border-l border-dashed border-white/15" />

                {/* 🔴 TOP LINE: Finish (Red Hands Dot) - Hold ~0.3s to calibrate & drag */}
                <div
                  data-calibration-line="true"
                  style={{ top: `${finishZoneY}%` }}
                  onContextMenu={(e) => {
                    if (isAiCameraMode && showGuides && !isRunning) e.preventDefault();
                  }}
                  onPointerDown={(e) => handleLinePointerDown('hand', e)}
                  onPointerMove={(e) => handleLinePointerMove('hand', e)}
                  onPointerUp={(e) => handleLinePointerUp('hand', e)}
                  onPointerCancel={(e) => handleLinePointerUp('hand', e)}
                  onClick={(e) => {
                    if (editingLine === 'hand' || isCalibrating || justDraggedRef.current) {
                      e.stopPropagation();
                    } else if (editingLine) {
                      e.stopPropagation();
                      setEditingLine('hand');
                    }
                  }}
                  className={`absolute left-2 right-2 -translate-y-1/2 py-4 flex items-center ${
                    !isRunning
                      ? editingLine === 'hand' || isCalibrating
                        ? 'pointer-events-auto cursor-ns-resize touch-none z-20'
                        : 'pointer-events-auto cursor-grab touch-pan-y'
                      : 'pointer-events-none'
                  }`}
                >
                  <div
                    className={`w-full border-t-2 relative transition-shadow ${
                      draggingLine === 'hand' || editingLine === 'hand'
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
                          draggingLine === 'hand' || editingLine === 'hand'
                            ? 'border-white scale-105 ring-2 ring-red-400'
                            : isCalibrating
                            ? 'border-red-400 ring-1 ring-red-400/50'
                            : 'border-red-500/60'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span>CÍL – Ruka ({routeDef.heightMeters}m)</span>
                        {(isCalibrating || editingLine === 'hand') && <span className="text-red-300 font-black">↕</span>}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-black/85 text-red-300 font-mono text-[9px] border border-red-500/50">
                        Y:{finishZoneY}%
                      </span>
                    </div>

                    {editingLine === 'hand' && !isRunning && (
                      <div
                        data-no-gesture="true"
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerMove={(e) => e.stopPropagation()}
                        onPointerUp={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-950/95 border border-red-400/70 shadow-2xl backdrop-blur-md whitespace-nowrap ${
                          finishZoneY < 24 ? 'top-full mt-2' : 'bottom-full mb-2'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => updateCalibration('finishY', -1)}
                          className="w-8 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black text-sm flex items-center justify-center"
                          title="Posunout výš (-1%)"
                        >
                          −
                        </button>
                        <span className="px-2 font-mono text-[11px] font-black text-red-200 min-w-[44px] text-center">
                          {finishZoneY}%
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCalibration('finishY', 1)}
                          className="w-8 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black text-sm flex items-center justify-center"
                          title="Posunout níž (+1%)"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            saveCalibrationExplicit();
                            setEditingLine(null);
                            setIsCalibrating(false);
                          }}
                          className="ml-1 px-2.5 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-[11px] font-bold flex items-center gap-1"
                          title="Uložit a zavřít"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 🟣 SPLIT 2 LINE (10m / 6.6m): Red Hands Dot - Hold ~0.3s to calibrate & drag */}
                <div
                  data-calibration-line="true"
                  style={{ top: `${split2ZoneY}%` }}
                  onContextMenu={(e) => {
                    if (isAiCameraMode && showGuides && !isRunning) e.preventDefault();
                  }}
                  onPointerDown={(e) => handleLinePointerDown('split2', e)}
                  onPointerMove={(e) => handleLinePointerMove('split2', e)}
                  onPointerUp={(e) => handleLinePointerUp('split2', e)}
                  onPointerCancel={(e) => handleLinePointerUp('split2', e)}
                  onClick={(e) => {
                    if (editingLine === 'split2' || isCalibrating || justDraggedRef.current) {
                      e.stopPropagation();
                    } else if (editingLine) {
                      e.stopPropagation();
                      setEditingLine('split2');
                    }
                  }}
                  className={`absolute left-2 right-2 -translate-y-1/2 py-4 flex items-center ${
                    !isRunning
                      ? editingLine === 'split2' || isCalibrating
                        ? 'pointer-events-auto cursor-ns-resize touch-none z-20'
                        : 'pointer-events-auto cursor-grab touch-pan-y'
                      : 'pointer-events-none'
                  }`}
                >
                  <div
                    className={`w-full border-t-2 relative transition-shadow ${
                      draggingLine === 'split2' || editingLine === 'split2'
                        ? 'border-violet-200 shadow-[0_0_20px_rgba(167,139,250,1)]'
                        : lastLineTrigger === 'split2' || split2Time !== null
                        ? 'border-violet-300 shadow-[0_0_16px_rgba(167,139,250,0.95)]'
                        : isCalibrating
                        ? 'border-violet-400'
                        : 'border-dashed border-violet-400/90'
                    }`}
                  >
                    <div className="flex items-center justify-between -translate-y-1/2 px-1">
                      <span
                        className={`px-2 py-0.5 rounded-full bg-violet-950/90 border text-violet-100 text-[10px] font-bold shadow-md flex items-center gap-1.5 transition-transform ${
                          draggingLine === 'split2' || editingLine === 'split2'
                            ? 'border-white scale-105 ring-2 ring-violet-400'
                            : isCalibrating
                            ? 'border-violet-400 ring-1 ring-violet-400/50'
                            : 'border-violet-500/60'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-violet-400" />
                        <span>
                          2. MEZIČAS – Ruka ({isYouthCategory ? '6.6m' : '10m'})
                          {split2Time !== null ? ` · ${split2Time.toFixed(2)}s` : ''}
                        </span>
                        {(isCalibrating || editingLine === 'split2') && (
                          <span className="text-violet-300 font-black">↕</span>
                        )}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-black/85 text-violet-300 font-mono text-[9px] border border-violet-500/50">
                        Y:{split2ZoneY}%
                      </span>
                    </div>

                    {editingLine === 'split2' && !isRunning && (
                      <div
                        data-no-gesture="true"
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerMove={(e) => e.stopPropagation()}
                        onPointerUp={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-950/95 border border-violet-400/70 shadow-2xl backdrop-blur-md whitespace-nowrap ${
                          split2ZoneY < 24 ? 'top-full mt-2' : 'bottom-full mb-2'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => updateCalibration('split2Y', -1)}
                          className="w-8 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black text-sm flex items-center justify-center"
                          title="Posunout výš (-1%)"
                        >
                          −
                        </button>
                        <span className="px-2 font-mono text-[11px] font-black text-violet-200 min-w-[44px] text-center">
                          {split2ZoneY}%
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCalibration('split2Y', 1)}
                          className="w-8 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black text-sm flex items-center justify-center"
                          title="Posunout níž (+1%)"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            saveCalibrationExplicit();
                            setEditingLine(null);
                            setIsCalibrating(false);
                          }}
                          className="ml-1 px-2.5 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-[11px] font-bold flex items-center gap-1"
                          title="Uložit a zavřít"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 🔵 SPLIT 1 LINE (5m / 3.3m): Red Hands Dot - Hold ~0.3s to calibrate & drag */}
                <div
                  data-calibration-line="true"
                  style={{ top: `${split1ZoneY}%` }}
                  onContextMenu={(e) => {
                    if (isAiCameraMode && showGuides && !isRunning) e.preventDefault();
                  }}
                  onPointerDown={(e) => handleLinePointerDown('split1', e)}
                  onPointerMove={(e) => handleLinePointerMove('split1', e)}
                  onPointerUp={(e) => handleLinePointerUp('split1', e)}
                  onPointerCancel={(e) => handleLinePointerUp('split1', e)}
                  onClick={(e) => {
                    if (editingLine === 'split1' || isCalibrating || justDraggedRef.current) {
                      e.stopPropagation();
                    } else if (editingLine) {
                      e.stopPropagation();
                      setEditingLine('split1');
                    }
                  }}
                  className={`absolute left-2 right-2 -translate-y-1/2 py-4 flex items-center ${
                    !isRunning
                      ? editingLine === 'split1' || isCalibrating
                        ? 'pointer-events-auto cursor-ns-resize touch-none z-20'
                        : 'pointer-events-auto cursor-grab touch-pan-y'
                      : 'pointer-events-none'
                  }`}
                >
                  <div
                    className={`w-full border-t-2 relative transition-shadow ${
                      draggingLine === 'split1' || editingLine === 'split1'
                        ? 'border-blue-200 shadow-[0_0_20px_rgba(96,165,250,1)]'
                        : lastLineTrigger === 'split1' || split1Time !== null
                        ? 'border-blue-300 shadow-[0_0_16px_rgba(96,165,250,0.95)]'
                        : isCalibrating
                        ? 'border-blue-400'
                        : 'border-dashed border-blue-400/90'
                    }`}
                  >
                    <div className="flex items-center justify-between -translate-y-1/2 px-1">
                      <span
                        className={`px-2 py-0.5 rounded-full bg-blue-950/90 border text-blue-100 text-[10px] font-bold shadow-md flex items-center gap-1.5 transition-transform ${
                          draggingLine === 'split1' || editingLine === 'split1'
                            ? 'border-white scale-105 ring-2 ring-blue-400'
                            : isCalibrating
                            ? 'border-blue-400 ring-1 ring-blue-400/50'
                            : 'border-blue-500/60'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        <span>
                          1. MEZIČAS – Ruka ({isYouthCategory ? '3.3m' : '5m'})
                          {split1Time !== null ? ` · ${split1Time.toFixed(2)}s` : ''}
                        </span>
                        {(isCalibrating || editingLine === 'split1') && (
                          <span className="text-blue-300 font-black">↕</span>
                        )}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-black/85 text-blue-300 font-mono text-[9px] border border-blue-500/50">
                        Y:{split1ZoneY}%
                      </span>
                    </div>

                    {editingLine === 'split1' && !isRunning && (
                      <div
                        data-no-gesture="true"
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerMove={(e) => e.stopPropagation()}
                        onPointerUp={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-950/95 border border-blue-400/70 shadow-2xl backdrop-blur-md whitespace-nowrap ${
                          split1ZoneY < 24 ? 'top-full mt-2' : 'bottom-full mb-2'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => updateCalibration('split1Y', -1)}
                          className="w-8 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black text-sm flex items-center justify-center"
                          title="Posunout výš (-1%)"
                        >
                          −
                        </button>
                        <span className="px-2 font-mono text-[11px] font-black text-blue-200 min-w-[44px] text-center">
                          {split1ZoneY}%
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCalibration('split1Y', 1)}
                          className="w-8 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black text-sm flex items-center justify-center"
                          title="Posunout níž (+1%)"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            saveCalibrationExplicit();
                            setEditingLine(null);
                            setIsCalibrating(false);
                          }}
                          className="ml-1 px-2.5 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-[11px] font-bold flex items-center gap-1"
                          title="Uložit a zavřít"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 🟢 BOTTOM LINE: Start (Green Foot Dot) - Hold ~0.3s to calibrate & drag */}
                <div
                  data-calibration-line="true"
                  style={{ top: `${startZoneY}%` }}
                  onContextMenu={(e) => {
                    if (isAiCameraMode && showGuides && !isRunning) e.preventDefault();
                  }}
                  onPointerDown={(e) => handleLinePointerDown('foot', e)}
                  onPointerMove={(e) => handleLinePointerMove('foot', e)}
                  onPointerUp={(e) => handleLinePointerUp('foot', e)}
                  onPointerCancel={(e) => handleLinePointerUp('foot', e)}
                  onClick={(e) => {
                    if (editingLine === 'foot' || isCalibrating || justDraggedRef.current) {
                      e.stopPropagation();
                    } else if (editingLine) {
                      e.stopPropagation();
                      setEditingLine('foot');
                    }
                  }}
                  className={`absolute left-2 right-2 -translate-y-1/2 py-4 flex items-center ${
                    !isRunning
                      ? editingLine === 'foot' || isCalibrating
                        ? 'pointer-events-auto cursor-ns-resize touch-none z-20'
                        : 'pointer-events-auto cursor-grab touch-pan-y'
                      : 'pointer-events-none'
                  }`}
                >
                  <div
                    className={`w-full border-t-2 relative transition-shadow ${
                      draggingLine === 'foot' || editingLine === 'foot'
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
                          draggingLine === 'foot' || editingLine === 'foot'
                            ? 'border-white scale-105 ring-2 ring-emerald-400'
                            : isCalibrating
                            ? 'border-emerald-400 ring-1 ring-emerald-400/50'
                            : 'border-emerald-500/60'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>START – Noha</span>
                        {(isCalibrating || editingLine === 'foot') && (
                          <span className="text-emerald-300 font-black">↕</span>
                        )}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-black/85 text-emerald-300 font-mono text-[9px] border border-emerald-500/50">
                        Y:{startZoneY}%
                      </span>
                    </div>

                    {editingLine === 'foot' && !isRunning && (
                      <div
                        data-no-gesture="true"
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerMove={(e) => e.stopPropagation()}
                        onPointerUp={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-950/95 border border-emerald-400/70 shadow-2xl backdrop-blur-md whitespace-nowrap ${
                          startZoneY < 24 ? 'top-full mt-2' : 'bottom-full mb-2'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => updateCalibration('startY', -1)}
                          className="w-8 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black text-sm flex items-center justify-center"
                          title="Posunout výš (-1%)"
                        >
                          −
                        </button>
                        <span className="px-2 font-mono text-[11px] font-black text-emerald-200 min-w-[44px] text-center">
                          {startZoneY}%
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCalibration('startY', 1)}
                          className="w-8 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black text-sm flex items-center justify-center"
                          title="Posunout níž (+1%)"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            saveCalibrationExplicit();
                            setEditingLine(null);
                            setIsCalibrating(false);
                          }}
                          className="ml-1 px-2.5 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-[11px] font-bold flex items-center gap-1"
                          title="Uložit a zavřít"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
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

                    {/* 🔵 Blue Dot = Torso/Body (Tělo) — Tap directly to Lock/Unlock Climber! */}
                    <button
                      type="button"
                      data-no-gesture="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (lockedClimber) {
                          unlockClimber();
                        } else {
                          lockOntoPoint(trackedPose.body.x, trackedPose.body.y);
                        }
                      }}
                      style={{ left: `${trackedPose.body.x}%`, top: `${trackedPose.body.y}%` }}
                      className="pointer-events-auto cursor-pointer absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 group/lock"
                      title={lockedClimber ? 'Zafixováno (klepnutím odemknete)' : 'Klepnutím zafixujete tohoto lezce'}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-blue-500 border-2 shadow-[0_0_12px_rgba(59,130,246,0.95)] transition-transform group-hover/lock:scale-125 ${
                          lockedClimber ? 'border-emerald-300 ring-4 ring-emerald-400/40' : 'border-white'
                        }`}
                      />
                      <span
                        className={`px-1.5 py-0.5 rounded text-white text-[9px] font-black shadow flex items-center gap-1 ${
                          lockedClimber ? 'bg-emerald-600/95 border border-emerald-300/70' : 'bg-blue-600/90'
                        }`}
                      >
                        {lockedClimber && <Lock className="w-2.5 h-2.5" />}
                        <span>{lockedClimber ? 'Zafixováno' : 'Tělo'}</span>
                      </span>
                    </button>

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

                {/* Other Detected People in Frame — Tap to Switch & Lock */}
                {secondaryPoses.map((pt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    data-no-gesture="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      lockOntoPoint(pt.x, pt.y);
                    }}
                    style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                    className={`pointer-events-auto cursor-pointer absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 transition-opacity ${
                      lockedClimber && !isPickingClimber ? 'opacity-45 hover:opacity-95' : 'opacity-90 hover:scale-110'
                    }`}
                    title="Klepnutím přepnete a zafixujete tuto osobu"
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-900/80 border-2 border-amber-300 shadow-md" />
                    <span className="px-1.5 py-0.5 rounded bg-slate-900/85 text-amber-200 text-[9px] font-bold border border-amber-300/40">
                      Zafixovat
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* High-visibility Chrono Overlay during active climb, countdown, or false start */}
            {(isRunning || elapsedMs > 0 || countdownState !== 'idle' || isFalseStart) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 z-20">
                {isFalseStart && !isRunning && (
                  <div className="mb-2 px-4 py-1.5 bg-red-600 text-white font-black text-xs uppercase tracking-wider rounded-full shadow-lg flex items-center gap-1.5 animate-bounce">
                    <AlertTriangle className="w-4 h-4" />
                    <span>
                      {falseStartReason ||
                        (reactionTime === 0
                          ? 'ULILÝ START (před pípnutím)'
                          : `ULILÝ START (${reactionTime.toFixed(3)}s < 0.100s)`)}
                    </span>
                  </div>
                )}

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
                      {countdownState === 'beeps' && '🔊 3... 2... 1... (HLÍDÁM ULITÝ START)'}
                    </span>
                  </div>
                )}

                <div className="font-mono tabular-nums text-6xl sm:text-8xl md:text-9xl font-black text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.95)] tracking-tight">
                  {formatChrono(elapsedMs)}
                </div>
              </div>
            )}

            {/* Optional Slim Top Calibration Bar ONLY when toolbar Kalibrace is toggled without an active line */}
            {isAiCameraMode && isCalibrating && !editingLine && !isRunning && (
              <div
                data-no-gesture="true"
                onClick={(e) => e.stopPropagation()}
                className="absolute top-2.5 left-2.5 right-2.5 z-30 px-2.5 py-1.5 rounded-xl bg-slate-950/90 border border-white/20 backdrop-blur-md flex flex-wrap items-center justify-between gap-2 shadow-xl text-[10px]"
              >
                <span className="text-slate-200 font-bold">
                  Táhněte nebo podržte libovolnou linii pro úpravu (±)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={resetCategoryCalibration}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                  >
                    Výchozí
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      saveCalibrationExplicit();
                      setIsCalibrating(false);
                      setEditingLine(null);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Hotovo</span>
                  </button>
                </div>
              </div>
            )}

            {isCameraExpanded && finishedRun && !isRunning && (
              <div
                data-no-gesture="true"
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-3 left-3 right-3 z-30 p-3 rounded-2xl bg-slate-950/90 border border-emerald-500/40 backdrop-blur-md space-y-2 shadow-2xl"
              >
                {videoShareFeedback && (
                  <div className="px-2.5 py-1 rounded-xl bg-blue-950/70 border border-blue-400/40 text-blue-200 text-[11px] font-bold text-center">
                    {videoShareFeedback}
                  </div>
                )}
                {isPostRollRecording && (
                  <div className="flex items-center justify-between gap-2 px-2.5 py-1 rounded-xl bg-amber-950/70 border border-amber-400/40 text-amber-200 text-[11px] font-bold">
                    <span className="animate-pulse">
                      🎬 Nahrávám +{videoTrimMarginSec}s po dohmatu ({postRollRemainingSec}s)...
                    </span>
                    <button
                      type="button"
                      onClick={() => finalizePostRollNowRef.current?.()}
                      className="px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 text-[10px] font-black"
                    >
                      Ukončit hned
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-lg font-mono font-black text-white leading-none flex items-center gap-2">
                        <span>{finishedRun.totalTime.toFixed(3)}s</span>
                        {finishedRun.isFalseStart ? (
                          <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-black">
                            ULILÝ START
                          </span>
                        ) : (
                          finishedRun.reactionTime > 0 && (
                            <span className="text-[10px] text-amber-300 font-bold">
                              ⚡ {finishedRun.reactionTime.toFixed(3)}s
                            </span>
                          )
                        )}
                      </div>
                      <div className="text-[10px] text-slate-300 font-mono mt-0.5">
                        {finishedRun.splits.split1.toFixed(2)}s · {finishedRun.splits.split2.toFixed(2)}s ·{' '}
                        {finishedRun.splits.split3.toFixed(2)}s
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => enqueueRunSaveAndReadyNext('download')}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1"
                      title="Zařadit video k uložení na pozadí a ihned uvolnit časomíru pro dalšího lezce"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Uložit</span>
                    </button>
                    {recordVideoOnRun && (
                      <button
                        type="button"
                        onClick={() => enqueueRunSaveAndReadyNext('share')}
                        className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1"
                        title="Připravit video na pozadí pro Disk a ihned uvolnit časomíru"
                      >
                        <Cloud className="w-3.5 h-3.5" />
                        <span>Disk</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleGestureDelete}
                      className="px-2.5 py-1.5 rounded-xl bg-red-600/85 hover:bg-red-500 text-white flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Smazat</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleGestureRestart}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1"
                      title="Nový pokus"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Fullscreen Cloud Picker Overlay (visible directly inside fullscreen camera) */}
            {isCameraExpanded && showCloudPicker && finishedRun?.videoUrl && (
              <div
                data-no-gesture="true"
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
              >
                <div className="w-full max-w-sm p-4 rounded-2xl bg-slate-900 border border-blue-500/40 space-y-3 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cloud className="w-4 h-4 text-blue-400" />
                      <span className="font-bold text-xs text-white">Odeslat video na Disk</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCloudPicker(false)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Stáhněte video na pozadí a nahrajte ho do svého cloudového úložiště:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <a
                      href="https://drive.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-between text-white font-bold"
                    >
                      <span>📁 Google Disk</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                    <a
                      href="https://onedrive.live.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-between text-white font-bold"
                    >
                      <span>☁️ OneDrive</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => void handleDownloadVideoDirect()}
                      className="font-bold text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Stáhnout video do zařízení</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCloudPicker(false)}
                      className="text-slate-400 hover:text-white font-semibold"
                    >
                      Hotovo
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Helper Banner OUTSIDE the video frame (controlled via Settings showTimerHints) */}
          {!isCameraExpanded && showTimerHints && (
            <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>
                    {isAiCameraMode
                      ? `🟢 Start (${startZoneY}%) → 🔵 ${isYouthCategory ? '3.3m' : '5m'} (${split1ZoneY}%) → 🟣 ${
                          isYouthCategory ? '6.6m' : '10m'
                        } (${split2ZoneY}%) → 🔴 Cíl (${finishZoneY}%) · Podržením linie ji upravíte (±)${
                          ifscStartWithCamera ? ' · IFSC ZAP' : ''
                        }`
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
                <span>Gesta jen v režimu Celý displej:</span>
                <span>← Doleva: Uložit</span>
                <span>2× → Dvěma prsty doprava: Smazat</span>
                <span>↑ Nahoru: Restart</span>
                <span>↓ Dolů: Zpět</span>
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
              <span>
                {falseStartReason ||
                  (reactionTime === 0
                    ? 'Ulilý start (před pípnutím)'
                    : `Ulilý start (${reactionTime.toFixed(3)}s < 0.100s)`)}
              </span>
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
                countdownState === 'armed' ||
                countdownState === 'marks' ||
                countdownState === 'ready' ||
                countdownState === 'beeps'
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
            >
              {countdownState === 'armed' ||
              countdownState === 'marks' ||
              countdownState === 'ready' ||
              countdownState === 'beeps' ? (
                <>
                  <Square className="w-5 h-5 fill-current" />
                  <span>{countdownState === 'armed' ? 'Zrušit hlídání' : 'Zrušit odpočet'}</span>
                </>
              ) : startMode === 'camera_motion' && ifscStartWithCamera ? (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>Start (IFSC + AI)</span>
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
            <div className="flex flex-wrap items-center gap-2">
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
              {finishedRun.isFalseStart ? (
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[11px] font-black">
                  🚨 ULILÝ START
                </span>
              ) : (
                finishedRun.reactionTime > 0 && (
                  <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                    · ⚡ Reakce {finishedRun.reactionTime.toFixed(3)}s
                  </span>
                )
              )}
              {finishedRun.isPersonalBest && !finishedRun.isFalseStart && (
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

          {/* Post-Roll Recording Banner while post-roll finish buffer captures */}
          {isPostRollRecording && !finishedRun.videoUrl && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-2 text-xs font-bold text-amber-800 dark:text-amber-200">
                <span className="animate-pulse">
                  🎬 Dokončuji +{videoTrimMarginSec}s videozáznamu po dohmatu ({postRollRemainingSec}s)...
                </span>
                <button
                  type="button"
                  onClick={() => finalizePostRollNowRef.current?.()}
                  className="px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 text-[11px] font-black"
                >
                  Ukončit hned
                </button>
              </div>
            </div>
          )}

          {/* Integrated Recorded Video Player */}
          {finishedRun.videoUrl && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                <span className="text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-red-600" />
                  <span>
                    {videoTrimMarginSec > 0
                      ? `Videozáznam (-${videoTrimMarginSec}s před startem / +${videoTrimMarginSec}s po cíli)`
                      : 'Videozáznam'}
                  </span>
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
                      onClick={() => enqueueRunSaveAndReadyNext('download')}
                      className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1 text-[11px] font-bold"
                      title="Uložit video na pozadí do zařízení a uvolnit časomíru pro dalšího lezce"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>💾 Do zařízení</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => enqueueRunSaveAndReadyNext('share')}
                      className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1 text-[11px] font-bold"
                      title="Připravit na pozadí a sdílet na Google Disk či OneDrive"
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
                  onLoadedMetadata={() => {
                    const vid = playbackVideoRef.current;
                    const tMeta =
                      finishedRun.videoTiming || recordedPoseDataMapRef.current.get(finishedRun.id)?.timing;
                    if (vid && tMeta && tMeta.preRollStartSec > 0.12) {
                      try {
                        vid.currentTime = tMeta.preRollStartSec;
                        setPlaybackVideoSec(tMeta.preRollStartSec);
                      } catch {
                        // ignore
                      }
                    }
                  }}
                  onPlay={() => {
                    const vid = playbackVideoRef.current;
                    const tMeta =
                      finishedRun.videoTiming || recordedPoseDataMapRef.current.get(finishedRun.id)?.timing;
                    if (vid && tMeta && vid.currentTime < tMeta.preRollStartSec - 0.15) {
                      try {
                        vid.currentTime = tMeta.preRollStartSec;
                      } catch {
                        // ignore
                      }
                    }
                    setIsPlaybackPlaying(true);
                  }}
                  onPause={() => {
                    setIsPlaybackPlaying(false);
                    if (playbackVideoRef.current) {
                      setPlaybackVideoSec(playbackVideoRef.current.currentTime);
                    }
                  }}
                  onEnded={() => {
                    setIsPlaybackPlaying(false);
                    const tMeta =
                      finishedRun.videoTiming || recordedPoseDataMapRef.current.get(finishedRun.id)?.timing;
                    setPlaybackVideoSec(tMeta ? tMeta.postRollEndSec : finishedRun.totalTime);
                  }}
                  onTimeUpdate={() => {
                    const vid = playbackVideoRef.current;
                    if (!vid) return;
                    const tMeta =
                      finishedRun.videoTiming || recordedPoseDataMapRef.current.get(finishedRun.id)?.timing;
                    if (tMeta && vid.currentTime >= tMeta.postRollEndSec && !vid.paused) {
                      vid.pause();
                      setIsPlaybackPlaying(false);
                    }
                    setPlaybackVideoSec(vid.currentTime);
                  }}
                  onSeeked={() => {
                    if (playbackVideoRef.current) {
                      setPlaybackVideoSec(playbackVideoRef.current.currentTime);
                    }
                  }}
                  className="w-full h-full object-contain"
                />

                {/* Optional Live Preview of AI Pose Tracking (Hands/Body/Foot + Skeleton) */}
                {includePoseInVideo &&
                  (() => {
                    const mem = recordedPoseDataMapRef.current.get(finishedRun.id);
                    const timeline = finishedRun.poseTimeline || mem?.poseTimeline;
                    const sample = findPoseSampleAtTime(timeline, playbackVideoSec);
                    if (!sample) return null;
                    return (
                      <div className="pointer-events-none absolute inset-0">
                        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                          {sample.skeleton?.map((seg, i) => (
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
                          ))}
                        </svg>
                        <div
                          style={{ left: `${sample.hands.x}%`, top: `${sample.hands.y}%` }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1"
                        >
                          <div className="w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white shadow" />
                          <span className="px-1 py-0.5 rounded bg-red-600/90 text-white text-[9px] font-black">Ruka</span>
                        </div>
                        <div
                          style={{ left: `${sample.body.x}%`, top: `${sample.body.y}%` }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1"
                        >
                          <div className="w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow" />
                          <span className="px-1 py-0.5 rounded bg-blue-600/90 text-white text-[9px] font-black">Tělo</span>
                        </div>
                        <div
                          style={{ left: `${sample.foot.x}%`, top: `${sample.foot.y}%` }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1"
                        >
                          <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow" />
                          <span className="px-1 py-0.5 rounded bg-emerald-600/90 text-white text-[9px] font-black">Noha</span>
                        </div>
                      </div>
                    );
                  })()}

                {/* Top-right Live Running / Final Chrono Overlay (respects videoTimeMode setting) */}
                {videoTimeMode !== 'none' &&
                  (() => {
                    const vid = playbackVideoRef.current;
                    const tMeta =
                      finishedRun.videoTiming || recordedPoseDataMapRef.current.get(finishedRun.id)?.timing;
                    let displaySec = finishedRun.totalTime;
                    let isPreStart = false;
                    let isAtFinish = true;

                    if (videoTimeMode === 'running') {
                      if (tMeta) {
                        const showLive = isPlaybackPlaying || playbackVideoSec > tMeta.preRollStartSec + 0.01;
                        if (!showLive || playbackVideoSec >= tMeta.climbEndSec) {
                          displaySec = finishedRun.totalTime;
                          isAtFinish = true;
                        } else if (playbackVideoSec < tMeta.climbStartSec) {
                          displaySec = 0;
                          isPreStart = true;
                          isAtFinish = false;
                        } else {
                          const span = Math.max(0.05, tMeta.climbEndSec - tMeta.climbStartSec);
                          displaySec = Math.min(
                            finishedRun.totalTime,
                            Math.max(0, ((playbackVideoSec - tMeta.climbStartSec) / span) * finishedRun.totalTime)
                          );
                          isAtFinish = displaySec >= finishedRun.totalTime - 0.012;
                        }
                      } else {
                        const vidDur = vid?.duration;
                        let mappedSec = playbackVideoSec;
                        if (vidDur && Number.isFinite(vidDur) && vidDur > 0.25 && vidDur < finishedRun.totalTime) {
                          mappedSec = (playbackVideoSec / vidDur) * finishedRun.totalTime;
                        }
                        const showLiveRunning = isPlaybackPlaying || (playbackVideoSec > 0.01 && !vid?.ended);
                        displaySec = showLiveRunning
                          ? Math.min(finishedRun.totalTime, Math.max(0, mappedSec))
                          : finishedRun.totalTime;
                        isAtFinish = !showLiveRunning || displaySec >= finishedRun.totalTime - 0.012;
                      }
                    }

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
                            : isPreStart
                            ? 'border-amber-400/50 border-l-amber-500'
                            : 'border-white/20 border-l-red-500'
                        }`}
                      >
                        <div
                          className={`text-[9px] font-bold uppercase tracking-wider leading-tight ${
                            isAtFinish
                              ? 'text-emerald-300'
                              : isPreStart
                              ? 'text-amber-300'
                              : 'text-slate-300'
                          }`}
                        >
                          {(finishedRun.climberName || 'LEZEC').toUpperCase()} ·{' '}
                          {finishedRun.routeCategory === 'adults_15m'
                            ? '15m'
                            : finishedRun.routeCategory === 'youth_u15'
                            ? '10m U15'
                            : '10m U13'}
                          {isAtFinish ? ' · CÍL' : isPreStart ? ' · START' : ''}
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
                      onClick={() => void handleDownloadVideoDirect()}
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

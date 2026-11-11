export type RouteCategory = 'adults_15m' | 'youth_u15' | 'youth_u13';

export interface SplitData {
  split1: number; // Section 1 (0-5m or 0-3.3m)
  split2: number; // Section 2 (5-10m or 3.3-6.6m)
  split3: number; // Section 3 (10-15m or 6.6-10m)
}

export interface AIAnalysisResult {
  summary: string;
  weakestSection: number;
  weakestSectionTitle: string;
  timeLossDelta: string;
  biomechanicObservations: string[];
  tacticalCues: string[];
  recommendedDrill: string;
}

export interface SpeedRun {
  id: string;
  date: string;
  totalTime: number; // in seconds
  splits: SplitData;
  reactionTime: number;
  isFalseStart: boolean;
  betaUsed: 'standard' | 'tomoa-skip' | 'modern-dyno' | 'youth-flow';
  routeCategory: RouteCategory;
  gym: string;
  climberName: string;
  nationalityCode?: string;
  flagEmoji?: string;
  gender: 'men' | 'women';
  notes?: string;
  videoUrl?: string;
  cloudSyncStatus?: 'local' | 'synced_gdrive' | 'synced_onedrive';
  isPersonalBest?: boolean;
  aiAnalysis?: AIAnalysisResult;
}

export interface AthleteRecord {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  gender: 'men' | 'women';
  category: RouteCategory;
  recordTime: number;
  splits: SplitData;
  dateAchieved: string;
  event: string;
  avatarUrl: string;
  title: string;
  betaDescription: string;
}

export interface TrainingExercise {
  id: string;
  name: string;
  category: 'Campus Board' | 'Plyometrics' | 'Wall Drills' | 'Core & Lat Power';
  sets: string;
  reps: string;
  rest: string;
  biomechanicalPurpose: string;
  techniqueTip: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Elite';
}

export interface TrainingProgram {
  programTitle: string;
  focusQuote: string;
  overview: string;
  exercises: TrainingExercise[];
}

export interface HoldCoordinate {
  id: number;
  holdNumber: number;
  x: number; // percentage from left (0 - 100)
  y: number; // percentage from bottom (0 - 100)
  section: 1 | 2 | 3;
  type: 'hand' | 'foot';
  name: string;
  color?: 'green' | 'orange' | 'adult_red' | 'outline';
  gridPanel?: string; // e.g. "sn3", "dx4"
  gridRow?: number;   // 1 to 10
  gridCol?: string;   // e.g. "M", "A", "C"
  isTomoaSkip?: boolean;
  isYouthSpecific?: boolean;
  isIntermediate?: boolean; // For orange U13 mezichyty
  keyCue: string;
}

export interface SpeedRouteDefinition {
  id: RouteCategory;
  nameCs: string;
  nameEn: string;
  nameDe: string;
  heightMeters: number;
  overhangDeg: number;
  totalHolds: number;
  targetAudience: string;
  topoImagePath?: string; // e.g. "/assets/aistudio/Screenshot_..."
  descriptionCs: string;
  descriptionEn: string;
  descriptionDe: string;
  wrBenchmark: {
    maleTime: number;
    maleHolder: string;
    femaleTime: number;
    femaleHolder: string;
  };
  holds: HoldCoordinate[];
}

export interface CloudStorageConfig {
  provider: 'none' | 'gdrive' | 'onedrive' | 'local_vault';
  isSignedIn: boolean;
  userEmail?: string;
  userName?: string;
  autoUpload: boolean;
  targetFolder: string;
  parentalConsentApproved: boolean;
}

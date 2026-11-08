import { SpeedRun } from '../types/climbing';

const STORAGE_KEY = 'speedpeak_runs_v1';
const PROFILE_KEY = 'speedpeak_profile_v1';

export interface UserProfile {
  name: string;
  gender: 'men' | 'women';
  homeGym: string;
  personalBest: number;
  targetGoal: number;
  favoriteBeta: 'standard' | 'tomoa-skip' | 'modern-dyno';
}

const DEFAULT_PROFILE: UserProfile = {
  name: 'Alex Novak',
  gender: 'men',
  homeGym: 'Big Wall Praha',
  personalBest: 5.642,
  targetGoal: 5.200,
  favoriteBeta: 'tomoa-skip',
};

const SEED_RUNS: SpeedRun[] = [
  {
    id: 'run-seed-1',
    date: '2026-11-04T16:20:00.000Z',
    totalTime: 5.642,
    splits: { split1: 1.78, split2: 1.94, split3: 1.92 },
    reactionTime: 0.138,
    isFalseStart: false,
    betaUsed: 'tomoa-skip',
    routeCategory: 'adults_15m',
    gym: 'Big Wall Praha (15m IFSC Official)',
    climberName: 'Alex Novak',
    gender: 'men',
    notes: 'Personal Best! Smooth exit from Hold 9 directly into Hold 12.',
    isPersonalBest: true,
    aiAnalysis: {
      summary: 'Exceptional run with clean Tomoa transition. Your start was within 0.32s of world record speed.',
      weakestSection: 2,
      weakestSectionTitle: 'Section 2 (5-10m) Mid-Wall Dyno',
      timeLossDelta: '+0.32s vs Sam Watson benchmark',
      biomechanicObservations: [
        'Hips stayed locked within 12cm of wall during the opening 3 steps.',
        'Slight 60ms pause right before grabbing Hold 12 during the dyno catch.',
      ],
      tacticalCues: [
        'Initiate the upper arm reach 1 frame earlier on the dyno.',
        'Keep momentum flowing directly toward Hold 14.',
      ],
      recommendedDrill: 'Campus Board 1-4-7 Power Pull-Through',
    },
  },
  {
    id: 'run-seed-2',
    date: '2026-11-01T14:15:00.000Z',
    totalTime: 5.890,
    splits: { split1: 1.84, split2: 2.08, split3: 1.97 },
    reactionTime: 0.152,
    isFalseStart: false,
    betaUsed: 'standard',
    routeCategory: 'adults_15m',
    gym: 'Big Wall Praha',
    climberName: 'Alex Novak',
    gender: 'men',
    notes: 'Standard beta practice session. Used hold 10 intermediate.',
  },
  {
    id: 'run-seed-3',
    date: '2026-10-26T18:40:00.000Z',
    totalTime: 6.120,
    splits: { split1: 1.92, split2: 2.15, split3: 2.05 },
    reactionTime: 0.165,
    isFalseStart: false,
    betaUsed: 'standard',
    routeCategory: 'adults_15m',
    gym: 'Vertikon Zlín',
    climberName: 'Alex Novak',
    gender: 'men',
    notes: 'Testing grip friction in cooler evening conditions.',
  },
  {
    id: 'run-seed-4',
    date: '2026-10-18T11:30:00.000Z',
    totalTime: 6.340,
    splits: { split1: 2.05, split2: 2.24, split3: 2.05 },
    reactionTime: 0.178,
    isFalseStart: false,
    betaUsed: 'standard',
    routeCategory: 'adults_15m',
    gym: 'HUDY Lezecká Stěna Brno',
    climberName: 'Alex Novak',
    gender: 'men',
    notes: 'First time trying full 15m run after campus cycle.',
  },
];

export function getStoredRuns(): SpeedRun[] {
  if (typeof window === 'undefined') return SEED_RUNS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_RUNS));
      return SEED_RUNS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse stored runs, using seeds:', err);
    return SEED_RUNS;
  }
}

export function saveRun(run: SpeedRun): SpeedRun[] {
  const currentRuns = getStoredRuns();
  
  // Calculate if it is a personal best
  const currentBest = currentRuns.reduce((best, r) => (r.totalTime < best ? r.totalTime : best), 999);
  const isPb = run.totalTime < currentBest;
  const updatedRun = { ...run, isPersonalBest: isPb };

  const updatedList = [updatedRun, ...currentRuns];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    if (isPb) {
      updateProfilePB(run.totalTime);
    }
  }
  return updatedList;
}

export function deleteRun(id: string): SpeedRun[] {
  const current = getStoredRuns();
  const updated = current.filter(r => r.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function updateRunAnalysis(runId: string, analysis: SpeedRun['aiAnalysis']): SpeedRun[] {
  const runs = getStoredRuns();
  const updated = runs.map(r => (r.id === runId ? { ...r, aiAnalysis: analysis } : r));
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function getUserProfile(): UserProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(DEFAULT_PROFILE));
      return DEFAULT_PROFILE;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }
}

function updateProfilePB(newPb: number): void {
  const profile = getUserProfile();
  if (newPb < profile.personalBest) {
    profile.personalBest = newPb;
    saveUserProfile(profile);
  }
}

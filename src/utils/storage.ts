import { SpeedRun } from '../types/climbing';

const STORAGE_KEY = 'speedpeak_runs_v1';
const PROFILE_KEY = 'speedpeak_profile_v1';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  gender: 'men' | 'women';
  homeGym: string;
  personalBest: number;
  targetGoal: number;
  favoriteBeta: 'standard' | 'tomoa-skip' | 'modern-dyno' | 'youth-flow';
  nationality: string;
  nationalityCode: string;
  flagEmoji: string;
  isAuthenticated: boolean;
  isDemoUser?: boolean;
}

export const DEFAULT_PROFILE: UserProfile = {
  id: 'athlete-main',
  name: '',
  email: '',
  gender: 'men',
  homeGym: '',
  personalBest: 0,
  targetGoal: 5.500,
  favoriteBeta: 'standard',
  nationality: 'Česká republika',
  nationalityCode: 'CZE',
  flagEmoji: '🇨🇿',
  isAuthenticated: false,
  isDemoUser: false,
};

export function getStoredRuns(): SpeedRun[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const runs: SpeedRun[] = JSON.parse(raw);
    // Automatically purge any legacy Alex Novak runs
    const cleaned = runs.filter(
      (r) =>
        !r.id.startsWith('run-seed-') &&
        r.climberName !== 'Alex Novak' &&
        r.climberName !== 'Alex Novák'
    );
    if (cleaned.length !== runs.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch (err) {
    console.warn('Failed to parse stored runs:', err);
    return [];
  }
}

export function saveRun(run: SpeedRun): SpeedRun[] {
  const currentRuns = getStoredRuns();
  
  // Calculate if it is a personal best
  const validRuns = currentRuns.filter((r) => !r.isFalseStart && r.totalTime > 0);
  const currentBest = validRuns.length > 0
    ? validRuns.reduce((best, r) => (r.totalTime < best ? r.totalTime : best), 999)
    : 999;
  
  const isPb = !run.isFalseStart && run.totalTime < currentBest;
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
  const updated = current.filter((r) => r.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function clearAllRuns(): SpeedRun[] {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  }
  return [];
}

export function clearDemoRuns(): SpeedRun[] {
  return clearAllRuns();
}

export function resetDemoRuns(): SpeedRun[] {
  return clearAllRuns();
}

export function updateRunAnalysis(runId: string, analysis: SpeedRun['aiAnalysis']): SpeedRun[] {
  const runs = getStoredRuns();
  const updated = runs.map((r) => (r.id === runId ? { ...r, aiAnalysis: analysis } : r));
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function updateRunVideo(runId: string, videoUrl: string): SpeedRun[] {
  const runs = getStoredRuns();
  const updated = runs.map((r) => (r.id === runId ? { ...r, videoUrl } : r));
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function removeRunVideo(runId: string): SpeedRun[] {
  const runs = getStoredRuns();
  const updated = runs.map((r) => {
    if (r.id === runId) {
      const copy = { ...r };
      delete copy.videoUrl;
      return copy;
    }
    return r;
  });
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
    const parsed = JSON.parse(raw);

    // Completely purge legacy Alex Novak or demo email from storage
    if (
      parsed.name === 'Alex Novak' ||
      parsed.name === 'Alex Novák' ||
      parsed.email === 'fifteen.speedclimb@gmail.com'
    ) {
      parsed.name = '';
      parsed.email = '';
      parsed.isDemoUser = false;
      parsed.isAuthenticated = false;
      const cleanedProfile = { ...DEFAULT_PROFILE, ...parsed };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(cleanedProfile));
      return cleanedProfile;
    }

    return {
      ...DEFAULT_PROFILE,
      ...parsed,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }
}

export function loginUserProfile(info: Partial<UserProfile>): UserProfile {
  const current = getUserProfile();
  const updated: UserProfile = {
    ...current,
    ...info,
    isAuthenticated: true,
    isDemoUser: false,
  };
  saveUserProfile(updated);
  return updated;
}

export function logoutUserProfile(): UserProfile {
  const current = getUserProfile();
  const updated: UserProfile = {
    ...current,
    isAuthenticated: false,
  };
  saveUserProfile(updated);
  return updated;
}

function updateProfilePB(newPb: number): void {
  const profile = getUserProfile();
  if (profile.personalBest === 0 || newPb < profile.personalBest) {
    profile.personalBest = newPb;
    saveUserProfile(profile);
  }
}

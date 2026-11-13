import { RouteCategory, SpeedRun } from '../types/climbing';

const STORAGE_KEY = 'speedpeak_runs_v1';
const PROFILE_KEY = 'speedpeak_profile_v1';
const PROFILES_LIST_KEY = 'fifteen_profiles_list_v2';
const ACTIVE_PROFILE_ID_KEY = 'fifteen_active_profile_id_v2';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  avatarColor?: string; // hex or tailwind color
  gender: 'men' | 'women';
  homeGym: string;
  personalBest: number;
  personalBestByCategory?: Partial<Record<RouteCategory, number>>;
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
  name: 'Lezec 1',
  email: '',
  avatarColor: '#ef4444',
  gender: 'men',
  homeGym: '',
  personalBest: 0,
  personalBestByCategory: {},
  targetGoal: 5.500,
  favoriteBeta: 'standard',
  nationality: 'Česká republika',
  nationalityCode: 'CZE',
  flagEmoji: '🇨🇿',
  isAuthenticated: true,
  isDemoUser: false,
};

export function getBestTimeForCategory(
  runs: SpeedRun[],
  climberIdOrName: string,
  category: RouteCategory
): number {
  const valid = runs.filter(
    (r) =>
      !r.isFalseStart &&
      r.totalTime > 0 &&
      r.routeCategory === category &&
      (!climberIdOrName || r.climberId === climberIdOrName || r.climberName === climberIdOrName)
  );
  if (valid.length === 0) return 0;
  return Math.min(...valid.map((r) => r.totalTime));
}

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
  const profile = getUserProfile();

  const climberId = run.climberId || profile.id;
  const climberName = run.climberName || profile.name || 'Lezec';
  const flagEmoji = run.flagEmoji || profile.flagEmoji || '🇨🇿';
  const nationalityCode = run.nationalityCode || profile.nationalityCode || 'CZE';

  // Calculate if it is a personal best for THIS climber AND THIS route category
  const validRuns = currentRuns.filter(
    (r) =>
      !r.isFalseStart &&
      r.totalTime > 0 &&
      r.routeCategory === run.routeCategory &&
      (r.climberId === climberId || r.climberName === climberName)
  );
  const currentBest =
    validRuns.length > 0
      ? validRuns.reduce((best, r) => (r.totalTime < best ? r.totalTime : best), 999)
      : 999;

  const isPb = !run.isFalseStart && run.totalTime > 0 && run.totalTime < currentBest;
  const updatedRun: SpeedRun = {
    ...run,
    climberId,
    climberName,
    flagEmoji,
    nationalityCode,
    isPersonalBest: isPb,
  };

  const updatedList = [updatedRun, ...currentRuns];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    if (isPb) {
      updateProfilePB(run.totalTime, run.routeCategory);
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

export function getAllProfiles(): UserProfile[] {
  if (typeof window === 'undefined') return [DEFAULT_PROFILE];
  try {
    const raw = localStorage.getItem(PROFILES_LIST_KEY);
    if (!raw) {
      // Migrate from single profile if exists
      const singleRaw = localStorage.getItem(PROFILE_KEY);
      let initial: UserProfile[] = [DEFAULT_PROFILE];
      if (singleRaw) {
        try {
          const parsedSingle = JSON.parse(singleRaw);
          if (parsedSingle.name && parsedSingle.name !== 'Alex Novak') {
            initial = [{ ...DEFAULT_PROFILE, ...parsedSingle, id: parsedSingle.id || 'athlete-1' }];
          }
        } catch {
          // ignore
        }
      }
      localStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(initial));
      localStorage.setItem(ACTIVE_PROFILE_ID_KEY, initial[0].id);
      return initial;
    }
    const parsed: UserProfile[] = JSON.parse(raw);
    const cleaned = parsed.filter(
      (p) => p.name !== 'Alex Novak' && p.name !== 'Alex Novák' && p.email !== 'fifteen.speedclimb@gmail.com'
    );
    if (cleaned.length === 0) {
      localStorage.setItem(PROFILES_LIST_KEY, JSON.stringify([DEFAULT_PROFILE]));
      localStorage.setItem(ACTIVE_PROFILE_ID_KEY, DEFAULT_PROFILE.id);
      return [DEFAULT_PROFILE];
    }
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [DEFAULT_PROFILE];
  }
}

export function getUserProfile(): UserProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  const profiles = getAllProfiles();
  const activeId = localStorage.getItem(ACTIVE_PROFILE_ID_KEY);
  const found = profiles.find((p) => p.id === activeId);
  if (found) return found;
  if (profiles.length > 0) {
    localStorage.setItem(ACTIVE_PROFILE_ID_KEY, profiles[0].id);
    return profiles[0];
  }
  return DEFAULT_PROFILE;
}

export function setActiveProfileId(id: string): UserProfile {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ACTIVE_PROFILE_ID_KEY, id);
    const current = getUserProfile();
    localStorage.setItem(PROFILE_KEY, JSON.stringify(current));
    return current;
  }
  return DEFAULT_PROFILE;
}

export function saveUserProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  const profiles = getAllProfiles();
  const idx = profiles.findIndex((p) => p.id === profile.id);
  let updatedProfiles: UserProfile[];
  if (idx >= 0) {
    updatedProfiles = profiles.map((p) => (p.id === profile.id ? profile : p));
  } else {
    updatedProfiles = [...profiles, profile];
  }
  localStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(updatedProfiles));
  localStorage.setItem(ACTIVE_PROFILE_ID_KEY, profile.id);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

const PROFILE_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export function createProfile(data: Partial<UserProfile>): UserProfile {
  const profiles = getAllProfiles();
  const nextNum = profiles.length + 1;
  const color = PROFILE_COLORS[(nextNum - 1) % PROFILE_COLORS.length];
  const newProfile: UserProfile = {
    ...DEFAULT_PROFILE,
    id: `climber-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: data.name?.trim() || `Lezec ${nextNum}`,
    avatarColor: color,
    nationality: data.nationality || 'Česká republika',
    nationalityCode: data.nationalityCode || 'CZE',
    flagEmoji: data.flagEmoji || '🇨🇿',
    gender: data.gender || 'men',
    homeGym: data.homeGym || '',
    targetGoal: data.targetGoal || 5.5,
    personalBest: data.personalBest || 0,
    favoriteBeta: data.favoriteBeta || 'standard',
    isAuthenticated: true,
    isDemoUser: false,
    ...data,
  };
  saveUserProfile(newProfile);
  return newProfile;
}

export function deleteProfile(profileId: string): UserProfile[] {
  if (typeof window === 'undefined') return [];
  const profiles = getAllProfiles();
  if (profiles.length <= 1) {
    // If only one profile left, reset it instead of empty array
    const reset = [{ ...DEFAULT_PROFILE, id: 'athlete-main', name: 'Lezec 1' }];
    localStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(reset));
    localStorage.setItem(ACTIVE_PROFILE_ID_KEY, reset[0].id);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(reset[0]));
    return reset;
  }
  const filtered = profiles.filter((p) => p.id !== profileId);
  localStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(filtered));
  const activeId = localStorage.getItem(ACTIVE_PROFILE_ID_KEY);
  if (activeId === profileId) {
    localStorage.setItem(ACTIVE_PROFILE_ID_KEY, filtered[0].id);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(filtered[0]));
  }
  return filtered;
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

function updateProfilePB(newPb: number, category: RouteCategory): void {
  const profile = getUserProfile();
  const byCat = { ...(profile.personalBestByCategory || {}) };
  const prevCatPb = byCat[category] || 0;
  let changed = false;

  if (prevCatPb === 0 || newPb < prevCatPb) {
    byCat[category] = newPb;
    profile.personalBestByCategory = byCat;
    changed = true;
  }

  if (category === 'adults_15m' && (profile.personalBest === 0 || newPb < profile.personalBest)) {
    profile.personalBest = newPb;
    changed = true;
  } else if (profile.personalBest === 0) {
    profile.personalBest = newPb;
    changed = true;
  }

  if (changed) {
    saveUserProfile(profile);
  }
}

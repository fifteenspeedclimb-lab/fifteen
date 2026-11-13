import React, { useState, useMemo, useEffect } from 'react';
import {
  Trophy,
  Plus,
  CheckCircle2,
  Calendar as CalendarIcon,
  TrendingUp,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Award,
  User,
  Zap,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { getUserProfile, getStoredRuns, saveRun, deleteRun, clearDemoRuns, clearAllRuns, getBestTimeForCategory, UserProfile } from '../utils/storage';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { RouteCategory, SpeedRun } from '../types/climbing';

interface LeaderboardEntry {
  id: string;
  rank: number;
  climberName: string;
  country: string;
  countryCode: string;
  flagEmoji?: string;
  gender: 'men' | 'women';
  category: 'adults_15m' | 'youth_u15' | 'youth_u13';
  totalTime: number;
  splits: { split1: number; split2: number; split3: number };
  gym: string;
  event: string;
  date: string;
  isVerified: boolean;
  isUser?: boolean;
}

const GLOBAL_IFSC_RECORDS: LeaderboardEntry[] = [
  {
    id: 'rec-1',
    rank: 1,
    climberName: 'Sam Watson',
    country: 'Spojené státy americké',
    countryCode: 'USA',
    flagEmoji: '🇺🇸',
    gender: 'men',
    category: 'adults_15m',
    totalTime: 4.74,
    splits: { split1: 1.46, split2: 1.62, split3: 1.66 },
    gym: 'Le Bourget Climbing Venue (Paříž)',
    event: 'Olympijské hry Paříž – Světový rekord (WR)',
    date: '2024-08-08',
    isVerified: true,
  },
  {
    id: 'rec-2',
    rank: 2,
    climberName: 'Veddriq Leonardo',
    country: 'Indonésie',
    countryCode: 'INA',
    flagEmoji: '🇮🇩',
    gender: 'men',
    category: 'adults_15m',
    totalTime: 4.75,
    splits: { split1: 1.48, split2: 1.61, split3: 1.66 },
    gym: 'Le Bourget Climbing Venue (Paříž)',
    event: 'Olympijské finále (Zlato)',
    date: '2024-08-08',
    isVerified: true,
  },
  {
    id: 'rec-3',
    rank: 3,
    climberName: 'Wu Peng',
    country: 'Čína',
    countryCode: 'CHN',
    flagEmoji: '🇨🇳',
    gender: 'men',
    category: 'adults_15m',
    totalTime: 4.77,
    splits: { split1: 1.49, split2: 1.62, split3: 1.66 },
    gym: 'Le Bourget Climbing Venue (Paříž)',
    event: 'Olympijské finále (Stříbro)',
    date: '2024-08-08',
    isVerified: true,
  },
  {
    id: 'rec-4',
    rank: 4,
    climberName: 'Matteo Zurloni',
    country: 'Itálie',
    countryCode: 'ITA',
    flagEmoji: '🇮🇹',
    gender: 'men',
    category: 'adults_15m',
    totalTime: 4.95,
    splits: { split1: 1.55, split2: 1.69, split3: 1.71 },
    gym: 'Wujiang IFSC World Cup (Čína)',
    event: 'Evropský rekord',
    date: '2024-04-14',
    isVerified: true,
  },
  {
    id: 'rec-6',
    rank: 5,
    climberName: 'Jan Kříž',
    country: 'Česká republika',
    countryCode: 'CZE',
    flagEmoji: '🇨🇿',
    gender: 'men',
    category: 'adults_15m',
    totalTime: 5.48,
    splits: { split1: 1.72, split2: 1.88, split3: 1.88 },
    gym: 'Big Wall Praha (15m)',
    event: 'Mistrovství ČR v rychlosti',
    date: '2025-06-12',
    isVerified: true,
  },
  {
    id: 'rec-7',
    rank: 6,
    climberName: 'Julian David',
    country: 'Nový Zéland',
    countryCode: 'NZL',
    flagEmoji: '🇳🇿',
    gender: 'men',
    category: 'adults_15m',
    totalTime: 5.20,
    splits: { split1: 1.63, split2: 1.78, split3: 1.79 },
    gym: 'Salt Lake City IFSC World Cup (USA)',
    event: 'Oceánský rekord',
    date: '2024-05-18',
    isVerified: true,
  },
  // Women Records
  {
    id: 'rec-w1',
    rank: 1,
    climberName: 'Aleksandra Mirosław',
    country: 'Polsko',
    countryCode: 'POL',
    flagEmoji: '🇵🇱',
    gender: 'women',
    category: 'adults_15m',
    totalTime: 6.06,
    splits: { split1: 1.95, split2: 2.12, split3: 1.99 },
    gym: 'Le Bourget Climbing Venue (Paříž)',
    event: 'Světový rekord ženy (WR)',
    date: '2024-08-05',
    isVerified: true,
  },
  {
    id: 'rec-w2',
    rank: 2,
    climberName: 'Deng Lijuan',
    country: 'Čína',
    countryCode: 'CHN',
    flagEmoji: '🇨🇳',
    gender: 'women',
    category: 'adults_15m',
    totalTime: 6.18,
    splits: { split1: 2.01, split2: 2.14, split3: 2.03 },
    gym: 'Olympijské finále Paříž',
    event: 'Olympijské stříbro',
    date: '2024-08-08',
    isVerified: true,
  },
  {
    id: 'rec-w3',
    rank: 3,
    climberName: 'Emma Hunt',
    country: 'Spojené státy americké',
    countryCode: 'USA',
    flagEmoji: '🇺🇸',
    gender: 'women',
    category: 'adults_15m',
    totalTime: 6.36,
    splits: { split1: 2.04, split2: 2.18, split3: 2.14 },
    gym: 'Salt Lake City IFSC World Cup (USA)',
    event: 'Pan-americký rekord',
    date: '2024-05-19',
    isVerified: true,
  },
  // Youth U15
  {
    id: 'rec-u15-1',
    rank: 1,
    climberName: 'Lucas Zhang',
    country: 'Čína',
    countryCode: 'CHN',
    flagEmoji: '🇨🇳',
    gender: 'men',
    category: 'youth_u15',
    totalTime: 3.82,
    splits: { split1: 1.25, split2: 1.28, split3: 1.29 },
    gym: 'Wujiang IFSC World Cup (Čína)',
    event: 'Světový juniorský pohár U15 (10m)',
    date: '2025-07-12',
    isVerified: true,
  },
  {
    id: 'rec-u15-2',
    rank: 2,
    climberName: 'Matyáš Král',
    country: 'Česká republika',
    countryCode: 'CZE',
    flagEmoji: '🇨🇿',
    gender: 'men',
    category: 'youth_u15',
    totalTime: 4.15,
    splits: { split1: 1.34, split2: 1.40, split3: 1.41 },
    gym: 'Big Wall Praha',
    event: 'Český pohár mládeže U15',
    date: '2026-05-14',
    isVerified: true,
  },
  // Youth U13
  {
    id: 'rec-u13-1',
    rank: 1,
    climberName: 'Jakub Sýkora',
    country: 'Česká republika',
    countryCode: 'CZE',
    flagEmoji: '🇨🇿',
    gender: 'men',
    category: 'youth_u13',
    totalTime: 4.88,
    splits: { split1: 1.58, split2: 1.65, split3: 1.65 },
    gym: 'HUDY Lezecká Stěna Brno',
    event: 'Moravia Speed Kids U13 (10m)',
    date: '2026-09-19',
    isVerified: true,
  },
];

const MONTH_NAMES_CS = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
];

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface LeaderboardsProps {
  lang?: Language;
  runs?: SpeedRun[];
  onRunsChanged?: (runs: SpeedRun[]) => void;
  userProfile?: UserProfile;
  onOpenAuth?: () => void;
  currentCategory?: RouteCategory;
}

const getCategoryShort = (cat: RouteCategory | 'all') => {
  if (cat === 'youth_u15') return '10m U15';
  if (cat === 'youth_u13') return '10m U13';
  if (cat === 'adults_15m') return '15m Dospělí';
  return 'Vše';
};

export const Leaderboards: React.FC<LeaderboardsProps> = ({
  lang = 'cs',
  runs: propRuns,
  onRunsChanged,
  userProfile: propUserProfile,
  onOpenAuth,
  currentCategory = 'adults_15m',
}) => {
  const profile = propUserProfile || getUserProfile();
  const t = TRANSLATIONS[lang];
  const userRuns = propRuns || getStoredRuns();

  const [activeMainTab, setActiveMainTab] = useState<'leaderboard' | 'history'>('history');
  const [genderFilter, setGenderFilter] = useState<'men' | 'women'>('men');
  const [categoryFilter, setCategoryFilter] = useState<'all' | RouteCategory>(currentCategory);
  const [venueFilter, setVenueFilter] = useState<string>('all');
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  useEffect(() => {
    setCategoryFilter(currentCategory);
  }, [currentCategory]);

  // Runs filtered by active category filter for History, Calendar & Graph
  const historyRuns = useMemo(() => {
    if (categoryFilter === 'all') return userRuns;
    return userRuns.filter((r) => r.routeCategory === categoryFilter);
  }, [userRuns, categoryFilter]);

  // Determine initial calendar month and year based on runs or current date
  const initialCalendarDate = useMemo(() => {
    if (historyRuns.length > 0) {
      const d = new Date(historyRuns[0].date);
      if (!isNaN(d.getTime())) return { year: d.getFullYear(), month: d.getMonth() };
    }
    if (userRuns.length > 0) {
      const d = new Date(userRuns[0].date);
      if (!isNaN(d.getTime())) return { year: d.getFullYear(), month: d.getMonth() };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }, [historyRuns, userRuns]);

  const [calendarYear, setCalendarYear] = useState<number>(initialCalendarDate.year);
  const [calendarMonth, setCalendarMonth] = useState<number>(initialCalendarDate.month); // 0-11
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Submission Form State
  const [subName, setSubName] = useState<string>(profile.name);
  const [subTime, setSubTime] = useState<string>('');
  const [subGym, setSubGym] = useState<string>(profile.homeGym || 'Big Wall Praha (15m)');
  const [subEvent, setSubEvent] = useState<string>('Oficiální tréninkový výlez Fifteen');
  const [subCategory, setSubCategory] = useState<RouteCategory>(currentCategory);
  const [customSubmittedEntries, setCustomSubmittedEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    setSubCategory(currentCategory);
  }, [currentCategory]);

  // Dynamic user entry for IFSC leaderboard matching active categoryFilter
  const dynamicUserEntry = useMemo<LeaderboardEntry | null>(() => {
    const validRuns = userRuns.filter(
      (r) => !r.isFalseStart && (categoryFilter === 'all' ? true : r.routeCategory === categoryFilter)
    );
    if (validRuns.length === 0) return null;

    const bestRun = [...validRuns].sort((a, b) => a.totalTime - b.totalTime)[0];
    return {
      id: 'active-user-best',
      rank: 0,
      climberName: `${profile.name || (lang === 'cs' ? 'Můj profil' : 'My profile')} (Vy)`,
      country: profile.nationality,
      countryCode: profile.nationalityCode,
      flagEmoji: profile.flagEmoji,
      gender: profile.gender,
      category: bestRun.routeCategory,
      totalTime: bestRun.totalTime,
      splits: bestRun.splits,
      gym: bestRun.gym,
      event: `Nejlepší výkon (${getCategoryShort(bestRun.routeCategory)})`,
      date: bestRun.date.split('T')[0],
      isVerified: true,
      isUser: true,
    };
  }, [userRuns, profile, categoryFilter, lang]);

  // Filtered leaderboard entries including dynamic user entry
  const filteredEntries = useMemo(() => {
    const baseList = [...GLOBAL_IFSC_RECORDS, ...customSubmittedEntries];
    if (dynamicUserEntry) {
      baseList.push(dynamicUserEntry);
    }

    return baseList
      .filter((e) => e.gender === genderFilter)
      .filter((e) => (categoryFilter === 'all' ? true : e.category === categoryFilter))
      .filter((e) => (venueFilter === 'all' ? true : e.gym.toLowerCase().includes(venueFilter.toLowerCase())))
      .sort((a, b) => a.totalTime - b.totalTime);
  }, [genderFilter, categoryFilter, venueFilter, customSubmittedEntries, dynamicUserEntry]);

  // Calendar days computation for active calendarYear & calendarMonth (scoped to historyRuns)
  const calendarData = useMemo(() => {
    const totalDaysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay(); // 0 is Sunday
    const offsetDays = (firstDayIndex + 6) % 7;

    const runsByDate: Record<string, SpeedRun[]> = {};
    historyRuns.forEach((r) => {
      const dateKey = r.date.split('T')[0];
      if (!runsByDate[dateKey]) runsByDate[dateKey] = [];
      runsByDate[dateKey].push(r);
    });

    const monthStr = String(calendarMonth + 1).padStart(2, '0');
    const days = [];

    const validRuns = historyRuns.filter((r) => !r.isFalseStart);
    const allTimeBest = validRuns.length > 0 ? Math.min(...validRuns.map((r) => r.totalTime)) : null;

    let activeDaysCount = 0;
    let totalRunsThisMonth = 0;

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const dateKey = `${calendarYear}-${monthStr}-${dayStr}`;
      const dayRuns = runsByDate[dateKey] || [];
      const validDayRuns = dayRuns.filter((r) => !r.isFalseStart);

      let bestTime: number | null = null;
      let isPB = false;

      if (validDayRuns.length > 0) {
        bestTime = Math.min(...validDayRuns.map((r) => r.totalTime));
        if (allTimeBest && Math.abs(bestTime - allTimeBest) < 0.001) {
          isPB = true;
        }
      }

      if (dayRuns.length > 0) {
        activeDaysCount++;
        totalRunsThisMonth += dayRuns.length;
      }

      days.push({
        day,
        dateKey,
        runs: dayRuns.length,
        best: bestTime ? `${bestTime.toFixed(2)}s` : null,
        isPB,
        runList: dayRuns,
      });
    }

    return {
      offsetDays,
      days,
      activeDaysCount,
      totalRunsThisMonth,
    };
  }, [calendarYear, calendarMonth, historyRuns]);

  // Selected date runs
  const selectedDateRuns = useMemo(() => {
    if (!selectedCalendarDate) return [];
    return historyRuns.filter((r) => r.date.startsWith(selectedCalendarDate));
  }, [selectedCalendarDate, historyRuns]);

  // Real Progression Curve Points
  const progressionData = useMemo(() => {
    const valid = historyRuns
      .filter((r) => !r.isFalseStart && r.totalTime > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (valid.length === 0) return null;

    const times = valid.map((r) => r.totalTime);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const timeRange = Math.max(0.5, maxTime - minTime);

    const svgWidth = 500;
    const svgHeight = 120;
    const padX = 35;
    const padY = 22;

    const points = valid.map((run, idx) => {
      const x = valid.length === 1 ? svgWidth / 2 : padX + (idx / (valid.length - 1)) * (svgWidth - padX * 2);
      const normalized = (run.totalTime - minTime) / timeRange;
      const y = padY + normalized * (svgHeight - padY * 2);
      return {
        x,
        y,
        time: run.totalTime,
        date: run.date.split('T')[0],
        id: run.id,
      };
    });

    const pathD = points.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');

    const areaD = points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${svgHeight} L ${points[0].x} ${svgHeight} Z`
      : '';

    return {
      points,
      pathD,
      areaD,
      minTime,
      maxTime,
      count: valid.length,
      bestRun: valid.reduce((best, cur) => (cur.totalTime < best.totalTime ? cur : best), valid[0]),
    };
  }, [historyRuns]);

  // Overall metrics calculated from REAL runs matching categoryFilter
  const metrics = useMemo(() => {
    const valid = historyRuns.filter((r) => !r.isFalseStart && r.totalTime > 0);
    const fallbackPb =
      categoryFilter === 'all'
        ? profile.personalBest
        : profile.personalBestByCategory?.[categoryFilter] ||
          (categoryFilter === 'adults_15m' ? profile.personalBest : 0);
    const bestTime = valid.length > 0 ? Math.min(...valid.map((r) => r.totalTime)) : fallbackPb;
    const totalRuns = historyRuns.length;
    const falseStarts = historyRuns.filter((r) => r.isFalseStart).length;
    const successRate = totalRuns > 0 ? (((totalRuns - falseStarts) / totalRuns) * 100).toFixed(1) : '100.0';

    const reactionRuns = historyRuns.filter((r) => r.reactionTime && r.reactionTime > 0.05);
    const avgReaction =
      reactionRuns.length > 0
        ? (reactionRuns.reduce((sum, r) => sum + r.reactionTime, 0) / reactionRuns.length).toFixed(3)
        : '—';

    return {
      bestTime: bestTime > 0 ? `${bestTime.toFixed(3)}s` : '—',
      activeDays: calendarData.activeDaysCount,
      totalRunsThisMonth: calendarData.totalRunsThisMonth,
      totalRunsAllTime: totalRuns,
      avgReaction: avgReaction === '—' ? '—' : `${avgReaction}s`,
      successRate,
    };
  }, [historyRuns, profile.personalBest, profile.personalBestByCategory, categoryFilter, calendarData]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
    setSelectedCalendarDate(null);
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
    setSelectedCalendarDate(null);
  };

  // Run deletion
  const handleDeleteSingleRun = (runId: string) => {
    deleteRun(runId);
    const updated = getStoredRuns();
    if (onRunsChanged) {
      onRunsChanged(updated);
    }
  };

  // Demo runs cleanup
  const handleClearDemoRuns = () => {
    clearDemoRuns();
    const updated = getStoredRuns();
    if (onRunsChanged) {
      onRunsChanged(updated);
    }
  };

  // Full history wipe
  const handleClearAllHistory = () => {
    clearAllRuns();
    const updated = getStoredRuns();
    if (onRunsChanged) {
      onRunsChanged(updated);
    }
    setShowClearConfirm(false);
    setSelectedCalendarDate(null);
  };

  // Manual Time Submission Modal
  const handleSubmitRun = (e: React.FormEvent) => {
    e.preventDefault();
    const timeNum = parseFloat(subTime);
    if (isNaN(timeNum) || timeNum <= 0) return;

    const newEntry: LeaderboardEntry = {
      id: 'sub-' + Date.now(),
      rank: 0,
      climberName: `${subName} (Vy)`,
      country: profile.nationality,
      countryCode: profile.nationalityCode,
      flagEmoji: profile.flagEmoji,
      gender: profile.gender,
      category: subCategory,
      totalTime: timeNum,
      splits: {
        split1: parseFloat((timeNum * 0.31).toFixed(2)),
        split2: parseFloat((timeNum * 0.35).toFixed(2)),
        split3: parseFloat((timeNum * 0.34).toFixed(2)),
      },
      gym: subGym,
      event: subEvent,
      date: new Date().toISOString().split('T')[0],
      isVerified: true,
      isUser: true,
    };

    setCustomSubmittedEntries((prev) => [newEntry, ...prev]);

    const currentCategoryBest = getBestTimeForCategory(userRuns, profile.id, subCategory);
    const newRun: SpeedRun = {
      id: 'manual-' + Date.now(),
      date: new Date().toISOString(),
      totalTime: timeNum,
      splits: newEntry.splits,
      reactionTime: 0.14,
      isFalseStart: false,
      betaUsed: 'standard',
      routeCategory: subCategory,
      gym: subGym,
      climberId: profile.id,
      climberName: subName,
      gender: profile.gender,
      nationalityCode: profile.nationalityCode,
      flagEmoji: profile.flagEmoji,
      cloudSyncStatus: 'synced_gdrive',
      isPersonalBest: currentCategoryBest === 0 || timeNum < currentCategoryBest,
    };

    saveRun(newRun);
    if (onRunsChanged) {
      onRunsChanged(getStoredRuns());
    }

    setShowSubmitModal(false);
    setSubTime('');
  };

  // CSV Exporter
  const handleExportRunsCsv = () => {
    if (userRuns.length === 0) return;

    const headers = 'ID,Datum,Cas_Sekundy,Reakce,Kategorie,Stena,Lezec,Zeme\n';
    const rows = userRuns
      .map(
        (r) =>
          `${r.id},${r.date},${r.totalTime},${r.reactionTime || ''},${r.routeCategory},"${r.gym || ''}","${r.climberName || ''}","${r.nationalityCode || ''}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Fifteen_Speed_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const monthLabel =
    lang === 'cs'
      ? `${MONTH_NAMES_CS[calendarMonth]} ${calendarYear}`
      : `${MONTH_NAMES_EN[calendarMonth]} ${calendarYear}`;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Top Header & Tab Switcher (Leaderboard vs Training History) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-500" />
            <span>{activeMainTab === 'leaderboard' ? 'Světové & Oficiální žebříčky' : 'Tréninková historie & Kalendář'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {activeMainTab === 'leaderboard'
              ? 'Světové rekordy IFSC a ověřené časy lezců'
              : 'Reálný přehled vašich tréninkových dnů, graf zrychlování a správa pokusů'}
          </p>
        </div>

        {/* Athlete profile pill & dual tab segmented control */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-red-500 transition-colors flex items-center gap-1.5"
              title="Upravit profil lezce a národnost"
            >
              <span className="text-base">{profile.flagEmoji}</span>
              <span className="truncate max-w-[120px]">{profile.name}</span>
            </button>
          )}

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveMainTab('history')}
              className={`min-h-[38px] px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeMainTab === 'history'
                  ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-4 h-4 text-red-600" />
              <span>{lang === 'cs' ? 'Kalendář & Grafy' : 'Calendar & Progress'}</span>
            </button>
            <button
              onClick={() => setActiveMainTab('leaderboard')}
              className={`min-h-[38px] px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeMainTab === 'leaderboard'
                  ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>{lang === 'cs' ? 'IFSC Žebříčky' : 'IFSC Rankings'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: GLOBAL IFSC LEADERBOARD */}
      {activeMainTab === 'leaderboard' && (
        <div className="space-y-4">
          {/* Action Row: Gender, Category, Venue filters and Add button */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Gender selector */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
                <button
                  onClick={() => setGenderFilter('men')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    genderFilter === 'men'
                      ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t.filterMen}
                </button>
                <button
                  onClick={() => setGenderFilter('women')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    genderFilter === 'women'
                      ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t.filterWomen}
                </button>
              </div>

              {/* Category selector */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                    categoryFilter === 'all'
                      ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Vše
                </button>
                <button
                  onClick={() => setCategoryFilter('adults_15m')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                    categoryFilter === 'adults_15m'
                      ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  15m Dospělí
                </button>
                <button
                  onClick={() => setCategoryFilter('youth_u15')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                    categoryFilter === 'youth_u15'
                      ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  10m U15
                </button>
                <button
                  onClick={() => setCategoryFilter('youth_u13')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                    categoryFilter === 'youth_u13'
                      ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  10m U13
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSubmitModal(true)}
                className="min-h-[40px] px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Zapsat čas</span>
              </button>
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-3 sm:px-4 w-12 text-center">#</th>
                    <th className="py-3 px-3 sm:px-4">Lezec & Národnost</th>
                    <th className="py-3 px-3 sm:px-4">Čas</th>
                    <th className="py-3 px-3 sm:px-4 hidden md:table-cell">
                      {categoryFilter === 'youth_u15' || categoryFilter === 'youth_u13'
                        ? 'Mezičasy (3.3m / 6.6m / 10m)'
                        : categoryFilter === 'adults_15m'
                        ? 'Mezičasy (5m / 10m / 15m)'
                        : 'Mezičasy (S1 / S2 / S3)'}
                    </th>
                    <th className="py-3 px-3 sm:px-4 hidden sm:table-cell">Lokalita / Akce</th>
                    <th className="py-3 px-3 sm:px-4 hidden lg:table-cell">Datum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredEntries.map((entry, index) => {
                    const rank = index + 1;
                    const isUser = entry.isUser || entry.climberName.includes('(Vy)');
                    return (
                      <tr
                        key={entry.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          isUser ? 'bg-red-50/60 dark:bg-red-950/30 font-semibold' : ''
                        }`}
                      >
                        <td className="py-3.5 px-3 sm:px-4 text-center font-mono font-bold">
                          {rank === 1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-sm">
                              1
                            </span>
                          ) : rank === 2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 text-slate-950 dark:text-white font-black text-xs">
                              2
                            </span>
                          ) : rank === 3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs">
                              3
                            </span>
                          ) : (
                            <span className="text-slate-400">{rank}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 sm:px-4">
                          <div className="flex items-center gap-2">
                            {entry.flagEmoji && <span className="text-base">{entry.flagEmoji}</span>}
                            <span className="font-bold text-slate-900 dark:text-white">
                              {entry.climberName}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                              {entry.countryCode}
                            </span>
                            {entry.isVerified && (
                              <span title="Oficiálně ověřený čas">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 sm:hidden">
                            {entry.gym}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 sm:px-4">
                          <span className="font-mono font-black text-sm sm:text-base text-red-600 dark:text-red-400 tabular-nums">
                            {entry.totalTime.toFixed(3)}s
                          </span>
                        </td>
                        <td className="py-3.5 px-3 sm:px-4 hidden md:table-cell font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {entry.splits.split1.toFixed(2)}s / {entry.splits.split2.toFixed(2)}s / {entry.splits.split3.toFixed(2)}s
                        </td>
                        <td className="py-3.5 px-3 sm:px-4 hidden sm:table-cell text-slate-600 dark:text-slate-300">
                          <div className="font-medium truncate max-w-[200px]">{entry.gym}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{entry.event}</div>
                        </td>
                        <td className="py-3.5 px-3 sm:px-4 hidden lg:table-cell text-slate-500 font-mono text-[11px]">
                          {entry.date}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: TRAINING CALENDAR & ANALYTICS GRAPH (100% REAL DATA) */}
      {activeMainTab === 'history' && (
        <div className="space-y-4">
          {/* Action Toolbar & Category Filter for Data Management */}
          <div className="flex flex-col gap-2.5 p-3 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="text-base">{profile.flagEmoji}</span>
                  <span>{profile.name || (lang === 'cs' ? 'Můj profil' : 'My profile')}</span>
                  <span className="text-slate-400">
                    ({historyRuns.length} výlezů · {getCategoryShort(categoryFilter)})
                  </span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {userRuns.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleExportRunsCsv}
                      className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors font-bold flex items-center gap-1 text-[11px]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(true)}
                      className="px-2.5 py-1 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 transition-colors font-bold flex items-center gap-1 text-[11px]"
                      title="Smazat všechny zaznamenané výkony"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Smazat historii</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Category switcher inside Calendar & Graphs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-slate-200/70 dark:border-slate-800">
              {([
                { id: 'adults_15m', label: '15m Dospělí' },
                { id: 'youth_u15', label: '10m U15' },
                { id: 'youth_u13', label: '10m U13' },
                { id: 'all', label: 'Všechny kategorie' },
              ] as const).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(cat.id);
                    setSelectedCalendarDate(null);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors shrink-0 ${
                    categoryFilter === cat.id
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Metrics Bar from REAL Runs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Osobní rekord ({getCategoryShort(categoryFilter)})
              </span>
              <span className="text-xl sm:text-2xl font-mono font-black text-red-600 dark:text-red-400 mt-0.5 block">
                {metrics.bestTime}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block truncate">
                {profile.name} · {profile.nationalityCode}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Tréninků v měsíci</span>
              <span className="text-xl sm:text-2xl font-mono font-black text-slate-900 dark:text-white mt-0.5 block">
                {metrics.activeDays} {metrics.activeDays === 1 ? 'den' : metrics.activeDays >= 2 && metrics.activeDays <= 4 ? 'dny' : 'dní'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {metrics.totalRunsThisMonth} výlezů v {monthLabel}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Průměrná reakce</span>
              <span className="text-xl sm:text-2xl font-mono font-black text-amber-500 mt-0.5 block">
                {metrics.avgReaction}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">IFSC limit DQ: &lt; 0.100s</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Konzistence výlezů</span>
              <span className="text-xl sm:text-2xl font-mono font-black text-emerald-500 mt-0.5 block">
                {metrics.successRate}%
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {metrics.totalRunsAllTime} výlezů v kategorii
              </span>
            </div>
          </div>

          {/* REAL Interactive Progression Graph */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-red-600" />
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                  Křivka progresu – {getCategoryShort(categoryFilter)} (Čas v sekundách)
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {progressionData ? `${progressionData.count} platných pokusů` : '0 pokusů'}
              </span>
            </div>

            {progressionData ? (
              <div className="space-y-2">
                <div className="relative h-44 w-full bg-slate-50 dark:bg-slate-950 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="realProgressionGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Reference top/bottom time lines */}
                    <line x1="0" y1="22" x2="500" y2="22" stroke="#ef4444" strokeDasharray="3 3" strokeWidth="0.8" opacity="0.4" />
                    <text x="5" y="18" fill="#ef4444" fontSize="8" fontFamily="monospace">
                      Nejlepší: {progressionData.minTime.toFixed(2)}s
                    </text>

                    {progressionData.maxTime > progressionData.minTime && (
                      <>
                        <line x1="0" y1="98" x2="500" y2="98" stroke="#94a3b8" strokeDasharray="3 3" strokeWidth="0.8" opacity="0.4" />
                        <text x="5" y="94" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                          {progressionData.maxTime.toFixed(2)}s
                        </text>
                      </>
                    )}

                    {/* Area under curve */}
                    {progressionData.areaD && (
                      <path d={progressionData.areaD} fill="url(#realProgressionGrad)" />
                    )}

                    {/* Progression curve line */}
                    {progressionData.pathD && (
                      <path
                        d={progressionData.pathD}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Node points */}
                    {progressionData.points.map((pt, i) => {
                      const isBest = Math.abs(pt.time - progressionData.minTime) < 0.001;
                      return (
                        <g key={pt.id || i}>
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isBest ? 5.5 : 4}
                            fill={isBest ? '#ef4444' : '#ffffff'}
                            stroke="#ef4444"
                            strokeWidth={isBest ? 3 : 2}
                          />
                          <text
                            x={pt.x}
                            y={Math.max(12, pt.y - 7)}
                            textAnchor="middle"
                            fill="#ef4444"
                            fontSize="8"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            {pt.time.toFixed(2)}s
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>První zaznamenaný pokus ({progressionData.points[0]?.date})</span>
                  <span className="text-red-500 font-bold">
                    Nejlepší čas: {progressionData.minTime.toFixed(3)}s ({progressionData.bestRun.date.split('T')[0]})
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-1">
                <Clock className="w-6 h-6 mx-auto text-slate-400" />
                <p className="font-bold">Zatím žádné zaznamenané pokusy pro graf progresu</p>
                <p className="text-[11px]">Změřte svůj první výlez v sekci Časomíra pro automatické zobrazení křivky!</p>
              </div>
            )}
          </div>

          {/* Dynamic Monthly Calendar Connected to REAL Runs */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-red-600" />
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                  Tréninkový kalendář – {monthLabel}
                </h3>
              </div>

              {/* Prev / Next Month Navigator */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                  title="Předchozí měsíc"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 px-1">
                  {calendarData.activeDaysCount} {calendarData.activeDaysCount === 1 ? 'den' : 'dnů'} s tréninkem
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                  title="Následující měsíc"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
              {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map((d) => (
                <div key={d} className="font-bold text-slate-400 py-1 text-[11px]">
                  {d}
                </div>
              ))}

              {/* Blank offset days */}
              {Array.from({ length: calendarData.offsetDays }).map((_, idx) => (
                <div key={`blank-${idx}`} className="p-2 min-h-[58px] opacity-10 pointer-events-none" />
              ))}

              {/* Days of month */}
              {calendarData.days.map((c) => {
                const isSelected = selectedCalendarDate === c.dateKey;
                return (
                  <div
                    key={c.dateKey}
                    onClick={() => {
                      if (c.runs > 0) {
                        setSelectedCalendarDate(isSelected ? null : c.dateKey);
                      }
                    }}
                    className={`p-1.5 sm:p-2 rounded-xl border flex flex-col items-center justify-between min-h-[58px] transition-all cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-red-500 bg-red-100/50 dark:bg-red-950/70 border-red-500 shadow-md'
                        : c.isPB
                        ? 'bg-red-50 dark:bg-red-950/40 border-red-500 ring-1 ring-red-500/30'
                        : c.runs > 0
                        ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                        : 'bg-transparent border-transparent text-slate-400 opacity-60'
                    }`}
                  >
                    <span className="font-bold text-xs">{c.day}</span>
                    {c.best && (
                      <span
                        className={`text-[10px] font-mono font-bold mt-1 px-1 rounded ${
                          c.isPB ? 'bg-red-600 text-white' : 'text-red-500 dark:text-red-400'
                        }`}
                      >
                        {c.best}
                      </span>
                    )}
                    {c.runs > 0 && (
                      <span className="text-[9px] text-slate-400 mt-0.5">
                        {c.runs} {c.runs === 1 ? 'pokus' : c.runs < 5 ? 'pokusy' : 'pokusů'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected Date Run Detail Card with Deletion */}
            {selectedCalendarDate && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-red-200 dark:border-red-900/50 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-red-600" />
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      Trénink ze dne {selectedCalendarDate} ({selectedDateRuns.length} výlezů)
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCalendarDate(null)}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
                  >
                    Zavřít
                  </button>
                </div>

                <div className="space-y-2">
                  {selectedDateRuns.map((run) => (
                    <div
                      key={run.id}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-red-600 dark:text-red-400">
                          {run.totalTime.toFixed(3)}s
                        </span>
                        {run.isPersonalBest && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            PB
                          </span>
                        )}
                        {run.isFalseStart && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                            Ulitý start
                          </span>
                        )}
                        <span className="text-slate-500 font-medium">
                          {getCategoryShort(run.routeCategory)} · {run.gym}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-mono text-slate-400">
                          {run.routeCategory === 'adults_15m'
                            ? `5m: ${run.splits.split1.toFixed(2)}s / 10m: ${run.splits.split2.toFixed(2)}s / 15m: ${run.splits.split3.toFixed(2)}s`
                            : `3.3m: ${run.splits.split1.toFixed(2)}s / 6.6m: ${run.splits.split2.toFixed(2)}s / 10m: ${run.splits.split3.toFixed(2)}s`}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSingleRun(run.id)}
                          className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-slate-400 hover:text-red-600 transition-colors"
                          title="Smazat tento pokus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Time Submission Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-display font-black text-lg text-slate-950 dark:text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span>Zapsat čas do žebříčku</span>
              </h3>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRun} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Jméno lezce
                </label>
                <input
                  type="text"
                  required
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Dosažený čas (vteřiny s tisícinami)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="3.0"
                  max="30.0"
                  required
                  placeholder="např. 5.642"
                  value={subTime}
                  onChange={(e) => setSubTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono text-base font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kategorie cesty
                </label>
                <select
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  <option value="adults_15m">15m Standardní dospělí</option>
                  <option value="youth_u15">10m Mládež U15</option>
                  <option value="youth_u13">10m Mládež U13</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lezecká stěna / Tělocvična
                </label>
                <input
                  type="text"
                  required
                  value={subGym}
                  onChange={(e) => setSubGym(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Událost / Závod
                </label>
                <input
                  type="text"
                  value={subEvent}
                  onChange={(e) => setSubEvent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md"
                >
                  Uložit čas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clear All Runs Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-display font-black text-base text-slate-950 dark:text-white">
                Smazat celou historii výlezů?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tato akce trvale odstraní všech {userRuns.length} naměřených pokusů včetně mezičasů a kalendářních záznamů.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Ponechat
              </button>
              <button
                type="button"
                onClick={handleClearAllHistory}
                className="py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm"
              >
                Ano, vymazat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

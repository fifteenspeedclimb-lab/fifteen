import React, { useState } from 'react';
import {
  Trophy,
  MapPin,
  Plus,
  CheckCircle2,
  Calendar as CalendarIcon,
  TrendingUp,
  BarChart3,
  Download,
  Filter,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Flame,
  Award
} from 'lucide-react';
import { getUserProfile, getStoredRuns, saveRun } from '../utils/storage';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { SpeedRun } from '../types/climbing';

interface LeaderboardEntry {
  id: string;
  rank: number;
  climberName: string;
  country: string;
  countryCode: string;
  gender: 'men' | 'women';
  category: 'adults_15m' | 'youth_u15' | 'youth_u13';
  totalTime: number;
  splits: { split1: number; split2: number; split3: number };
  gym: string;
  event: string;
  date: string;
  isVerified: boolean;
}

const GLOBAL_IFSC_RECORDS: LeaderboardEntry[] = [
  {
    id: 'rec-1',
    rank: 1,
    climberName: 'Sam Watson',
    country: 'United States',
    countryCode: 'USA',
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
    country: 'Indonesia',
    countryCode: 'INA',
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
    country: 'China',
    countryCode: 'CHN',
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
    country: 'Italy',
    countryCode: 'ITA',
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
    id: 'rec-5',
    rank: 5,
    climberName: 'Alex Novák (Vy)',
    country: 'Czech Republic',
    countryCode: 'CZE',
    gender: 'men',
    category: 'adults_15m',
    totalTime: 5.642,
    splits: { split1: 1.78, split2: 1.94, split3: 1.92 },
    gym: 'Big Wall Praha (15m)',
    event: 'Trénink s aplikací Fifteen',
    date: '2026-11-06',
    isVerified: true,
  },
  {
    id: 'rec-6',
    rank: 6,
    climberName: 'Jan Kříž',
    country: 'Czech Republic',
    countryCode: 'CZE',
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
    rank: 7,
    climberName: 'Julian David',
    country: 'New Zealand',
    countryCode: 'NZL',
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
    country: 'Poland',
    countryCode: 'POL',
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
    country: 'China',
    countryCode: 'CHN',
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
    country: 'United States',
    countryCode: 'USA',
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
    country: 'China',
    countryCode: 'CHN',
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
    country: 'Czech Republic',
    countryCode: 'CZE',
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
    country: 'Czech Republic',
    countryCode: 'CZE',
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

interface LeaderboardsProps {
  lang?: Language;
}

export const Leaderboards: React.FC<LeaderboardsProps> = ({ lang = 'cs' }) => {
  const profile = getUserProfile();
  const t = TRANSLATIONS[lang];
  const userRuns = getStoredRuns();

  const [activeMainTab, setActiveMainTab] = useState<'leaderboard' | 'history'>('leaderboard');
  const [genderFilter, setGenderFilter] = useState<'men' | 'women'>('men');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'adults_15m' | 'youth_u15' | 'youth_u13'>('all');
  const [venueFilter, setVenueFilter] = useState<string>('all');
  const [entries, setEntries] = useState<LeaderboardEntry[]>(GLOBAL_IFSC_RECORDS);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);

  // Submission Form State
  const [subName, setSubName] = useState<string>(profile.name);
  const [subTime, setSubTime] = useState<string>('');
  const [subGym, setSubGym] = useState<string>('Big Wall Praha (15m)');
  const [subEvent, setSubEvent] = useState<string>('Oficiální tréninkový výlez Fifteen');
  const [subCategory, setSubCategory] = useState<'adults_15m' | 'youth_u15' | 'youth_u13'>('adults_15m');

  // Calendar State for History Tab
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>('2026-11-06');

  // Filtered leaderboard list
  const filteredEntries = entries
    .filter((e) => e.gender === genderFilter)
    .filter((e) => (categoryFilter === 'all' ? true : e.category === categoryFilter))
    .filter((e) => (venueFilter === 'all' ? true : e.gym.toLowerCase().includes(venueFilter.toLowerCase())))
    .sort((a, b) => a.totalTime - b.totalTime);

  const handleSubmitRun = (e: React.FormEvent) => {
    e.preventDefault();
    const timeNum = parseFloat(subTime);
    if (isNaN(timeNum) || timeNum <= 0) return;

    const newEntry: LeaderboardEntry = {
      id: 'sub-' + Date.now(),
      rank: 0,
      climberName: `${subName} (Vy)`,
      country: 'Czech Republic',
      countryCode: 'CZE',
      gender: genderFilter,
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
    };

    setEntries((prev) => [newEntry, ...prev]);
    setShowSubmitModal(false);
    setSubTime('');
  };

  // CSV Exporter
  const handleExportRunsCsv = () => {
    const runs = userRuns.length > 0 ? userRuns : [
      { id: '1', date: '2026-11-06T10:15:00Z', totalTime: 5.642, reactionTime: 0.138, routeCategory: 'adults_15m', gym: 'Big Wall Praha' },
      { id: '2', date: '2026-11-04T16:20:00Z', totalTime: 5.710, reactionTime: 0.142, routeCategory: 'adults_15m', gym: 'Big Wall Praha' },
      { id: '3', date: '2026-11-02T14:00:00Z', totalTime: 5.890, reactionTime: 0.155, routeCategory: 'adults_15m', gym: 'Big Wall Praha' },
      { id: '4', date: '2026-10-28T09:30:00Z', totalTime: 6.120, reactionTime: 0.160, routeCategory: 'adults_15m', gym: 'HUDY Brno' },
    ];

    const headers = 'ID,Datum,Cas_Sekundy,Reakce,Kategorie,Stena\n';
    const rows = runs
      .map((r: any) => `${r.id},${r.date},${r.totalTime},${r.reactionTime},${r.routeCategory},"${r.gym}"`)
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

  // Mock calendar days in November 2026
  const CALENDAR_DAYS = [
    { day: 1, runs: 0, best: null },
    { day: 2, runs: 4, best: '5.89s' },
    { day: 3, runs: 0, best: null },
    { day: 4, runs: 6, best: '5.71s' },
    { day: 5, runs: 0, best: null },
    { day: 6, runs: 8, best: '5.64s', isPB: true },
    { day: 7, runs: 3, best: '5.69s' },
    { day: 8, runs: 0, best: null },
    { day: 9, runs: 5, best: '5.66s' },
    { day: 10, runs: 0, best: null },
    { day: 11, runs: 0, best: null },
    { day: 12, runs: 4, best: '5.75s' },
    { day: 13, runs: 0, best: null },
    { day: 14, runs: 0, best: null },
    { day: 15, runs: 7, best: '5.68s' },
  ];

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
              ? 'Světové rekordy IFSC (Paříž, Salt Lake City, Wujiang) a ověřené časy lezců'
              : 'Přehled vašich tréninkových dnů, graf zrychlování a export dat'}
          </p>
        </div>

        {/* Dual Tab Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveMainTab('leaderboard')}
            className={`min-h-[40px] px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeMainTab === 'leaderboard'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>{lang === 'cs' ? 'IFSC Žebříčky' : 'IFSC Rankings'}</span>
          </button>
          <button
            onClick={() => setActiveMainTab('history')}
            className={`min-h-[40px] px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeMainTab === 'history'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <CalendarIcon className="w-4 h-4 text-red-600" />
            <span>{lang === 'cs' ? 'Kalendář & Grafy' : 'Calendar & Progress'}</span>
          </button>
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
                      ? 'bg-red-600 text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Vše
                </button>
                <button
                  onClick={() => setCategoryFilter('adults_15m')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                    categoryFilter === 'adults_15m'
                      ? 'bg-red-600 text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  15m Dospělí
                </button>
                <button
                  onClick={() => setCategoryFilter('youth_u15')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                    categoryFilter === 'youth_u15'
                      ? 'bg-red-600 text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  10m U15
                </button>
                <button
                  onClick={() => setCategoryFilter('youth_u13')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                    categoryFilter === 'youth_u13'
                      ? 'bg-red-600 text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  10m U13
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={venueFilter}
                  onChange={(e) => setVenueFilter(e.target.value)}
                  className="min-h-[40px] text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200 w-full sm:w-auto"
                >
                  <option value="all">Všechny haly & Světové rekordy</option>
                  <option value="Bourget">Le Bourget (Paříž – Olympijská stěna)</option>
                  <option value="Salt Lake">Salt Lake City (USA World Cup)</option>
                  <option value="Wujiang">Wujiang (Čína IFSC)</option>
                  <option value="Big Wall">Big Wall Praha (ČR)</option>
                  <option value="HUDY">HUDY Brno (ČR)</option>
                </select>
              </div>

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
                    <th className="py-3 px-3 sm:px-4">Lezec & Země</th>
                    <th className="py-3 px-3 sm:px-4">Čas</th>
                    <th className="py-3 px-3 sm:px-4 hidden md:table-cell">Mezičasy (5m / 10m / 15m)</th>
                    <th className="py-3 px-3 sm:px-4 hidden sm:table-cell">Lokalita / Akce</th>
                    <th className="py-3 px-3 sm:px-4 hidden lg:table-cell">Datum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredEntries.map((entry, index) => {
                    const rank = index + 1;
                    const isUser = entry.climberName.includes('(Vy)');
                    return (
                      <tr
                        key={entry.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          isUser ? 'bg-red-50/50 dark:bg-red-950/20 font-semibold' : ''
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

      {/* VIEW 2: TRAINING CALENDAR & ANALYTICS GRAPH */}
      {activeMainTab === 'history' && (
        <div className="space-y-4">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Osobní rekord (15m)</span>
              <span className="text-xl sm:text-2xl font-mono font-black text-red-600 dark:text-red-400 mt-0.5 block">5.642s</span>
              <span className="text-[10px] text-emerald-500 font-semibold mt-0.5 block">Big Wall Praha · WR Delta +0.90s</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Tréninků v měsíci</span>
              <span className="text-xl sm:text-2xl font-mono font-black text-slate-900 dark:text-white mt-0.5 block">14 dní</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Celkem 42 měřených výlezů</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Průměrná reakce</span>
              <span className="text-xl sm:text-2xl font-mono font-black text-amber-500 mt-0.5 block">0.134s</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">IFSC limit DQ: &lt; 0.100s</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Konzistence výlezů</span>
              <span className="text-xl sm:text-2xl font-mono font-black text-emerald-500 mt-0.5 block">94.8%</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">1 selhání z 20 pokusů</span>
            </div>
          </div>

          {/* Interactive Progression Graph */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-red-600" />
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                  Křivka rychlostního progresu (Čas v sekundách)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportRunsCsv}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Visual SVG Progression Graph */}
            <div className="relative h-44 w-full bg-slate-50 dark:bg-slate-950 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 overflow-hidden">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
                {/* Reference line: 6.0s */}
                <line x1="0" y1="50" x2="500" y2="50" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth="0.8" opacity="0.4" />
                <text x="5" y="46" fill="#94a3b8" fontSize="8" fontFamily="monospace">6.00s</text>

                {/* Target line: 5.50s */}
                <line x1="0" y1="85" x2="500" y2="85" stroke="#ef4444" strokeDasharray="4 4" strokeWidth="1" opacity="0.6" />
                <text x="5" y="81" fill="#ef4444" fontSize="8" fontFamily="monospace">Cíl: 5.50s</text>

                {/* Progression curve */}
                <path
                  d="M 20 20 L 90 32 L 170 38 L 240 45 L 320 62 L 400 70 L 480 82"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Area under curve */}
                <path
                  d="M 20 20 L 90 32 L 170 38 L 240 45 L 320 62 L 400 70 L 480 82 L 480 120 L 20 120 Z"
                  fill="url(#progressionGradient)"
                  opacity="0.2"
                />

                <defs>
                  <linearGradient id="progressionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Nodes */}
                {[
                  { cx: 20, cy: 20, time: '7.15s' },
                  { cx: 90, cy: 32, time: '6.82s' },
                  { cx: 170, cy: 38, time: '6.45s' },
                  { cx: 240, cy: 45, time: '6.12s' },
                  { cx: 320, cy: 62, time: '5.89s' },
                  { cx: 400, cy: 70, time: '5.71s' },
                  { cx: 480, cy: 82, time: '5.64s', active: true },
                ].map((pt, i) => (
                  <g key={i}>
                    <circle
                      cx={pt.cx}
                      cy={pt.cy}
                      r={pt.active ? 6 : 4}
                      fill={pt.active ? '#ef4444' : '#ffffff'}
                      stroke="#ef4444"
                      strokeWidth={pt.active ? 3 : 2}
                    />
                    <text
                      x={pt.cx}
                      y={pt.cy - 8}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                      className="drop-shadow"
                    >
                      {pt.time}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>Září 2026 (Začátek tréninku)</span>
              <span>Říjen 2026</span>
              <span className="text-red-500 font-bold">Listopad 2026 (PB: 5.642s)</span>
            </div>
          </div>

          {/* Interactive Monthly Calendar */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-red-600" />
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                  Tréninkový kalendář – Listopad 2026
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">
                8 aktivních dnů v tomto měsíci
              </span>
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
              {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map((d) => (
                <div key={d} className="font-bold text-slate-400 py-1 text-[11px]">
                  {d}
                </div>
              ))}

              {CALENDAR_DAYS.map((c) => (
                <div
                  key={c.day}
                  onClick={() => c.best && setSelectedCalendarDate(`2026-11-${c.day < 10 ? '0' + c.day : c.day}`)}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-between min-h-[56px] transition-all cursor-pointer ${
                    c.isPB
                      ? 'bg-red-50 dark:bg-red-950/40 border-red-500 ring-2 ring-red-500/20'
                      : c.runs > 0
                      ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                      : 'bg-transparent border-transparent text-slate-400 opacity-60'
                  }`}
                >
                  <span className="font-bold text-xs">{c.day}</span>
                  {c.best && (
                    <span className={`text-[10px] font-mono font-bold mt-1 px-1 rounded ${
                      c.isPB ? 'bg-red-600 text-white' : 'text-red-500 dark:text-red-400'
                    }`}>
                      {c.best}
                    </span>
                  )}
                  {c.runs > 0 && (
                    <span className="text-[9px] text-slate-400 mt-0.5">
                      {c.runs} pokusů
                    </span>
                  )}
                </div>
              ))}
            </div>
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
                  Dosažený čas (vteřiny s setinami)
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
    </div>
  );
};

import React, { useState } from 'react';
import { Trophy, MapPin, Plus, CheckCircle2 } from 'lucide-react';
import { getUserProfile } from '../utils/storage';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface LeaderboardEntry {
  id: string;
  rank: number;
  climberName: string;
  country: string;
  countryCode: string;
  gender: 'men' | 'women';
  totalTime: number;
  splits: { split1: number; split2: number; split3: number };
  gym: string;
  event: string;
  date: string;
  isVerified: boolean;
}

const INITIAL_ENTRIES: LeaderboardEntry[] = [
  {
    id: 'lb-1',
    rank: 1,
    climberName: 'Sam Watson',
    country: 'United States',
    countryCode: 'USA',
    gender: 'men',
    totalTime: 4.74,
    splits: { split1: 1.46, split2: 1.62, split3: 1.66 },
    gym: 'Le Bourget Climbing Venue',
    event: 'Olympijské hry Paříž (Světový rekord)',
    date: '2024-08-08',
    isVerified: true,
  },
  {
    id: 'lb-2',
    rank: 2,
    climberName: 'Veddriq Leonardo',
    country: 'Indonesia',
    countryCode: 'INA',
    gender: 'men',
    totalTime: 4.75,
    splits: { split1: 1.48, split2: 1.61, split3: 1.66 },
    gym: 'Le Bourget Climbing Venue',
    event: 'Zlaté finále olympiády',
    date: '2024-08-08',
    isVerified: true,
  },
  {
    id: 'lb-3',
    rank: 3,
    climberName: 'Matteo Zurloni',
    country: 'Italy',
    countryCode: 'ITA',
    gender: 'men',
    totalTime: 4.95,
    splits: { split1: 1.55, split2: 1.69, split3: 1.71 },
    gym: 'Wujiang IFSC World Cup',
    event: 'Evropský rekord',
    date: '2024-04-14',
    isVerified: true,
  },
  {
    id: 'lb-4',
    rank: 4,
    climberName: 'Jan Kříž',
    country: 'Czech Republic',
    countryCode: 'CZE',
    gender: 'men',
    totalTime: 5.48,
    splits: { split1: 1.72, split2: 1.88, split3: 1.88 },
    gym: 'Big Wall Praha (15m)',
    event: 'Mistrovství ČR v rychlosti',
    date: '2025-06-12',
    isVerified: true,
  },
  {
    id: 'lb-5',
    rank: 5,
    climberName: 'Alex Novák (Vy)',
    country: 'Czech Republic',
    countryCode: 'CZE',
    gender: 'men',
    totalTime: 5.642,
    splits: { split1: 1.78, split2: 1.94, split3: 1.92 },
    gym: 'Big Wall Praha',
    event: 'Trénink s aplikací Fifteen',
    date: '2026-11-04',
    isVerified: true,
  },
  {
    id: 'lb-6',
    rank: 6,
    climberName: 'Tomáš Binter',
    country: 'Czech Republic',
    countryCode: 'CZE',
    gender: 'men',
    totalTime: 5.82,
    splits: { split1: 1.82, split2: 2.01, split3: 1.99 },
    gym: 'Vertikon Zlín',
    event: 'Moravia Speed Open',
    date: '2026-09-20',
    isVerified: true,
  },
  {
    id: 'lb-7',
    rank: 7,
    climberName: 'Martin Dvořák',
    country: 'Czech Republic',
    countryCode: 'CZE',
    gender: 'men',
    totalTime: 6.04,
    splits: { split1: 1.90, split2: 2.11, split3: 2.03 },
    gym: 'HUDY Lezecká Stěna Brno',
    event: 'Brněnský pohár',
    date: '2026-10-15',
    isVerified: false,
  },
  {
    id: 'lb-w1',
    rank: 1,
    climberName: 'Aleksandra Mirosław',
    country: 'Poland',
    countryCode: 'POL',
    gender: 'women',
    totalTime: 6.06,
    splits: { split1: 1.95, split2: 2.12, split3: 1.99 },
    gym: 'Le Bourget Climbing Venue',
    event: 'Světový rekord ženy 15m',
    date: '2024-08-05',
    isVerified: true,
  },
  {
    id: 'lb-w2',
    rank: 2,
    climberName: 'Deng Lijuan',
    country: 'China',
    countryCode: 'CHN',
    gender: 'women',
    totalTime: 6.18,
    splits: { split1: 2.01, split2: 2.14, split3: 2.03 },
    gym: 'Olympijské finále Paříž',
    event: 'Stříbrná olympijská medaile',
    date: '2024-08-08',
    isVerified: true,
  },
  {
    id: 'lb-w3',
    rank: 3,
    climberName: 'Tereza Cibulková',
    country: 'Czech Republic',
    countryCode: 'CZE',
    gender: 'women',
    totalTime: 7.42,
    splits: { split1: 2.38, split2: 2.56, split3: 2.48 },
    gym: 'Big Wall Praha',
    event: 'Český pohár',
    date: '2026-05-18',
    isVerified: true,
  },
];

interface LeaderboardsProps {
  lang?: Language;
}

export const Leaderboards: React.FC<LeaderboardsProps> = ({ lang = 'cs' }) => {
  const profile = getUserProfile();
  const t = TRANSLATIONS[lang];

  const [genderFilter, setGenderFilter] = useState<'men' | 'women'>('men');
  const [gymFilter, setGymFilter] = useState<string>('all');
  const [entries, setEntries] = useState<LeaderboardEntry[]>(INITIAL_ENTRIES);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);

  const [subName, setSubName] = useState<string>(profile.name);
  const [subTime, setSubTime] = useState<string>('');
  const [subGym, setSubGym] = useState<string>(profile.homeGym);
  const [subEvent, setSubEvent] = useState<string>('Tréninkový čas Fifteen');

  const filteredEntries = entries
    .filter((e) => e.gender === genderFilter)
    .filter((e) => (gymFilter === 'all' ? true : e.gym.includes(gymFilter)))
    .sort((a, b) => a.totalTime - b.totalTime);

  const handleSubmitRun = (e: React.FormEvent) => {
    e.preventDefault();
    const timeNum = parseFloat(subTime);
    if (isNaN(timeNum) || timeNum <= 0) return;

    const newEntry: LeaderboardEntry = {
      id: 'sub-' + Date.now(),
      rank: 0,
      climberName: subName,
      country: 'Czech Republic',
      countryCode: 'CZE',
      gender: genderFilter,
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

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-500" />
            <span>{t.leaderboardTitle}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.leaderboardSubtitle}
          </p>
        </div>

        <button
          onClick={() => setShowSubmitModal(true)}
          className="min-h-[44px] px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>{t.submitTimeBtn}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setGenderFilter('men')}
            className={`min-h-[38px] px-4 py-1.5 text-xs font-bold rounded-xl transition-colors ${
              genderFilter === 'men'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {t.filterMen}
          </button>
          <button
            onClick={() => setGenderFilter('women')}
            className={`min-h-[38px] px-4 py-1.5 text-xs font-bold rounded-xl transition-colors ${
              genderFilter === 'women'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {t.filterWomen}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={gymFilter}
            onChange={(e) => setGymFilter(e.target.value)}
            className="min-h-[40px] text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200"
          >
            <option value="all">Všechny stěny & Světové rekordy</option>
            <option value="Big Wall Praha">Big Wall Praha</option>
            <option value="Vertikon Zlín">Vertikon Zlín</option>
            <option value="HUDY Lezecká Stěna Brno">HUDY Lezecká Stěna Brno</option>
            <option value="Lezecká aréna Jirkov">Lezecká aréna Jirkov</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 w-14 text-center">Pořadí</th>
                <th className="py-3 px-4">Lezec</th>
                <th className="py-3 px-4">Čas</th>
                <th className="py-3 px-4 hidden md:table-cell">Mezičasy (5m / 10m / 15m)</th>
                <th className="py-3 px-4 hidden sm:table-cell">Stěna</th>
                <th className="py-3 px-4 hidden lg:table-cell">Datum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredEntries.map((entry, index) => {
                const rank = index + 1;
                return (
                  <tr
                    key={entry.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      entry.climberName.includes('(Vy)')
                        ? 'bg-red-50/60 dark:bg-red-950/20 font-medium'
                        : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center font-bold">
                      {rank === 1 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-black">
                          1
                        </span>
                      ) : rank === 2 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 font-black">
                          2
                        </span>
                      ) : rank === 3 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-900/10 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 font-black">
                          3
                        </span>
                      ) : (
                        <span className="font-mono text-slate-400">{rank}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {entry.climberName}
                        </span>
                        {entry.isVerified && (
                          <span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {entry.countryCode} · {entry.event}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono font-black text-base tabular-nums text-slate-950 dark:text-white">
                        {entry.totalTime.toFixed(3)}s
                      </span>
                    </td>

                    <td className="py-3.5 px-4 hidden md:table-cell font-mono text-[11px] text-slate-500 tabular-nums">
                      {entry.splits.split1.toFixed(2)}s / {entry.splits.split2.toFixed(2)}s / {entry.splits.split3.toFixed(2)}s
                    </td>

                    <td className="py-3.5 px-4 hidden sm:table-cell text-slate-600 dark:text-slate-300">
                      {entry.gym}
                    </td>

                    <td className="py-3.5 px-4 hidden lg:table-cell text-slate-400 font-mono text-[11px]">
                      {entry.date}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitRun}
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-display font-bold text-base text-slate-950 dark:text-white">
                Zapsat čas na 15m stěně
              </h3>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jméno lezce
                </label>
                <input
                  type="text"
                  required
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Výsledný čas (sekundy)
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  placeholder="např. 5.642"
                  value={subTime}
                  onChange={(e) => setSubTime(e.target.value)}
                  className="w-full px-3 py-2 font-mono text-base font-bold rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lezecká stěna
                </label>
                <select
                  value={subGym}
                  onChange={(e) => setSubGym(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Big Wall Praha">Big Wall Praha</option>
                  <option value="Vertikon Zlín">Vertikon Zlín</option>
                  <option value="HUDY Lezecká Stěna Brno">HUDY Lezecká Stěna Brno</option>
                  <option value="Lezecká aréna Jirkov">Lezecká aréna Jirkov</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
              >
                Zrušit
              </button>
              <button
                type="submit"
                className="min-h-[42px] px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                Uložit do žebříčku
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

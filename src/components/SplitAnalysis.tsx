import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Award,
  Zap,
  Activity,
  TrendingUp,
  Gauge,
  Users,
  Trophy,
  Crown,
  Check,
  Swords,
  Flame,
  ArrowRight
} from 'lucide-react';
import { SpeedRun, RouteCategory } from '../types/climbing';
import { WORLD_RECORDS, SECTION_METRICS } from '../data/speedWallData';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { getAllProfiles, getBestTimeForCategory } from '../utils/storage';

interface SplitAnalysisProps {
  currentRun?: SpeedRun | null;
  allRuns: SpeedRun[];
  onSelectRun: (run: SpeedRun) => void;
  onOpenAiAnalysis: (run: SpeedRun) => void;
  lang?: Language;
  currentCategory?: RouteCategory;
}

const getCategoryBadgeLabel = (cat: RouteCategory): string => {
  if (cat === 'youth_u15') return '10m U15';
  if (cat === 'youth_u13') return '10m U13';
  return '15m Dospělí';
};

export const SplitAnalysis: React.FC<SplitAnalysisProps> = ({
  currentRun,
  allRuns,
  onSelectRun,
  onOpenAiAnalysis,
  lang = 'cs',
  currentCategory = 'adults_15m',
}) => {
  const t = TRANSLATIONS[lang];
  const profiles = getAllProfiles();

  const [selectedCategory, setSelectedCategory] = useState<RouteCategory>(
    currentRun?.routeCategory || currentCategory
  );
  const [analysisMode, setAnalysisMode] = useState<'single' | 'compare'>('single');
  const [compareScope, setCompareScope] = useState<'inter_climber' | 'same_climber'>('inter_climber');
  const [selectedSameClimberKey, setSelectedSameClimberKey] = useState<string>('');

  useEffect(() => {
    setSelectedCategory(currentCategory);
  }, [currentCategory]);

  useEffect(() => {
    if (currentRun?.routeCategory) {
      setSelectedCategory(currentRun.routeCategory);
    }
  }, [currentRun?.id, currentRun?.routeCategory]);

  const categoryRuns = allRuns.filter((r) => r.routeCategory === selectedCategory);
  const categoryRecords = WORLD_RECORDS.filter((r) => r.category === selectedCategory);
  const availableRecords = categoryRecords.length > 0 ? categoryRecords : WORLD_RECORDS;
  const defaultWrId = `wr-${availableRecords[0].id}`;

  // Group runs by climber for "Porovnání pokusů jednoho lezce"
  const climberGroups = React.useMemo(() => {
    const map = new Map<string, { key: string; name: string; flag: string; runs: SpeedRun[] }>();
    for (const r of categoryRuns) {
      const name = (r.climberName || 'Lezec').trim();
      const key = name.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { key, name, flag: r.flagEmoji || '🇨🇿', runs: [] });
      }
      map.get(key)!.runs.push(r);
    }
    return Array.from(map.values()).sort((a, b) => b.runs.length - a.runs.length);
  }, [categoryRuns]);

  const activeSameClimber =
    climberGroups.find((g) => g.key === selectedSameClimberKey) || climberGroups[0] || null;
  const sameClimberRuns = activeSameClimber?.runs || [];

  // Head-to-Head Comparison selection
  const [runIdA, setRunIdA] = useState<string>(currentRun?.id || (categoryRuns[0]?.id ?? ''));
  const [runIdB, setRunIdB] = useState<string>(
    categoryRuns.length > 1 ? categoryRuns[1].id : defaultWrId
  );

  // Helper to auto-pick latest vs best/second attempt of a given climber
  const selectSameClimberDefaults = (runsForClimber: SpeedRun[]) => {
    if (runsForClimber.length === 0) return;
    const latest = runsForClimber[0];
    const best = [...runsForClimber].sort((a, b) => a.totalTime - b.totalTime)[0];
    setRunIdA(latest.id);
    if (runsForClimber.length >= 2) {
      const secondChoice = best.id !== latest.id ? best : runsForClimber[1];
      setRunIdB(secondChoice.id);
    } else {
      setRunIdB(defaultWrId);
    }
    setCurrentPlaybackTime(0);
  };

  // Sync selectedSameClimberKey when category or currentRun changes
  useEffect(() => {
    if (climberGroups.length === 0) {
      setSelectedSameClimberKey('');
      return;
    }
    const preferredKey = currentRun?.climberName?.trim().toLowerCase();
    const existsCurrent = climberGroups.some((g) => g.key === selectedSameClimberKey);
    if (!existsCurrent) {
      const nextGroup =
        (preferredKey && climberGroups.find((g) => g.key === preferredKey)) || climberGroups[0];
      setSelectedSameClimberKey(nextGroup.key);
      if (compareScope === 'same_climber') {
        selectSameClimberDefaults(nextGroup.runs);
      }
    }
  }, [selectedCategory, climberGroups.length]);

  // Keep comparison defaults aligned when selectedCategory or categoryRuns change
  useEffect(() => {
    const validIds = new Set<string>([
      ...categoryRuns.map((r) => r.id),
      ...profiles.map((p) => p.id),
      ...availableRecords.map((w) => `wr-${w.id}`),
    ]);
    if (!runIdA || !validIds.has(runIdA)) {
      setRunIdA(
        currentRun && currentRun.routeCategory === selectedCategory
          ? currentRun.id
          : categoryRuns[0]?.id || profiles[0]?.id || defaultWrId
      );
    }
    if (!runIdB || !validIds.has(runIdB)) {
      setRunIdB(categoryRuns.length > 1 ? categoryRuns[1].id : defaultWrId);
    }
  }, [selectedCategory, categoryRuns.length]);

  const effectiveCurrentRun =
    currentRun && currentRun.routeCategory === selectedCategory
      ? currentRun
      : categoryRuns[0] || null;

  const isYouth = selectedCategory === 'youth_u13' || selectedCategory === 'youth_u15';
  const wallHeight = isYouth ? 10 : 15;
  const s1Range = isYouth ? '0–3.3m' : '0–5m';
  const s2Range = isYouth ? '3.3–6.6m' : '5–10m';
  const s3Range = isYouth ? '6.6–10m' : '10–15m';

  // Single run benchmark states
  const [selectedRecordId, setSelectedRecordId] = useState<string>(availableRecords[0].id);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.5);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0);

  useEffect(() => {
    if (!availableRecords.some((r) => r.id === selectedRecordId)) {
      setSelectedRecordId(availableRecords[0].id);
      setCurrentPlaybackTime(0);
    }
  }, [selectedCategory, availableRecords, selectedRecordId]);

  const benchmark = availableRecords.find((r) => r.id === selectedRecordId) || availableRecords[0];
  const maxDuration = Math.max(effectiveCurrentRun?.totalTime || benchmark.recordTime, benchmark.recordTime);
  const animFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  // Dual Head-to-Head Comparison Climbers
  const getComparisonItem = (id: string): {
    name: string;
    flag: string;
    totalTime: number;
    splits: { split1: number; split2: number; split3: number };
    reactionTime: number;
    gym?: string;
    date?: string;
    isBenchmark?: boolean;
  } => {
    // If it's a recorded run
    const foundRun = allRuns.find((r) => r.id === id);
    if (foundRun) {
      return {
        name: foundRun.climberName || 'Lezec',
        flag: foundRun.flagEmoji || '🇨🇿',
        totalTime: foundRun.totalTime,
        splits: foundRun.splits,
        reactionTime: foundRun.reactionTime,
        gym: foundRun.gym,
        date: new Date(foundRun.date).toLocaleDateString(),
        isBenchmark: false,
      };
    }

    // If it's a world/category record benchmark
    const wr = WORLD_RECORDS.find((w) => w.id === id || id === `wr-${w.id}`);
    if (wr) {
      return {
        name: wr.name,
        flag: wr.countryCode === 'USA' ? '🇺🇸' : wr.countryCode === 'CHN' ? '🇨🇳' : wr.countryCode === 'POL' ? '🇵🇱' : wr.countryCode === 'CZE' ? '🇨🇿' : '🌍',
        totalTime: wr.recordTime,
        splits: wr.splits,
        reactionTime: 0.125,
        gym: wr.event || 'IFSC World Cup',
        date: 'Rekord kategorie',
        isBenchmark: true,
      };
    }

    // If it's a profile without a run, generate category-scoped PB/target splits
    const prof = profiles.find((p) => p.id === id);
    if (prof) {
      const catPb =
        getBestTimeForCategory(allRuns, prof.id, selectedCategory) ||
        prof.personalBestByCategory?.[selectedCategory] ||
        (selectedCategory === 'adults_15m' ? prof.personalBest : 0);
      const time = catPb > 0 ? catPb : selectedCategory === 'adults_15m' ? prof.targetGoal || 6.5 : 7.0;
      return {
        name: prof.name,
        flag: prof.flagEmoji || '🇨🇿',
        totalTime: time,
        splits: {
          split1: parseFloat((time * 0.28).toFixed(2)),
          split2: parseFloat((time * 0.35).toFixed(2)),
          split3: parseFloat((time * 0.37).toFixed(2)),
        },
        reactionTime: 0.135,
        gym: prof.homeGym || 'Tréninkový profil',
        date: catPb > 0 ? `Osobní rekord (${getCategoryBadgeLabel(selectedCategory)})` : 'Cílový čas',
        isBenchmark: false,
      };
    }

    // Fallback to category benchmark
    return {
      name: benchmark.name,
      flag: benchmark.countryCode === 'CZE' ? '🇨🇿' : '🌍',
      totalTime: benchmark.recordTime,
      splits: benchmark.splits,
      reactionTime: 0.125,
      gym: benchmark.event,
      date: 'Rekord kategorie',
      isBenchmark: true,
    };
  };

  const climberA = getComparisonItem(runIdA || effectiveCurrentRun?.id || defaultWrId);
  const climberB = getComparisonItem(runIdB || (categoryRuns[1]?.id ?? defaultWrId));
  const isSameNameComparison =
    compareScope === 'same_climber' ||
    climberA.name.trim().toLowerCase() === climberB.name.trim().toLowerCase();
  const labelA = isSameNameComparison
    ? `Pokus A (${climberA.totalTime.toFixed(3)}s)`
    : climberA.name;
  const labelB = isSameNameComparison
    ? `Pokus B (${climberB.totalTime.toFixed(3)}s)`
    : climberB.name;
  const compareMaxDuration = Math.max(climberA.totalTime, climberB.totalTime);

  // Playback loop
  useEffect(() => {
    if (isPlaying) {
      lastTickRef.current = performance.now();
      const currentMax = analysisMode === 'compare' ? compareMaxDuration : maxDuration;
      const loop = (now: number) => {
        const deltaSec = ((now - lastTickRef.current) / 1000) * playbackSpeed;
        lastTickRef.current = now;

        setCurrentPlaybackTime((prev) => {
          const next = prev + deltaSec;
          if (next >= currentMax + 0.3) {
            setIsPlaying(false);
            return currentMax;
          }
          return next;
        });

        animFrameRef.current = requestAnimationFrame(loop);
      };
      animFrameRef.current = requestAnimationFrame(loop);
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, playbackSpeed, maxDuration, compareMaxDuration, analysisMode]);

  const resetPlayback = () => {
    setIsPlaying(false);
    setCurrentPlaybackTime(0);
  };

  const getClimberHeight = (
    timeSec: number,
    totalDuration: number,
    splits: { split1: number; split2: number; split3: number }
  ) => {
    if (timeSec <= 0) return 0;
    if (timeSec >= totalDuration) return wallHeight;

    const t1 = splits.split1;
    const t2 = splits.split1 + splits.split2;
    const t3 = totalDuration;
    const segment = wallHeight / 3.0;

    if (timeSec <= t1) {
      return (timeSec / t1) * segment;
    } else if (timeSec <= t2) {
      return segment + ((timeSec - t1) / splits.split2) * segment;
    } else {
      return segment * 2 + ((timeSec - t2) / (t3 - t2)) * segment;
    }
  };

  // Metrics for single run vs WR (computed safely even if effectiveCurrentRun is null)
  const safeRunTotal = effectiveCurrentRun?.totalTime || benchmark.recordTime;
  const safeRunSplits = effectiveCurrentRun?.splits || benchmark.splits;
  const userHeightMeters = getClimberHeight(currentPlaybackTime, safeRunTotal, safeRunSplits);
  const benchmarkHeightMeters = getClimberHeight(currentPlaybackTime, benchmark.recordTime, benchmark.splits);
  const heightGapMeters = (userHeightMeters - benchmarkHeightMeters).toFixed(2);

  const s1Delta = safeRunSplits.split1 - benchmark.splits.split1;
  const s2Delta = safeRunSplits.split2 - benchmark.splits.split2;
  const s3Delta = safeRunSplits.split3 - benchmark.splits.split3;

  // Realistic Kinematic Telemetry
  const segmentDist = wallHeight / 3.0;
  const userAvgVel = (wallHeight / safeRunTotal).toFixed(2);
  const wrAvgVel = (wallHeight / benchmark.recordTime).toFixed(2);
  const userS1Vel = (segmentDist / safeRunSplits.split1).toFixed(2);
  const userS2Vel = (segmentDist / safeRunSplits.split2).toFixed(2);
  const userS3Vel = (segmentDist / safeRunSplits.split3).toFixed(2);
  const peakVelocity = (
    Math.max(parseFloat(userS1Vel), parseFloat(userS2Vel), parseFloat(userS3Vel)) * 1.18
  ).toFixed(2);
  const cadence = ((isYouth ? 14 : 18) / safeRunTotal).toFixed(1);

  // Metrics for Head-to-Head Comparison
  const heightA = getClimberHeight(currentPlaybackTime, climberA.totalTime, climberA.splits);
  const heightB = getClimberHeight(currentPlaybackTime, climberB.totalTime, climberB.splits);
  const compareHeightGap = (heightA - heightB).toFixed(2);

  const compTotalDelta = climberA.totalTime - climberB.totalTime;
  const compS1Delta = climberA.splits.split1 - climberB.splits.split1;
  const compS2Delta = climberA.splits.split2 - climberB.splits.split2;
  const compS3Delta = climberA.splits.split3 - climberB.splits.split3;

  const aWinsS1 = compS1Delta < 0;
  const aWinsS2 = compS2Delta < 0;
  const aWinsS3 = compS3Delta < 0;
  const aSectorsWon = (aWinsS1 ? 1 : 0) + (aWinsS2 ? 1 : 0) + (aWinsS3 ? 1 : 0);
  const bSectorsWon = 3 - aSectorsWon;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 space-y-4 sm:space-y-6">
      {/* Top Main Mode Selector: Single Run vs Inter-Climber / Accounts + Category Selector */}
      <div className="flex flex-col gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
              <span>{analysisMode === 'compare' ? 'Porovnání mezi lezci / účty' : t.splitAnalysisTitle}</span>
              <span className="text-xs px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300">
                {getCategoryBadgeLabel(selectedCategory)}
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {analysisMode === 'compare'
                ? compareScope === 'same_climber'
                  ? `Porovnání dvou pokusů stejného lezce v úsecích ${s1Range}, ${s2Range} a ${s3Range} (${wallHeight}m).`
                  : `Detailní srovnání mezičasů ${s1Range}, ${s2Range} a ${s3Range} (${wallHeight}m) mezi dvěma lezci nebo účty.`
                : `Rozbor jednotlivých úseků (${s1Range}, ${s2Range}, ${s3Range}) na ${wallHeight}m trati a simulace proti rekordu.`}
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setAnalysisMode('single');
                setCurrentPlaybackTime(0);
              }}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                analysisMode === 'single'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Rozbor výlezu</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAnalysisMode('compare');
                setCurrentPlaybackTime(0);
              }}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                analysisMode === 'compare'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Swords className="w-4 h-4" />
              <span>Porovnání</span>
            </button>
          </div>
        </div>

        {/* Route Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {([
            { id: 'adults_15m', label: '15m Dospělí' },
            { id: 'youth_u15', label: '10m Mládež U15' },
            { id: 'youth_u13', label: '10m Děti U13' },
          ] as const).map((cat) => {
            const count = allRuns.filter((r) => r.routeCategory === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setIsPlaying(false);
                  setCurrentPlaybackTime(0);
                }}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 border ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-900 dark:border-white'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                }`}
              >
                <span>{cat.label}</span>
                <span className="font-mono text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =================================================================== */}
      {/* MODE 2: INTER-CLIMBER & SAME-CLIMBER ATTEMPTS COMPARISON            */}
      {/* =================================================================== */}
      {analysisMode === 'compare' ? (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in">
          {/* Sub-mode Toggle: Inter-climber vs Same-climber Attempts */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setCompareScope('inter_climber');
                    setCurrentPlaybackTime(0);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    compareScope === 'inter_climber'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Mezi lezci / účty</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCompareScope('same_climber');
                    if (activeSameClimber) {
                      setSelectedSameClimberKey(activeSameClimber.key);
                      selectSameClimberDefaults(activeSameClimber.runs);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    compareScope === 'same_climber'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Pokusy jednoho lezce</span>
                </button>
              </div>

              {compareScope === 'same_climber' && sameClimberRuns.length >= 2 && (
                <button
                  type="button"
                  onClick={() => selectSameClimberDefaults(sameClimberRuns)}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-bold hover:bg-amber-100 transition-colors"
                >
                  Poslední vs Nejlepší (PB)
                </button>
              )}
            </div>

            {/* Climber Picker for Single-Climber Attempt Comparison */}
            {compareScope === 'same_climber' && (
              <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 block">
                  Vyberte lezce ({getCategoryBadgeLabel(selectedCategory)}):
                </span>
                {climberGroups.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Pro tuto kategorii zatím nemáte žádné uložené pokusy. Změřte alespoň 2 výlezy v Časomíře.
                  </p>
                ) : (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                    {climberGroups.map((g) => (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => {
                          setSelectedSameClimberKey(g.key);
                          selectSameClimberDefaults(g.runs);
                        }}
                        className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 border transition-all ${
                          activeSameClimber?.key === g.key
                            ? 'bg-red-600 text-white border-red-600 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                        }`}
                      >
                        <span>{g.flag}</span>
                        <span>{g.name}</span>
                        <span className="text-[10px] opacity-80 font-mono">
                          ({g.runs.length} {g.runs.length === 1 ? 'pokus' : g.runs.length < 5 ? 'pokusy' : 'pokusů'})
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Climber / Attempt Selectors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Climber / Attempt A Card */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border-2 border-red-500/40 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-600 text-white font-black text-xs flex items-center justify-center">
                    A
                  </div>
                  <div>
                    <span className="text-xs font-bold text-red-600 dark:text-red-400 block uppercase tracking-wider">
                      {compareScope === 'same_climber' ? 'Pokus A' : 'První lezec / Pokus'}
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {climberA.name} {climberA.flag}
                    </span>
                    {climberA.date && (
                      <span className="text-[10px] text-slate-400 block">
                        {climberA.date}{climberA.gym ? ` · ${climberA.gym}` : ''}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xl font-mono font-black text-red-600 dark:text-red-400">
                  {climberA.totalTime.toFixed(3)}s
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  {compareScope === 'same_climber'
                    ? `Vyberte pokus A (${activeSameClimber?.name || 'Lezec'}):`
                    : 'Vyberte pokus nebo profil lezce A:'}
                </label>
                <select
                  value={runIdA}
                  onChange={(e) => {
                    setRunIdA(e.target.value);
                    setCurrentPlaybackTime(0);
                  }}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-red-500"
                >
                  {compareScope === 'same_climber' ? (
                    <>
                      <optgroup label={`Pokusy lezce ${activeSameClimber?.name || ''} (${getCategoryBadgeLabel(selectedCategory)})`}>
                        {sameClimberRuns.map((r, idx) => {
                          const attemptNum = sameClimberRuns.length - idx;
                          const d = new Date(r.date);
                          const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          return (
                            <option key={r.id} value={r.id}>
                              Pokus #{attemptNum} — {r.totalTime.toFixed(3)}s ({d.toLocaleDateString()} {timeStr}){r.isPersonalBest ? ' ⭐ PB' : ''}
                            </option>
                          );
                        })}
                      </optgroup>
                      <optgroup label={`Rekordy kategorie (${getCategoryBadgeLabel(selectedCategory)})`}>
                        {availableRecords.map((w) => (
                          <option key={w.id} value={`wr-${w.id}`}>
                            Rekord: {w.name} ({w.recordTime.toFixed(2)}s)
                          </option>
                        ))}
                      </optgroup>
                    </>
                  ) : (
                    <>
                      <optgroup label={`Zaznamenané pokusy (${getCategoryBadgeLabel(selectedCategory)})`}>
                        {categoryRuns.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.climberName || 'Lezec'} — {r.totalTime.toFixed(3)}s ({new Date(r.date).toLocaleDateString()})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label={`Profily lezců (${getCategoryBadgeLabel(selectedCategory)})`}>
                        {profiles.map((p) => {
                          const catBest =
                            getBestTimeForCategory(allRuns, p.id, selectedCategory) ||
                            p.personalBestByCategory?.[selectedCategory] ||
                            (selectedCategory === 'adults_15m' ? p.personalBest : 0);
                          return (
                            <option key={p.id} value={p.id}>
                              Profil: {p.name} {p.flagEmoji} (PB: {catBest > 0 ? `${catBest.toFixed(2)}s` : 'neměřen'})
                            </option>
                          );
                        })}
                      </optgroup>
                      <optgroup label={`Rekordy kategorie (${getCategoryBadgeLabel(selectedCategory)})`}>
                        {availableRecords.map((w) => (
                          <option key={w.id} value={`wr-${w.id}`}>
                            Rekord: {w.name} ({w.recordTime.toFixed(2)}s)
                          </option>
                        ))}
                      </optgroup>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-50 dark:bg-slate-950 rounded-2xl text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">1. ({s1Range})</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {climberA.splits.split1.toFixed(2)}s
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">2. ({s2Range})</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {climberA.splits.split2.toFixed(2)}s
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">3. ({s3Range})</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {climberA.splits.split3.toFixed(2)}s
                  </span>
                </div>
              </div>
            </div>

            {/* Climber / Attempt B Card */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-500/40 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                    B
                  </div>
                  <div>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block uppercase tracking-wider">
                      {compareScope === 'same_climber' ? 'Pokus B' : 'Druhý lezec / Pokus'}
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {climberB.name} {climberB.flag}
                    </span>
                    {climberB.date && (
                      <span className="text-[10px] text-slate-400 block">
                        {climberB.date}{climberB.gym ? ` · ${climberB.gym}` : ''}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xl font-mono font-black text-blue-600 dark:text-blue-400">
                  {climberB.totalTime.toFixed(3)}s
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  {compareScope === 'same_climber'
                    ? `Vyberte pokus B (${activeSameClimber?.name || 'Lezec'}):`
                    : 'Vyberte pokus nebo profil lezce B:'}
                </label>
                <select
                  value={runIdB}
                  onChange={(e) => {
                    setRunIdB(e.target.value);
                    setCurrentPlaybackTime(0);
                  }}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {compareScope === 'same_climber' ? (
                    <>
                      <optgroup label={`Pokusy lezce ${activeSameClimber?.name || ''} (${getCategoryBadgeLabel(selectedCategory)})`}>
                        {sameClimberRuns.map((r, idx) => {
                          const attemptNum = sameClimberRuns.length - idx;
                          const d = new Date(r.date);
                          const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          return (
                            <option key={r.id} value={r.id}>
                              Pokus #{attemptNum} — {r.totalTime.toFixed(3)}s ({d.toLocaleDateString()} {timeStr}){r.isPersonalBest ? ' ⭐ PB' : ''}
                            </option>
                          );
                        })}
                      </optgroup>
                      <optgroup label={`Rekordy kategorie (${getCategoryBadgeLabel(selectedCategory)})`}>
                        {availableRecords.map((w) => (
                          <option key={w.id} value={`wr-${w.id}`}>
                            Rekord: {w.name} ({w.recordTime.toFixed(2)}s)
                          </option>
                        ))}
                      </optgroup>
                    </>
                  ) : (
                    <>
                      <optgroup label={`Zaznamenané pokusy (${getCategoryBadgeLabel(selectedCategory)})`}>
                        {categoryRuns.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.climberName || 'Lezec'} — {r.totalTime.toFixed(3)}s ({new Date(r.date).toLocaleDateString()})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label={`Profily lezců (${getCategoryBadgeLabel(selectedCategory)})`}>
                        {profiles.map((p) => {
                          const catBest =
                            getBestTimeForCategory(allRuns, p.id, selectedCategory) ||
                            p.personalBestByCategory?.[selectedCategory] ||
                            (selectedCategory === 'adults_15m' ? p.personalBest : 0);
                          return (
                            <option key={p.id} value={p.id}>
                              Profil: {p.name} {p.flagEmoji} (PB: {catBest > 0 ? `${catBest.toFixed(2)}s` : 'neměřen'})
                            </option>
                          );
                        })}
                      </optgroup>
                      <optgroup label={`Rekordy kategorie (${getCategoryBadgeLabel(selectedCategory)})`}>
                        {availableRecords.map((w) => (
                          <option key={w.id} value={`wr-${w.id}`}>
                            Rekord: {w.name} ({w.recordTime.toFixed(2)}s)
                          </option>
                        ))}
                      </optgroup>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-50 dark:bg-slate-950 rounded-2xl text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">1. ({s1Range})</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {climberB.splits.split1.toFixed(2)}s
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">2. ({s2Range})</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {climberB.splits.split2.toFixed(2)}s
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">3. ({s3Range})</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {climberB.splits.split3.toFixed(2)}s
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Winner Scoreboard Banner */}
          <div className="p-4 rounded-3xl bg-slate-950 text-white border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Výsledek srovnání ({wallHeight}m trať)
                </span>
                <div className="text-lg sm:text-xl font-black flex items-center gap-2 justify-center sm:justify-start">
                  {compTotalDelta < 0 ? (
                    <span className="text-emerald-400">
                      🏆 {labelA} je o {Math.abs(compTotalDelta).toFixed(3)}s rychlejší!
                    </span>
                  ) : compTotalDelta > 0 ? (
                    <span className="text-blue-400">
                      🏆 {labelB} je o {Math.abs(compTotalDelta).toFixed(3)}s rychlejší!
                    </span>
                  ) : (
                    <span className="text-amber-400">Remíza! Stejný výsledný čas.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold shrink-0">
              <div className="px-3 py-1.5 rounded-xl bg-red-600/30 text-red-300 border border-red-500/40">
                {labelA}: {aSectorsWon} {aSectorsWon === 1 ? 'úsek' : 'úseky'}
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-blue-600/30 text-blue-300 border border-blue-500/40">
                {labelB}: {bSectorsWon} {bSectorsWon === 1 ? 'úsek' : 'úseky'}
              </div>
            </div>
          </div>

          {/* Interactive Dual Race Simulation */}
          <div className="bg-slate-950 rounded-3xl p-5 text-white border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-sm tracking-wide">
                  Simulace závodu: {labelA} vs {labelB}
                </span>
              </div>
              <span className="font-mono text-slate-400">
                +{currentPlaybackTime.toFixed(2)}s / {compareMaxDuration.toFixed(2)}s
              </span>
            </div>

            {/* Altitude Bars */}
            <div className="grid grid-cols-2 gap-4 my-2">
              {/* Pillar A */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-red-400 truncate">{labelA}</span>
                  <span className="font-mono text-red-400">{heightA.toFixed(1)}m</span>
                </div>
                <div className="h-44 bg-slate-900 rounded-2xl relative overflow-hidden border border-slate-800 p-2 flex flex-col justify-end">
                  <div className="absolute top-[33.3%] left-0 right-0 border-b border-dashed border-slate-700/80 text-[9px] text-slate-500 pl-2">
                    {isYouth ? '6.6m Split' : '10m Úsek'}
                  </div>
                  <div className="absolute top-[66.6%] left-0 right-0 border-b border-dashed border-slate-700/80 text-[9px] text-slate-500 pl-2">
                    {isYouth ? '3.3m Split' : '5m Úsek'}
                  </div>
                  <div
                    className="w-full bg-gradient-to-t from-red-600 to-red-400 rounded-xl transition-all duration-75 relative flex items-center justify-center shadow-lg shadow-red-600/30"
                    style={{ height: `${Math.min(100, (heightA / wallHeight) * 100)}%` }}
                  >
                    <span className="text-[10px] font-mono font-black text-white">
                      {heightA >= wallHeight ? 'CÍL!' : `${heightA.toFixed(1)}m`}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-slate-400 text-center">
                  Čas: {climberA.totalTime.toFixed(3)}s
                </div>
              </div>

              {/* Pillar B */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-blue-400 truncate">{labelB}</span>
                  <span className="font-mono text-blue-400">{heightB.toFixed(1)}m</span>
                </div>
                <div className="h-44 bg-slate-900 rounded-2xl relative overflow-hidden border border-slate-800 p-2 flex flex-col justify-end">
                  <div className="absolute top-[33.3%] left-0 right-0 border-b border-dashed border-slate-700/80 text-[9px] text-slate-500 pl-2">
                    {isYouth ? '6.6m Split' : '10m Úsek'}
                  </div>
                  <div className="absolute top-[66.6%] left-0 right-0 border-b border-dashed border-slate-700/80 text-[9px] text-slate-500 pl-2">
                    {isYouth ? '3.3m Split' : '5m Úsek'}
                  </div>
                  <div
                    className="w-full bg-gradient-to-t from-blue-600 to-cyan-400 rounded-xl transition-all duration-75 relative flex items-center justify-center shadow-lg shadow-blue-600/30"
                    style={{ height: `${Math.min(100, (heightB / wallHeight) * 100)}%` }}
                  >
                    <span className="text-[10px] font-mono font-black text-white">
                      {heightB >= wallHeight ? 'CÍL!' : `${heightB.toFixed(1)}m`}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-slate-400 text-center">
                  Čas: {climberB.totalTime.toFixed(3)}s
                </div>
              </div>
            </div>

            {/* Gap at current playback */}
            <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Rozdíl na stěně v čase {currentPlaybackTime.toFixed(2)}s:</span>
              <span
                className={`font-mono font-bold text-sm ${
                  parseFloat(compareHeightGap) > 0
                    ? 'text-red-400'
                    : parseFloat(compareHeightGap) < 0
                    ? 'text-blue-400'
                    : 'text-slate-400'
                }`}
              >
                {parseFloat(compareHeightGap) > 0
                  ? `${labelA} vede o +${Math.abs(parseFloat(compareHeightGap)).toFixed(2)}m`
                  : parseFloat(compareHeightGap) < 0
                  ? `${labelB} vede o +${Math.abs(parseFloat(compareHeightGap)).toFixed(2)}m`
                  : 'Rovnoměrně'}
              </span>
            </div>

            {/* Scrubber Controls */}
            <div className="pt-2 border-t border-slate-800 flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-transform active:scale-95"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              <button
                onClick={resetPlayback}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center justify-center"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  setCurrentPlaybackTime(ratio * compareMaxDuration);
                  setIsPlaying(false);
                }}
                className="flex-1 h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 cursor-pointer relative"
              >
                <div
                  className="h-full bg-red-600 rounded-full transition-all duration-75"
                  style={{ width: `${Math.min(100, (currentPlaybackTime / compareMaxDuration) * 100)}%` }}
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                {[0.25, 0.5, 1.0].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`min-h-[32px] px-2 py-1 rounded-lg text-[10px] font-bold ${
                      playbackSpeed === spd ? 'bg-red-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sector-by-Sector Split Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {[
              {
                section: 1,
                title: isYouth ? '1. Úsek: Start (0–3.3m)' : '1. Úsek: Startovní náběh (0–5m)',
                splitA: climberA.splits.split1,
                splitB: climberB.splits.split1,
                delta: compS1Delta,
                aWins: aWinsS1,
              },
              {
                section: 2,
                title: isYouth ? '2. Úsek: Střed (3.3–6.6m)' : '2. Úsek: Dyno & Střed stěny (5–10m)',
                splitA: climberA.splits.split2,
                splitB: climberB.splits.split2,
                delta: compS2Delta,
                aWins: aWinsS2,
              },
              {
                section: 3,
                title: isYouth ? '3. Úsek: Dohmat (6.6–10m)' : '3. Úsek: Cílový dohmat (10–15m)',
                splitA: climberA.splits.split3,
                splitB: climberB.splits.split3,
                delta: compS3Delta,
                aWins: aWinsS3,
              },
            ].map((sec) => (
              <div
                key={sec.section}
                className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800 text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">{sec.title}</span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                      sec.aWins
                        ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    }`}
                  >
                    Vyhrál: {sec.aWins ? labelA : labelB}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center pt-1">
                  <div className="p-2 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-500/20">
                    <span className="text-[10px] text-red-600 dark:text-red-400 font-bold block truncate">
                      {labelA}
                    </span>
                    <span className="text-xl font-mono font-black text-slate-950 dark:text-white">
                      {sec.splitA.toFixed(2)}s
                    </span>
                  </div>

                  <div className="p-2 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-500/20">
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold block truncate">
                      {labelB}
                    </span>
                    <span className="text-xl font-mono font-black text-slate-950 dark:text-white">
                      {sec.splitB.toFixed(2)}s
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Rozdíl v úseku:</span>
                  <span
                    className={`font-mono font-bold ${
                      sec.delta < 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {sec.delta < 0
                      ? `${labelA} o ${Math.abs(sec.delta).toFixed(2)}s rychlejší`
                      : `${labelB} o ${Math.abs(sec.delta).toFixed(2)}s rychlejší`}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Tactical Coach Summary */}
          <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Kde byl výlez rozhodnut (Trenérské hodnocení):</span>
            </span>
            <p>
              {Math.abs(compS1Delta) >= Math.abs(compS2Delta) && Math.abs(compS1Delta) >= Math.abs(compS3Delta)
                ? `Největší rozdíl nastal v 1. úseku (${Math.abs(compS1Delta).toFixed(2)}s). Rozhodující roli hrál odraz ze startovní podložky a náběh do prvních chytů.`
                : Math.abs(compS2Delta) >= Math.abs(compS1Delta) && Math.abs(compS2Delta) >= Math.abs(compS3Delta)
                ? `Klíčový náskok vznikl ve 2. úseku (${Math.abs(compS2Delta).toFixed(2)}s) při dynamickém skoku a přechodu středem stěny.`
                : `Rozhodnutí padlo v cílové pasáži a dohmatu (${Math.abs(compS3Delta).toFixed(2)}s). Rozhodla přesnost dohmatu na dotykovou desku bez zpomalení.`}
            </p>
          </div>
        </div>
      ) : !effectiveCurrentRun ? (
        <div className="py-12 px-4 text-center rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 space-y-3 animate-in fade-in">
          <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 flex items-center justify-center mx-auto border border-red-200 dark:border-red-900">
            <Activity className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              Zatím žádné pokusy pro kategorii {getCategoryBadgeLabel(selectedCategory)}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              {`Spusťte měření na ${wallHeight}m stěně v záložce Časomíra. Zaznamenaný výlez se zde zobrazí s mezičasy ${s1Range}, ${s2Range} a ${s3Range}.`}
            </p>
          </div>
        </div>
      ) : (
        /* =================================================================== */
        /* MODE 1: SINGLE RUN ANALYSIS VS WORLD RECORD (CATEGORY SCOPED)       */
        /* =================================================================== */
        <div className="space-y-4 sm:space-y-6 animate-in fade-in">
          {/* Run Header Info & Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-xs font-bold text-slate-500">
                Zvolený pokus k rozboru ({getCategoryBadgeLabel(selectedCategory)}):
              </span>
              <div className="text-base font-black text-slate-950 dark:text-white">
                {effectiveCurrentRun.climberName} — {effectiveCurrentRun.totalTime.toFixed(3)}s ({effectiveCurrentRun.gym})
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {categoryRuns.length > 1 && (
                <select
                  value={effectiveCurrentRun.id}
                  onChange={(e) => {
                    const found = categoryRuns.find((r) => r.id === e.target.value);
                    if (found) onSelectRun(found);
                  }}
                  className="text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-200 flex-1 sm:flex-none"
                >
                  {categoryRuns.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.climberName || 'Lezec'} · {r.totalTime.toFixed(3)}s ({new Date(r.date).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={() => onOpenAiAnalysis(effectiveCurrentRun)}
                className="min-h-[38px] px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Diagnostika</span>
              </button>
            </div>
          </div>

          {/* Benchmark Selector */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Porovnat s rekordem kategorie ({getCategoryBadgeLabel(selectedCategory)}):
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
              {availableRecords.map((wr) => (
                <button
                  key={wr.id}
                  onClick={() => {
                    setSelectedRecordId(wr.id);
                    setCurrentPlaybackTime(0);
                  }}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
                    selectedRecordId === wr.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <span>{wr.countryCode}</span>
                  <span>{wr.name} ({wr.recordTime.toFixed(2)}s)</span>
                </button>
              ))}
            </div>
          </div>

          {/* Side-by-side Simulation & Telemetry */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left: Dual Velocity Simulation */}
            <div className="lg:col-span-7 bg-slate-950 rounded-3xl p-5 text-white border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="font-display font-bold text-sm tracking-wide">
                    Side-by-Side Simulace ({wallHeight}m stěna)
                  </span>
                </div>
                <div className="text-xs font-mono tabular-nums text-slate-400">
                  +{currentPlaybackTime.toFixed(2)}s / {maxDuration.toFixed(2)}s
                </div>
              </div>

              {/* Altitude bars */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 my-2">
                {/* User */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-200 truncate">{effectiveCurrentRun.climberName} (Vy)</span>
                    <span className="font-mono tabular-nums text-red-400 font-bold">
                      {userHeightMeters.toFixed(1)} m
                    </span>
                  </div>
                  <div className="h-44 bg-slate-900 rounded-2xl relative overflow-hidden border border-slate-800 p-2 flex flex-col justify-end">
                    <div className="absolute top-[33.3%] left-0 right-0 border-b border-dashed border-slate-700/80 text-[9px] text-slate-500 pl-2">
                      {isYouth ? '6.6m Split' : '10m Headwall'}
                    </div>
                    <div className="absolute top-[66.6%] left-0 right-0 border-b border-dashed border-slate-700/80 text-[9px] text-slate-500 pl-2">
                      {isYouth ? '3.3m Start' : '5m Vstup do skoku'}
                    </div>

                    <div
                      className="w-full bg-gradient-to-t from-red-600 to-red-400 rounded-xl transition-all duration-75 relative flex items-center justify-center shadow-lg shadow-red-600/30"
                      style={{ height: `${Math.min(100, (userHeightMeters / wallHeight) * 100)}%` }}
                    >
                      <span className="text-[10px] font-mono font-black text-white">
                        {userHeightMeters >= wallHeight ? 'CÍL!' : `${userHeightMeters.toFixed(1)}m`}
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 text-center">
                    Čas: {effectiveCurrentRun.totalTime.toFixed(3)}s
                  </div>
                </div>

                {/* Benchmark */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-200 flex items-center gap-1 truncate">
                      <span>{benchmark.name}</span>
                      <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    </span>
                    <span className="font-mono tabular-nums text-amber-400 font-bold">
                      {benchmarkHeightMeters.toFixed(1)} m
                    </span>
                  </div>
                  <div className="h-44 bg-slate-900 rounded-2xl relative overflow-hidden border border-slate-800 p-2 flex flex-col justify-end">
                    <div className="absolute top-[33.3%] left-0 right-0 border-b border-dashed border-slate-700/80 text-[9px] text-slate-500 pl-2">
                      {isYouth ? '6.6m Split' : '10m Headwall'}
                    </div>
                    <div className="absolute top-[66.6%] left-0 right-0 border-b border-dashed border-slate-700/80 text-[9px] text-slate-500 pl-2">
                      {isYouth ? '3.3m Start' : '5m Vstup do skoku'}
                    </div>

                    <div
                      className="w-full bg-gradient-to-t from-amber-500 to-yellow-300 rounded-xl transition-all duration-75 relative flex items-center justify-center shadow-lg shadow-amber-500/30"
                      style={{ height: `${Math.min(100, (benchmarkHeightMeters / wallHeight) * 100)}%` }}
                    >
                      <span className="text-[10px] font-mono font-black text-slate-950">
                        {benchmarkHeightMeters >= wallHeight ? 'CÍL!' : `${benchmarkHeightMeters.toFixed(1)}m`}
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 text-center">
                    Rekord: {benchmark.recordTime.toFixed(3)}s
                  </div>
                </div>
              </div>

              {/* Gap Status */}
              <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Rozdíl pozice na stěně:</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    parseFloat(heightGapMeters) >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {parseFloat(heightGapMeters) >= 0
                    ? `Náskok +${heightGapMeters}m`
                    : `Ztráta ${Math.abs(parseFloat(heightGapMeters)).toFixed(2)}m`}
                </span>
              </div>

              {/* Scrubber */}
              <div className="pt-2 border-t border-slate-800 flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-transform active:scale-95"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>

                <button
                  onClick={resetPlayback}
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center justify-center"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    setCurrentPlaybackTime(ratio * maxDuration);
                    setIsPlaying(false);
                  }}
                  className="flex-1 h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 cursor-pointer relative"
                  title="Klepněte pro skok v čase"
                >
                  <div
                    className="h-full bg-red-600 rounded-full transition-all duration-75"
                    style={{ width: `${Math.min(100, (currentPlaybackTime / maxDuration) * 100)}%` }}
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  {[0.25, 0.5, 1.0].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`min-h-[32px] px-2 py-1 rounded-lg text-[10px] font-bold ${
                        playbackSpeed === spd ? 'bg-red-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Telemetry & Velocity */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-red-600 dark:text-red-500" />
                    <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                      Telemetrie & Rychlost
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-red-600 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md">
                    {wallHeight}m
                  </span>
                </div>

                {/* Velocity Stats Grid */}
                <div className="grid grid-cols-2 gap-2.5 my-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>Špičková rychlost</span>
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-xl sm:text-2xl font-black font-mono text-slate-950 dark:text-white">
                        {peakVelocity}
                      </span>
                      <span className="text-xs text-slate-500 font-bold">m/s</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Dosaženo v dyno fázi</span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>Průměrná rychlost</span>
                      <Activity className="w-3.5 h-3.5 text-red-500" />
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-xl sm:text-2xl font-black font-mono text-slate-950 dark:text-white">
                        {userAvgVel}
                      </span>
                      <span className="text-xs text-slate-500 font-bold">m/s</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      WR: {wrAvgVel} m/s ({benchmark.name})
                    </span>
                  </div>
                </div>

                {/* Velocity per Sector breakdown */}
                <div className="space-y-2 mt-2">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                    Rychlost v sektorech stěny
                  </span>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {isYouth ? 'Sektor 1: Náběh (0–3.3m)' : 'Sektor 1: Náběh (0–5m)'}
                      </span>
                      <span className="font-mono font-bold text-slate-950 dark:text-white">{userS1Vel} m/s</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-600 rounded-full"
                        style={{ width: `${Math.min(100, (parseFloat(userS1Vel) / 3.8) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {isYouth ? 'Sektor 2: Střed stěny (3.3–6.6m)' : 'Sektor 2: Dyno & skok (5–10m)'}
                      </span>
                      <span className="font-mono font-bold text-slate-950 dark:text-white">{userS2Vel} m/s</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${Math.min(100, (parseFloat(userS2Vel) / 3.8) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {isYouth ? 'Sektor 3: Závěr & cíl (6.6–10m)' : 'Sektor 3: Headwall & cíl (10–15m)'}
                      </span>
                      <span className="font-mono font-bold text-slate-950 dark:text-white">{userS3Vel} m/s</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${Math.min(100, (parseFloat(userS3Vel) / 3.8) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 p-2.5 bg-slate-900 dark:bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-white text-xs">
                  <span className="text-slate-400">Frekvence kroků (kadence):</span>
                  <span className="font-mono font-bold text-amber-400">
                    ~{cadence} chytů/s
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex justify-between">
                <span>Založeno na telemetrii stopek</span>
                <span className="text-red-600 font-bold">FIFTEEN Engine</span>
              </div>
            </div>
          </div>

          {/* 3 Split Cards vs WR */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {SECTION_METRICS.map((metric) => {
              const userSplit =
                metric.section === 1
                  ? effectiveCurrentRun.splits.split1
                  : metric.section === 2
                  ? effectiveCurrentRun.splits.split2
                  : effectiveCurrentRun.splits.split3;

              const wrSplit =
                metric.section === 1
                  ? benchmark.splits.split1
                  : metric.section === 2
                  ? benchmark.splits.split2
                  : benchmark.splits.split3;

              const delta = userSplit - wrSplit;
              const isWeakest =
                (metric.section === 1 && s1Delta >= s2Delta && s1Delta >= s3Delta) ||
                (metric.section === 2 && s2Delta >= s1Delta && s2Delta >= s3Delta) ||
                (metric.section === 3 && s3Delta >= s1Delta && s3Delta >= s2Delta);

              return (
                <div
                  key={metric.section}
                  className={`p-4 rounded-3xl border transition-all ${
                    isWeakest
                      ? 'bg-red-50/50 dark:bg-red-950/20 border-red-300 dark:border-red-900/60'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {metric.section === 1
                        ? isYouth
                          ? 'Úsek 1: Start & náběh (0–3.3m)'
                          : t.sector1Title
                        : metric.section === 2
                        ? isYouth
                          ? 'Úsek 2: Střed stěny (3.3–6.6m)'
                          : t.sector2Title
                        : isYouth
                        ? 'Úsek 3: Závěr & cíl (6.6–10m)'
                        : t.sector3Title}
                    </span>
                    {isWeakest && (
                      <span className="px-2 py-0.5 text-[10px] font-black bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 rounded-md">
                        {t.paceLoss}
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between mt-3">
                    <div>
                      <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-950 dark:text-white">
                        {userSplit.toFixed(2)}s
                      </span>
                      <span className="block text-[11px] text-slate-500">{t.yourSplit}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-mono font-bold text-slate-600 dark:text-slate-400">
                        {wrSplit.toFixed(2)}s
                      </span>
                      <span className="block text-[11px] text-slate-500">{benchmark.name}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500">{t.deltaVsWr}:</span>
                    <span
                      className={`font-mono font-bold ${
                        delta <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {delta <= 0 ? `${delta.toFixed(2)}s` : `+${delta.toFixed(2)}s`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

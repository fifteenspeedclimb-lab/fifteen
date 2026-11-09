import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Sparkles, Award, Zap, Activity, TrendingUp, Gauge, ArrowUpRight } from 'lucide-react';
import { SpeedRun, RouteCategory } from '../types/climbing';
import { WORLD_RECORDS, SECTION_METRICS } from '../data/speedWallData';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface SplitAnalysisProps {
  currentRun: SpeedRun;
  allRuns: SpeedRun[];
  onSelectRun: (run: SpeedRun) => void;
  onOpenAiAnalysis: (run: SpeedRun) => void;
  lang?: Language;
  currentCategory?: RouteCategory;
}

export const SplitAnalysis: React.FC<SplitAnalysisProps> = ({
  currentRun,
  allRuns,
  onSelectRun,
  onOpenAiAnalysis,
  lang = 'cs',
  currentCategory = 'adults_15m',
}) => {
  const t = TRANSLATIONS[lang];
  const isYouth = currentCategory === 'youth_u13' || currentCategory === 'youth_u15' || currentRun.routeCategory === 'youth_u13' || currentRun.routeCategory === 'youth_u15';
  const wallHeight = isYouth ? 10 : 15;
  const [selectedRecordId, setSelectedRecordId] = useState<string>('sam-watson');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.5);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0);

  const benchmark = WORLD_RECORDS.find((r) => r.id === selectedRecordId) || WORLD_RECORDS[0];
  const maxDuration = Math.max(currentRun.totalTime, benchmark.recordTime);
  const animFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  useEffect(() => {
    if (isPlaying) {
      lastTickRef.current = performance.now();
      const loop = (now: number) => {
        const deltaSec = ((now - lastTickRef.current) / 1000) * playbackSpeed;
        lastTickRef.current = now;

        setCurrentPlaybackTime((prev) => {
          const next = prev + deltaSec;
          if (next >= maxDuration + 0.3) {
            setIsPlaying(false);
            return maxDuration;
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
  }, [isPlaying, playbackSpeed, maxDuration]);

  const resetPlayback = () => {
    setIsPlaying(false);
    setCurrentPlaybackTime(0);
  };

  const getClimberHeight = (timeSec: number, totalDuration: number, splits: { split1: number; split2: number; split3: number }) => {
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
      return (segment * 2) + ((timeSec - t2) / (t3 - t2)) * segment;
    }
  };

  const userHeightMeters = getClimberHeight(currentPlaybackTime, currentRun.totalTime, currentRun.splits);
  const benchmarkHeightMeters = getClimberHeight(currentPlaybackTime, benchmark.recordTime, benchmark.splits);
  const heightGapMeters = (userHeightMeters - benchmarkHeightMeters).toFixed(2);

  const s1Delta = currentRun.splits.split1 - benchmark.splits.split1;
  const s2Delta = currentRun.splits.split2 - benchmark.splits.split2;
  const s3Delta = currentRun.splits.split3 - benchmark.splits.split3;
  const totalDelta = currentRun.totalTime - benchmark.recordTime;

  // Realistic Speed Climbing Kinematic Telemetry
  const segmentDist = wallHeight / 3.0;
  const userAvgVel = (wallHeight / currentRun.totalTime).toFixed(2);
  const wrAvgVel = (wallHeight / benchmark.recordTime).toFixed(2);
  const userS1Vel = (segmentDist / currentRun.splits.split1).toFixed(2);
  const wrS1Vel = (segmentDist / benchmark.splits.split1).toFixed(2);
  const userS2Vel = (segmentDist / currentRun.splits.split2).toFixed(2);
  const wrS2Vel = (segmentDist / benchmark.splits.split2).toFixed(2);
  const userS3Vel = (segmentDist / currentRun.splits.split3).toFixed(2);
  const wrS3Vel = (segmentDist / benchmark.splits.split3).toFixed(2);
  const peakVelocity = (Math.max(parseFloat(userS1Vel), parseFloat(userS2Vel), parseFloat(userS3Vel)) * 1.18).toFixed(2);
  const cadence = (18 / currentRun.totalTime).toFixed(1); // holds/second

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
            {t.splitAnalysisTitle} ({isYouth ? (currentCategory === 'youth_u13' ? 'U13 · 10m' : 'U15 · 10m') : '15m'})
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <span>Výlez: {currentRun.totalTime.toFixed(3)}s ({currentRun.gym})</span>
            <span aria-hidden="true">·</span>
            <span>Beta: {currentRun.betaUsed}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {allRuns.length > 1 && (
            <select
              value={currentRun.id}
              onChange={(e) => {
                const found = allRuns.find((r) => r.id === e.target.value);
                if (found) onSelectRun(found);
              }}
              className="text-xs px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200 flex-1 sm:flex-none"
            >
              {allRuns.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.totalTime.toFixed(3)}s ({new Date(r.date).toLocaleDateString()})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => onOpenAiAnalysis(currentRun)}
            className="min-h-[42px] px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Diagnostika</span>
          </button>
        </div>
      </div>

      {/* Benchmark Selector */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
          Porovnat se světovým rekordem:
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
          {WORLD_RECORDS.map((wr) => (
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

      {/* Side-by-side & Route Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Side-by-Side Dual Velocity Simulation (7 cols) */}
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
                <span className="font-bold text-slate-200">{currentRun.climberName} (Vy)</span>
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
                Čas: {currentRun.totalTime.toFixed(3)}s
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

            {/* Clickable Timeline Track instead of slider */}
            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const ratio = Math.max(0, Math.min(1, clickX / rect.width));
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

        {/* Right: Realistic Speed Climbing Telemetry & Biomechanics (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-red-600 dark:text-red-500" />
                <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                  {lang === 'cs' ? 'Telemetrie & Rychlost' : lang === 'de' ? 'Telemetrie & Geschwindigkeit' : 'Velocity & Telemetry'}
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
                  <span>{lang === 'cs' ? 'Špičková rychlost' : lang === 'de' ? 'Spitzengeschw.' : 'Peak Velocity'}</span>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-black font-mono text-slate-950 dark:text-white">
                    {peakVelocity}
                  </span>
                  <span className="text-xs text-slate-500 font-bold">m/s</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {lang === 'cs' ? 'Dosaženo v dyno fázi' : lang === 'de' ? 'In Dyno-Phase' : 'Reached in dyno phase'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>{lang === 'cs' ? 'Průměrná rychlost' : lang === 'de' ? 'Durchschnitt' : 'Avg Velocity'}</span>
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
                {lang === 'cs' ? 'Rychlost v sektorech stěny' : lang === 'de' ? 'Sektoren-Geschwindigkeit' : 'Pace Across Wall Sectors'}
              </span>

              {/* S1 */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {lang === 'cs' ? 'Sektor 1: Náběh (0–5m)' : lang === 'de' ? 'Sektor 1: Start (0–5m)' : 'Sector 1: Start (0–5m)'}
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

              {/* S2 */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {lang === 'cs' ? 'Sektor 2: Dyno & skok (5–10m)' : lang === 'de' ? 'Sektor 2: Dyno & Sprung (5–10m)' : 'Sector 2: Dyno jump (5–10m)'}
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

              {/* S3 */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {lang === 'cs' ? 'Sektor 3: Headwall & cíl (10–15m)' : lang === 'de' ? 'Sektor 3: Headwall & Ziel' : 'Sector 3: Headwall & Finish'}
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

            {/* Cadence */}
            <div className="mt-3 p-2.5 bg-slate-900 dark:bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-white text-xs">
              <span className="text-slate-400">
                {lang === 'cs' ? 'Frekvence kroků (kadence):' : lang === 'de' ? 'Trittfrequenz:' : 'Movement Cadence:'}
              </span>
              <span className="font-mono font-bold text-amber-400">
                ~{cadence} {lang === 'cs' ? 'chytů/s' : lang === 'de' ? 'Griffe/s' : 'holds/s'}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex justify-between">
            <span>{lang === 'cs' ? 'Založeno na telemetrii stopek' : lang === 'de' ? 'Basiert auf Chrono-Telemetrie' : 'Based on chrono telemetry'}</span>
            <span className="text-red-600 font-bold">FIFTEEN Engine</span>
          </div>
        </div>
      </div>

      {/* 3 Split Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {SECTION_METRICS.map((metric) => {
          const userSplit =
            metric.section === 1
              ? currentRun.splits.split1
              : metric.section === 2
              ? currentRun.splits.split2
              : currentRun.splits.split3;

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
                    ? t.sector1Title
                    : metric.section === 2
                    ? t.sector2Title
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
  );
};

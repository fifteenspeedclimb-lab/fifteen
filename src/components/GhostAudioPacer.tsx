import React, { useState, useEffect, useRef } from 'react';
import { Headphones, Volume2, Play, Square, Check } from 'lucide-react';
import {
  playIFSCPrepTone,
  playIFSCStartTone,
  playSplitChime,
  playFinishFanfare,
  speakCoachCue,
  speakIFSCCommand,
} from '../utils/audio';
import { getBestTimeForCategory, getStoredRuns, getUserProfile } from '../utils/storage';
import { RouteCategory } from '../types/climbing';
import { Language } from '../utils/i18n';

interface GhostAudioPacerProps {
  lang?: Language;
  currentCategory?: RouteCategory;
}

export const GhostAudioPacer: React.FC<GhostAudioPacerProps> = ({
  lang = 'cs',
  currentCategory = 'adults_15m',
}) => {
  const profile = getUserProfile();
  const runs = getStoredRuns();
  const isYouth = currentCategory === 'youth_u13' || currentCategory === 'youth_u15';

  const [ghostTarget, setGhostTarget] = useState<'pb' | 'sam' | 'ola' | 'target55'>('pb');
  const [enableVoiceCues, setEnableVoiceCues] = useState<boolean>(true);
  const [enableMetronome, setEnableMetronome] = useState<boolean>(true);
  const [cadencePreset, setCadencePreset] = useState<number>(isYouth ? 195 : 210);

  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simElapsedMs, setSimElapsedMs] = useState<number>(0);
  const simRafRef = useRef<number | null>(null);
  const simStartRef = useRef<number>(0);
  const metronomeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => {
    setCadencePreset(isYouth ? 195 : 210);
  }, [isYouth]);

  const categoryPb =
    getBestTimeForCategory(runs, profile.id, currentCategory) ||
    profile.personalBestByCategory?.[currentCategory] ||
    (currentCategory === 'adults_15m' ? profile.personalBest : 0);

  const safePbTime =
    categoryPb > 0
      ? categoryPb
      : currentCategory === 'adults_15m'
      ? 6.0
      : currentCategory === 'youth_u15'
      ? 6.5
      : 7.5;

  const opponents =
    currentCategory === 'youth_u15'
      ? [
          { id: 'pb' as const, label: categoryPb > 0 ? 'Můj osobák (U15)' : 'Výchozí U15', timeNum: safePbTime },
          { id: 'sam' as const, label: 'Rekord U15 (Chlapci)', timeNum: 6.18 },
          { id: 'ola' as const, label: 'Rekord U15 (Dívky)', timeNum: 6.95 },
          { id: 'target55' as const, label: 'Cíl Sub 6.5s', timeNum: 6.5 },
        ]
      : currentCategory === 'youth_u13'
      ? [
          { id: 'pb' as const, label: categoryPb > 0 ? 'Můj osobák (U13)' : 'Výchozí U13', timeNum: safePbTime },
          { id: 'sam' as const, label: 'Rekord U13 (Chlapci)', timeNum: 7.45 },
          { id: 'ola' as const, label: 'Rekord U13 (Dívky)', timeNum: 7.9 },
          { id: 'target55' as const, label: 'Cíl Sub 7.8s', timeNum: 7.8 },
        ]
      : [
          { id: 'pb' as const, label: categoryPb > 0 ? 'Můj osobák (15m)' : 'Výchozí 15m', timeNum: safePbTime },
          { id: 'sam' as const, label: 'Sam Watson (WR)', timeNum: 4.74 },
          { id: 'ola' as const, label: 'Mirosław (WR)', timeNum: 6.06 },
          { id: 'target55' as const, label: 'Cíl Sub 5.5s', timeNum: 5.5 },
        ];

  const targetTime = Math.max(
    1.0,
    opponents.find((o) => o.id === ghostTarget)?.timeNum || safePbTime
  );

  const targetSplits = {
    s1: parseFloat((targetTime * 0.31).toFixed(2)),
    s2: parseFloat((targetTime * 0.35).toFixed(2)),
    s3: parseFloat((targetTime * 0.34).toFixed(2)),
  };

  const clearAllScheduled = () => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
    if (simRafRef.current) {
      cancelAnimationFrame(simRafRef.current);
      simRafRef.current = null;
    }
    if (metronomeIntervalRef.current) {
      clearInterval(metronomeIntervalRef.current);
      metronomeIntervalRef.current = null;
    }
  };

  const stopGhostSimulation = () => {
    setIsSimulating(false);
    clearAllScheduled();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const startGhostSimulation = () => {
    if (isSimulating) return;
    clearAllScheduled();

    if (enableVoiceCues) {
      speakIFSCCommand('marks');
    }

    timersRef.current.push(
      setTimeout(() => {
        if (enableVoiceCues) speakIFSCCommand('ready');
      }, 1200)
    );

    timersRef.current.push(setTimeout(() => playIFSCPrepTone(), 2200));
    timersRef.current.push(setTimeout(() => playIFSCPrepTone(), 3200));
    timersRef.current.push(setTimeout(() => playIFSCPrepTone(), 4200));

    timersRef.current.push(
      setTimeout(() => {
        playIFSCStartTone();
        setIsSimulating(true);
        setSimElapsedMs(0);
        simStartRef.current = performance.now();

        if (enableMetronome) {
          const intervalMs = (60 / cadencePreset) * 1000;
          metronomeIntervalRef.current = setInterval(() => {
            playSplitChime();
          }, intervalMs);
        }

        // Checkpoint 1 (5m or 3.3m)
        timersRef.current.push(
          setTimeout(() => {
            if (enableVoiceCues) {
              speakCoachCue(
                isYouth
                  ? lang === 'cs'
                    ? 'Tři celé tři metru!'
                    : 'Three point three meters!'
                  : lang === 'cs'
                  ? 'Pět metrů!'
                  : 'Five meters!',
                lang
              );
            }
          }, targetSplits.s1 * 1000)
        );

        // Checkpoint 2 (10m or 6.6m)
        timersRef.current.push(
          setTimeout(() => {
            if (enableVoiceCues) {
              speakCoachCue(
                isYouth
                  ? lang === 'cs'
                    ? 'Šest celé šest metru, finiš!'
                    : 'Six point six meters, finish!'
                  : lang === 'cs'
                  ? 'Deset metrů, dyno!'
                  : 'Ten meters, dyno!',
                lang
              );
            }
          }, (targetSplits.s1 + targetSplits.s2) * 1000)
        );

        // Finish Pad
        timersRef.current.push(
          setTimeout(() => {
            playFinishFanfare();
            if (enableVoiceCues) {
              speakCoachCue(
                lang === 'cs'
                  ? `Cíl, čas ${targetTime.toFixed(2)}!`
                  : `Finish, time ${targetTime.toFixed(2)}!`,
                lang
              );
            }
            setIsSimulating(false);
            if (simRafRef.current) cancelAnimationFrame(simRafRef.current);
            if (metronomeIntervalRef.current) clearInterval(metronomeIntervalRef.current);
          }, targetTime * 1000)
        );

        const updateSim = () => {
          const elapsed = performance.now() - simStartRef.current;
          setSimElapsedMs(elapsed);
          if (elapsed < targetTime * 1000) {
            simRafRef.current = requestAnimationFrame(updateSim);
          }
        };
        simRafRef.current = requestAnimationFrame(updateSim);
      }, 5200)
    );
  };

  useEffect(() => {
    return () => {
      clearAllScheduled();
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-3 sm:py-5 space-y-4 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white flex items-center gap-2">
            <Headphones className="w-5 h-5 text-red-600" />
            <span>Virtuální soupeř (Ghost Audio)</span>
          </h1>
          <p className="text-xs text-slate-500">
            Mezičasy ({isYouth ? '3.3m / 6.6m / 10m' : '5m / 10m / 15m'}) a tempo kroků do bezdrátových sluchátek
          </p>
        </div>

        <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 rounded-xl text-xs font-mono font-bold">
          Cíl: {targetTime.toFixed(2)}s
        </span>
      </div>

      {/* Target Selector Buttons */}
      <div className="p-3.5 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
          Zvolte tempo soupeře ({currentCategory === 'adults_15m' ? '15m Dospělí' : currentCategory === 'youth_u15' ? '10m U15' : '10m U13'}):
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {opponents.map((item) => (
            <button
              key={item.id}
              onClick={() => setGhostTarget(item.id)}
              className={`p-3 rounded-2xl border text-left transition-all ${
                ghostTarget === item.id
                  ? 'bg-red-50 dark:bg-red-950/40 border-red-500 ring-2 ring-red-500/20 text-slate-950 dark:text-white'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                {item.label}
              </div>
              <div className="text-lg font-black font-mono mt-0.5">{item.timeNum.toFixed(2)}s</div>
            </button>
          ))}
        </div>
      </div>

      {/* Audio Options: Voice & Metronome Buttons - ZERO SLIDERS */}
      <div className="p-3.5 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
          Nastavení zvuku:
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            onClick={() => setEnableVoiceCues(!enableVoiceCues)}
            className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
              enableVoiceCues
                ? 'bg-red-50 dark:bg-red-950/30 border-red-500 text-slate-950 dark:text-white'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'
            }`}
          >
            <div>
              <div className="text-xs font-bold">Hlasové hlášení mezičasů</div>
              <div className="text-[11px] text-slate-500">
                {isYouth ? '3.3m a 6.6m brány do sluchátek' : '5m a 10m brány do sluchátek'}
              </div>
            </div>
            {enableVoiceCues && <Check className="w-4 h-4 text-red-600" />}
          </button>

          <button
            onClick={() => setEnableMetronome(!enableMetronome)}
            className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
              enableMetronome
                ? 'bg-red-50 dark:bg-red-950/30 border-red-500 text-slate-950 dark:text-white'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'
            }`}
          >
            <div>
              <div className="text-xs font-bold">Rytmický metronom ({cadencePreset} BPM)</div>
              <div className="text-[11px] text-slate-500">Cvakání frekvence kroků</div>
            </div>
            {enableMetronome && <Check className="w-4 h-4 text-red-600" />}
          </button>
        </div>

        {/* Metronome Cadence Discrete Presets */}
        {enableMetronome && (
          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-slate-500 font-medium">Frekvence kroků:</span>
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              {[
                { bpm: 195, label: '195 BPM (U15)' },
                { bpm: 210, label: '210 BPM (Standard)' },
                { bpm: 225, label: '225 BPM (WR)' },
              ].map((c) => (
                <button
                  key={c.bpm}
                  onClick={() => setCadencePreset(c.bpm)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    cadencePreset === c.bpm
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Simulator Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-950 text-white border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-red-500" />
            <span className="font-bold text-xs">Simulace audia do sluchátek</span>
          </div>
          <span className="font-mono text-xs text-slate-400">
            {(simElapsedMs / 1000).toFixed(2)}s / {targetTime.toFixed(2)}s
          </span>
        </div>

        <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-red-600 rounded-full transition-all duration-75"
            style={{ width: `${Math.min(100, (simElapsedMs / (targetTime * 1000)) * 100)}%` }}
          />
        </div>

        <div className="flex justify-end pt-1">
          {isSimulating ? (
            <button
              onClick={stopGhostSimulation}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-2"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Zastavit</span>
            </button>
          ) : (
            <button
              onClick={startGhostSimulation}
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-red-600/30"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Spustit test do sluchátek</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

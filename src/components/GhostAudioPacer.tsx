import React, { useState, useEffect, useRef } from 'react';
import { Headphones, Volume2, Play, Square, Check } from 'lucide-react';
import { playIFSCPrepTone, playIFSCStartTone, playSplitChime, playFinishFanfare, speakCoachCue } from '../utils/audio';
import { getUserProfile } from '../utils/storage';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface GhostAudioPacerProps {
  lang?: Language;
}

export const GhostAudioPacer: React.FC<GhostAudioPacerProps> = ({ lang = 'cs' }) => {
  const profile = getUserProfile();
  const t = TRANSLATIONS[lang];

  const [ghostTarget, setGhostTarget] = useState<'pb' | 'sam' | 'ola' | 'target55'>('pb');
  const [enableVoiceCues, setEnableVoiceCues] = useState<boolean>(true);
  const [enableMetronome, setEnableMetronome] = useState<boolean>(true);
  const [cadencePreset, setCadencePreset] = useState<number>(210); // 200, 210, 225 BPM

  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simElapsedMs, setSimElapsedMs] = useState<number>(0);
  const simRafRef = useRef<number | null>(null);
  const simStartRef = useRef<number>(0);
  const metronomeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const targetTime =
    ghostTarget === 'pb'
      ? profile.personalBest
      : ghostTarget === 'sam'
      ? 4.74
      : ghostTarget === 'ola'
      ? 6.06
      : 5.50;

  const targetSplits = {
    s1: parseFloat((targetTime * 0.31).toFixed(2)),
    s2: parseFloat((targetTime * 0.35).toFixed(2)),
    s3: parseFloat((targetTime * 0.34).toFixed(2)),
  };

  const startGhostSimulation = () => {
    if (isSimulating) return;

    speakCoachCue('Na místa, připravit se.', lang);

    setTimeout(() => playIFSCPrepTone(), 1000);
    setTimeout(() => playIFSCPrepTone(), 2000);
    setTimeout(() => playIFSCPrepTone(), 3000);

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

      // Checkpoint 1: 5m
      setTimeout(() => {
        if (enableVoiceCues) {
          speakCoachCue(lang === 'cs' ? 'Pět metrů!' : 'Five meters!', lang);
        }
      }, targetSplits.s1 * 1000);

      // Checkpoint 2: 10m
      setTimeout(() => {
        if (enableVoiceCues) {
          speakCoachCue(lang === 'cs' ? 'Deset metrů, dyno!' : 'Ten meters, dyno!', lang);
        }
      }, (targetSplits.s1 + targetSplits.s2) * 1000);

      // Finish Pad
      setTimeout(() => {
        playFinishFanfare();
        if (enableVoiceCues) {
          speakCoachCue(lang === 'cs' ? `Cíl, čas ${targetTime.toFixed(2)}!` : `Finish, time ${targetTime.toFixed(2)}!`, lang);
        }
        stopGhostSimulation();
      }, targetTime * 1000);

      const updateSim = () => {
        const elapsed = performance.now() - simStartRef.current;
        setSimElapsedMs(elapsed);
        if (elapsed < targetTime * 1000) {
          simRafRef.current = requestAnimationFrame(updateSim);
        }
      };
      simRafRef.current = requestAnimationFrame(updateSim);
    }, 4000);
  };

  const stopGhostSimulation = () => {
    setIsSimulating(false);
    if (simRafRef.current) cancelAnimationFrame(simRafRef.current);
    if (metronomeIntervalRef.current) clearInterval(metronomeIntervalRef.current);
  };

  useEffect(() => {
    return () => {
      if (simRafRef.current) cancelAnimationFrame(simRafRef.current);
      if (metronomeIntervalRef.current) clearInterval(metronomeIntervalRef.current);
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
          <p className="text-xs text-slate-500">Mezičasy a tempo kroků do bezdrátových sluchátek</p>
        </div>

        <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 rounded-xl text-xs font-mono font-bold">
          Cíl: {targetTime.toFixed(2)}s
        </span>
      </div>

      {/* Target Selector Buttons */}
      <div className="p-3.5 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
          Zvolte tempo soupeře:
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'pb' as const, label: 'Můj osobák', time: `${profile.personalBest.toFixed(2)}s` },
            { id: 'sam' as const, label: 'Sam Watson (WR)', time: '4.74s' },
            { id: 'ola' as const, label: 'Mirosław (WR)', time: '6.06s' },
            { id: 'target55' as const, label: 'Cíl Sub 5.5s', time: '5.50s' },
          ].map((item) => (
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
              <div className="text-lg font-black font-mono mt-0.5">{item.time}</div>
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
              <div className="text-[11px] text-slate-500">5m a 10m brány do sluchátek</div>
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

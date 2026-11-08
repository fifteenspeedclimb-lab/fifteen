import React, { useState, useEffect, useRef } from 'react';
import { Headphones, Volume2, Play, Square, Sliders, Zap } from 'lucide-react';
import { playIFSCPrepTone, playIFSCStartTone, playSplitChime, playFinishFanfare, speakCoachCue } from '../utils/audio';
import { getUserProfile } from '../utils/storage';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface GhostAudioPacerProps {
  lang?: Language;
}

export const GhostAudioPacer: React.FC<GhostAudioPacerProps> = ({ lang = 'cs' }) => {
  const profile = getUserProfile();
  const t = TRANSLATIONS[lang];

  const [ghostTarget, setGhostTarget] = useState<'pb' | 'sam' | 'ola' | 'custom'>('pb');
  const [customTargetTime, setCustomTargetTime] = useState<number>(5.50);

  const [enableVoiceCues, setEnableVoiceCues] = useState<boolean>(true);
  const [enableMetronome, setEnableMetronome] = useState<boolean>(true);
  const [metronomeBpm, setMetronomeBpm] = useState<number>(210);

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
      : customTargetTime;

  const targetSplits = {
    s1: parseFloat((targetTime * 0.31).toFixed(2)),
    s2: parseFloat((targetTime * 0.35).toFixed(2)),
    s3: parseFloat((targetTime * 0.34).toFixed(2)),
  };

  const startGhostSimulation = () => {
    if (isSimulating) return;

    speakCoachCue(t.ghostReadyVoice, lang);

    setTimeout(() => playIFSCPrepTone(), 1000);
    setTimeout(() => playIFSCPrepTone(), 2000);
    setTimeout(() => playIFSCPrepTone(), 3000);

    setTimeout(() => {
      playIFSCStartTone();
      setIsSimulating(true);
      setSimElapsedMs(0);
      simStartRef.current = performance.now();

      if (enableMetronome) {
        const intervalMs = (60 / metronomeBpm) * 1000;
        metronomeIntervalRef.current = setInterval(() => {
          playSplitChime();
        }, intervalMs);
      }

      // Checkpoint 1
      setTimeout(() => {
        if (enableVoiceCues) {
          speakCoachCue(lang === 'cs' ? 'První brána. Pět metrů!' : lang === 'de' ? 'Erstes Tor. Fünf Meter!' : 'Gate one. Five meters!', lang);
        }
      }, targetSplits.s1 * 1000);

      // Checkpoint 2
      setTimeout(() => {
        if (enableVoiceCues) {
          speakCoachCue(lang === 'cs' ? 'Deset metrů! Přechod na skok.' : lang === 'de' ? 'Zehn Meter! Sprungphase.' : 'Ten meters! Dyno phase.', lang);
        }
      }, (targetSplits.s1 + targetSplits.s2) * 1000);

      // Finish Pad
      setTimeout(() => {
        playFinishFanfare();
        if (enableVoiceCues) {
          speakCoachCue(lang === 'cs' ? `Cíl! Čas ${targetTime.toFixed(2)} sekund.` : lang === 'de' ? `Ziel! Zeit ${targetTime.toFixed(2)} Sekunden.` : `Finish! Time ${targetTime.toFixed(2)} seconds.`, lang);
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
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
            <Headphones className="w-7 h-7 text-red-600" />
            <span>{t.ghostTitle}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.ghostSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">
            {lang === 'cs' ? 'Cílový čas:' : lang === 'de' ? 'Zielzeit:' : 'Target Time:'}
          </span>
          <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 rounded-xl text-xs font-bold font-mono">
            {targetTime.toFixed(2)}s
          </span>
        </div>
      </div>

      {/* Target Selection */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white">
          {t.chooseOpponent}
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <button
            onClick={() => setGhostTarget('pb')}
            className={`min-h-[72px] p-3 rounded-2xl border text-left transition-all ${
              ghostTarget === 'pb'
                ? 'bg-red-50/60 dark:bg-red-950/30 border-red-500 text-slate-950 dark:text-white ring-2 ring-red-500/20'
                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
              {t.myPb}
            </div>
            <div className="text-lg sm:text-xl font-black font-mono mt-0.5">
              {profile.personalBest.toFixed(2)}s
            </div>
          </button>

          <button
            onClick={() => setGhostTarget('sam')}
            className={`min-h-[72px] p-3 rounded-2xl border text-left transition-all ${
              ghostTarget === 'sam'
                ? 'bg-red-50/60 dark:bg-red-950/30 border-red-500 text-slate-950 dark:text-white ring-2 ring-red-500/20'
                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
              Sam Watson (WR)
            </div>
            <div className="text-lg sm:text-xl font-black font-mono mt-0.5">4.74s</div>
          </button>

          <button
            onClick={() => setGhostTarget('ola')}
            className={`min-h-[72px] p-3 rounded-2xl border text-left transition-all ${
              ghostTarget === 'ola'
                ? 'bg-red-50/60 dark:bg-red-950/30 border-red-500 text-slate-950 dark:text-white ring-2 ring-red-500/20'
                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-purple-500">
              Mirosław (WR)
            </div>
            <div className="text-lg sm:text-xl font-black font-mono mt-0.5">6.06s</div>
          </button>

          <button
            onClick={() => setGhostTarget('custom')}
            className={`min-h-[72px] p-3 rounded-2xl border text-left transition-all ${
              ghostTarget === 'custom'
                ? 'bg-red-50/60 dark:bg-red-950/30 border-red-500 text-slate-950 dark:text-white ring-2 ring-red-500/20'
                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
              {t.customGoal}
            </div>
            <div className="text-lg sm:text-xl font-black font-mono mt-0.5">
              {customTargetTime.toFixed(2)}s
            </div>
          </button>
        </div>

        {ghostTarget === 'custom' && (
          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span>{lang === 'cs' ? 'Cílový čas:' : lang === 'de' ? 'Zielzeit:' : 'Target Time:'} {customTargetTime.toFixed(2)}s</span>
              <span className="text-slate-500">4.5s – 9.0s</span>
            </div>
            <input
              type="range"
              min="4.50"
              max="9.00"
              step="0.05"
              value={customTargetTime}
              onChange={(e) => setCustomTargetTime(parseFloat(e.target.value))}
              className="w-full accent-red-600 cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Audio preferences */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-red-600" />
          <span>{lang === 'cs' ? 'Zvukové signály do sluchátek' : lang === 'de' ? 'Kopfhörer-Signale' : 'In-Ear Audio Preferences'}</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-start gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 cursor-pointer">
            <input
              type="checkbox"
              checked={enableVoiceCues}
              onChange={(e) => setEnableVoiceCues(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-red-600 accent-red-600"
            />
            <div className="text-xs">
              <div className="font-bold text-slate-900 dark:text-white">{t.voiceCoachLabel}</div>
              <div className="text-slate-500 mt-0.5">
                {lang === 'cs'
                  ? 'Hlásí mezičasy na 5 m a 10 m přímo do uší.'
                  : lang === 'de'
                  ? 'Gibt Zwischenzeiten bei 5m und 10m im Ohr durch.'
                  : 'Announces 5m and 10m split checkpoints directly.'}
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 cursor-pointer">
            <input
              type="checkbox"
              checked={enableMetronome}
              onChange={(e) => setEnableMetronome(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-red-600 accent-red-600"
            />
            <div className="text-xs">
              <div className="font-bold text-slate-900 dark:text-white">
                {t.metronomeLabel} ({metronomeBpm} BPM)
              </div>
              <div className="text-slate-500 mt-0.5">
                {lang === 'cs'
                  ? 'Rovnoměrné cvakání pro udržení kadence kroků.'
                  : lang === 'de'
                  ? 'Gleichmäßiges Ticken zur Einhaltung der Trittfrequenz.'
                  : 'Rhythmic metronome click to lock in footwork cadence.'}
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Simulation / Playback Controls */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-950 text-white border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-red-500" />
            <h3 className="font-display font-bold text-sm">
              {lang === 'cs' ? 'Zkušební simulace tempa soupeře' : lang === 'de' ? 'Ghost-Simulation testen' : 'Ghost Tempo Audio Simulation'}
            </h3>
          </div>
          <span className="font-mono text-xs text-slate-400">
            {(simElapsedMs / 1000).toFixed(2)}s / {targetTime.toFixed(2)}s
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-400 rounded-full transition-all duration-75"
            style={{ width: `${Math.min(100, (simElapsedMs / (targetTime * 1000)) * 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          {isSimulating ? (
            <button
              onClick={stopGhostSimulation}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-2"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>{t.stopGhostBtn}</span>
            </button>
          ) : (
            <button
              onClick={startGhostSimulation}
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{t.testGhostBtn}</span>
            </button>
          )}
        </div>
      </div>

      {/* Test Player Card */}
      <div className="p-5 sm:p-8 rounded-3xl bg-slate-950 text-white border border-slate-800 shadow-2xl text-center space-y-5">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-red-400 font-bold">
            ZKOUŠKA ZVUKU VE SLUCHÁTKÁCH
          </span>
          <h3 className="font-display font-black text-xl sm:text-2xl text-white mt-0.5">
            Vyzkoušet tempo {targetTime.toFixed(2)}s
          </h3>
        </div>

        {/* Bar */}
        <div className="max-w-md mx-auto space-y-1.5">
          <div className="flex justify-between text-xs font-mono text-slate-400">
            <span>0 m (Země)</span>
            <span className="text-white font-bold">{(simElapsedMs / 1000).toFixed(2)}s</span>
            <span>15 m (Cíl)</span>
          </div>
          <div className="h-3.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative">
            <div
              className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-400 transition-all duration-75"
              style={{ width: `${Math.min(100, (simElapsedMs / (targetTime * 1000)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {!isSimulating ? (
            <button
              onClick={startGhostSimulation}
              className="min-h-[50px] px-6 py-3 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-sm rounded-2xl shadow-xl shadow-red-600/20 transition-all flex items-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Spustit test do sluchátek</span>
            </button>
          ) : (
            <button
              onClick={stopGhostSimulation}
              className="min-h-[50px] px-6 py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-sm rounded-2xl shadow-xl transition-all flex items-center gap-2"
            >
              <Square className="w-5 h-5 fill-current" />
              <span>Zastavit test</span>
            </button>
          )}

          <button
            onClick={() => speakCoachCue('Hlasový trenér aplikace Fifteen je připraven.')}
            className="min-h-[50px] px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-2xl border border-slate-800 transition-colors flex items-center gap-2"
          >
            <Volume2 className="w-4 h-4" />
            <span>Test hlasu</span>
          </button>
        </div>
      </div>
    </div>
  );
};

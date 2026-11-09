import React, { useState } from 'react';
import {
  Flame,
  Timer,
  Check,
  RotateCcw,
  Sparkles,
  Loader2,
  X
} from 'lucide-react';
import { playSplitChime, playFinishFanfare } from '../utils/audio';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface TrainingRoutinesProps {
  lang?: Language;
}

interface RoutineItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  step1: string;
  step2: string;
  totalSets: number;
  restSec: number;
  setsLabel: string;
}

const SPEED_ROUTINES: RoutineItem[] = [
  {
    id: 'campus-1-4-7',
    title: 'Campusboard 1-4-7 Power Pull',
    subtitle: 'Explozivní síla paží a zádových svalů (RFD)',
    image: '/src/assets/images/training_campusboard_1794239288932.jpg',
    step1: 'Ze šprušle 1 proveďte maximální explozivní skok do šprušle 4.',
    step2: 'Bez zhoupnutí v bocích okamžitě dotáhněte druhou rukou na šprušli 7.',
    totalSets: 5,
    restSec: 120,
    setsLabel: '5 sérií (střídat vedoucí ruku)',
  },
  {
    id: 'start-pad-reaction',
    title: 'Odraz ze startovní podložky',
    subtitle: 'Zkrácení reakční doby nohy pod 0.12 sekundy',
    image: '/src/assets/images/training_start_pad_1794239289237.jpg',
    step1: 'Seskok z 40cm bedny přímo na startovní desku pro maximální předpětí lýtka.',
    step2: 'Okamžitý bleskový odraz nahoru bez prodlevy (amortizace pod 120 ms).',
    totalSets: 4,
    restSec: 90,
    setsLabel: '4 série po 4 skocích',
  },
  {
    id: 'tomoa-skip-dyno',
    title: 'Tomoa Skip (Chyt 9 do 12)',
    subtitle: 'Plynulý skok bez zaváhání uprostřed stěny',
    image: '/src/assets/images/training_tomoa_dyno_1794239289109.jpg',
    step1: 'Z chytu 9 vynechte chyty 10 i 11 a vyrazte pánví přímo ke stěně.',
    step2: 'Dynamicky zalepte chyt 12 oběma rukama v pevném zámku.',
    totalSets: 5,
    restSec: 120,
    setsLabel: '5 sérií po 2 opakováních',
  },
  {
    id: 'wall-sprint-5m',
    title: '0–5m Startovní sprint',
    subtitle: 'První 3 kroky z automatické svalové paměti',
    image: '/src/assets/images/training_wall_sprint_1794239290588.jpg',
    step1: 'Výbušný start z podložky na první 3 stupy bez dívání se na ruce.',
    step2: 'Maximální zrychlení přes chyt 7 k laserové 5m metě pod 1.50 s.',
    totalSets: 6,
    restSec: 120,
    setsLabel: '6 ostrých startů',
  },
];

export const TrainingRoutines: React.FC<TrainingRoutinesProps> = ({ lang = 'cs' }) => {
  const t = TRANSLATIONS[lang];

  // Completed sets map: { [routineId]: number }
  const [completedSets, setCompletedSets] = useState<Record<string, number>>({});

  // Floating Rest Timer
  const [restSecondsRemaining, setRestSecondsRemaining] = useState<number | null>(null);
  const [restIntervalRef, setRestIntervalRef] = useState<NodeJS.Timeout | null>(null);

  // AI workout modal
  const [showAiModal, setShowAiModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [targetGoal, setTargetGoal] = useState('Sub 5.5s');
  const [aiResult, setAiResult] = useState<string | null>(null);

  const startRestTimer = (seconds: number) => {
    if (restIntervalRef) clearInterval(restIntervalRef);
    setRestSecondsRemaining(seconds);

    const intv = setInterval(() => {
      setRestSecondsRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(intv);
          playSplitChime();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    setRestIntervalRef(intv);
  };

  const handleToggleSet = (routineId: string, setIndex: number, restSec: number, total: number) => {
    const current = completedSets[routineId] || 0;
    // If clicking the current next set
    if (setIndex === current + 1) {
      setCompletedSets((prev) => ({ ...prev, [routineId]: setIndex }));
      playSplitChime();
      startRestTimer(restSec);
      if (setIndex === total) {
        setTimeout(() => playFinishFanfare(), 400);
      }
    } else if (setIndex <= current) {
      // Uncheck down to previous
      setCompletedSets((prev) => ({ ...prev, [routineId]: setIndex - 1 }));
    }
  };

  const handleResetSets = (routineId: string) => {
    setCompletedSets((prev) => ({ ...prev, [routineId]: 0 }));
  };

  const handleGenerateAiPlan = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetGoal, currentPb: '5.64s', focusArea: 'Start 0-5m', sessionsPerWeek: 3 }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAiResult(data.data.programTitle + ': ' + data.data.overview);
      }
    } catch {
      setAiResult('Cílený plán výbušnosti: 3 tréninky týdně se zaměřením na reaktivní odraz z desky a náběh do dynu 9-12.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-3 sm:py-5 space-y-4 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-600" />
            <span>Trénink výbušnosti Fifteen</span>
          </h1>
          <p className="text-xs text-slate-500">4 klíčová cvičení pro zrychlení na 15m stěně</p>
        </div>

        <button
          onClick={() => {
            setShowAiModal(true);
            if (!aiResult) handleGenerateAiPlan();
          }}
          className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Plán</span>
        </button>
      </div>

      {/* Floating Rest Countdown Banner */}
      {restSecondsRemaining !== null && (
        <div className="sticky top-18 z-30 p-3 sm:p-3.5 rounded-2xl bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center justify-between shadow-2xl animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <Timer className="w-4 h-4 text-emerald-400 animate-spin" />
            <div>
              <span className="text-xs font-bold block text-white">Pauza mezi sériemi</span>
              <span className="text-[11px] text-emerald-400">Obnova výbušnosti svalů</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-mono font-black text-white tabular-nums">
              {restSecondsRemaining}s
            </span>
            <button
              onClick={() => setRestSecondsRemaining(null)}
              className="px-2 py-1 text-xs bg-emerald-900 hover:bg-emerald-800 text-white rounded-lg font-bold"
            >
              Přeskočit
            </button>
          </div>
        </div>
      )}

      {/* Clean 4-Card Athletic Workout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SPEED_ROUTINES.map((routine) => {
          const done = completedSets[routine.id] || 0;
          const isComplete = done >= routine.totalSets;

          return (
            <div
              key={routine.id}
              className={`rounded-3xl bg-white dark:bg-slate-900 border transition-all overflow-hidden flex flex-col justify-between shadow-sm ${
                isComplete
                  ? 'border-emerald-500/80 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Photo Banner with Dark Gradient */}
              <div className="relative h-44 w-full bg-slate-950 overflow-hidden">
                <img
                  src={routine.image}
                  alt={routine.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute bottom-2.5 left-3 right-3 text-white">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 block font-mono">
                    {routine.setsLabel}
                  </span>
                  <h3 className="font-display font-black text-lg leading-tight text-white drop-shadow">
                    {routine.title}
                  </h3>
                </div>
              </div>

              {/* Instructions and Set Counter */}
              <div className="p-3.5 sm:p-4 space-y-3 flex-1 flex flex-col justify-between">
                {/* 2 Clear Action Steps */}
                <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="leading-snug">{routine.step1}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="leading-snug">{routine.step2}</p>
                  </div>
                </div>

                {/* Interactive Set Tap Tracker [ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ] */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                    <span className="text-slate-500">Zaznamenat sérii (klepněte):</span>
                    {done > 0 && (
                      <button
                        onClick={() => handleResetSets(routine.id)}
                        className="text-[10px] text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {Array.from({ length: routine.totalSets }).map((_, i) => {
                      const setNum = i + 1;
                      const isDone = setNum <= done;
                      return (
                        <button
                          key={setNum}
                          onClick={() => handleToggleSet(routine.id, setNum, routine.restSec, routine.totalSets)}
                          className={`min-h-[44px] rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 ${
                            isDone
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : setNum === done + 1
                              ? 'bg-red-600 text-white animate-pulse shadow-md'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {isDone ? <Check className="w-3.5 h-3.5" /> : setNum}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="font-display font-black text-base text-slate-950 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-red-600" />
                <span>AI Doporučení pro trénink</span>
              </span>
              <button
                onClick={() => setShowAiModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Cílový čas:</span>
                <select
                  value={targetGoal}
                  onChange={(e) => setTargetGoal(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-bold"
                >
                  <option value="Sub 6.0s">Sub 6.0s</option>
                  <option value="Sub 5.5s">Sub 5.5s</option>
                  <option value="Sub 5.0s">Sub 5.0s (Světová špička)</option>
                </select>
              </div>

              {isGenerating ? (
                <div className="p-4 text-center text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                  <span>Sestavuji doporučení...</span>
                </div>
              ) : (
                aiResult && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 leading-relaxed text-slate-700 dark:text-slate-300">
                    {aiResult}
                  </div>
                )
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-4 py-1.5 bg-red-600 text-white rounded-xl font-bold text-xs"
              >
                Rozumím
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Flame, Sparkles, Timer, Zap, Loader2 } from 'lucide-react';
import { DEFAULT_EXERCISES } from '../data/trainingData';
import { TrainingExercise, TrainingProgram } from '../types/climbing';
import { getUserProfile } from '../utils/storage';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface TrainingRoutinesProps {
  lang?: Language;
}

export const TrainingRoutines: React.FC<TrainingRoutinesProps> = ({ lang = 'cs' }) => {
  const profile = getUserProfile();
  const t = TRANSLATIONS[lang];

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [exercises] = useState<TrainingExercise[]>(DEFAULT_EXERCISES);

  // AI Generator state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedProgram, setGeneratedProgram] = useState<TrainingProgram | null>(null);
  const [targetGoal, setTargetGoal] = useState<string>('Sub 5.5s');
  const [focusArea, setFocusArea] = useState<string>('Přechod na skok chyty 8-12 a ztráta rychlosti');
  const [sessionsPerWeek, setSessionsPerWeek] = useState<number>(3);
  const [showAiModal, setShowAiModal] = useState<boolean>(false);

  // Rest Timer state
  const [restSecondsRemaining, setRestSecondsRemaining] = useState<number | null>(null);
  const [restInterval, setRestIntervalRef] = useState<NodeJS.Timeout | null>(null);

  const startRestTimer = (seconds: number) => {
    if (restInterval) clearInterval(restInterval);
    setRestSecondsRemaining(seconds);

    const intv = setInterval(() => {
      setRestSecondsRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(intv);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    setRestIntervalRef(intv);
  };

  const handleGenerateAiWorkout = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetGoal,
          currentPb: `${profile.personalBest.toFixed(2)}s`,
          focusArea,
          sessionsPerWeek,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setGeneratedProgram(data.data);
      }
    } catch {
      // ignore
    } finally {
      setIsGenerating(false);
    }
  };

  const categories = ['all', 'Campus Board', 'Plyometrics', 'Wall Drills', 'Core & Lat Power'];

  const filteredExercises =
    activeCategory === 'all'
      ? exercises
      : exercises.filter((e) => e.category === activeCategory);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
            <Flame className="w-7 h-7 text-red-600" />
            <span>{t.drillsTitle}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.drillsSubtitle}
          </p>
        </div>

        <button
          onClick={() => {
            setShowAiModal(true);
            if (!generatedProgram) handleGenerateAiWorkout();
          }}
          className="min-h-[44px] px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>{t.aiWorkoutBtn}</span>
        </button>
      </div>

      {/* Hero photo banner */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-950 text-white border border-slate-800 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
          <div className="md:col-span-7 p-5 sm:p-8 flex flex-col justify-between space-y-3">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-mono text-red-400 font-bold uppercase tracking-wider mb-1.5">
                <Zap className="w-4 h-4 text-red-500" />
                <span>Rychlostní a výbušný trénink</span>
              </div>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-white">
                Rychlost rozvoje síly (RFD)
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                Rychlolezení na 15 metrech se rozhoduje v prvních 120 milisekundách kontaktu. Trénink klade důraz na reaktivní sílu nohou a přesnost pohybu po normalizované cestě.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800 text-xs">
              <div>
                <span className="block font-mono font-bold text-red-400 text-base">0.12 s</span>
                <span className="text-[11px] text-slate-400">Reakce nohou</span>
              </div>
              <div>
                <span className="block font-mono font-bold text-amber-400 text-base">220 BPM</span>
                <span className="text-[11px] text-slate-400">Frekvence kroků</span>
              </div>
              <div>
                <span className="block font-mono font-bold text-emerald-400 text-base">15 m</span>
                <span className="text-[11px] text-slate-400">Výška stěny</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-5 relative min-h-[180px] sm:min-h-[220px] bg-slate-900 overflow-hidden">
            <img
              src="/src/assets/images/explosive_training_plyo_1794137552314.jpg"
              alt="Campusboard trénink rychlolezce"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-slate-950 via-slate-950/40 to-transparent" />
          </div>
        </div>
      </div>

      {/* Rest Timer */}
      {restSecondsRemaining !== null && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-3">
            <Timer className="w-5 h-5 animate-spin" />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider block">Pauza mezi sériemi</span>
              <span className="text-sm font-semibold text-white">Obnova neuromuskulární výbušnosti</span>
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-white tabular-nums">
            {restSecondsRemaining}s
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`min-h-[38px] px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 ${
              activeCategory === cat
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {cat === 'all' ? 'Všechny cviky' : cat}
          </button>
        ))}
      </div>

      {/* Exercise Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {filteredExercises.map((exercise) => (
          <div
            key={exercise.id}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-bold text-red-600 dark:text-red-400">
                  {exercise.category}
                </span>
                <span className="text-slate-500 font-mono text-[11px]">
                  {exercise.difficulty}
                </span>
              </div>

              <h3 className="font-display font-bold text-base text-slate-950 dark:text-white mt-2.5">
                {exercise.name}
              </h3>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {exercise.biomechanicalPurpose}
              </p>

              <div className="grid grid-cols-3 gap-2 p-2 mt-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 text-center text-[11px]">
                <div>
                  <span className="block text-slate-400 text-[10px]">Série</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{exercise.sets}</span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[10px]">Opakování</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{exercise.reps}</span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[10px]">Odpočinek</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{exercise.rest}</span>
                </div>
              </div>

              <div className="mt-2.5 p-2.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl text-[11px] text-amber-900 dark:text-amber-300">
                <strong>Tip k provedení:</strong> {exercise.techniqueTip}
              </div>
            </div>

            <button
              onClick={() => startRestTimer(120)}
              className="min-h-[42px] w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Timer className="w-3.5 h-3.5 text-slate-500" />
              <span>Spustit 2 minuty pauzy</span>
            </button>
          </div>
        ))}
      </div>

      {/* AI Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-red-600" />
                <h2 className="font-display font-extrabold text-lg text-slate-950 dark:text-white">
                  AI Plán výbušnosti Fifteen
                </h2>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cílový čas
                </label>
                <select
                  value={targetGoal}
                  onChange={(e) => setTargetGoal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Sub 7.0s">Sub 7.0s (Národní pohár)</option>
                  <option value="Sub 6.0s">Sub 6.0s (Finále)</option>
                  <option value="Sub 5.2s">Sub 5.2s (Světový pohár)</option>
                  <option value="Sub 4.8s">Sub 4.8s (Světový rekord)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Místo ztráty rychlosti
                </label>
                <select
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Start & odraz z podložky (0-5m)">Start & odraz z podložky (0-5m)</option>
                  <option value="Zaváhání u skoku Tomoa (5-10m)">Zaváhání u skoku Tomoa (5-10m)</option>
                  <option value="Frekvence v horní pasáži a dohmat (10-15m)">Frekvence v horní pasáži a dohmat (10-15m)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleGenerateAiWorkout}
                disabled={isGenerating}
                className="min-h-[44px] px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzuji biomechaniku...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generovat tréninkový cyklus</span>
                  </>
                )}
              </button>
            </div>

            {generatedProgram && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="font-display font-bold text-base text-slate-950 dark:text-white">
                  {generatedProgram.programTitle}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {generatedProgram.overview}
                </p>

                <div className="space-y-2.5">
                  {generatedProgram.exercises?.map((ex, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                        <span>{ex.name}</span>
                        <span className="text-[10px] text-red-600">{ex.category}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {ex.sets} · {ex.reps} · Pauza: {ex.rest}
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                        <strong>Proč:</strong> {ex.biomechanicalPurpose}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

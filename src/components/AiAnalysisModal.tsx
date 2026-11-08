import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { SpeedRun, AIAnalysisResult } from '../types/climbing';
import { updateRunAnalysis, getUserProfile } from '../utils/storage';

interface AiAnalysisModalProps {
  run: SpeedRun;
  onClose: () => void;
  onRunUpdated: (updatedRun: SpeedRun) => void;
}

export const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({
  run,
  onClose,
  onRunUpdated,
}) => {
  const profile = getUserProfile();
  const [loading, setLoading] = useState<boolean>(!run.aiAnalysis);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(run.aiAnalysis || null);

  useEffect(() => {
    if (!run.aiAnalysis) {
      const fetchAnalysis = async () => {
        setLoading(true);
        try {
          const res = await fetch('/api/ai/analyze-run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              totalTime: run.totalTime,
              split1: run.splits.split1,
              split2: run.splits.split2,
              split3: run.splits.split3,
              betaUsed: run.betaUsed,
              previousBest: profile.personalBest,
              gender: run.gender,
            }),
          });
          const json = await res.json();
          if (json.success && json.data) {
            setAnalysis(json.data);
            updateRunAnalysis(run.id, json.data);
            onRunUpdated({ ...run, aiAnalysis: json.data });
          }
        } catch (err) {
          console.warn('Analysis error:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchAnalysis();
    }
  }, [run, profile, onRunUpdated]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-red-600" />
            <h2 className="font-display font-extrabold text-lg text-slate-950 dark:text-white">
              AI Trenér Fifteen: Rozbor splitů (15m)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Run summary */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Analyzovaný čas
            </span>
            <div className="text-2xl font-black font-mono text-slate-950 dark:text-white mt-0.5">
              {run.totalTime.toFixed(3)}s
            </div>
          </div>
          <div className="text-right text-xs text-slate-500 font-mono">
            <div>0–5m: {run.splits.split1.toFixed(2)}s</div>
            <div>5–10m: {run.splits.split2.toFixed(2)}s</div>
            <div>10–15m: {run.splits.split3.toFixed(2)}s</div>
          </div>
        </div>

        {loading ? (
          <div className="py-10 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">
              Porovnávám s olympijským profilem trati...
            </p>
          </div>
        ) : analysis ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 block mb-1">
                Zhodnocení trenéra
              </span>
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {analysis.summary}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block">
                  Kde ztrácíte setiny
                </span>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {analysis.weakestSectionTitle}
                </div>
                <div className="text-red-600 dark:text-red-400 font-mono mt-0.5">
                  {analysis.timeLossDelta}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block">
                  Doporučené cvičení
                </span>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {analysis.recommendedDrill}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                Postřehy k technice pohybu
              </h3>
              {analysis.biomechanicObservations?.map((obs, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{obs}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                Taktická rada pro další pokus
              </h3>
              {analysis.tacticalCues?.map((cue, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 flex items-start gap-2.5 font-medium"
                >
                  <ArrowRight className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>{cue}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            Hotovo
          </button>
        </div>
      </div>
    </div>
  );
};

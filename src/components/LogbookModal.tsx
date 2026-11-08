import React, { useState } from 'react';
import { Download, Trash2, Trophy, Sparkles } from 'lucide-react';
import { SpeedRun } from '../types/climbing';
import { deleteRun } from '../utils/storage';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface LogbookModalProps {
  runs: SpeedRun[];
  onClose: () => void;
  onSelectRunForAnalysis: (run: SpeedRun) => void;
  onRunsChanged: (runs: SpeedRun[]) => void;
  lang?: Language;
}

export const LogbookModal: React.FC<LogbookModalProps> = ({
  runs,
  onClose,
  onSelectRunForAnalysis,
  onRunsChanged,
  lang = 'cs',
}) => {
  const t = TRANSLATIONS[lang];
  const [filterBeta, setFilterBeta] = useState<string>('all');

  const filteredRuns = runs.filter((r) =>
    filterBeta === 'all' ? true : r.betaUsed === filterBeta
  );

  const bestTime = runs.length > 0 ? Math.min(...runs.map((r) => r.totalTime)) : 0;

  const handleDelete = (id: string) => {
    if (confirm('Smazat tento záznam z deníku?')) {
      const updated = deleteRun(id);
      onRunsChanged(updated);
    }
  };

  const exportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(runs, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `fifteen_runs_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchor.click();
  };

  const exportCSV = () => {
    const headers = 'ID,Datum,CelkovyCas,Split1,Split2,Split3,Reakce,Beta,Stena,Poznamky\n';
    const rows = runs
      .map(
        (r) =>
          `"${r.id}","${r.date}",${r.totalTime},${r.splits.split1},${r.splits.split2},${r.splits.split3},${r.reactionTime},"${r.betaUsed}","${r.gym}","${(r.notes || '').replace(/"/g, '""')}"`
      )
      .join('\n');
    const dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + rows);
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `fifteen_runs_${new Date().toISOString().split('T')[0]}.csv`);
    dlAnchor.click();
  };

  const sortedByDate = [...runs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const chartPoints = sortedByDate.slice(-10);
  const minTime = chartPoints.length > 0 ? Math.min(...chartPoints.map((p) => p.totalTime)) : 5.0;
  const maxTime = chartPoints.length > 0 ? Math.max(...chartPoints.map((p) => p.totalTime)) : 7.0;
  const timeSpan = Math.max(0.5, maxTime - minTime);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="font-display font-black text-xl text-slate-950 dark:text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span>Deník časů Fifteen (15m)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {runs.length} zaznamenaných výlezů · Osobák: {bestTime > 0 ? `${bestTime.toFixed(3)}s` : '—'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              CSV
            </button>
            <button
              onClick={exportJSON}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              JSON
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* PR Trend */}
        {chartPoints.length >= 2 && (
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Vývoj rychlosti na 15 m</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                Rekord: {minTime.toFixed(3)}s
              </span>
            </div>

            <div className="h-24 w-full relative pt-2">
              <svg className="w-full h-full overflow-visible">
                <polyline
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={chartPoints
                    .map((pt, idx) => {
                      const x = (idx / (chartPoints.length - 1)) * 100;
                      const y = 90 - ((maxTime - pt.totalTime) / timeSpan) * 80;
                      return `${x}%,${y}%`;
                    })
                    .join(' ')}
                />
                {chartPoints.map((pt, idx) => {
                  const x = (idx / (chartPoints.length - 1)) * 100;
                  const y = 90 - ((maxTime - pt.totalTime) / timeSpan) * 80;
                  return (
                    <circle
                      key={pt.id}
                      cx={`${x}%`}
                      cy={`${y}%`}
                      r="4.5"
                      className="fill-red-600 stroke-white dark:stroke-slate-950"
                      strokeWidth="2"
                    />
                  );
                })}
              </svg>
            </div>
          </div>
        )}

        {/* Runs List */}
        <div className="space-y-2.5">
          {filteredRuns.map((run) => (
            <div
              key={run.id}
              className="p-3.5 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-lg text-slate-950 dark:text-white tabular-nums">
                    {run.totalTime.toFixed(3)}s
                  </span>
                  {run.isPersonalBest && (
                    <span className="px-2 py-0.5 text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-md">
                      PR
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {new Date(run.date).toLocaleDateString()} · {run.gym}
                </div>
                <div className="font-mono text-[10px] text-slate-400 mt-1">
                  S1: {run.splits.split1.toFixed(2)}s · S2: {run.splits.split2.toFixed(2)}s · S3: {run.splits.split3.toFixed(2)}s
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onSelectRunForAnalysis(run);
                    onClose();
                  }}
                  className="min-h-[36px] px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Rozbor</span>
                </button>
                <button
                  onClick={() => handleDelete(run.id)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

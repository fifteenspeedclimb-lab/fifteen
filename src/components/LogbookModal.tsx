import React, { useState } from 'react';
import { Download, Trash2, Trophy, Sparkles, Video, Play, X, AlertTriangle } from 'lucide-react';
import { SpeedRun } from '../types/climbing';
import { deleteRun, removeRunVideo, clearAllRuns, clearDemoRuns } from '../utils/storage';
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
  const [activeVideoRun, setActiveVideoRun] = useState<SpeedRun | null>(null);
  const [deletingRunId, setDeletingRunId] = useState<string | null>(null);
  const [confirmDeleteVideoId, setConfirmDeleteVideoId] = useState<string | null>(null);
  const [showConfirmClearAll, setShowConfirmClearAll] = useState<boolean>(false);

  const filteredRuns = runs.filter((r) =>
    filterBeta === 'all' ? true : r.betaUsed === filterBeta
  );

  const bestTime = runs.length > 0 ? Math.min(...runs.map((r) => r.totalTime)) : 0;

  const confirmDeleteRun = (id: string) => {
    const updated = deleteRun(id);
    onRunsChanged(updated);
    setDeletingRunId(null);
    if (activeVideoRun?.id === id) {
      setActiveVideoRun(null);
    }
  };

  const handleClearAll = () => {
    const empty = clearAllRuns();
    onRunsChanged(empty);
    setShowConfirmClearAll(false);
  };

  const handleClearDemoOnly = () => {
    const withoutDemo = clearDemoRuns();
    onRunsChanged(withoutDemo);
  };

  const confirmDeleteVideo = (id: string) => {
    const updated = removeRunVideo(id);
    onRunsChanged(updated);
    setConfirmDeleteVideoId(null);
    if (activeVideoRun?.id === id) {
      setActiveVideoRun((prev) => (prev ? { ...prev, videoUrl: undefined } : null));
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

        {/* Action Toolbar for Bulk Deletion and Data Management */}
        {runs.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-500 font-medium">
              Celkem zaznamenáno {runs.length} {runs.length === 1 ? 'výlez' : runs.length < 5 ? 'výlezy' : 'výlezů'}
            </span>

            <div>
              {showConfirmClearAll ? (
              <div className="flex items-center gap-1.5 p-1 bg-red-100 dark:bg-red-950/60 rounded-xl border border-red-300 dark:border-red-900">
                <span className="text-[11px] text-red-700 dark:text-red-300 font-bold px-1">
                  Smazat všech {runs.length} časů?
                </span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[10px] font-bold hover:bg-red-700 shadow-sm"
                >
                  Ano, smazat
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmClearAll(false)}
                  className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px]"
                >
                  Ne
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmClearAll(true)}
                disabled={runs.length === 0}
                className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex items-center gap-1 disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Smazat všechny výkony</span>
              </button>
            )}
          </div>
        </div>
      )}

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
          {filteredRuns.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-400">
              <Trophy className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-500" />
              <p className="text-xs font-bold">Žádné zaznamenané časy</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Spusťte měření na stěně pro záznam vašeho prvního oficiálního času.
              </p>
            </div>
          ) : (
            filteredRuns.map((run) => (
              <div
                key={run.id}
                className="p-3.5 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-lg text-slate-950 dark:text-white tabular-nums">
                      {run.totalTime.toFixed(3)}s
                    </span>
                    {run.flagEmoji && (
                      <span className="text-sm leading-none" title={run.nationalityCode}>
                        {run.flagEmoji}
                      </span>
                    )}
                    {run.isPersonalBest && (
                      <span className="px-2 py-0.5 text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-md">
                        PR
                      </span>
                    )}
                    {run.videoUrl && (
                      <button
                        type="button"
                        onClick={() => setActiveVideoRun(run)}
                        className="px-2 py-0.5 text-[10px] font-bold bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-950 dark:hover:bg-red-900 dark:text-red-300 rounded-md flex items-center gap-1 transition-colors"
                        title="Přehrát nebo spravovat video výlezu"
                      >
                        <Play className="w-2.5 h-2.5 fill-current text-red-600" />
                        <span>Video</span>
                      </button>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {new Date(run.date).toLocaleDateString()} · {run.climberName || 'Lezec'} · {run.gym}
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

                {deletingRunId === run.id ? (
                  <div className="flex items-center gap-1 bg-red-50 dark:bg-red-950/60 p-1 rounded-xl border border-red-200 dark:border-red-900">
                    <span className="text-[10px] text-red-600 dark:text-red-400 font-bold px-1">
                      Smazat?
                    </span>
                    <button
                      type="button"
                      onClick={() => confirmDeleteRun(run.id)}
                      className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold hover:bg-red-700"
                    >
                      Ano
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingRunId(null)}
                      className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px]"
                    >
                      Ne
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeletingRunId(run.id)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-600"
                    title="Smazat záznam"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )))}
        </div>
      </div>

      {/* Floating Video Preview & Management Modal */}
      {activeVideoRun && activeVideoRun.videoUrl && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-lg w-full p-4 sm:p-5 text-white space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-red-500" />
                <span className="font-bold text-sm">
                  Záznam {activeVideoRun.totalTime.toFixed(3)}s · {activeVideoRun.gym}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideoRun(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800">
              <video
                src={activeVideoRun.videoUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <a
                href={activeVideoRun.videoUrl}
                download={`fifteen_run_${activeVideoRun.totalTime.toFixed(3)}s.webm`}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Stáhnout do zařízení</span>
              </a>

              {confirmDeleteVideoId === activeVideoRun.id ? (
                <div className="flex items-center gap-1.5 p-1 bg-red-950/70 rounded-xl border border-red-900">
                  <span className="text-[11px] text-red-300 px-1 font-bold">Opravdu smazat?</span>
                  <button
                    type="button"
                    onClick={() => confirmDeleteVideo(activeVideoRun.id)}
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-bold"
                  >
                    Ano, smazat
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteVideoId(null)}
                    className="px-2 py-1 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-lg text-[11px]"
                  >
                    Zrušit
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteVideoId(activeVideoRun.id)}
                  className="px-3 py-1.5 rounded-xl bg-red-950/50 hover:bg-red-900/60 text-red-400 font-bold flex items-center gap-1.5 transition-colors border border-red-900/50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Smazat video</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

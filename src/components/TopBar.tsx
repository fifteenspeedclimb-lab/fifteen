import React from 'react';
import { Settings, BookOpen } from 'lucide-react';
import { RouteCategory } from '../types/climbing';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { FifteenLogo } from './FifteenLogo';

interface TopBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenLogbook: () => void;
  onOpenSettings: () => void;
  currentCategory: RouteCategory;
  onSelectCategory: (cat: RouteCategory) => void;
  lang: Language;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  onOpenLogbook,
  onOpenSettings,
  currentCategory,
  onSelectCategory,
  lang,
}) => {
  const t = TRANSLATIONS[lang];

  return (
    <header className="sticky top-0 z-40 w-full max-w-full overflow-x-hidden bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-6">
        {/* Zone 1: Authentic FIFTEEN Brand logo with dynamic climbing arrow */}
        <div className="flex items-center gap-2 shrink-0 py-1">
          <button
            onClick={() => setActiveTab('timer')}
            aria-label="FIFTEEN Speed Climbing App Home"
            className="shrink-0 hover:opacity-95 active:scale-98 transition-all focus:outline-none flex items-center"
          >
            <FifteenLogo size="md" />
          </button>
        </div>

        {/* Zone 2: Navigation links for tablet and desktop viewports */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-xs lg:text-sm font-bold text-slate-600 dark:text-slate-300">
          <button
            onClick={() => setActiveTab('timer')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
              activeTab === 'timer'
                ? 'border-red-600 text-slate-950 dark:text-white'
                : 'border-transparent hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            {t.navTimer}
          </button>
          <button
            onClick={() => setActiveTab('splits')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
              activeTab === 'splits'
                ? 'border-red-600 text-slate-950 dark:text-white'
                : 'border-transparent hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            {t.navSplits}
          </button>
          <button
            onClick={() => setActiveTab('ghost')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
              activeTab === 'ghost'
                ? 'border-red-600 text-slate-950 dark:text-white'
                : 'border-transparent hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            {t.navGhost}
          </button>
          <button
            onClick={() => setActiveTab('training')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
              activeTab === 'training'
                ? 'border-red-600 text-slate-950 dark:text-white'
                : 'border-transparent hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            {t.navTraining}
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
              activeTab === 'leaderboard'
                ? 'border-red-600 text-slate-950 dark:text-white'
                : 'border-transparent hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            {t.navLeaderboard}
          </button>
        </nav>

        {/* Zone 3: Clean, uncluttered action cluster for mobile & desktop */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Quick Route Category indicator on tablets */}
          <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span>{currentCategory === 'adults_15m' ? '15m Standard' : currentCategory === 'youth_u15' ? '10m U15' : '10m U13'}</span>
          </div>

          {/* Logbook Quick Trigger */}
          <button
            onClick={onOpenLogbook}
            aria-label={t.logbookBtn}
            title={t.logbookBtn}
            className="h-9 px-2.5 sm:px-3 rounded-xl flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all active:scale-95 shadow-sm"
          >
            <BookOpen className="w-4 h-4 text-red-600 dark:text-red-500" />
            <span className="hidden xs:inline">{t.logbookBtn}</span>
          </button>

          {/* Unified Settings Button (⚙️) - contains Language, Theme, Audio, Cloud, Legal, Phone QR */}
          <button
            onClick={onOpenSettings}
            aria-label="Nastavení aplikace"
            title="Nastavení aplikace (Jazyk, Zvuk, Motiv, Právní)"
            className="w-9 h-9 min-w-[36px] rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all active:scale-95 shadow-sm"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

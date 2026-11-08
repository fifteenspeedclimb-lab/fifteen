import React from 'react';
import { Cloud, Scale, Smartphone } from 'lucide-react';
import { RouteCategory } from '../types/climbing';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { FifteenLogo } from './FifteenLogo';

interface TopBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenLogbook: () => void;
  onOpenCloudSync: () => void;
  onOpenLegal: () => void;
  onOpenPhoneTest: () => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  currentCategory: RouteCategory;
  onSelectCategory: (cat: RouteCategory) => void;
  lang: Language;
  onSelectLang: (lang: Language) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  onOpenLogbook,
  onOpenCloudSync,
  onOpenLegal,
  onOpenPhoneTest,
  isDark,
  setIsDark,
  currentCategory,
  onSelectCategory,
  lang,
  onSelectLang,
}) => {
  const t = TRANSLATIONS[lang];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3 sm:gap-6">
        {/* Zone 1: Authentic FIFTEEN Brand logo with climbing arrow */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 py-1">
          <button
            onClick={() => setActiveTab('timer')}
            aria-label="FIFTEEN Speed Climbing App Home"
            className="shrink-0 hover:opacity-95 active:scale-98 transition-all focus:outline-none flex items-center"
          >
            <FifteenLogo size="md" />
          </button>
        </div>

        {/* Zone 2: Concise single-line navigation links for tablets and desktop */}
        <nav className="hidden md:flex items-center gap-5 lg:gap-7 text-xs lg:text-sm font-bold text-slate-600 dark:text-slate-300">
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

        {/* Zone 3: Primary Action Cluster (Language Switcher, Cloud, Theme, Logbook) */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Language Switcher Segmented Control */}
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-bold">
            <button
              onClick={() => onSelectLang('cs')}
              title="Čeština"
              className={`px-2 py-1 rounded-lg transition-colors ${
                lang === 'cs'
                  ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              CZ
            </button>
            <button
              onClick={() => onSelectLang('en')}
              title="English"
              className={`px-2 py-1 rounded-lg transition-colors ${
                lang === 'en'
                  ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => onSelectLang('de')}
              title="Deutsch"
              className={`px-2 py-1 rounded-lg transition-colors ${
                lang === 'de'
                  ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              DE
            </button>
          </div>

          {/* Phone Test & QR Code */}
          <button
            onClick={onOpenPhoneTest}
            aria-label="Vyzkoušet na telefonu"
            title={t.tryOnPhone}
            className="h-9 px-2.5 rounded-xl flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 transition-colors border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
          >
            <Smartphone className="w-4 h-4 text-red-600 dark:text-red-500" />
            <span className="hidden sm:inline">{t.tryOnPhone}</span>
          </button>

          {/* Cloud Sync & Auth Button */}
          <button
            onClick={onOpenCloudSync}
            aria-label="Cloudové úložiště videí"
            title={t.navCloud}
            className="w-9 h-9 min-w-[36px] rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-colors border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
          >
            <Cloud className="w-4 h-4" />
          </button>

          {/* Legal and Compliance Button */}
          <button
            onClick={onOpenLegal}
            aria-label="Právní podmínky & GDPR"
            title={t.navLegal}
            className="w-9 h-9 min-w-[36px] rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-colors border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
          >
            <Scale className="w-4 h-4" />
          </button>

          {/* Theme Switcher */}
          <button
            onClick={() => setIsDark(!isDark)}
            aria-label="Přepnout motiv"
            className="w-9 h-9 min-w-[36px] rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors border border-slate-200 dark:border-slate-800"
          >
            {isDark ? '☀️' : '🌙'}
          </button>

          {/* Logbook CTA */}
          <button
            onClick={onOpenLogbook}
            className="hidden sm:inline-flex px-3.5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 rounded-xl transition-all shadow-sm whitespace-nowrap shrink-0"
          >
            {t.logbookBtn}
          </button>
        </div>
      </div>
    </header>
  );
};

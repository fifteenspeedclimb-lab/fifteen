import React from 'react';
import { Settings, BookOpen } from 'lucide-react';
import { RouteCategory } from '../types/climbing';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { FifteenLogo } from './FifteenLogo';

import { UserProfile } from '../utils/storage';

interface TopBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenLogbook: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  userProfile?: UserProfile;
  currentCategory: RouteCategory;
  onSelectCategory: (cat: RouteCategory) => void;
  lang: Language;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  onOpenLogbook,
  onOpenSettings,
  onOpenAuth,
  userProfile,
  currentCategory,
  onSelectCategory,
  lang,
}) => {
  const t = TRANSLATIONS[lang];

  const cycleCategory = () => {
    const order: RouteCategory[] = ['adults_15m', 'youth_u15', 'youth_u13'];
    const next = order[(order.indexOf(currentCategory) + 1) % order.length];
    onSelectCategory(next);
  };

  return (
    <header className="sticky top-0 z-40 w-full max-w-full overflow-x-hidden bg-black/95 backdrop-blur-md border-b border-slate-800 transition-colors">
      <div className="max-w-6xl mx-auto px-2.5 sm:px-6 h-16 sm:h-20 relative flex items-center justify-between gap-2">
        {/* Left Side: Route Category Badge & Desktop Navigation links */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 z-10">
          <button
            type="button"
            onClick={cycleCategory}
            title={lang === 'cs' ? 'Kliknutím přepnete kategorii tratě (15m / 10m U15 / 10m U13)' : 'Click to switch route category'}
            className="h-9 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-slate-200 transition-colors shrink-0 whitespace-nowrap"
          >
            <span className="text-red-500 font-black">
              {currentCategory === 'adults_15m' ? '15m' : '10m'}
            </span>
            <span className="hidden sm:inline text-slate-300">
              {currentCategory === 'adults_15m' ? 'Standard' : currentCategory === 'youth_u15' ? 'U15' : 'U13'}
            </span>
            <span className="sm:hidden text-slate-400">
              {currentCategory === 'adults_15m' ? '' : currentCategory === 'youth_u15' ? 'U15' : 'U13'}
            </span>
          </button>

          <nav className="hidden lg:flex items-center gap-3 xl:gap-4 text-xs font-bold text-slate-300">
            <button
              onClick={() => setActiveTab('timer')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
                activeTab === 'timer' ? 'border-red-600 text-white' : 'border-transparent hover:text-white'
              }`}
            >
              {t.navTimer}
            </button>
            <button
              onClick={() => setActiveTab('splits')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
                activeTab === 'splits' ? 'border-red-600 text-white' : 'border-transparent hover:text-white'
              }`}
            >
              {t.navSplits}
            </button>
            <button
              onClick={() => setActiveTab('ghost')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
                activeTab === 'ghost' ? 'border-red-600 text-white' : 'border-transparent hover:text-white'
              }`}
            >
              {t.navGhost}
            </button>
            <button
              onClick={() => setActiveTab('training')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
                activeTab === 'training' ? 'border-red-600 text-white' : 'border-transparent hover:text-white'
              }`}
            >
              {t.navTraining}
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
                activeTab === 'leaderboard' ? 'border-red-600 text-white' : 'border-transparent hover:text-white'
              }`}
            >
              {t.navLeaderboard}
            </button>
          </nav>
        </div>

        {/* Center Logo: Flex-centered on mobile/tablet (zero overlap with left/right), centered cleanly on wide desktop */}
        <div className="flex-1 min-w-0 flex items-center justify-center px-1 lg:px-2 z-10">
          <button
            onClick={() => setActiveTab('timer')}
            aria-label="FIFTEEN Speed Climbing App Home"
            className="hover:opacity-90 active:scale-98 transition-all focus:outline-none flex items-center justify-center max-w-full"
          >
            <span className="lg:hidden inline-flex items-center justify-center max-w-full">
              <FifteenLogo size="sm" />
            </span>
            <span className="hidden lg:inline-flex items-center justify-center max-w-full">
              <FifteenLogo size="md" />
            </span>
          </button>
        </div>

        {/* Right Side: Account, Logbook & Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 z-10">
          <button
            onClick={onOpenAuth}
            aria-label="Profil lezce a přepínač účtů"
            title={`Aktivní lezec: ${userProfile?.name || 'Lezec'} (${userProfile?.nationalityCode || 'CZE'}) – Kliknutím přepnete lezce`}
            className="h-9 min-w-[44px] px-2 sm:px-2.5 rounded-xl flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-white bg-slate-900 border border-slate-800 hover:border-red-500/50 transition-all active:scale-95 shadow-sm group shrink-0"
          >
            <div
              style={{ backgroundColor: userProfile?.avatarColor || '#ef4444' }}
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-sm"
            >
              {userProfile?.name ? userProfile.name[0].toUpperCase() : 'L'}
            </div>
            <span className="text-sm leading-none shrink-0">{userProfile?.flagEmoji || '🇨🇿'}</span>
            <span className="hidden sm:inline max-w-[90px] truncate text-[11px] font-bold text-slate-200 group-hover:text-white">
              {userProfile?.name ? userProfile.name.split(' ')[0] : (lang === 'cs' ? 'Lezec' : 'Climber')}
            </span>
          </button>

          <button
            onClick={onOpenLogbook}
            aria-label={t.logbookBtn}
            title={t.logbookBtn}
            className="h-9 min-w-[40px] px-2 sm:px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-slate-200 hover:text-red-400 bg-slate-900 border border-slate-800 transition-all active:scale-95 shadow-sm shrink-0 whitespace-nowrap"
          >
            <BookOpen className="w-4 h-4 text-red-500 shrink-0" />
            <span className="hidden md:inline">{t.logbookBtn}</span>
          </button>

          <button
            onClick={onOpenSettings}
            aria-label="Nastavení aplikace"
            title="Nastavení aplikace"
            className="w-9 h-9 min-w-[36px] rounded-xl flex items-center justify-center text-slate-200 hover:text-red-400 bg-slate-900 border border-slate-800 transition-all active:scale-95 shadow-sm shrink-0"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

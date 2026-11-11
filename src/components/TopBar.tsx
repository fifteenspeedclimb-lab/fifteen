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

  return (
    <header className="sticky top-0 z-40 w-full max-w-full overflow-x-hidden bg-black/95 backdrop-blur-md border-b border-slate-800 transition-colors">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-18 sm:h-22 relative flex items-center justify-between gap-2">
        {/* Left Side: Route Category Badge & Desktop Navigation links */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0 z-10">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span className="hidden xs:inline">
              {currentCategory === 'adults_15m' ? '15m Standard' : currentCategory === 'youth_u15' ? '10m U15' : '10m U13'}
            </span>
            <span className="xs:hidden">
              {currentCategory === 'adults_15m' ? '15m' : '10m'}
            </span>
          </div>

          <nav className="hidden lg:flex items-center gap-3 xl:gap-4 text-xs font-bold text-slate-300">
            <button
              onClick={() => setActiveTab('timer')}
              className={`whitespace-nowrap transition-colors py-1 border-b-2 ${
                activeTab === 'timer' ? 'border-red-600 text-white' : 'border-transparent hover:text-white'
              }`}
            >
              {t.navTimer}
            </button>
            <button
              onClick={() => setActiveTab('splits')}
              className={`whitespace-nowrap transition-colors py-1 border-b-2 ${
                activeTab === 'splits' ? 'border-red-600 text-white' : 'border-transparent hover:text-white'
              }`}
            >
              {t.navSplits}
            </button>
            <button
              onClick={() => setActiveTab('ghost')}
              className={`whitespace-nowrap transition-colors py-1 border-b-2 ${
                activeTab === 'ghost' ? 'border-red-600 text-white' : 'border-transparent hover:text-white'
              }`}
            >
              {t.navGhost}
            </button>
            <button
              onClick={() => setActiveTab('training')}
              className={`whitespace-nowrap transition-colors py-1 border-b-2 ${
                activeTab === 'training' ? 'border-red-600 text-white' : 'border-transparent hover:text-white'
              }`}
            >
              {t.navTraining}
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`whitespace-nowrap transition-colors py-1 border-b-2 ${
                activeTab === 'leaderboard' ? 'border-red-600 text-white' : 'border-transparent hover:text-white'
              }`}
            >
              {t.navLeaderboard}
            </button>
          </nav>
        </div>

        {/* Center: Exactly Centered Enlarged Authentic FIFTEEN Logo without frame */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center z-20 pointer-events-auto">
          <button
            onClick={() => setActiveTab('timer')}
            aria-label="FIFTEEN Speed Climbing App Home"
            className="hover:opacity-90 active:scale-98 transition-all focus:outline-none flex items-center justify-center"
          >
            <FifteenLogo size="md" />
          </button>
        </div>

        {/* Right Side: Account, Logbook & Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 z-10">
          <button
            onClick={onOpenAuth}
            aria-label="Profil lezce a přepínač účtů"
            title={`Aktivní lezec: ${userProfile?.name || 'Lezec'} (${userProfile?.nationalityCode || 'CZE'}) – Kliknutím přepnete lezce`}
            className="h-9 px-2.5 rounded-xl flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-white bg-slate-900 border border-slate-800 hover:border-red-500/50 transition-all active:scale-95 shadow-sm group"
          >
            <div
              style={{ backgroundColor: userProfile?.avatarColor || '#ef4444' }}
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-sm"
            >
              {userProfile?.name ? userProfile.name[0].toUpperCase() : 'L'}
            </div>
            <span className="text-sm leading-none">{userProfile?.flagEmoji || '🇨🇿'}</span>
            <span className="hidden sm:inline max-w-[90px] truncate text-[11px] font-bold text-slate-200 group-hover:text-white">
              {userProfile?.name ? userProfile.name.split(' ')[0] : (lang === 'cs' ? 'Lezec' : 'Climber')}
            </span>
          </button>

          <button
            onClick={onOpenLogbook}
            aria-label={t.logbookBtn}
            title={t.logbookBtn}
            className="h-9 px-2.5 sm:px-3 rounded-xl flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-red-400 bg-slate-900 border border-slate-800 transition-all active:scale-95 shadow-sm"
          >
            <BookOpen className="w-4 h-4 text-red-500" />
            <span className="hidden sm:inline">{t.logbookBtn}</span>
          </button>

          <button
            onClick={onOpenSettings}
            aria-label="Nastavení aplikace"
            title="Nastavení aplikace"
            className="w-9 h-9 min-w-[36px] rounded-xl flex items-center justify-center text-slate-200 hover:text-red-400 bg-slate-900 border border-slate-800 transition-all active:scale-95 shadow-sm"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

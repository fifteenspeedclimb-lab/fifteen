import React from 'react';
import { Timer, Split, Headphones, Trophy, Dumbbell } from 'lucide-react';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface BottomTabBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  lang: Language;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, setActiveTab, lang }) => {
  const t = TRANSLATIONS[lang];

  const tabs = [
    { id: 'timer', label: t.navTimer, icon: Timer },
    { id: 'splits', label: t.navSplits, icon: Split },
    { id: 'ghost', label: t.navGhost, icon: Headphones },
    { id: 'training', label: t.navTraining, icon: Dumbbell },
    { id: 'leaderboard', label: t.navLeaderboard, icon: Trophy },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe">
      <div className="grid grid-cols-5 items-center h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center transition-colors ${
                isActive
                  ? 'text-red-600 dark:text-red-500 font-extrabold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
              <span className="text-[10px] tracking-tight mt-1 truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

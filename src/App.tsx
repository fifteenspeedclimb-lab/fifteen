/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { BottomTabBar } from './components/BottomTabBar';
import { SmartTimer } from './components/SmartTimer';
import { SplitAnalysis } from './components/SplitAnalysis';
import { GhostAudioPacer } from './components/GhostAudioPacer';
import { TrainingRoutines } from './components/TrainingRoutines';
import { Leaderboards } from './components/Leaderboards';
import { LogbookModal } from './components/LogbookModal';
import { AiAnalysisModal } from './components/AiAnalysisModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { LegalModal } from './components/LegalModal';
import { PhoneQrModal } from './components/PhoneQrModal';
import { RouteCategory, SpeedRun } from './types/climbing';
import { getStoredRuns, getUserProfile } from './utils/storage';
import { Language, getStoredLanguage, saveStoredLanguage, TRANSLATIONS } from './utils/i18n';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('timer');
  const [isDark, setIsDark] = useState<boolean>(true);
  const [lang, setLang] = useState<Language>(getStoredLanguage());
  const [currentCategory, setCurrentCategory] = useState<RouteCategory>('adults_15m');
  const [runs, setRuns] = useState<SpeedRun[]>([]);
  const [currentSelectedRun, setCurrentSelectedRun] = useState<SpeedRun | null>(null);

  // Modals
  const [showLogbook, setShowLogbook] = useState<boolean>(false);
  const [showCloudSync, setShowCloudSync] = useState<boolean>(false);
  const [showLegal, setShowLegal] = useState<boolean>(false);
  const [showPhoneQr, setShowPhoneQr] = useState<boolean>(false);
  const [analyzingRun, setAnalyzingRun] = useState<SpeedRun | null>(null);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const loadedRuns = getStoredRuns();
    setRuns(loadedRuns);
    if (loadedRuns.length > 0) {
      setCurrentSelectedRun(loadedRuns[0]);
    }

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    saveStoredLanguage(newLang);
  };

  const handleRunFinished = (newRun: SpeedRun) => {
    const updated = [newRun, ...runs.filter((r) => r.id !== newRun.id)];
    setRuns(updated);
    setCurrentSelectedRun(newRun);
  };

  const handleOpenAiAnalysis = (run: SpeedRun) => {
    setAnalyzingRun(run);
  };

  const handleRunUpdated = (updatedRun: SpeedRun) => {
    const updated = runs.map((r) => (r.id === updatedRun.id ? updatedRun : r));
    setRuns(updated);
    if (currentSelectedRun?.id === updatedRun.id) {
      setCurrentSelectedRun(updatedRun);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Strict 3-zone Top Bar Contract */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenLogbook={() => setShowLogbook(true)}
        onOpenCloudSync={() => setShowCloudSync(true)}
        onOpenLegal={() => setShowLegal(true)}
        onOpenPhoneTest={() => setShowPhoneQr(true)}
        isDark={isDark}
        setIsDark={setIsDark}
        currentCategory={currentCategory}
        onSelectCategory={setCurrentCategory}
        lang={lang}
        onSelectLang={handleLanguageChange}
      />

      {/* Main Responsive Canvas (Phones & Tablets) */}
      <main className="flex-1 pb-24 md:pb-12">
        {activeTab === 'timer' && (
          <SmartTimer
            onRunFinished={handleRunFinished}
            onOpenAnalysis={handleOpenAiAnalysis}
            currentCategory={currentCategory}
            onSelectCategory={setCurrentCategory}
            lang={lang}
          />
        )}

        {activeTab === 'splits' && (
          <SplitAnalysis
            currentRun={currentSelectedRun || runs[0]}
            allRuns={runs}
            onSelectRun={(run) => setCurrentSelectedRun(run)}
            onOpenAiAnalysis={handleOpenAiAnalysis}
            lang={lang}
            currentCategory={currentCategory}
          />
        )}

        {activeTab === 'ghost' && <GhostAudioPacer lang={lang} />}

        {activeTab === 'training' && <TrainingRoutines lang={lang} />}

        {activeTab === 'leaderboard' && <Leaderboards lang={lang} />}
      </main>

      {/* Ergonomic Mobile Bottom Tab Bar */}
      <BottomTabBar activeTab={activeTab} setActiveTab={setActiveTab} lang={lang} />

      {/* Session Logbook Modal */}
      {showLogbook && (
        <LogbookModal
          runs={runs}
          onClose={() => setShowLogbook(false)}
          onSelectRunForAnalysis={(run) => {
            setCurrentSelectedRun(run);
            setActiveTab('splits');
          }}
          onRunsChanged={(updatedRuns) => {
            setRuns(updatedRuns);
            if (updatedRuns.length > 0) {
              setCurrentSelectedRun(updatedRuns[0]);
            }
          }}
          lang={lang}
        />
      )}

      {/* AI Coach Analysis Modal */}
      {analyzingRun && (
        <AiAnalysisModal
          run={analyzingRun}
          onClose={() => setAnalyzingRun(null)}
          onRunUpdated={handleRunUpdated}
        />
      )}

      {/* Cloud Sync & Auth Modal */}
      {showCloudSync && (
        <CloudSyncModal
          onClose={() => setShowCloudSync(false)}
          lang={lang}
        />
      )}

      {/* Legal & Compliance Modal */}
      {showLegal && (
        <LegalModal
          onClose={() => setShowLegal(false)}
          lang={lang}
        />
      )}

      {/* Mobile Phone Test & Setup Guide Modal */}
      {showPhoneQr && (
        <PhoneQrModal
          onClose={() => setShowPhoneQr(false)}
          lang={lang}
        />
      )}
    </div>
  );
}

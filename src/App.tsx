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
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { RouteCategory, SpeedRun } from './types/climbing';
import { getStoredRuns, getUserProfile, UserProfile } from './utils/storage';
import { Language, getStoredLanguage, saveStoredLanguage, TRANSLATIONS } from './utils/i18n';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('timer');
  const [isDark, setIsDark] = useState<boolean>(true);
  const [lang, setLang] = useState<Language>(getStoredLanguage());
  const [currentCategory, setCurrentCategory] = useState<RouteCategory>('adults_15m');
  const [runs, setRuns] = useState<SpeedRun[]>([]);
  const [currentSelectedRun, setCurrentSelectedRun] = useState<SpeedRun | null>(null);
  const [profile, setProfile] = useState<UserProfile>(getUserProfile());

  // Modals
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showLogbook, setShowLogbook] = useState<boolean>(false);
  const [showCloudSync, setShowCloudSync] = useState<boolean>(false);
  const [showLegal, setShowLegal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
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
    setProfile(getUserProfile());
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

  const handleRunsChanged = (updatedRuns: SpeedRun[]) => {
    setRuns(updatedRuns);
    if (updatedRuns.length > 0) {
      if (!currentSelectedRun || !updatedRuns.some((r) => r.id === currentSelectedRun.id)) {
        setCurrentSelectedRun(updatedRuns[0]);
      }
    } else {
      setCurrentSelectedRun(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 w-full max-w-full overflow-x-hidden">
      {/* Strict 3-zone Top Bar Contract */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenLogbook={() => setShowLogbook(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenAuth={() => setShowAuthModal(true)}
        userProfile={profile}
        currentCategory={currentCategory}
        onSelectCategory={setCurrentCategory}
        lang={lang}
      />

      {/* Main Responsive Canvas (Phones & Tablets) */}
      <main className="flex-1 pb-28 md:pb-12 w-full max-w-full overflow-x-hidden">
        {activeTab === 'timer' && (
          <SmartTimer
            onRunFinished={handleRunFinished}
            onOpenAnalysis={handleOpenAiAnalysis}
            currentCategory={currentCategory}
            onSelectCategory={setCurrentCategory}
            lang={lang}
            userProfile={profile}
            onDeleteRun={(runId) => {
              const updated = runs.filter((r) => r.id !== runId);
              handleRunsChanged(updated);
            }}
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

        {activeTab === 'leaderboard' && (
          <Leaderboards
            lang={lang}
            runs={runs}
            onRunsChanged={handleRunsChanged}
            userProfile={profile}
            onOpenAuth={() => setShowAuthModal(true)}
          />
        )}
      </main>

      {/* Ergonomic Mobile Bottom Tab Bar */}
      <BottomTabBar activeTab={activeTab} setActiveTab={setActiveTab} lang={lang} />

      {/* Session Logbook Modal with Single & Bulk Deletions */}
      {showLogbook && (
        <LogbookModal
          runs={runs}
          onClose={() => setShowLogbook(false)}
          onSelectRunForAnalysis={(run) => {
            setCurrentSelectedRun(run);
            setActiveTab('splits');
          }}
          onRunsChanged={handleRunsChanged}
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

      {/* Athlete Authentication & Nationality Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => {
            setShowAuthModal(false);
            setProfile(getUserProfile());
            setRuns(getStoredRuns());
          }}
          onProfileUpdated={(updatedProfile) => {
            setProfile(updatedProfile);
          }}
          onRunsChanged={handleRunsChanged}
          lang={lang}
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

      {/* Unified Settings Modal (Language, Theme, Audio tones, Athlete Profile, Cloud, Legal) */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          lang={lang}
          onSelectLang={handleLanguageChange}
          isDark={isDark}
          setIsDark={setIsDark}
          onOpenCloudSync={() => setShowCloudSync(true)}
          onOpenLegal={() => setShowLegal(true)}
          onOpenAuth={() => {
            setShowSettings(false);
            setShowAuthModal(true);
          }}
          userProfile={profile}
        />
      )}
    </div>
  );
}

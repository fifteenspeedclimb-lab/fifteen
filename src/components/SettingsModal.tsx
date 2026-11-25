import React, { useState } from 'react';
import { Volume2, VolumeX, Moon, Sun, Globe, Shield, Play, Check, Users, Mic, Video, Camera } from 'lucide-react';
import { Language } from '../utils/i18n';
import {
  ToneStyle,
  getStoredAudioSettings,
  saveStoredAudioSettings,
  playIFSCPrepTone,
  playIFSCStartTone,
  speakIFSCCommand,
} from '../utils/audio';
import { FifteenAppIcon } from './FifteenLogo';

import { RouteCategory } from '../types/climbing';
import {
  UserProfile,
  getUserProfile,
  saveUserProfile,
  AppSettings,
  getAppSettings,
  saveAppSettings,
  VideoTimeOverlayMode,
  AiSensitivityPreset,
  DefaultStartMode,
} from '../utils/storage';

interface SettingsModalProps {
  onClose: () => void;
  lang: Language;
  onSelectLang: (lang: Language) => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  onOpenLegal: () => void;
  onOpenAuth: () => void;
  userProfile?: UserProfile;
  currentCategory?: RouteCategory;
  onSelectCategory?: (cat: RouteCategory) => void;
  onProfileUpdated?: (profile: UserProfile) => void;
  appSettings?: AppSettings;
  onAppSettingsChange?: (settings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  lang,
  onSelectLang,
  isDark,
  setIsDark,
  onOpenLegal,
  onOpenAuth,
  userProfile,
  currentCategory,
  onSelectCategory,
  onProfileUpdated,
  appSettings: externalAppSettings,
  onAppSettingsChange,
}) => {
  const [profile, setProfile] = useState<UserProfile>(userProfile || getUserProfile);
  const [audioSettings, setAudioSettings] = useState(getStoredAudioSettings());
  const [localAppSettings, setLocalAppSettings] = useState<AppSettings>(
    () => externalAppSettings || getAppSettings()
  );
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  const updateAppSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setLocalAppSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveAppSettings(next);
      onAppSettingsChange?.(next);
      return next;
    });
  };

  const selectedClimberCategory: RouteCategory = profile.defaultCategory || currentCategory || 'adults_15m';

  const handleClimberCategoryChange = (cat: RouteCategory) => {
    const updated: UserProfile = { ...profile, defaultCategory: cat };
    setProfile(updated);
    saveUserProfile(updated);
    onProfileUpdated?.(updated);
    onSelectCategory?.(cat);
  };

  const handleToneStyleChange = (style: ToneStyle) => {
    const updated = { ...audioSettings, toneStyle: style };
    setAudioSettings(updated);
    saveStoredAudioSettings(updated);
    playIFSCPrepTone(style);
  };

  const handleVolumePreset = (vol: number) => {
    const updated = { ...audioSettings, volume: vol };
    setAudioSettings(updated);
    saveStoredAudioSettings(updated);
    playIFSCStartTone(audioSettings.toneStyle);
  };

  const handleVoiceToggle = () => {
    const nextEnabled = !audioSettings.voiceEnabled;
    const updated = { ...audioSettings, voiceEnabled: nextEnabled };
    setAudioSettings(updated);
    saveStoredAudioSettings(updated);
    if (nextEnabled) {
      speakIFSCCommand('marks');
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const runTestBeeps = () => {
    if (isPlayingTest) return;
    setIsPlayingTest(true);
    const delayOffset = audioSettings.voiceEnabled ? 2500 : 0;

    if (audioSettings.voiceEnabled) {
      speakIFSCCommand('marks');
      setTimeout(() => speakIFSCCommand('ready'), 1400);
    }

    setTimeout(() => playIFSCPrepTone(audioSettings.toneStyle), delayOffset);
    setTimeout(() => playIFSCPrepTone(audioSettings.toneStyle), delayOffset + 1000);
    setTimeout(() => playIFSCPrepTone(audioSettings.toneStyle), delayOffset + 2000);
    setTimeout(() => {
      playIFSCStartTone(audioSettings.toneStyle);
      setIsPlayingTest(false);
    }, delayOffset + 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <FifteenAppIcon size="sm" className="w-8 h-8 rounded-xl shadow-sm" />
            <div>
              <h2 className="font-display font-black text-xl text-slate-950 dark:text-white leading-tight">
                {lang === 'cs' ? 'Nastavení' : lang === 'de' ? 'Einstellungen' : 'Settings'}
              </h2>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fifteen v1.0</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Zavřít"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white text-base font-bold"
          >
            ✕
          </button>
        </div>

        {/* 0. Athlete Profile, Category & Nationality Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-red-600/10 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-lg border border-red-500/20 shrink-0">
                {profile.flagEmoji || '🇨🇿'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="truncate">{profile.name || (lang === 'cs' ? 'Nenastavený profil lezce' : 'Profile not set')}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                    {profile.nationalityCode || 'CZE'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {profile.homeGym ? `${profile.homeGym} · ` : ''}{profile.nationality || 'Česká republika'}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
            >
              {profile.isAuthenticated
                ? lang === 'cs'
                  ? 'Upravit profil'
                  : lang === 'de'
                  ? 'Profil bearbeiten'
                  : 'Edit profile'
                : lang === 'cs'
                ? 'Přihlásit se'
                : lang === 'de'
                ? 'Anmelden'
                : 'Sign in'}
            </button>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              {lang === 'cs'
                ? 'Kategorie lezce (délka tratě)'
                : lang === 'de'
                ? 'Kletterer-Kategorie (Strecke)'
                : 'Climber Category (Route)'}
            </span>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 rounded-xl text-[11px] font-bold">
              {[
                {
                  id: 'adults_15m' as RouteCategory,
                  label: lang === 'cs' ? '15m Dospělí' : lang === 'de' ? '15m Erw.' : '15m Adults',
                },
                { id: 'youth_u15' as RouteCategory, label: '10m U15' },
                { id: 'youth_u13' as RouteCategory, label: '10m U13' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleClimberCategoryChange(cat.id)}
                  className={`min-h-[36px] py-1 px-2 rounded-lg transition-all ${
                    selectedClimberCategory === cat.id
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 1. Language Picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
            <Globe className="w-3.5 h-3.5 text-red-600" />
            <span>{lang === 'cs' ? 'Jazyk' : lang === 'de' ? 'Sprache' : 'Language'}</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { code: 'cs' as Language, label: 'Čeština', flag: '🇨🇿' },
              { code: 'en' as Language, label: 'English', flag: '🇬🇧' },
              { code: 'de' as Language, label: 'Deutsch', flag: '🇩🇪' },
            ].map((item) => (
              <button
                key={item.code}
                onClick={() => onSelectLang(item.code)}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  lang === item.code
                    ? 'bg-red-600 text-white border-red-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <span>{item.flag}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Theme Mode */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
            {isDark ? <Moon className="w-3.5 h-3.5 text-purple-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
            <span>{lang === 'cs' ? 'Motiv' : lang === 'de' ? 'Thema' : 'Theme'}</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsDark(true)}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                isDark
                  ? 'bg-slate-900 text-white border-red-500 ring-2 ring-red-500/20'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>{lang === 'cs' ? 'Tmavý' : lang === 'de' ? 'Dunkel' : 'Dark'}</span>
            </button>
            <button
              onClick={() => setIsDark(false)}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                !isDark
                  ? 'bg-slate-100 text-slate-950 border-red-500 ring-2 ring-red-500/20'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>{lang === 'cs' ? 'Světlý' : lang === 'de' ? 'Hell' : 'Light'}</span>
            </button>
          </div>
        </div>

        {/* 3. Start Audio & Tones */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Volume2 className="w-3.5 h-3.5 text-red-600" />
              <span>{lang === 'cs' ? 'Startovní tón' : 'Start Sound'}</span>
            </label>
            <button
              onClick={runTestBeeps}
              disabled={isPlayingTest}
              className="px-2.5 py-1 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>
                {isPlayingTest
                  ? lang === 'cs'
                    ? 'Přehrávám...'
                    : lang === 'de'
                    ? 'Wiedergabe...'
                    : 'Playing...'
                  : lang === 'cs'
                  ? 'Test zvuku'
                  : lang === 'de'
                  ? 'Ton testen'
                  : 'Test sound'}
              </span>
            </button>
          </div>

          {/* Tone Style buttons (Clean Cards without text bloat) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { id: 'piercing' as ToneStyle, label: 'Pronikavý 1200+2400Hz', badge: 'Doporučeno' },
              { id: 'ifsc_standard' as ToneStyle, label: 'IFSC 440/880Hz', badge: 'Standard' },
              { id: 'buzzer' as ToneStyle, label: 'Klakson / Buzzer', badge: 'Rázový' },
            ].map((tStyle) => (
              <button
                key={tStyle.id}
                onClick={() => handleToneStyleChange(tStyle.id)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  audioSettings.toneStyle === tStyle.id
                    ? 'bg-red-50 dark:bg-red-950/30 border-red-500 text-red-600 dark:text-red-400 font-bold'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs">{tStyle.label}</span>
                  {audioSettings.toneStyle === tStyle.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                </div>
              </button>
            ))}
          </div>

          {/* Stepped Volume Selector - NO SLIDER */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-slate-500 font-medium">
              {lang === 'cs' ? 'Hlasitost pípnutí:' : lang === 'de' ? 'Signallautstärke:' : 'Beep volume:'}
            </span>
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              {[
                { val: 0.5, label: '50%' },
                { val: 0.8, label: '80%' },
                { val: 1.0, label: '100% (Hala)' },
              ].map((v) => (
                <button
                  key={v.val}
                  onClick={() => handleVolumePreset(v.val)}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                    Math.abs(audioSettings.volume - v.val) < 0.1
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Commands Toggle (IFSC "At your marks" / "Ready" & Coach) */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 mt-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  audioSettings.voiceEnabled
                    ? 'bg-red-600/15 text-red-600 dark:text-red-400'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                }`}
              >
                {audioSettings.voiceEnabled ? <Mic className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {lang === 'cs'
                    ? 'Hlasové povely startéra'
                    : lang === 'de'
                    ? 'Sprachkommandos beim Start'
                    : 'Starter voice commands'}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {lang === 'cs'
                    ? '„At your marks“ a „Ready“ před startovním pípáním'
                    : '“At your marks” and “Ready” before countdown beeps'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleVoiceToggle}
              aria-pressed={audioSettings.voiceEnabled}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                audioSettings.voiceEnabled
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
              }`}
            >
              {audioSettings.voiceEnabled
                ? lang === 'cs'
                  ? 'Zapnuto'
                  : 'On'
                : lang === 'cs'
                ? 'Vypnuto'
                : 'Off'}
            </button>
          </div>
        </div>

        {/* 3B. Video & Background Export Presets */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
            <Video className="w-3.5 h-3.5 text-red-600" />
            <span>{lang === 'cs' ? 'Video a ukládání na pozadí' : 'Video & Background Export'}</span>
          </label>

          {/* Toggle recording on run */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-600 dark:text-slate-300 font-semibold">
              {lang === 'cs' ? 'Nahrávat video při výlezu' : 'Record video on climb'}
            </span>
            <button
              type="button"
              onClick={() => updateAppSetting('recordVideoOnRun', !localAppSettings.recordVideoOnRun)}
              className={`min-h-[34px] px-3 py-1 rounded-xl font-bold border transition-all ${
                localAppSettings.recordVideoOnRun
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
              }`}
            >
              {localAppSettings.recordVideoOnRun ? 'Zapnuto' : 'Vypnuto'}
            </button>
          </div>

          {/* Time overlay mode inside saved video */}
          <div className="space-y-1">
            <span className="text-[11px] text-slate-500 font-semibold block">
              {lang === 'cs' ? 'Zobrazení času v uloženém videu:' : 'Time overlay in saved video:'}
            </span>
            <div className="grid grid-cols-3 gap-1.5 text-[11px] font-bold">
              {(
                [
                  { id: 'running', label: 'Běžící čas' },
                  { id: 'final', label: 'Jen výsledný čas' },
                  { id: 'none', label: 'Bez času (ihned)' },
                ] as { id: VideoTimeOverlayMode; label: string }[]
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => updateAppSetting('videoTimeMode', m.id)}
                  className={`min-h-[38px] px-2 py-1.5 rounded-xl border transition-all ${
                    localAppSettings.videoTimeMode === m.id
                      ? 'bg-red-600 text-white border-red-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* FPS & Pre/Post-roll margins */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-500">Snímkování:</span>
              <div className="flex items-center gap-1">
                {([60, 30] as (60 | 30)[]).map((fps) => (
                  <button
                    key={fps}
                    type="button"
                    onClick={() => updateAppSetting('videoFps', fps)}
                    className={`px-2.5 py-1 rounded-lg font-mono font-bold transition-all ${
                      localAppSettings.videoFps === fps
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {fps} FPS
                  </button>
                ))}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-500">Okraj ±s:</span>
              <div className="flex items-center gap-1">
                {([3, 1, 0] as (3 | 1 | 0)[]).map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => updateAppSetting('videoTrimMarginSec', sec)}
                    className={`px-2 py-1 rounded-lg font-mono font-bold transition-all ${
                      localAppSettings.videoTrimMarginSec === sec
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {sec === 0 ? '0s' : `±${sec}s`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* AI dots in video + Auto-save toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => updateAppSetting('includePoseInVideo', !localAppSettings.includePoseInVideo)}
              className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all ${
                localAppSettings.includePoseInVideo
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold'
              }`}
            >
              <span className="text-[11px]">AI body (ruka/tělo/noha)</span>
              <span className="text-[10px] font-black">{localAppSettings.includePoseInVideo ? 'ZAP' : 'VYP'}</span>
            </button>

            <button
              type="button"
              onClick={() => updateAppSetting('autoSaveVideoOnFinish', !localAppSettings.autoSaveVideoOnFinish)}
              className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all ${
                localAppSettings.autoSaveVideoOnFinish
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold'
              }`}
            >
              <span className="text-[11px]">Auto-uložit po doběhu</span>
              <span className="text-[10px] font-black">{localAppSettings.autoSaveVideoOnFinish ? 'ZAP' : 'VYP'}</span>
            </button>
          </div>
        </div>

        {/* 3C. AI Camera, Start Mode & Display Presets */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
            <Camera className="w-3.5 h-3.5 text-red-600" />
            <span>{lang === 'cs' ? 'AI Kamera a rozhraní' : 'AI Camera & Display'}</span>
          </label>

          {/* Default start mode */}
          <div className="space-y-1">
            <span className="text-[11px] text-slate-500 font-semibold block">Výchozí režim startu:</span>
            <div className="grid grid-cols-4 gap-1 text-[11px] font-bold">
              {(
                [
                  { id: 'manual', label: 'Ruční' },
                  { id: 'ifsc_countdown', label: 'Pípnutí' },
                  { id: 'camera_motion', label: 'AI Kamera' },
                  { id: 'sound_trigger', label: 'AI Zvuk' },
                ] as { id: DefaultStartMode; label: string }[]
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => updateAppSetting('defaultStartMode', m.id)}
                  className={`min-h-[36px] px-1.5 py-1 rounded-xl border transition-all ${
                    localAppSettings.defaultStartMode === m.id
                      ? 'bg-red-600 text-white border-red-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sensitivity + Camera Fit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-500">Citlivost AI:</span>
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: 'low', label: 'Níz.' },
                    { id: 'medium', label: 'Stř.' },
                    { id: 'high', label: 'Vys.' },
                  ] as { id: AiSensitivityPreset; label: string }[]
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => updateAppSetting('sensitivityPreset', s.id)}
                    className={`px-2 py-1 rounded-lg font-bold transition-all ${
                      localAppSettings.sensitivityPreset === s.id
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-500">Hledáček:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => updateAppSetting('cameraFit', 'contain')}
                  className={`px-2 py-1 rounded-lg font-bold transition-all ${
                    localAppSettings.cameraFit === 'contain'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Celý ↕
                </button>
                <button
                  type="button"
                  onClick={() => updateAppSetting('cameraFit', 'cover')}
                  className={`px-2 py-1 rounded-lg font-bold transition-all ${
                    localAppSettings.cameraFit === 'cover'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Výplň
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => updateAppSetting('ifscStartWithCamera', !localAppSettings.ifscStartWithCamera)}
              className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all ${
                localAppSettings.ifscStartWithCamera
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-500 text-amber-700 dark:text-amber-300 font-bold'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold'
              }`}
            >
              <span className="text-[11px]">IFSC start v AI kameře</span>
              <span className="text-[10px] font-black">{localAppSettings.ifscStartWithCamera ? 'ZAP' : 'VYP'}</span>
            </button>

            <button
              type="button"
              onClick={() => updateAppSetting('showGuides', !localAppSettings.showGuides)}
              className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all ${
                localAppSettings.showGuides
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold'
              }`}
            >
              <span className="text-[11px]">Vodicí linie stěny</span>
              <span className="text-[10px] font-black">{localAppSettings.showGuides ? 'ZAP' : 'VYP'}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                updateAppSetting(
                  'defaultFacingMode',
                  localAppSettings.defaultFacingMode === 'environment' ? 'user' : 'environment'
                )
              }
              className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-left flex items-center justify-between gap-2"
            >
              <span className="text-[11px]">Výchozí kamera</span>
              <span className="text-[10px] font-black">
                {localAppSettings.defaultFacingMode === 'environment' ? 'Zadní' : 'Přední'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => updateAppSetting('showTimerHints', !localAppSettings.showTimerHints)}
              className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all ${
                localAppSettings.showTimerHints
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-bold'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 font-semibold'
              }`}
            >
              <span className="text-[11px]">Nápověda pod kamerou</span>
              <span className="text-[10px] font-black">{localAppSettings.showTimerHints ? 'ZAP' : 'VYP'}</span>
            </button>
          </div>
        </div>

        {/* 4. Quick Actions Hub */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => {
              onClose();
              onOpenAuth();
            }}
            className="p-2.5 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 text-center transition-colors flex items-center justify-center gap-2"
          >
            <Users className="w-4 h-4 text-red-500" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              {lang === 'cs'
                ? 'Přepnout / Přidat lezce'
                : lang === 'de'
                ? 'Kletterer wechseln'
                : 'Switch / Add climber'}
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenLegal();
            }}
            className="p-2.5 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 text-center transition-colors flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4 text-emerald-500" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              {lang === 'cs'
                ? 'Pravidla a licence'
                : lang === 'de'
                ? 'Rechtliches & DSGVO'
                : 'Rules & Privacy'}
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            {lang === 'cs' ? 'Zavřít' : lang === 'de' ? 'Schließen' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

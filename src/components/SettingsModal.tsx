import React, { useState } from 'react';
import { Volume2, VolumeX, Moon, Sun, Globe, Shield, Play, Check, Users, Mic } from 'lucide-react';
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

import { UserProfile, getUserProfile } from '../utils/storage';

interface SettingsModalProps {
  onClose: () => void;
  lang: Language;
  onSelectLang: (lang: Language) => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  onOpenLegal: () => void;
  onOpenAuth: () => void;
  userProfile?: UserProfile;
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
}) => {
  const [profile] = useState<UserProfile>(userProfile || getUserProfile);
  const [audioSettings, setAudioSettings] = useState(getStoredAudioSettings());
  const [isPlayingTest, setIsPlayingTest] = useState(false);

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

        {/* 0. Athlete Profile & Nationality Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-600/10 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-lg border border-red-500/20">
              {profile.flagEmoji || '🇨🇿'}
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{profile.name || (lang === 'cs' ? 'Nenastavený profil lezce' : 'Profile not set')}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {profile.nationalityCode || 'CZE'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
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
            {profile.isAuthenticated ? 'Upravit profil' : 'Přihlásit se'}
          </button>
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
              <span>Tmavý</span>
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
              <span>Světlý</span>
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
              <span>{isPlayingTest ? 'Přehrávám...' : 'Test zvuku'}</span>
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
            <div className="text-xs font-bold text-slate-900 dark:text-white">Přepnout / Přidat lezce</div>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenLegal();
            }}
            className="p-2.5 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 text-center transition-colors flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4 text-emerald-500" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">Pravidla a licence</div>
          </button>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );
};

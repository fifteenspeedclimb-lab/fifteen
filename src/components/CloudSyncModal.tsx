import React, { useState } from 'react';
import { Cloud, Lock, CheckCircle2, ShieldCheck, HardDrive, Smartphone, AlertCircle, LogOut } from 'lucide-react';
import { CloudStorageConfig } from '../types/climbing';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { getUserProfile } from '../utils/storage';

interface CloudSyncModalProps {
  onClose: () => void;
  lang: Language;
}

const STORAGE_CONFIG_KEY = 'fifteen_cloud_config_v1';

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ onClose, lang }) => {
  const t = TRANSLATIONS[lang];
  const profile = getUserProfile();

  // Load saved config or defaults
  const [config, setConfig] = useState<CloudStorageConfig>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.userName === 'Alex Novák' || parsed.userEmail === 'fifteen.speedclimb@gmail.com') {
          parsed.userName = profile.name || undefined;
          parsed.userEmail = profile.email || undefined;
          parsed.isSignedIn = !!profile.email;
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    return {
      provider: 'gdrive',
      isSignedIn: !!profile.email,
      userEmail: profile.email || undefined,
      userName: profile.name || undefined,
      autoUpload: true,
      targetFolder: 'Fifteen_Climbs_15m',
      parentalConsentApproved: true,
    };
  });

  const [simulatingAuth, setSimulatingAuth] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const saveConfig = (newCfg: CloudStorageConfig) => {
    setConfig(newCfg);
    try {
      localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(newCfg));
    } catch {
      // ignore
    }
  };

  const handleSignIn = (provider: 'gdrive' | 'onedrive') => {
    setSimulatingAuth(true);
    setFeedbackMsg(null);

    setTimeout(() => {
      const currentProf = getUserProfile();
      const updated: CloudStorageConfig = {
        ...config,
        provider,
        isSignedIn: true,
        userEmail: currentProf.email || 'athlete@climbing.cz',
        userName: currentProf.name || (lang === 'cs' ? 'Můj profil' : 'My Profile'),
      };
      saveConfig(updated);
      setSimulatingAuth(false);
      setFeedbackMsg(
        lang === 'cs'
          ? `Úspěšně propojeno s ${provider === 'gdrive' ? 'Google Drive' : 'OneDrive'} do složky /${updated.targetFolder}!`
          : `Successfully connected to ${provider === 'gdrive' ? 'Google Drive' : 'OneDrive'}!`
      );
    }, 900);
  };

  const handleSignOut = () => {
    const updated: CloudStorageConfig = {
      ...config,
      isSignedIn: false,
      userEmail: undefined,
      userName: undefined,
    };
    saveConfig(updated);
    setFeedbackMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Cloud className="w-6 h-6 text-red-600" />
            <div>
              <h2 className="font-display font-black text-lg sm:text-xl text-slate-950 dark:text-white">
                {t.cloudTitle}
              </h2>
              <span className="text-[11px] text-slate-500">Zabezpečená synchronizace videí</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* User Account Login Status */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
              {config.isSignedIn ? 'AN' : '?'}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {config.isSignedIn ? config.userName : 'Nepřihlášený uživatel'}
              </div>
              <div className="text-[11px] text-slate-500">
                {config.isSignedIn ? config.userEmail : 'Pro zálohu videí je vyžadováno přihlášení'}
              </div>
            </div>
          </div>

          {config.isSignedIn ? (
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t.signOut}</span>
            </button>
          ) : (
            <button
              onClick={() => handleSignIn('gdrive')}
              disabled={simulatingAuth}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              {simulatingAuth ? 'Připojuji...' : t.signIn}
            </button>
          )}
        </div>

        {feedbackMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Cloud Providers Selection */}
        <div className="space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
            Cílové bezpečné úložiště
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Google Drive */}
            <button
              onClick={() => handleSignIn('gdrive')}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                config.provider === 'gdrive' && config.isSignedIn
                  ? 'bg-red-50/70 dark:bg-red-950/30 border-red-500 ring-2 ring-red-500/20'
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 dark:text-white">
                  Google Drive
                </span>
                {config.provider === 'gdrive' && config.isSignedIn && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Složka: /{config.targetFolder}
              </p>
            </button>

            {/* Microsoft OneDrive */}
            <button
              onClick={() => handleSignIn('onedrive')}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                config.provider === 'onedrive' && config.isSignedIn
                  ? 'bg-red-50/70 dark:bg-red-950/30 border-red-500 ring-2 ring-red-500/20'
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 dark:text-white">
                  OneDrive
                </span>
                {config.provider === 'onedrive' && config.isSignedIn && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Složka: /Fifteen_Speed
              </p>
            </button>

            {/* Encrypted Local Vault */}
            <button
              onClick={() => {
                const updated: CloudStorageConfig = { ...config, provider: 'local_vault' };
                saveConfig(updated);
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                config.provider === 'local_vault'
                  ? 'bg-red-50/70 dark:bg-red-950/30 border-red-500 ring-2 ring-red-500/20'
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 dark:text-white">
                  Lokální Vault
                </span>
                {config.provider === 'local_vault' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Šifrovaná offline paměť
              </p>
            </button>
          </div>
        </div>

        {/* Sync Settings */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoUpload}
              onChange={(e) => saveConfig({ ...config, autoUpload: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded text-red-600 accent-red-600"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-900 dark:text-white block">
                {t.autoUploadVideos}
              </span>
              <span className="text-slate-500 text-[11px]">
                Po doteku cílového senzoru se video automaticky nahraje do vaší privátní složky.
              </span>
            </div>
          </label>

          {/* Parental consent check for minors U13 & U15 */}
          <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-slate-200 dark:border-slate-800">
            <input
              type="checkbox"
              checked={config.parentalConsentApproved}
              onChange={(e) => saveConfig({ ...config, parentalConsentApproved: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded text-red-600 accent-red-600"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-900 dark:text-white block flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Souhlas zákonného zástupce (povinné pro děti do 15 let)</span>
              </span>
              <span className="text-slate-500 text-[11px] leading-relaxed block mt-0.5">
                Potvrzuji, že jako rodič / trenér s pověřením uděluji souhlas s pořizováním videozáznamů a biomechanické analýzy mého dítěte.
              </span>
            </div>
          </label>
        </div>

        {/* Legal Security Architecture Note */}
        <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-2xl text-[11px] text-blue-900 dark:text-blue-300 leading-relaxed flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong>Právní architektura úložiště:</strong> Aplikace Fifteen ukládá videa přímo do vaší soukromé složky na Google Drive / OneDrive přes autorizační rozsah <code>drive.file</code>. Aplikace nemá přístup k vašim ostatním souborům a žádná videa se neukládají na centrální veřejný server.
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="min-h-[44px] px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            Uložit a zavřít
          </button>
        </div>
      </div>
    </div>
  );
};

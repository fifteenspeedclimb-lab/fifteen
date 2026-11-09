import React, { useState } from 'react';
import { Smartphone, QrCode, Copy, Check, ExternalLink, Camera, Wifi, Volume2, Shield } from 'lucide-react';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface PhoneQrModalProps {
  onClose: () => void;
  lang: Language;
}

export const PhoneQrModal: React.FC<PhoneQrModalProps> = ({ onClose, lang }) => {
  const t = TRANSLATIONS[lang];
  const [copied, setCopied] = useState(false);

  // App URL for phone testing: prefers shared app URL, fallback to current origin
  const appUrl =
    typeof window !== 'undefined'
      ? (window.location.origin.includes('localhost')
          ? 'https://ais-pre-s3efmh5no4ttepcjve65p2-602450368606.europe-west2.run.app'
          : window.location.origin)
      : 'https://ais-pre-s3efmh5no4ttepcjve65p2-602450368606.europe-west2.run.app';

  // SVG QR Code generator via quickchart.io QR API or pure encoded SVG
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(appUrl)}&color=090d16&bgcolor=ffffff&qzone=1`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-red-600" />
            <div>
              <h2 className="font-display font-black text-lg text-slate-950 dark:text-white">
                {t.phoneModalTitle}
              </h2>
              <span className="text-[11px] text-slate-500">
                {lang === 'cs'
                  ? 'Plná podpora pro iOS (Safari) i Android (Chrome)'
                  : lang === 'de'
                  ? 'Optimiert für iOS (Safari) und Android (Chrome)'
                  : 'Optimized for iOS (Safari) and Android (Chrome)'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Zavřít"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* QR Code and Quick Link */}
        <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="bg-white p-2.5 rounded-xl border border-slate-300 shadow-sm shrink-0">
            <img
              src={qrCodeUrl}
              alt="QR Code pro telefon"
              className="w-36 h-36 object-contain"
              loading="eager"
            />
          </div>

          <div className="space-y-2.5 flex-1 w-full text-center sm:text-left">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {lang === 'cs'
                ? 'Namiřte fotoaparát mobilu na tento QR kód'
                : lang === 'de'
                ? 'Handy-Kamera auf den QR-Code richten'
                : 'Point your phone camera at this QR code'}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {lang === 'cs'
                ? 'Otevře se přímo ostrá mobilní verze se stopkami a kamerou.'
                : lang === 'de'
                ? 'Öffnet direkt die mobile Stoppuhr mit KI-Kamera.'
                : 'Instantly opens the mobile chrono app with AI camera.'}
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={appUrl}
                className="w-full text-[11px] font-mono px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 truncate"
              />
              <button
                onClick={copyToClipboard}
                title="Kopírovat odkaz"
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shrink-0 transition-colors flex items-center gap-1 active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? (lang === 'cs' ? 'Zkopírováno' : 'Copied') : (lang === 'cs' ? 'Kopírovat' : 'Copy')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Practical steps for speed climbing at the wall */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            {lang === 'cs'
              ? 'Doporučené nastavení u stěny'
              : lang === 'de'
              ? 'Empfohlenes Setup an der Wand'
              : 'Recommended Wall Setup'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                <Camera className="w-4 h-4 text-red-600" />
                <span>1. Povolte kameru & mikrofon</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                {lang === 'cs'
                  ? 'Prohlížeč požádá o povolení – umožní optické měření startu a cíle.'
                  : lang === 'de'
                  ? 'Browser-Berechtigung für optische Start/Ziel-Erkennung erteilen.'
                  : 'Grant browser permissions for automatic start/finish detection.'}
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                <Smartphone className="w-4 h-4 text-amber-500" />
                <span>2. Instalace na mobil & APK</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                {lang === 'cs'
                  ? 'V Chrome klepněte na 3 tečky → „Nainstalovat aplikaci“ (funguje okamžitě jako nativní APK). Pro samostatný instalační soubor .apk vložte odkaz do pwabuilder.com.'
                  : 'In Chrome tap 3 dots → “Install app” (acts like native APK). For standalone .apk file, use pwabuilder.com.'}
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-950 dark:text-white">
                <Volume2 className="w-4 h-4 text-emerald-500" />
                <span>3. Zvuk a sluchátka</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                {lang === 'cs'
                  ? 'Zapněte hlasitost pro oficiální IFSC tóny nebo nasaďte bezdrátová sluchátka pro Ghost režim.'
                  : lang === 'de'
                  ? 'Lautstärke für IFSC-Pieptöne oder Kopfhörer für Ghost-Pacer.'
                  : 'Turn up volume for IFSC start beeps or use earbuds for Ghost pacer.'}
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-950 dark:text-white">
                <Shield className="w-4 h-4 text-blue-500" />
                <span>4. Poloha telefonu</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                {lang === 'cs'
                  ? 'Opřete telefon o batoh nebo žíněnku 2–3 metry od stěny tak, aby zabíral startovní zónu.'
                  : lang === 'de'
                  ? 'Handy 2–3 m vor die Wand stellen mit Sicht auf den Startbereich.'
                  : 'Prop phone 2–3m away facing the start pad.'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 rounded-xl text-xs font-bold transition-all"
          >
            {lang === 'cs' ? 'Rozumím' : lang === 'de' ? 'Verstanden' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
};

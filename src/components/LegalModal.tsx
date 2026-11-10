import React from 'react';
import { Shield, ShieldAlert, CheckCircle2, Lock, Scale, FileText, AlertTriangle } from 'lucide-react';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { FifteenAppIcon } from './FifteenLogo';

interface LegalModalProps {
  onClose: () => void;
  lang: Language;
}

export const LegalModal: React.FC<LegalModalProps> = ({ onClose, lang }) => {
  const t = TRANSLATIONS[lang];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-5 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <FifteenAppIcon size="sm" className="w-8 h-8 rounded-xl shadow-sm" />
            <div>
              <h2 className="font-display font-black text-lg sm:text-xl text-slate-950 dark:text-white">
                {t.legalTitle}
              </h2>
              <span className="text-[11px] text-slate-500">Právní analýza a regulatorní rámec · Fifteen</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Executive summary banner */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <p className="font-semibold text-slate-900 dark:text-white mb-1">
            Právní audit pro aplikaci Fifteen (provoz v ČR a EU):
          </p>
          Tato analýza shrnuje veškeré zákonné povinnosti vyplývající z <strong>GDPR (Nařízení EU 2016/679)</strong>, <strong>zákona č. 110/2019 Sb. o zpracování osobních údajů</strong>, směrnice <strong>ePrivacy</strong> a pravidel mezinárodní federace <strong>IFSC</strong> pro nahrávání sportovních videí a zpracování dat mládeže.
        </div>

        {/* Section 1: Children & Minors U13/U15 */}
        <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <h3 className="font-display font-bold text-sm text-slate-950 dark:text-white">
              {t.parentalConsentTitle}
            </h3>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {t.parentalConsentDesc}
          </p>
          <div className="pt-2 text-[11px] text-amber-900 dark:text-amber-300 font-medium">
            ✓ <strong>Zavedené opatření v aplikaci Fifteen:</strong> U kategorií Děti U13 a U15 je vyžadováno zaškrtnutí rodičovského souhlasu. Videa dětí nejsou bez souhlasu rodičů sdílena na veřejných žebříčcích.
          </div>
        </div>

        {/* Section 2: On-device Edge Computing (Camera & AI) */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-600 shrink-0" />
            <h3 className="font-display font-bold text-sm text-slate-950 dark:text-white">
              {t.biometricsTitle}
            </h3>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {t.biometricsDesc}
          </p>
          <div className="pt-1 text-[11px] text-slate-500">
            ✓ <strong>Zásada minimalizace údajů (čl. 5 GDPR):</strong> Zpracovává se pouze optická změna pixelů v zónách startu a cíle bez ukládání biometrických šablon obličeje.
          </div>
        </div>

        {/* Section 3: Cloud Storage Legal Model */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600 shrink-0" />
            <h3 className="font-display font-bold text-sm text-slate-950 dark:text-white">
              {t.cloudLegalTitle}
            </h3>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {t.cloudLegalDesc}
          </p>
          <div className="pt-1 text-[11px] text-slate-500">
            ✓ <strong>OAuth 2.0 delegované úložiště:</strong> Uživatel je přímým vlastníkem svého Google Drive nebo OneDrive účtu. Aplikace Fifteen nevystupuje jako centrální datové úložiště videí.
          </div>
        </div>

        {/* Section 4: Public Gym Filming & GDPR */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0" />
            <h3 className="font-display font-bold text-sm text-slate-950 dark:text-white">
              Natáčení v prostorách lezeckých center
            </h3>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            Při umístění mobilu nebo tabletu na lezeckou stěnu (např. Big Wall Praha, Vertikon Zlín, HUDY Brno) je nutné respektovat provozní řád lezeckého centra. Úhel kamery je doporučeno směřovat výhradně vzhůru na vlastní lezeckou dráhu 15 m (nebo 10 m), aby nedocházelo k natáčení nezúčastněných osob v hale.
          </p>
        </div>

        {/* Section 5: Sports Safety Disclaimer */}
        <div className="p-4 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <h3 className="font-display font-bold text-sm text-slate-950 dark:text-white">
              {t.disclaimerTitle}
            </h3>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {t.disclaimerDesc}
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="min-h-[44px] px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            Rozumím a souhlasím
          </button>
        </div>
      </div>
    </div>
  );
};

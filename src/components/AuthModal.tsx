import React, { useState } from 'react';
import {
  User,
  Mail,
  Lock,
  Globe,
  MapPin,
  Trophy,
  Check,
  LogOut,
  Trash2,
  ShieldCheck,
  Flame,
  Award
} from 'lucide-react';
import { SPEED_COUNTRIES, CountryOption, getCountryByCode } from '../data/countries';
import {
  UserProfile,
  getUserProfile,
  saveUserProfile,
  loginUserProfile,
  logoutUserProfile,
  clearAllRuns
} from '../utils/storage';
import { SpeedRun } from '../types/climbing';
import { Language } from '../utils/i18n';
import { FifteenAppIcon } from './FifteenLogo';

interface AuthModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onProfileUpdated: (profile: UserProfile) => void;
  onRunsChanged: (runs: SpeedRun[]) => void;
  lang?: Language;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen = true,
  onClose,
  onProfileUpdated,
  onRunsChanged,
  lang = 'cs',
}) => {
  const [profile, setProfile] = useState<UserProfile>(getUserProfile);
  const [activeTab, setActiveTab] = useState<'profile' | 'login'>('profile');

  // Form states initialized with current profile (or blank for new users)
  const [nameInput, setNameInput] = useState<string>(profile.name || '');
  const [emailInput, setEmailInput] = useState<string>(profile.email || '');
  const [homeGymInput, setHomeGymInput] = useState<string>(profile.homeGym || '');
  const [nationalityCode, setNationalityCode] = useState<string>(profile.nationalityCode || 'CZE');
  const [genderInput, setGenderInput] = useState<'men' | 'women'>(profile.gender || 'men');
  const [personalBestInput, setPersonalBestInput] = useState<string>(
    profile.personalBest && profile.personalBest > 0 ? profile.personalBest.toFixed(3) : ''
  );
  const [targetGoalInput, setTargetGoalInput] = useState<string>(
    profile.targetGoal ? profile.targetGoal.toFixed(3) : '5.500'
  );
  const [favoriteBeta, setFavoriteBeta] = useState<'standard' | 'tomoa-skip' | 'modern-dyno' | 'youth-flow'>(
    profile.favoriteBeta || 'standard'
  );

  // Quick Google Sign-In state
  const [googleEmailInput, setGoogleEmailInput] = useState<string>('');
  const [showGoogleInput, setShowGoogleInput] = useState<boolean>(false);

  // Confirmation modals
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const country = getCountryByCode(nationalityCode);
    const pbNum = parseFloat(personalBestInput);
    const goalNum = parseFloat(targetGoalInput);

    const updated: UserProfile = {
      ...profile,
      name: nameInput.trim() || (lang === 'cs' ? 'Můj profil' : 'My Profile'),
      email: emailInput.trim(),
      homeGym: homeGymInput.trim(),
      nationality: country.nameCs,
      nationalityCode: country.code,
      flagEmoji: country.flag,
      gender: genderInput,
      personalBest: !isNaN(pbNum) && pbNum > 0 ? pbNum : 0,
      targetGoal: !isNaN(goalNum) && goalNum > 0 ? goalNum : 5.500,
      favoriteBeta: favoriteBeta,
      isAuthenticated: true,
      isDemoUser: false,
    };

    saveUserProfile(updated);
    setProfile(updated);
    onProfileUpdated(updated);
    showToast(lang === 'cs' ? 'Profil lezce byl úspěšně uložen!' : 'Profile saved successfully!');
  };

  const handleGoogleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetEmail = (googleEmailInput || emailInput).trim();
    if (!targetEmail) {
      setShowGoogleInput(true);
      return;
    }

    const country = getCountryByCode(nationalityCode || 'CZE');
    const athleteName = nameInput.trim() || targetEmail.split('@')[0];

    const logged = loginUserProfile({
      name: athleteName,
      email: targetEmail,
      nationality: country.nameCs,
      nationalityCode: country.code,
      flagEmoji: country.flag,
      isDemoUser: false,
    });

    setProfile(logged);
    setEmailInput(targetEmail);
    if (!nameInput.trim()) setNameInput(athleteName);
    onProfileUpdated(logged);
    setShowGoogleInput(false);
    showToast(lang === 'cs' ? `Přihlášen přes Google: ${targetEmail}` : `Signed in via Google: ${targetEmail}`);
  };

  const handleLogout = () => {
    const loggedOut = logoutUserProfile();
    setProfile(loggedOut);
    onProfileUpdated(loggedOut);
    showToast(lang === 'cs' ? 'Byl jste úspěšně odhlášen' : 'Successfully logged out');
  };

  const handleClearAllRuns = () => {
    const empty = clearAllRuns();
    onRunsChanged(empty);
    setConfirmDeleteAll(false);
    showToast(lang === 'cs' ? 'Všechny výkony byly smazány.' : 'All recorded runs cleared.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <FifteenAppIcon size="sm" className="w-9 h-9 rounded-xl shadow-md" />
            <div>
              <h2 className="font-display font-black text-xl text-slate-950 dark:text-white leading-tight flex items-center gap-2">
                <span>{profile.name ? profile.name : 'Profil závodníka'}</span>
                {profile.flagEmoji && <span className="text-lg">{profile.flagEmoji}</span>}
              </h2>
              <span className="text-xs text-slate-500">
                {profile.isAuthenticated && profile.email
                  ? `Přihlášen účtem: ${profile.email}`
                  : profile.name
                  ? `Nastavený profil: ${profile.name}`
                  : 'Nastavení vlastního profilu a účtu lezce'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Zavřít"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white text-base font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher: Profil vs Přihlášení */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5 text-red-600" />
            <span>Údaje lezce & Národnost</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('login')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Účet & Přihlášení</span>
          </button>
        </div>

        {/* TAB 1: Nastavení profilu lezce */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Jméno a příjmení */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-red-600" />
                  <span>Jméno a příjmení</span>
                </label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="např. Jakub Sýkora"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-red-500/20"
                />
              </div>

              {/* Vlastní E-mail */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-blue-500" />
                  <span>Váš e-mail</span>
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="vas.email@domena.cz"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono text-[11px] focus:ring-2 focus:ring-red-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Národnost s vlajkami */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Národnost / Stát</span>
                </label>
                <select
                  value={nationalityCode}
                  onChange={(e) => setNationalityCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold"
                >
                  {SPEED_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.nameCs} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Pohlaví */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kategorie
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGenderInput('men')}
                    className={`py-2 rounded-xl font-bold border transition-colors ${
                      genderInput === 'men'
                        ? 'bg-red-600 text-white border-red-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Muži
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenderInput('women')}
                    className={`py-2 rounded-xl font-bold border transition-colors ${
                      genderInput === 'women'
                        ? 'bg-red-600 text-white border-red-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Ženy
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Domovská lezecká stěna */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-500" />
                  <span>Domácí lezecká stěna</span>
                </label>
                <input
                  type="text"
                  value={homeGymInput}
                  onChange={(e) => setHomeGymInput(e.target.value)}
                  placeholder="např. Big Wall Praha, HUDY Brno..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              {/* Cílový čas */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>Cílový čas na 15 m (s)</span>
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="3.0"
                  max="20.0"
                  value={targetGoalInput}
                  onChange={(e) => setTargetGoalInput(e.target.value)}
                  placeholder="5.200"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Osobní rekord */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-red-500" />
                  <span>Výchozí osobní rekord PB (s)</span>
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="3.0"
                  max="30.0"
                  value={personalBestInput}
                  onChange={(e) => setPersonalBestInput(e.target.value)}
                  placeholder="Automaticky z měření"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                />
              </div>

              {/* Oblíbená technika / beta */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>Preferovaná beta výlezu</span>
                </label>
                <select
                  value={favoriteBeta}
                  onChange={(e) => setFavoriteBeta(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  <option value="standard">Standardní IFSC beta</option>
                  <option value="tomoa-skip">Tomoa Narasaki Skip</option>
                  <option value="modern-dyno">Moderní dynamický styl</option>
                  <option value="youth-flow">Mládežnický plynulý styl</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 text-xs"
              >
                <Check className="w-4 h-4" />
                <span>Uložit profil lezce</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: Přihlášení jakýmkoli vlastním účtem */}
        {activeTab === 'login' && (
          <div className="space-y-4 text-xs">
            {profile.isAuthenticated && profile.email ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                    {profile.flagEmoji || '🧗'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Aktivní přihlášený účet</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {profile.name}
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono">
                      {profile.email}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-red-600 border border-slate-200 dark:border-slate-800 text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Odhlásit</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Přihlaste se se svým účtem
                </div>
                <p className="text-[11px] text-slate-500">
                  Zadejte jakýkoli svůj e-mail nebo Google účet pro synchronizaci naměřených časů a profilu.
                </p>

                {/* Google Sign In option */}
                <div className="space-y-2">
                  {showGoogleInput ? (
                    <form onSubmit={handleGoogleLogin} className="space-y-2">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Zadejte svůj Google e-mail:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          required
                          value={googleEmailInput}
                          onChange={(e) => setGoogleEmailInput(e.target.value)}
                          placeholder="vas-ucet@gmail.com"
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs"
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-sm"
                        >
                          Přihlásit
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowGoogleInput(true)}
                      className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2.5 shadow-sm transition-all"
                    >
                      {/* Google G SVG */}
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Přihlásit se přes Google účet</span>
                    </button>
                  )}
                </div>

                <div className="relative text-center my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                  </div>
                  <span className="relative px-2 bg-slate-50 dark:bg-slate-950 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    nebo přímé zadání profilu
                  </span>
                </div>

                <p className="text-[11px] text-slate-500">
                  Můžete také přejít na záložku <strong>„Údaje lezce & Národnost“</strong>, vyplnit své jméno a e-mail a kliknout na Uložit.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Správa celé historie naměřených časů */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Správa dat aplikace
          </div>

          {confirmDeleteAll ? (
            <div className="p-3 bg-red-50 dark:bg-red-950/60 rounded-2xl border border-red-200 dark:border-red-900 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-bold">
              <span className="text-[11px] text-red-600 dark:text-red-300">
                Opravdu si přejete smazat celou historii časů?
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearAllRuns}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Ano, smazat vše
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteAll(false)}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs"
                >
                  Zrušit
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDeleteAll(true)}
              className="w-full p-2.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>Vymazat celou historii pokusů</span>
            </button>
          )}
        </div>

        {/* Toast notification */}
        {toastMessage && (
          <div className="p-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-center text-xs font-bold shadow-lg animate-in fade-in">
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
};

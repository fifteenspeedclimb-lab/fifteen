import React, { useState } from 'react';
import {
  User,
  Users,
  Plus,
  Check,
  Trash2,
  Trophy,
  MapPin,
  Flame,
  Award,
  Globe,
  X,
  Edit2
} from 'lucide-react';
import { SPEED_COUNTRIES, getCountryByCode } from '../data/countries';
import {
  UserProfile,
  getAllProfiles,
  getUserProfile,
  saveUserProfile,
  setActiveProfileId,
  createProfile,
  deleteProfile,
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

const AVATAR_COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen = true,
  onClose,
  onProfileUpdated,
  onRunsChanged,
  lang = 'cs',
}) => {
  const [profiles, setProfiles] = useState<UserProfile[]>(getAllProfiles);
  const [activeProfile, setActiveProfile] = useState<UserProfile>(getUserProfile);

  // Tab: 'switcher' (seznam lezců) | 'edit' (úprava aktivního profilu) | 'create' (přidání nového lezce)
  const [viewMode, setViewMode] = useState<'switcher' | 'edit' | 'create'>('switcher');

  // Form states for creating / editing
  const [nameInput, setNameInput] = useState<string>(activeProfile.name || '');
  const [emailInput, setEmailInput] = useState<string>(activeProfile.email || '');
  const [homeGymInput, setHomeGymInput] = useState<string>(activeProfile.homeGym || '');
  const [nationalityCode, setNationalityCode] = useState<string>(activeProfile.nationalityCode || 'CZE');
  const [genderInput, setGenderInput] = useState<'men' | 'women'>(activeProfile.gender || 'men');
  const [personalBestInput, setPersonalBestInput] = useState<string>(
    activeProfile.personalBest && activeProfile.personalBest > 0 ? activeProfile.personalBest.toFixed(3) : ''
  );
  const [targetGoalInput, setTargetGoalInput] = useState<string>(
    activeProfile.targetGoal ? activeProfile.targetGoal.toFixed(3) : '5.500'
  );
  const [favoriteBeta, setFavoriteBeta] = useState<'standard' | 'tomoa-skip' | 'modern-dyno' | 'youth-flow'>(
    activeProfile.favoriteBeta || 'standard'
  );
  const [avatarColor, setAvatarColor] = useState<string>(activeProfile.avatarColor || '#ef4444');

  // Delete confirmations
  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);
  const [confirmClearRuns, setConfirmClearRuns] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  // Open Edit for a specific profile
  const handleStartEdit = (prof: UserProfile) => {
    setNameInput(prof.name);
    setEmailInput(prof.email || '');
    setHomeGymInput(prof.homeGym || '');
    setNationalityCode(prof.nationalityCode || 'CZE');
    setGenderInput(prof.gender || 'men');
    setPersonalBestInput(prof.personalBest > 0 ? prof.personalBest.toFixed(3) : '');
    setTargetGoalInput(prof.targetGoal > 0 ? prof.targetGoal.toFixed(3) : '5.500');
    setFavoriteBeta(prof.favoriteBeta || 'standard');
    setAvatarColor(prof.avatarColor || '#ef4444');
    setViewMode('edit');
  };

  // Switch to another climber profile
  const handleSwitchProfile = (profId: string) => {
    const switched = setActiveProfileId(profId);
    setActiveProfile(switched);
    setProfiles(getAllProfiles());
    onProfileUpdated(switched);
    showToast(
      lang === 'cs'
        ? `Aktivní lezec: ${switched.name}`
        : `Active climber: ${switched.name}`
    );
  };

  // Save changes to active profile
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const country = getCountryByCode(nationalityCode);
    const pbNum = parseFloat(personalBestInput);
    const goalNum = parseFloat(targetGoalInput);

    const updated: UserProfile = {
      ...activeProfile,
      name: nameInput.trim() || `Lezec ${profiles.findIndex((p) => p.id === activeProfile.id) + 1}`,
      email: emailInput.trim(),
      homeGym: homeGymInput.trim(),
      nationality: country.nameCs,
      nationalityCode: country.code,
      flagEmoji: country.flag,
      gender: genderInput,
      personalBest: !isNaN(pbNum) && pbNum > 0 ? pbNum : 0,
      targetGoal: !isNaN(goalNum) && goalNum > 0 ? goalNum : 5.500,
      favoriteBeta,
      avatarColor,
      isAuthenticated: true,
      isDemoUser: false,
    };

    saveUserProfile(updated);
    setActiveProfile(updated);
    setProfiles(getAllProfiles());
    onProfileUpdated(updated);
    setViewMode('switcher');
    showToast(lang === 'cs' ? 'Profil byl úspěšně uložen!' : 'Profile saved successfully!');
  };

  // Create a brand new climber profile
  const handleCreateNewProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const country = getCountryByCode(nationalityCode);
    const pbNum = parseFloat(personalBestInput);
    const goalNum = parseFloat(targetGoalInput);

    const newProfile = createProfile({
      name: nameInput.trim() || `Lezec ${profiles.length + 1}`,
      email: emailInput.trim(),
      homeGym: homeGymInput.trim(),
      nationality: country.nameCs,
      nationalityCode: country.code,
      flagEmoji: country.flag,
      gender: genderInput,
      personalBest: !isNaN(pbNum) && pbNum > 0 ? pbNum : 0,
      targetGoal: !isNaN(goalNum) && goalNum > 0 ? goalNum : 5.500,
      favoriteBeta,
      avatarColor,
    });

    setProfiles(getAllProfiles());
    setActiveProfile(newProfile);
    onProfileUpdated(newProfile);
    setViewMode('switcher');
    showToast(lang === 'cs' ? `Vytvořen nový profil: ${newProfile.name}` : `Created climber: ${newProfile.name}`);
  };

  // Open Create Form
  const handleOpenCreate = () => {
    const nextNum = profiles.length + 1;
    setNameInput(`Lezec ${nextNum}`);
    setEmailInput('');
    setHomeGymInput('');
    setNationalityCode('CZE');
    setGenderInput('men');
    setPersonalBestInput('');
    setTargetGoalInput('5.500');
    setFavoriteBeta('standard');
    setAvatarColor(AVATAR_COLORS[(nextNum - 1) % AVATAR_COLORS.length]);
    setViewMode('create');
  };

  // Delete profile
  const handleDeleteProfile = (profId: string) => {
    const updated = deleteProfile(profId);
    setProfiles(updated);
    const current = getUserProfile();
    setActiveProfile(current);
    onProfileUpdated(current);
    setProfileToDelete(null);
    showToast(lang === 'cs' ? 'Profil byl smazán.' : 'Profile deleted.');
  };

  // Clear runs
  const handleClearRuns = () => {
    const updatedRuns = clearAllRuns();
    onRunsChanged(updatedRuns);
    setConfirmClearRuns(false);
    showToast(lang === 'cs' ? 'Historie pokusů byla vymazána.' : 'All runs cleared.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <FifteenAppIcon size="sm" className="w-8 h-8 rounded-xl shadow-sm" />
            <div>
              <h2 className="font-display font-black text-xl text-slate-950 dark:text-white leading-tight">
                {viewMode === 'create'
                  ? 'Vytvoření nového lezce'
                  : viewMode === 'edit'
                  ? 'Úprava profilu lezce'
                  : 'Profily lezců a přepínač'}
              </h2>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {profiles.length} {profiles.length === 1 ? 'účet' : profiles.length < 5 ? 'účty' : 'účtů'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Zavřít"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white text-base font-bold transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Mode Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setViewMode('switcher')}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              viewMode === 'switcher'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Přepnout lezce</span>
          </button>
          <button
            type="button"
            onClick={() => handleStartEdit(activeProfile)}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              viewMode === 'edit'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Upravit profil</span>
          </button>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold text-center animate-in fade-in">
            {toastMessage}
          </div>
        )}

        {/* MODE 1: PROFILES LIST & SWITCHER */}
        {viewMode === 'switcher' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                Zvolte aktivního lezce pro měření a rozbor:
              </span>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold flex items-center gap-1 text-[11px] shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Nový lezec</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
              {profiles.map((prof) => {
                const isActive = prof.id === activeProfile.id;
                const initials = prof.name
                  ? prof.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : 'L';

                return (
                  <div
                    key={prof.id}
                    onClick={() => handleSwitchProfile(prof.id)}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                      isActive
                        ? 'bg-red-50/70 dark:bg-red-950/30 border-red-500/60 shadow-md ring-1 ring-red-500/30'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar Circle */}
                      <div
                        style={{ backgroundColor: prof.avatarColor || '#ef4444' }}
                        className="w-10 h-10 rounded-2xl text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm"
                      >
                        {initials}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-black text-sm text-slate-900 dark:text-white truncate">
                          <span>{prof.name}</span>
                          <span className="text-base shrink-0">{prof.flagEmoji || '🇨🇿'}</span>
                          {isActive && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-600 text-white shrink-0">
                              Aktivní
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 truncate mt-0.5">
                          <span>{prof.homeGym || 'Stěna nevyplněna'}</span>
                          <span>•</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                            PB: {prof.personalBest > 0 ? `${prof.personalBest.toFixed(2)}s` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          handleSwitchProfile(prof.id);
                          handleStartEdit(prof);
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                        title="Upravit tento profil"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {profiles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setProfileToDelete(prof.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Smazat profil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Confirm Delete Profile Dialog */}
            {profileToDelete && (
              <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 space-y-2 animate-in fade-in">
                <span className="text-xs font-bold text-red-600 dark:text-red-300 block">
                  Opravdu smazat profil {profiles.find((p) => p.id === profileToDelete)?.name}?
                </span>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => handleDeleteProfile(profileToDelete)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
                  >
                    Ano, smazat
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileToDelete(null)}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl"
                  >
                    Zrušit
                  </button>
                </div>
              </div>
            )}

            {/* Clear Runs Section */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500">Historie naměřených časů:</span>
              {confirmClearRuns ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleClearRuns}
                    className="px-2.5 py-1 bg-red-600 text-white rounded-lg font-bold"
                  >
                    Vymazat vše
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearRuns(false)}
                    className="px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300"
                  >
                    Zpět
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearRuns(true)}
                  className="text-slate-400 hover:text-red-600 underline font-medium"
                >
                  Smazat všechny pokusy
                </button>
              )}
            </div>
          </div>
        )}

        {/* MODE 2 & 3: FORM FOR EDIT / CREATE PROFILE */}
        {(viewMode === 'edit' || viewMode === 'create') && (
          <form
            onSubmit={viewMode === 'create' ? handleCreateNewProfile : handleSaveEdit}
            className="space-y-3.5"
          >
            {/* Name & Flag */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Jméno lezce *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="např. Jakub, Adam, Eliška..."
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>
            </div>

            {/* Nationality & Flag Picker */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Národnost a vlajka
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={nationalityCode}
                  onChange={(e) => setNationalityCode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-red-500 outline-none cursor-pointer"
                >
                  {SPEED_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.nameCs} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Avatar Color Picker */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Barva odznaku lezce
              </label>
              <div className="flex items-center gap-2">
                {AVATAR_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setAvatarColor(col)}
                    style={{ backgroundColor: col }}
                    className={`w-7 h-7 rounded-xl transition-all flex items-center justify-center text-white ${
                      avatarColor === col ? 'ring-2 ring-white ring-offset-2 scale-110 shadow-md' : 'opacity-85 hover:opacity-100'
                    }`}
                  >
                    {avatarColor === col && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Home Gym & Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Domácí stěna
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Big Wall, Vertikon, HUDY..."
                    value={homeGymInput}
                    onChange={(e) => setHomeGymInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Kategorie pohlaví
                </label>
                <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setGenderInput('men')}
                    className={`py-1.5 rounded-lg transition-all ${
                      genderInput === 'men'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Muži
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenderInput('women')}
                    className={`py-1.5 rounded-lg transition-all ${
                      genderInput === 'women'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Ženy
                  </button>
                </div>
              </div>
            </div>

            {/* Target Goal & Personal Best */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Cílový čas (s)
                </label>
                <div className="relative">
                  <Flame className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="0.001"
                    placeholder="5.500"
                    value={targetGoalInput}
                    onChange={(e) => setTargetGoalInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Osobní rekord (PB)
                </label>
                <div className="relative">
                  <Trophy className="w-4 h-4 text-yellow-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="0.001"
                    placeholder="Neměřen"
                    value={personalBestInput}
                    onChange={(e) => setPersonalBestInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Favorite Beta */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Preferovaná sekvence (Beta)
              </label>
              <select
                value={favoriteBeta}
                onChange={(e) => setFavoriteBeta(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-red-500 outline-none cursor-pointer"
              >
                <option value="standard">Standardní sekvence (IFSC klasika)</option>
                <option value="tomoa-skip">Tomoa Skip (přeskočení chytu 4)</option>
                <option value="modern-dyno">Moderní dyno skok</option>
                <option value="youth-flow">Mládežnický plynulý styl (U15/U13)</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
              <button
                type="button"
                onClick={() => setViewMode('switcher')}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
              >
                Zpět na seznam
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{viewMode === 'create' ? 'Vytvořit lezce' : 'Uložit změny'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

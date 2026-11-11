export interface CountryOption {
  code: string;
  nameCs: string;
  nameEn: string;
  flag: string;
}

export const SPEED_COUNTRIES: CountryOption[] = [
  { code: 'CZE', nameCs: 'Česká republika', nameEn: 'Czech Republic', flag: '🇨🇿' },
  { code: 'SVK', nameCs: 'Slovensko', nameEn: 'Slovakia', flag: '🇸🇰' },
  { code: 'POL', nameCs: 'Polsko', nameEn: 'Poland', flag: '🇵🇱' },
  { code: 'AUT', nameCs: 'Rakousko', nameEn: 'Austria', flag: '🇦🇹' },
  { code: 'GER', nameCs: 'Německo', nameEn: 'Germany', flag: '🇩🇪' },
  { code: 'INA', nameCs: 'Indonésie', nameEn: 'Indonesia', flag: '🇮🇩' },
  { code: 'CHN', nameCs: 'Čína', nameEn: 'China', flag: '🇨🇳' },
  { code: 'USA', nameCs: 'Spojené státy', nameEn: 'United States', flag: '🇺🇸' },
  { code: 'FRA', nameCs: 'Francie', nameEn: 'France', flag: '🇫🇷' },
  { code: 'ITA', nameCs: 'Itálie', nameEn: 'Italy', flag: '🇮🇹' },
  { code: 'JPN', nameCs: 'Japonsko', nameEn: 'Japan', flag: '🇯🇵' },
  { code: 'KOR', nameCs: 'Jižní Korea', nameEn: 'South Korea', flag: '🇰🇷' },
  { code: 'ESP', nameCs: 'Španělsko', nameEn: 'Spain', flag: '🇪🇸' },
  { code: 'UKR', nameCs: 'Ukrajina', nameEn: 'Ukraine', flag: '🇺🇦' },
  { code: 'GBR', nameCs: 'Velká Británie', nameEn: 'Great Britain', flag: '🇬🇧' },
  { code: 'SUI', nameCs: 'Švýcarsko', nameEn: 'Switzerland', flag: '🇨🇭' },
  { code: 'SLO', nameCs: 'Slovinsko', nameEn: 'Slovenia', flag: '🇸🇮' },
  { code: 'CAN', nameCs: 'Kanada', nameEn: 'Canada', flag: '🇨🇦' },
  { code: 'AUS', nameCs: 'Austrálie', nameEn: 'Australia', flag: '🇦🇺' },
  { code: 'KAZ', nameCs: 'Kazachstán', nameEn: 'Kazakhstan', flag: '🇰🇿' },
  { code: 'HUN', nameCs: 'Maďarsko', nameEn: 'Hungary', flag: '🇭🇺' },
  { code: 'BEL', nameCs: 'Belgie', nameEn: 'Belgium', flag: '🇧🇪' },
  { code: 'NED', nameCs: 'Nizozemsko', nameEn: 'Netherlands', flag: '🇳🇱' },
  { code: 'NOR', nameCs: 'Norsko', nameEn: 'Norway', flag: '🇳🇴' },
  { code: 'SWE', nameCs: 'Švédsko', nameEn: 'Sweden', flag: '🇸🇪' },
];

export const getCountryByCode = (code: string): CountryOption => {
  const found = SPEED_COUNTRIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
  return found || { code: code.toUpperCase(), nameCs: code, nameEn: code, flag: '🌐' };
};

import { AthleteRecord, HoldCoordinate, RouteCategory, SpeedRouteDefinition } from '../types/climbing';

// Official 20 adult IFSC speed climbing holds (used as primary holds for 15m and as outline backgrounds for U13/U15)
export const ADULT_HOLDS_OUTLINE: HoldCoordinate[] = [
  { id: 1, holdNumber: 1, x: 42, y: 5.5, section: 1, type: 'hand', name: 'Start Hold L (Adult)', gridPanel: 'sn1', gridRow: 7, gridCol: 'L', keyCue: 'Levá ruka start, otevřená ramena' },
  { id: 2, holdNumber: 2, x: 58, y: 8.2, section: 1, type: 'hand', name: 'Start Hold R (Adult)', gridPanel: 'dx1', gridRow: 9, gridCol: 'E', keyCue: 'Pravá ruka start, tah ze země' },
  { id: 3, holdNumber: 3, x: 44, y: 13.0, section: 1, type: 'hand', name: 'Hold 3 (Hop)', gridPanel: 'sn2', gridRow: 3, gridCol: 'M', keyCue: 'Boky těsně u stěny' },
  { id: 4, holdNumber: 4, x: 56, y: 17.5, section: 1, type: 'hand', name: 'Hold 4 (Pivot)', gridPanel: 'dx2', gridRow: 7, gridCol: 'D', keyCue: 'Plynulý přehmata bez zastavení' },
  { id: 5, holdNumber: 5, x: 38, y: 22.0, section: 1, type: 'hand', name: 'Hold 5 (Reach)', gridPanel: 'sn3', gridRow: 2, gridCol: 'I', keyCue: 'Dlouhý krok levou nohou' },
  { id: 6, holdNumber: 6, x: 62, y: 26.8, section: 1, type: 'hand', name: 'Hold 6 (Gate 1)', gridPanel: 'dx3', gridRow: 6, gridCol: 'F', keyCue: 'Zatížení pravého hamstringu' },
  { id: 7, holdNumber: 7, x: 48, y: 32.5, section: 1, type: 'hand', name: 'Hold 7 (5m Gate)', gridPanel: 'sn3', gridRow: 10, gridCol: 'M', keyCue: 'První kontrolní bod 5 m' },

  { id: 8, holdNumber: 8, x: 40, y: 38.0, section: 2, type: 'hand', name: 'Hold 8 (Low Dyno)', gridPanel: 'sn4', gridRow: 4, gridCol: 'L', keyCue: 'Odrazová základna pro dyno' },
  { id: 9, holdNumber: 9, x: 60, y: 44.0, section: 2, type: 'hand', name: 'Hold 9 (Tomoa Launch)', gridPanel: 'dx4', gridRow: 8, gridCol: 'E', keyCue: 'Klíčový akcelerační chyt' },
  { id: 10, holdNumber: 10, x: 45, y: 49.5, section: 2, type: 'hand', name: 'Hold 10 (Intermediate)', isTomoaSkip: true, gridPanel: 'sn5', gridRow: 2, gridCol: 'M', keyCue: 'Vynechává se při Tomoa skipu' },
  { id: 11, holdNumber: 11, x: 52, y: 55.0, section: 2, type: 'hand', name: 'Hold 11 (Skip Hold)', isTomoaSkip: true, gridPanel: 'dx5', gridRow: 6, gridCol: 'B', keyCue: 'Přelet v moderní světové betě' },
  { id: 12, holdNumber: 12, x: 39, y: 60.5, section: 2, type: 'hand', name: 'Hold 12 (Dyno Catch)', gridPanel: 'sn6', gridRow: 1, gridCol: 'L', keyCue: 'Zachycení vertikální rychlosti' },
  { id: 13, holdNumber: 13, x: 58, y: 64.8, section: 2, type: 'hand', name: 'Hold 13 (Re-align)', gridPanel: 'dx6', gridRow: 4, gridCol: 'D', keyCue: 'Srovnání těžiště do osy' },
  { id: 14, holdNumber: 14, x: 46, y: 68.0, section: 2, type: 'hand', name: 'Hold 14 (10m Gate)', gridPanel: 'sn6', gridRow: 8, gridCol: 'M', keyCue: 'Druhý mezičas: výška 10 m' },

  { id: 15, holdNumber: 15, x: 38, y: 74.0, section: 3, type: 'hand', name: 'Hold 15 (Sprint)', gridPanel: 'sn7', gridRow: 2, gridCol: 'I', keyCue: 'Maximální frekvence kroků' },
  { id: 16, holdNumber: 16, x: 61, y: 79.5, section: 3, type: 'hand', name: 'Hold 16 (Cadence Peak)', gridPanel: 'dx7', gridRow: 6, gridCol: 'F', keyCue: 'Nejrychlejší přehmata' },
  { id: 17, holdNumber: 17, x: 45, y: 84.5, section: 3, type: 'hand', name: 'Hold 17 (Pre-Dyno)', gridPanel: 'sn8', gridRow: 1, gridCol: 'M', keyCue: 'Příprava na finální odraz' },
  { id: 18, holdNumber: 18, x: 56, y: 89.0, section: 3, type: 'hand', name: 'Hold 18 (Launch Platform)', gridPanel: 'dx8', gridRow: 4, gridCol: 'D', keyCue: 'Komprese do odrazu' },
  { id: 19, holdNumber: 19, x: 42, y: 93.5, section: 3, type: 'hand', name: 'Hold 19 (Guide)', gridPanel: 'sn8', gridRow: 7, gridCol: 'L', keyCue: 'Vodicí chyt před dohmatem' },
  { id: 20, holdNumber: 20, x: 50, y: 98.2, section: 3, type: 'hand', name: 'Cílový senzor 15m', gridPanel: 'dx8', gridRow: 10, gridCol: 'A', keyCue: 'Plošný dohmat celou dlaní' },
];

export const IFSC_HOLDS_15M = ADULT_HOLDS_OUTLINE;

// EXACT U15 ROUTE HOLDS (Bolted between adult holds as indicated in official TOPO U15)
// Green holds on the grid from panel sn1/dx1 to sn6/dx6 with finish pad at sn7/dx7
export const YOUTH_U15_EXACT_HOLDS: HoldCoordinate[] = [
  { id: 101, holdNumber: 1, x: 58, y: 2.5, section: 1, type: 'foot', name: 'Stup Start (U15)', color: 'green', gridPanel: 'dx1', gridRow: 1, gridCol: 'E', keyCue: 'Nástup pravou nohou ze země' },
  { id: 102, holdNumber: 2, x: 44, y: 6.8, section: 1, type: 'hand', name: 'Start L (U15)', color: 'green', gridPanel: 'sn1', gridRow: 7, gridCol: 'M', keyCue: 'Základní levý startovní chyt U15' },
  { id: 103, holdNumber: 3, x: 56, y: 8.5, section: 1, type: 'hand', name: 'Start R (U15)', color: 'green', gridPanel: 'dx1', gridRow: 9, gridCol: 'D', keyCue: 'Startovní pravá ruka' },
  { id: 104, holdNumber: 4, x: 60, y: 10.0, section: 1, type: 'hand', name: 'Chyt 4 (U15 Odraz)', color: 'green', gridPanel: 'dx1', gridRow: 10, gridCol: 'F', keyCue: 'Rychlý odraz a přenesení těžiště' },
  { id: 105, holdNumber: 5, x: 52, y: 14.5, section: 1, type: 'hand', name: 'Chyt 5 (U15)', color: 'green', gridPanel: 'dx2', gridRow: 4, gridCol: 'B', keyCue: 'Přehmata podél pravé osy' },
  { id: 106, holdNumber: 6, x: 44, y: 16.0, section: 1, type: 'foot', name: 'Stup 6 (U15)', color: 'green', gridPanel: 'sn2', gridRow: 5, gridCol: 'L', keyCue: 'Podpora levé nohy u obrysu dospělého chytu' },
  { id: 107, holdNumber: 7, x: 42, y: 21.0, section: 1, type: 'hand', name: 'Chyt 7 (U15 Brána 1)', color: 'green', gridPanel: 'sn3', gridRow: 2, gridCol: 'L', keyCue: 'Kontrolní bod úseku 1 (3.3m)' },

  { id: 108, holdNumber: 8, x: 45, y: 25.5, section: 2, type: 'hand', name: 'Chyt 8 (U15)', color: 'green', gridPanel: 'sn3', gridRow: 6, gridCol: 'M', keyCue: 'Náběh do středové části stěny' },
  { id: 109, holdNumber: 9, x: 48, y: 27.0, section: 2, type: 'hand', name: 'Chyt 9 (U15 Dyno Prep)', color: 'green', gridPanel: 'dx3', gridRow: 8, gridCol: 'A', keyCue: 'Středový tah před přechodem' },
  { id: 110, holdNumber: 10, x: 44, y: 34.0, section: 2, type: 'hand', name: 'Chyt 10 (U15)', color: 'green', gridPanel: 'sn4', gridRow: 3, gridCol: 'L', keyCue: 'Podpora u dospělého chytu 8' },
  { id: 111, holdNumber: 11, x: 53, y: 41.5, section: 2, type: 'hand', name: 'Chyt 11 (U15 Brána 2)', color: 'green', gridPanel: 'dx4', gridRow: 10, gridCol: 'B', keyCue: 'Kontrolní bod úseku 2 (6.6m)' },

  { id: 112, holdNumber: 12, x: 43, y: 49.0, section: 3, type: 'hand', name: 'Chyt 12 (U15 Akcelerace)', color: 'green', gridPanel: 'sn6', gridRow: 10, gridCol: 'M', keyCue: 'Finální akcelerace do finiše' },
  { id: 113, holdNumber: 13, x: 50, y: 55.5, section: 3, type: 'hand', name: 'Chyt 13 (U15 Předcíl)', color: 'green', gridPanel: 'dx7', gridRow: 1, gridCol: 'A', keyCue: 'Vodicí chyt před dohmatem' },
  { id: 114, holdNumber: 14, x: 50, y: 60.0, section: 3, type: 'hand', name: 'Cílový senzor Top Device (10m)', color: 'green', gridPanel: 'sn7/dx7', gridRow: 4, gridCol: 'M-A', keyCue: 'Hatchovaný elektronický senzor na panelu 7' },
];

// EXACT U13 ROUTE HOLDS (Bolted between adult holds as indicated in official TOPO U13)
// Green holds + Orange intermediate holds (dětské mezichyty)
export const YOUTH_U13_EXACT_HOLDS: HoldCoordinate[] = [
  // Panel 1
  { id: 201, holdNumber: 1, x: 58, y: 2.5, section: 1, type: 'foot', name: 'Stup Start (U13)', color: 'green', gridPanel: 'dx1', gridRow: 1, gridCol: 'E', keyCue: 'Startovní stup pravá noha' },
  { id: 202, holdNumber: 2, x: 54, y: 5.0, section: 1, type: 'hand', name: 'Chyt 2 (U13 Mezichyt)', color: 'orange', isIntermediate: true, gridPanel: 'dx1', gridRow: 5, gridCol: 'D', keyCue: 'Oranžový dětský mezichyt pro zkrácení startu' },
  { id: 203, holdNumber: 3, x: 44, y: 6.8, section: 1, type: 'hand', name: 'Start L (U13)', color: 'green', gridPanel: 'sn1', gridRow: 7, gridCol: 'M', keyCue: 'Základní levý chyt U13' },
  { id: 204, holdNumber: 4, x: 56, y: 8.5, section: 1, type: 'hand', name: 'Start R (U13)', color: 'green', gridPanel: 'dx1', gridRow: 9, gridCol: 'D', keyCue: 'Pravý startovní chyt' },
  { id: 205, holdNumber: 5, x: 60, y: 10.0, section: 1, type: 'hand', name: 'Chyt 5 (U13)', color: 'green', gridPanel: 'dx1', gridRow: 10, gridCol: 'F', keyCue: 'Odrazový chyt' },

  // Panel 2
  { id: 206, holdNumber: 6, x: 50, y: 12.0, section: 1, type: 'hand', name: 'Chyt 6 (U13 Mezichyt)', color: 'orange', isIntermediate: true, gridPanel: 'dx2', gridRow: 1, gridCol: 'A', keyCue: 'Oranžový mezichyt nad panelem 1' },
  { id: 207, holdNumber: 7, x: 52, y: 14.5, section: 1, type: 'hand', name: 'Chyt 7 (U13)', color: 'green', gridPanel: 'dx2', gridRow: 4, gridCol: 'B', keyCue: 'Pravý tah' },
  { id: 208, holdNumber: 8, x: 44, y: 16.0, section: 1, type: 'foot', name: 'Stup 8 (U13)', color: 'green', gridPanel: 'sn2', gridRow: 5, gridCol: 'L', keyCue: 'Stabilní stup pro nohu' },
  { id: 209, holdNumber: 9, x: 53, y: 17.5, section: 1, type: 'hand', name: 'Chyt 9 (U13 Mezichyt)', color: 'orange', isIntermediate: true, gridPanel: 'dx2', gridRow: 6, gridCol: 'B', keyCue: 'Oranžový mezichyt pro menší vzrůst' },

  // Panel 3
  { id: 210, holdNumber: 10, x: 42, y: 21.0, section: 1, type: 'hand', name: 'Chyt 10 (U13)', color: 'green', gridPanel: 'sn3', gridRow: 2, gridCol: 'L', keyCue: 'První kontrolní brána 3.3m' },
  { id: 211, holdNumber: 11, x: 50, y: 23.5, section: 2, type: 'hand', name: 'Chyt 11 (U13 Mezichyt)', color: 'orange', isIntermediate: true, gridPanel: 'dx3', gridRow: 3, gridCol: 'A', keyCue: 'Oranžový mezichyt na ose' },
  { id: 212, holdNumber: 12, x: 45, y: 25.5, section: 2, type: 'hand', name: 'Chyt 12 (U13)', color: 'green', gridPanel: 'sn3', gridRow: 6, gridCol: 'M', keyCue: 'Plynulý krok' },
  { id: 213, holdNumber: 13, x: 48, y: 27.0, section: 2, type: 'hand', name: 'Chyt 13 (U13)', color: 'green', gridPanel: 'dx3', gridRow: 8, gridCol: 'A', keyCue: 'Středová sekvence' },
  { id: 214, holdNumber: 14, x: 54, y: 29.5, section: 2, type: 'hand', name: 'Chyt 14 (U13 Mezichyt)', color: 'orange', isIntermediate: true, gridPanel: 'dx3', gridRow: 9, gridCol: 'B', keyCue: 'Oranžový mezichyt před panelem 4' },

  // Panel 4
  { id: 215, holdNumber: 15, x: 56, y: 32.5, section: 2, type: 'hand', name: 'Chyt 15 (U13 Mezichyt)', color: 'orange', isIntermediate: true, gridPanel: 'dx4', gridRow: 2, gridCol: 'C', keyCue: 'Oranžový mezichyt pro udržení tempa' },
  { id: 216, holdNumber: 16, x: 44, y: 34.0, section: 2, type: 'hand', name: 'Chyt 16 (U13)', color: 'green', gridPanel: 'sn4', gridRow: 3, gridCol: 'L', keyCue: 'Levý tah u dospělého chytu' },
  { id: 217, holdNumber: 17, x: 53, y: 39.5, section: 2, type: 'hand', name: 'Chyt 17 (U13 Mezichyt)', color: 'orange', isIntermediate: true, gridPanel: 'dx4', gridRow: 8, gridCol: 'B', keyCue: 'Oranžový mezichyt před bránou 2' },
  { id: 218, holdNumber: 18, x: 53, y: 41.5, section: 2, type: 'hand', name: 'Chyt 18 (U13 Brána 2)', color: 'green', gridPanel: 'dx4', gridRow: 10, gridCol: 'B', keyCue: 'Kontrolní bod 6.6m' },

  // Panel 5
  { id: 219, holdNumber: 19, x: 46, y: 44.0, section: 3, type: 'hand', name: 'Chyt 19 (U13 Mezichyt)', color: 'orange', isIntermediate: true, gridPanel: 'sn5', gridRow: 2, gridCol: 'M', keyCue: 'Oranžový mezichyt na přechodu' },
  { id: 220, holdNumber: 20, x: 52, y: 47.0, section: 3, type: 'hand', name: 'Chyt 20 (U13 Mezichyt)', color: 'orange', isIntermediate: true, gridPanel: 'dx5', gridRow: 8, gridCol: 'B', keyCue: 'Oranžový mezichyt pod panelem 6' },

  // Panel 6
  { id: 221, holdNumber: 21, x: 43, y: 49.0, section: 3, type: 'hand', name: 'Chyt 21 (U13)', color: 'green', gridPanel: 'sn6', gridRow: 10, gridCol: 'M', keyCue: 'Klíčový tah před finišem' },
  { id: 222, holdNumber: 22, x: 52, y: 52.0, section: 3, type: 'hand', name: 'Chyt 22 (U13 Mezichyt)', color: 'orange', isIntermediate: true, gridPanel: 'dx6', gridRow: 2, gridCol: 'A', keyCue: 'Poslední oranžový mezichyt před cílem' },

  // Panel 7 (Finish)
  { id: 223, holdNumber: 23, x: 50, y: 60.0, section: 3, type: 'hand', name: 'Cílový senzor Top Device (10m)', color: 'green', gridPanel: 'sn7/dx7', gridRow: 4, gridCol: 'M-A', keyCue: 'Hatchovaný elektronický senzor na panelu 7' },
];

export const ROUTE_DEFINITIONS: Record<RouteCategory, SpeedRouteDefinition> = {
  adults_15m: {
    id: 'adults_15m',
    nameCs: 'Dospělí 15 m (Oficiální IFSC)',
    nameEn: 'Adults 15m (Official IFSC)',
    nameDe: 'Erwachsene 15m (Offiziell IFSC)',
    heightMeters: 15.0,
    overhangDeg: 5.0,
    totalHolds: 20,
    targetAudience: 'Kategorie Muži & Ženy, Junioři U17+',
    descriptionCs: 'Oficiální olympijská a světová 15metrová trať se 20 normalizovanými chyty a 11 stupy. Obsahuje Tomoa skip na chytech 10–11 a 5° stálý převis.',
    descriptionEn: 'Official Olympic 15m course featuring 20 standardized holds and 11 footholds at a constant 5-degree overhang with Tomoa skip beta.',
    descriptionDe: 'Offizielle olympische 15m-Wand mit 20 standardisierten Griffen und 11 Tritten bei 5° Neigung.',
    wrBenchmark: {
      maleTime: 4.74,
      maleHolder: 'Sam Watson (USA)',
      femaleTime: 6.06,
      femaleHolder: 'Aleksandra Mirosław (POL)',
    },
    holds: ADULT_HOLDS_OUTLINE,
  },
  youth_u15: {
    id: 'youth_u15',
    nameCs: 'Mládež U15 (10 m tratě dle TOPO U15)',
    nameEn: 'Youth U15 (10m Route as per TOPO U15)',
    nameDe: 'Jugend U15 (10m laut TOPO U15)',
    heightMeters: 10.0,
    overhangDeg: 5.0,
    totalHolds: 14,
    targetAudience: 'Závodníci ve věku 13–14 let (Kategorie B)',
    topoImagePath: '/assets/aistudio/Screenshot_20261108_164346_Brave_f9e8f60e.jpg',
    descriptionCs: 'Oficiální soutěžní trať dle schématu TOPO U15. Zelené chyty jsou našroubované přesně do mřížky sn1–sn7 / dx1–dx7 mezi dospělými chyty (znázorněnými obrysem). Cíl je na 10 m (panel 7).',
    descriptionEn: 'Official competitive route according to TOPO U15 scheme. Green holds are bolted precisely into grid sn1-sn7 / dx1-dx7 among adult outline holds with top device at 10m.',
    descriptionDe: 'Offizielle Wettkampfstrecke laut TOPO U15 Schema mit grünen Griffen im sn1-sn7 Raster zwischen den Erwachsenengriffen.',
    wrBenchmark: {
      maleTime: 6.18,
      maleHolder: 'Mládežnický rekord U15',
      femaleTime: 6.95,
      femaleHolder: 'Mládežnický rekord U15 dívky',
    },
    holds: YOUTH_U15_EXACT_HOLDS,
  },
  youth_u13: {
    id: 'youth_u13',
    nameCs: 'Děti U13 (10 m Kids dle TOPO U13)',
    nameEn: 'Kids U13 (10m Kids as per TOPO U13)',
    nameDe: 'Kinder U13 (10m Kids laut TOPO U13)',
    heightMeters: 10.0,
    overhangDeg: 5.0,
    totalHolds: 23,
    targetAudience: 'Děti do 12 let (Kategorie C & D)',
    topoImagePath: '/assets/aistudio/Screenshot_20261108_164340_Brave_d6443df1.jpg',
    descriptionCs: 'Oficiální dětská trať dle schématu TOPO U13. Obsahuje zelené závodní chyty doplněné o oranžové mezichyty zkracující rozteče pro menší rozpětí paží. Dospělé chyty jsou v pozadí jako obrys.',
    descriptionEn: 'Official kids speed climbing route according to TOPO U13 scheme. Combines green competition holds with orange intermediate reach holds. Adult holds are shown in outline.',
    descriptionDe: 'Offizielle Kinder-Speedstrecke laut TOPO U13 mit grünen Wettkampfgriffen und orangefarbenen Zwischengriffen.',
    wrBenchmark: {
      maleTime: 7.45,
      maleHolder: 'Dětský rekord U13 chlapci',
      femaleTime: 7.90,
      femaleHolder: 'Dětský rekord U13 dívky',
    },
    holds: YOUTH_U13_EXACT_HOLDS,
  },
};

export const WORLD_RECORDS: AthleteRecord[] = [
  {
    id: 'sam-watson',
    name: 'Sam Watson',
    country: 'United States',
    countryCode: 'USA',
    gender: 'men',
    category: 'adults_15m',
    recordTime: 4.74,
    splits: { split1: 1.46, split2: 1.62, split3: 1.66 },
    dateAchieved: '2024-08-08',
    event: 'Olympijské hry Paříž (Světový rekord)',
    avatarUrl: '/src/assets/images/record_holder_sam_1794137552503.jpg',
    title: 'Světový rekordman (Muži 15m)',
    betaDescription: 'Tomoa skip přes chyty 10–11 s agresivním startem.',
  },
  {
    id: 'aleksandra-miroslaw',
    name: 'Aleksandra Mirosław',
    country: 'Poland',
    countryCode: 'POL',
    gender: 'women',
    category: 'adults_15m',
    recordTime: 6.06,
    splits: { split1: 1.95, split2: 2.12, split3: 1.99 },
    dateAchieved: '2024-08-05',
    event: 'Olympijské hry Paříž',
    avatarUrl: '/src/assets/images/record_holder_ola_1794137552655.jpg',
    title: 'Olympijská vítězka & WR 15m',
    betaDescription: 'Robotická přesnost každého doteku a bezchybný finiš.',
  },
  {
    id: 'veddriq-leonardo',
    name: 'Veddriq Leonardo',
    country: 'Indonesia',
    countryCode: 'INA',
    gender: 'men',
    category: 'adults_15m',
    recordTime: 4.75,
    splits: { split1: 1.48, split2: 1.61, split3: 1.66 },
    dateAchieved: '2024-08-08',
    event: 'Zlaté finále olympijských her',
    avatarUrl: '/src/assets/images/record_holder_sam_1794137552503.jpg',
    title: 'Olympijský šampion 2024',
    betaDescription: 'Explozivní start a lineární zrychlení.',
  },
  {
    id: 'youth-u15-champ',
    name: 'Matyáš Král',
    country: 'Czech Republic',
    countryCode: 'CZE',
    gender: 'men',
    category: 'youth_u15',
    recordTime: 6.18,
    splits: { split1: 1.98, split2: 2.15, split3: 2.05 },
    dateAchieved: '2026-05-12',
    event: 'Evropský pohár mládeže U15 (10m)',
    avatarUrl: '/src/assets/images/record_holder_sam_1794137552503.jpg',
    title: 'Šampion kategorie U15',
    betaDescription: 'Plynulá práce nohou na 10m trati.',
  },
  {
    id: 'youth-u13-champ',
    name: 'Eliška Nováková',
    country: 'Czech Republic',
    countryCode: 'CZE',
    gender: 'women',
    category: 'youth_u13',
    recordTime: 7.45,
    splits: { split1: 2.35, split2: 2.58, split3: 2.52 },
    dateAchieved: '2026-06-20',
    event: 'Český pohár dětí U13 (10m)',
    avatarUrl: '/src/assets/images/record_holder_ola_1794137552655.jpg',
    title: 'Šampionka kategorie U13',
    betaDescription: 'Přesný rytmus s využitím oranžových mezichytů.',
  },
];

export const SECTION_METRICS = [
  {
    section: 1,
    title: 'Úsek 1: Start & náběh',
    distanceAdult: '0–5 m',
    distanceYouth: '0–3.3 m',
    description: 'Startovní reakce z podložky, komprese těla ke stěně a první přehmata.',
    wrMale: '1.46s (15m)',
    wrFemale: '1.95s (15m)',
    cruxCue: 'Udržet boky do 10 cm od stěny při druhém kroku.',
  },
  {
    section: 2,
    title: 'Úsek 2: Střední pasáž & Tomoa',
    distanceAdult: '5–10 m',
    distanceYouth: '3.3–6.6 m',
    description: 'Dynamický přechod a akcelerace na klíčových středových chytech.',
    wrMale: '1.62s (15m)',
    wrFemale: '2.12s (15m)',
    cruxCue: '100% nasazení vertikálního tahu bez kontroly pohledem.',
  },
  {
    section: 3,
    title: 'Úsek 3: Horní pasáž & dohmat',
    distanceAdult: '10–15 m',
    distanceYouth: '6.6–10 m',
    description: 'Sprint s maximální frekvencí a plošný dohmat do cílového senzoru.',
    wrMale: '1.66s (15m)',
    wrFemale: '1.99s (15m)',
    cruxCue: 'Dohmat celou plochou dlaně do středu žluté desky.',
  },
];

export const IFSC_HOLDS = ADULT_HOLDS_OUTLINE;

export type Language = 'cs' | 'de' | 'en';

export interface Translations {
  appName: string;
  tagline: string;
  // Nav
  navTimer: string;
  navSplits: string;
  navGhost: string;
  navTraining: string;
  navLeaderboard: string;
  navRoutes: string;
  navCloud: string;
  navLegal: string;
  logbookBtn: string;
  // Categories
  categoryAdults: string;
  categoryU15: string;
  categoryU13: string;
  categorySelect: string;
  wallHeight: string;
  wallOverhang: string;
  // Timer
  timerTitle: string;
  startBeeps: string;
  startCamera: string;
  startSound: string;
  startManual: string;
  readyMarks: string;
  readySet: string;
  readyBeeps: string;
  btnStart: string;
  btnStop: string;
  btnReset: string;
  gate1: string;
  gate2: string;
  finishPad: string;
  falseStart: string;
  newPb: string;
  timerActive: string;
  tapToRecord: string;
  sensorsCalibration: string;
  camActive: string;
  camTurnOn: string;
  micActive: string;
  micTurnOn: string;
  motionSens: string;
  soundSens: string;
  gymLabel: string;
  betaLabel: string;
  finalTime: string;
  // Splits
  splitAnalysisTitle: string;
  compareWr: string;
  sideBySideTitle: string;
  aheadBy: string;
  behindBy: string;
  speedLeak: string;
  holdBeta: string;
  sector1Title: string;
  sector2Title: string;
  sector3Title: string;
  yourSplit: string;
  deltaVsWr: string;
  paceLoss: string;
  // Ghost
  ghostTitle: string;
  ghostSubtitle: string;
  chooseOpponent: string;
  myPb: string;
  customGoal: string;
  voiceCoach: string;
  metronome: string;
  testGhostBtn: string;
  stopGhostBtn: string;
  ghostReadyVoice: string;
  ghostSplit1Ahead: string;
  ghostSplit1Behind: string;
  ghostFinishVoice: string;
  voiceCoachLabel: string;
  metronomeLabel: string;
  // Training
  drillsTitle: string;
  drillsSubtitle: string;
  aiWorkoutBtn: string;
  restTimer: string;
  sets: string;
  reps: string;
  rest: string;
  catAll: string;
  catCampus: string;
  catPlyo: string;
  catLegs: string;
  catCore: string;
  // Leaderboards
  leaderboardTitle: string;
  leaderboardSubtitle: string;
  rank: string;
  climber: string;
  time: string;
  gym: string;
  date: string;
  submitTimeBtn: string;
  scopeGlobal: string;
  scopeCz: string;
  scopeGym: string;
  filterMen: string;
  filterWomen: string;
  // Logbook
  logbookTitle: string;
  noRunsYet: string;
  startRunPrompt: string;
  // Cloud & Auth
  cloudTitle: string;
  cloudSubtitle: string;
  signIn: string;
  signOut: string;
  signedInAs: string;
  driveGoogle: string;
  driveOneDrive: string;
  localVault: string;
  autoUploadVideos: string;
  cloudSecurityNotice: string;
  // Legal
  legalTitle: string;
  legalSubtitle: string;
  parentalConsentTitle: string;
  parentalConsentDesc: string;
  gdprTitle: string;
  gdprDesc: string;
  biometricsTitle: string;
  biometricsDesc: string;
  cloudLegalTitle: string;
  cloudLegalDesc: string;
  disclaimerTitle: string;
  disclaimerDesc: string;
  // Mobile / Phone
  tryOnPhone: string;
  phoneModalTitle: string;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  cs: {
    appName: 'Fifteen',
    tagline: '15m digitální trenér a časomíra pro rychlolezení',
    navTimer: 'Časomíra',
    navSplits: 'Mezičasy',
    navGhost: 'Ghost',
    navTraining: 'Trénink',
    navLeaderboard: 'Žebříčky',
    navRoutes: 'Trasy stěny',
    navCloud: 'Profily lezců',
    navLegal: 'Pravidla a bezpečnost',
    logbookBtn: 'Deník časů',
    categoryAdults: 'Dospělí 15m',
    categoryU15: 'Mládež U15 (10m)',
    categoryU13: 'Děti U13 (10m)',
    categorySelect: 'Kategorie tratě',
    wallHeight: 'Výška stěny',
    wallOverhang: 'Převis',
    timerTitle: 'Fifteen Chrono',
    startBeeps: 'IFSC Odpočet',
    startCamera: 'AI Kamera',
    startSound: 'AI Zvuk',
    startManual: 'Dotykový start',
    readyMarks: 'At your marks (Na místa)',
    readySet: 'Ready (Připravit se)',
    readyBeeps: '3... 2... 1... START!',
    btnStart: 'Odstartovat',
    btnStop: 'DOHMAT V CÍLI (STOP)',
    btnReset: 'Vynulovat',
    gate1: '1. úsek (5m)',
    gate2: '2. úsek (10m)',
    finishPad: 'Cílová deska',
    falseStart: 'Ulilý start! Reakce pod 0,100 s',
    newPb: 'NOVÝ OSOBNÍ REKORD!',
    timerActive: 'ČASOMÍRA BĚŽÍ',
    tapToRecord: 'Zaznamenat',
    sensorsCalibration: 'Senzory a kalibrace stěny',
    camActive: 'Kamera aktivní',
    camTurnOn: 'Zapnout kameru',
    micActive: 'Mikrofon aktivní',
    micTurnOn: 'Zapnout mikrofon',
    motionSens: 'Citlivost optického pohybu',
    soundSens: 'Hlasitost startovního signálu',
    gymLabel: 'Lezecká stěna / Tělocvična',
    betaLabel: 'Trénovaná beta cesty',
    finalTime: 'Výsledný čas',
    splitAnalysisTitle: 'Analýza mezičasů',
    compareWr: 'Porovnat se světovým rekordem:',
    sideBySideTitle: 'Side-by-Side simulace rychlosti',
    aheadBy: 'Náskok',
    behindBy: 'Ztráta',
    speedLeak: 'Ztráta tempa',
    holdBeta: 'Beta chytů',
    sector1Title: 'Úsek 1: Start & náběh (0–5m)',
    sector2Title: 'Úsek 2: Dyno & skok (5–10m)',
    sector3Title: 'Úsek 3: Headwall & cíl (10–15m)',
    yourSplit: 'Váš split',
    deltaVsWr: 'Rozdíl vs WR',
    paceLoss: 'Ztráta tempa',
    ghostTitle: 'Režim Ghost do sluchátek',
    ghostSubtitle: 'Akustické tempo a hlášení mezičasů přímo do uší během lezení.',
    chooseOpponent: 'Zvolte virtuálního soupeře',
    myPb: 'Můj osobák',
    customGoal: 'Vlastní cíl',
    voiceCoach: 'Hlasový trenér',
    metronome: 'Rytmický metronom',
    testGhostBtn: 'Spustit test do sluchátek',
    stopGhostBtn: 'Zastavit test',
    ghostReadyVoice: 'Virtuální soupeř připraven. Pozor na tóny.',
    ghostSplit1Ahead: 'První split: máš náskok!',
    ghostSplit1Behind: 'První split: ztrácíš tempo!',
    ghostFinishVoice: 'Cíl dosažen!',
    voiceCoachLabel: 'Hlasový kouč do uší',
    metronomeLabel: 'Tempo metronom (BPM)',
    drillsTitle: 'Výbušnost a koordinace',
    drillsSubtitle: 'Specializované cviky pro rychlolezení: campusboard, reakce nohou a start.',
    aiWorkoutBtn: 'AI Tréninkový plán',
    restTimer: 'Pauza mezi sériemi',
    sets: 'Série',
    reps: 'Opakování',
    rest: 'Pauza',
    catAll: 'Všechny cviky',
    catCampus: 'Campusboard',
    catPlyo: 'Plyometrie',
    catLegs: 'Výbušnost nohou',
    catCore: 'Střed těla',
    leaderboardTitle: 'Žebříčky rychlostních stěn',
    leaderboardSubtitle: 'Světové rekordy i lokální žebříčky pro české lezecké stěny.',
    rank: 'Pořadí',
    climber: 'Lezec',
    time: 'Čas',
    gym: 'Stěna',
    date: 'Datum',
    submitTimeBtn: 'Zapsat čas',
    scopeGlobal: 'Globální',
    scopeCz: 'Česká republika',
    scopeGym: 'Lokální stěny',
    filterMen: 'Muži',
    filterWomen: 'Ženy',
    logbookTitle: 'Deník lezeckých časů',
    noRunsYet: 'Zatím žádné zaznamenané časy',
    startRunPrompt: 'Přejděte na stopky a změřte svůj první pokus.',
    cloudTitle: 'Profily lezců & Přepínač',
    cloudSubtitle: 'Správa lezců, přepínání účtů pro porovnávání mezičasů a přímé stahování videí.',
    signIn: 'Zvolit lezce',
    signOut: 'Odhlásit',
    signedInAs: 'Aktivní lezec',
    driveGoogle: 'Google Drive',
    driveOneDrive: 'Microsoft OneDrive',
    localVault: 'Paměť zařízení',
    autoUploadVideos: 'Automaticky nabídnout uložení videa po výlezu',
    cloudSecurityNotice: 'Videa se ukládají přímo do vašeho zařízení nebo je můžete sdílet do své privátní cloudové složky.',
    legalTitle: 'Právní podmínky & GDPR compliance',
    legalSubtitle: 'Kompletní přehled zákonných požadavků pro nahrávání videí dětí, biometrickou analýzu a cloudové ukládání.',
    parentalConsentTitle: '1. Ochrana osobních údajů dětí (U13 & U15) a souhlas rodičů',
    parentalConsentDesc: 'Videa nezletilých závodníků představují citlivé osobní údaje. Dle čl. 8 GDPR a zákona č. 110/2019 Sb. je pro nahrávání a případné zveřejnění na žebříčcích nezbytný výslovný souhlas zákonného zástupce (rodiče). V aplikaci jsou profily dětí automaticky v režimu "Privátní", pokud rodič neudělí souhlas.',
    gdprTitle: '2. Zpracování dat a právo na výmaz (GDPR)',
    gdprDesc: 'Uživatel má plnou kontrolu nad svými daty. Má právo na okamžitý výmaz všech časů, videozáznamů a biomechanických profilů. Data nejsou prodávána třetím stranám.',
    biometricsTitle: '3. Optická AI analýza pohybu (přímo v zařízení)',
    biometricsDesc: 'Sledování nohy, těla a rukou i spouštění časomíry probíhá v reálném čase přímo v prohlížeči vašeho zařízení (Canvas API). Žádný živý video stream z kamery se neodesílá na vzdálené servery.',
    cloudLegalTitle: '4. Ukládání a sdílení videí (Zařízení / Google Drive / OneDrive)',
    cloudLegalDesc: 'Videa se ukládají přímo do vašeho zařízení nebo je můžete sdílet do své soukromé složky na Google Drive či OneDrive. Vlastníkem a správcem záznamů zůstáváte výhradně vy.',
    disclaimerTitle: '5. Vyloučení odpovědnosti (Sportovní a bezpečnostní disclaimer)',
    disclaimerDesc: 'Aplikace Fifteen slouží výhradně jako tréninková časomíra a diagnostický nástroj. Nenahrazuje certifikovaný lezecký dohled, automatický naviják (Auto-Belay) ani bezpečnostní pravidla IFSC a ČHS.',
    tryOnPhone: 'Otevřít v mobilu',
    phoneModalTitle: 'Jak spustit Fifteen na telefonu',
  },
  en: {
    appName: 'Fifteen',
    tagline: '15m Digital Speed Climbing Coach & Chrono Tracker',
    navTimer: 'Chrono',
    navSplits: 'Splits',
    navGhost: 'Ghost',
    navTraining: 'Training',
    navLeaderboard: 'Leaderboard',
    navRoutes: 'Routes',
    navCloud: 'Profiles',
    navLegal: 'Rules & Safety',
    logbookBtn: 'Logbook',
    categoryAdults: 'Adults 15m',
    categoryU15: 'Youth U15 (10m)',
    categoryU13: 'Kids U13 (10m)',
    categorySelect: 'Route Division',
    wallHeight: 'Wall Height',
    wallOverhang: 'Overhang',
    timerTitle: 'Fifteen Chrono',
    startBeeps: 'IFSC Countdown',
    startCamera: 'AI Camera',
    startSound: 'AI Sound',
    startManual: 'Touch Pad',
    readyMarks: '“AT YOUR MARKS”',
    readySet: '“READY”',
    readyBeeps: '3... 2... 1... START!',
    btnStart: 'Start Chrono',
    btnStop: 'HIT FINISH PAD (STOP)',
    btnReset: 'Reset',
    gate1: 'Section 1 (5m)',
    gate2: 'Section 2 (10m)',
    finishPad: 'Finish Pad',
    falseStart: 'FALSE START! Reaction < 0.100s',
    newPb: 'NEW PERSONAL RECORD!',
    timerActive: 'CHRONO RUNNING',
    tapToRecord: 'Record',
    sensorsCalibration: 'Sensors & Wall Calibration',
    camActive: 'Camera Active',
    camTurnOn: 'Turn On Camera',
    micActive: 'Microphone Active',
    micTurnOn: 'Turn On Mic',
    motionSens: 'Optical Motion Sensitivity',
    soundSens: 'Start Signal Audio Threshold',
    gymLabel: 'Climbing Gym / Venue',
    betaLabel: 'Trained Route Beta',
    finalTime: 'Official Time',
    splitAnalysisTitle: 'Split Times Analysis',
    compareWr: 'Compare with Record:',
    sideBySideTitle: 'Side-by-Side Velocity Simulation',
    aheadBy: 'Ahead by',
    behindBy: 'Behind by',
    speedLeak: 'Speed Bleed Zone',
    holdBeta: 'Hold Beta',
    sector1Title: 'Sector 1: Start Drive (0–5m)',
    sector2Title: 'Sector 2: Dyno Flight (5–10m)',
    sector3Title: 'Sector 3: Headwall & Finish (10–15m)',
    yourSplit: 'Your split',
    deltaVsWr: 'Delta vs WR',
    paceLoss: 'Pace Loss',
    ghostTitle: 'Earbuds Ghost Pacer',
    ghostSubtitle: 'Real-time acoustic checkpoints and voice feedback right into your headphones.',
    chooseOpponent: 'Choose Ghost Opponent',
    myPb: 'My Record',
    customGoal: 'Custom Goal',
    voiceCoach: 'Voice Coach',
    metronome: 'Cadence Metronome',
    testGhostBtn: 'Start Earbuds Test',
    stopGhostBtn: 'Stop Test',
    ghostReadyVoice: 'Virtual opponent armed. Listen for start beeps.',
    ghostSplit1Ahead: 'Split one: You are ahead!',
    ghostSplit1Behind: 'Split one: Losing pace!',
    ghostFinishVoice: 'Finish sensor hit!',
    voiceCoachLabel: 'In-ear Voice Feedback',
    metronomeLabel: 'Cadence Metronome (BPM)',
    drillsTitle: 'Explosive Power & Coordination',
    drillsSubtitle: 'Speed-specific drills: campus board, start pad reactive power, and plyometrics.',
    aiWorkoutBtn: 'AI Training Program',
    restTimer: 'Rest Interval',
    sets: 'Sets',
    reps: 'Reps',
    rest: 'Rest',
    catAll: 'All Drills',
    catCampus: 'Campus Board',
    catPlyo: 'Plyometrics',
    catLegs: 'Explosive Legs',
    catCore: 'Core & Stability',
    leaderboardTitle: 'Speed Wall Leaderboards',
    leaderboardSubtitle: 'World records and national/local climbing gym rankings.',
    rank: 'Rank',
    climber: 'Climber',
    time: 'Time',
    gym: 'Gym',
    date: 'Date',
    submitTimeBtn: 'Submit Time',
    scopeGlobal: 'Global',
    scopeCz: 'Czech Republic',
    scopeGym: 'Local Gyms',
    filterMen: 'Men',
    filterWomen: 'Women',
    logbookTitle: 'Speed Climbing Logbook',
    noRunsYet: 'No recorded times yet',
    startRunPrompt: 'Head to the chrono and record your first speed run.',
    cloudTitle: 'Climber Profiles & Switcher',
    cloudSubtitle: 'Manage climber profiles, switch accounts for split comparisons, and download recorded videos.',
    signIn: 'Select Climber',
    signOut: 'Sign Out',
    signedInAs: 'Active Climber',
    driveGoogle: 'Google Drive',
    driveOneDrive: 'Microsoft OneDrive',
    localVault: 'Device Storage',
    autoUploadVideos: 'Prompt to save recorded video after climb',
    cloudSecurityNotice: 'Videos stay on your device or can be shared directly to your private cloud folder.',
    legalTitle: 'Legal Requirements & GDPR Compliance',
    legalSubtitle: 'Complete overview of statutory compliance for youth video recordings, on-device tracking, and storage.',
    parentalConsentTitle: '1. Child Privacy (U13 & U15) & Mandatory Parental Consent',
    parentalConsentDesc: 'Video recordings of minors constitute sensitive personal data under GDPR Art. 8 and national privacy acts. Explicit parental consent is legally mandatory prior to recording or publishing youth names/videos. Youth profiles remain strictly private by default.',
    gdprTitle: '2. Data Subject Rights & Right to Erasure',
    gdprDesc: 'Users retain 100% data ownership with full right to immediate deletion of all times, recordings, and biomechanical telemetry.',
    biometricsTitle: '3. On-Device AI Tracking (Canvas Edge Processing)',
    biometricsDesc: 'Foot, torso, and hand tracking runs locally in real time inside your device browser via Canvas API. Live camera feeds are never uploaded to remote servers.',
    cloudLegalTitle: '4. Video Storage & Sharing (Device / Google Drive / OneDrive)',
    cloudLegalDesc: 'Recordings are saved locally to your device or shared directly by you to your private Google Drive or OneDrive folder, keeping 100% ownership with you.',
    disclaimerTitle: '5. Athletic Safety & Liability Disclaimer',
    disclaimerDesc: 'Fifteen is a chronometer and biomechanics training aid. It does not replace auto-belay inspection, certified coaching, or IFSC safety protocols.',
    tryOnPhone: 'Open on Phone',
    phoneModalTitle: 'Run Fifteen on Mobile Phone',
  },
  de: {
    appName: 'Fifteen',
    tagline: '15m Digitaler Speed-Klettertrainer & Zeitmessung',
    navTimer: 'Stoppuhr',
    navSplits: 'Zwischenzeiten',
    navGhost: 'Ghost',
    navTraining: 'Training',
    navLeaderboard: 'Rangliste',
    navRoutes: 'Routen',
    navCloud: 'Profile',
    navLegal: 'Rechtliches & DSGVO',
    logbookBtn: 'Logbuch',
    categoryAdults: 'Erwachsene 15m',
    categoryU15: 'Jugend U15 (10m)',
    categoryU13: 'Kinder U13 (10m)',
    categorySelect: 'Routenkategorie',
    wallHeight: 'Wandhöhe',
    wallOverhang: 'Überhang',
    timerTitle: 'Fifteen Chrono',
    startBeeps: 'IFSC Pieptöne',
    startCamera: 'KI Kamera',
    startSound: 'KI Sound',
    startManual: 'Touchpad',
    readyMarks: '„AT YOUR MARKS“',
    readySet: '„READY“',
    readyBeeps: '3... 2... 1... START!',
    btnStart: 'Starten',
    btnStop: 'ZIEL BERÜHRT (STOPP)',
    btnReset: 'Zurücksetzen',
    gate1: 'Abschnitt 1 (5m)',
    gate2: 'Abschnitt 2 (10m)',
    finishPad: 'Zielpad',
    falseStart: 'FEHLSTART! Reaktion < 0,100 s',
    newPb: 'NEUE PERSÖNLICHE BESTZEIT!',
    timerActive: 'ZEIT LÄUFT',
    tapToRecord: 'Erfassen',
    sensorsCalibration: 'Sensoren & Wandkalibrierung',
    camActive: 'Kamera aktiv',
    camTurnOn: 'Kamera einschalten',
    micActive: 'Mikrofon aktiv',
    micTurnOn: 'Mikrofon einschalten',
    motionSens: 'Optische Bewegungsempfindlichkeit',
    soundSens: 'Startsignal-Lautstärkeschwelle',
    gymLabel: 'Kletterhalle / Trainingsort',
    betaLabel: 'Trainierte Routen-Beta',
    finalTime: 'Offizielle Zeit',
    splitAnalysisTitle: 'Zwischenzeiten-Analyse',
    compareWr: 'Vergleich mit Rekord:',
    sideBySideTitle: 'Side-by-Side Geschwindigkeits-Sim',
    aheadBy: 'Vorsprung',
    behindBy: 'Rückstand',
    speedLeak: 'Geschwindigkeitsverlust',
    holdBeta: 'Griff-Beta',
    sector1Title: 'Sektor 1: Start & Antritt (0–5m)',
    sector2Title: 'Sektor 2: Dyno & Sprung (5–10m)',
    sector3Title: 'Sektor 3: Headwall & Ziel (10–15m)',
    yourSplit: 'Ihr Split',
    deltaVsWr: 'Differenz zu WR',
    paceLoss: 'Tempoverlust',
    ghostTitle: 'Ghost-Pacer im Kopfhörer',
    ghostSubtitle: 'Akustische Signale und Sprachansagen direkt im Kopfhörer beim Klettern.',
    chooseOpponent: 'Virtuellen Gegner wählen',
    myPb: 'Meine Bestzeit',
    customGoal: 'Eigenes Ziel',
    voiceCoach: 'Sprach-Coach',
    metronome: 'Rhythmus-Metronom',
    testGhostBtn: 'Test im Kopfhörer starten',
    stopGhostBtn: 'Test beenden',
    ghostReadyVoice: 'Virtueller Gegner bereit. Auf Pieptöne achten.',
    ghostSplit1Ahead: 'Split eins: Du liegst in Führung!',
    ghostSplit1Behind: 'Split eins: Tempoverlust!',
    ghostFinishVoice: 'Zielpad berührt!',
    voiceCoachLabel: 'Sprach-Feedback im Ohr',
    metronomeLabel: 'Rhythmus-Metronom (BPM)',
    drillsTitle: 'Explosivkraft & Koordination',
    drillsSubtitle: 'Spezifisches Speed-Training: Campusboard, Sprungkraft und Antritt.',
    aiWorkoutBtn: 'KI-Trainingsplan',
    restTimer: 'Satzpause',
    sets: 'Sätze',
    reps: 'Wdh.',
    rest: 'Pause',
    catAll: 'Alle Übungen',
    catCampus: 'Campusboard',
    catPlyo: 'Plyometrie',
    catLegs: 'Explosive Beinkraft',
    catCore: 'Rumpfstabilität',
    leaderboardTitle: 'Speedwand-Ranglisten',
    leaderboardSubtitle: 'Weltrekorde und lokale Kletterhallen-Bestzeiten.',
    rank: 'Platz',
    climber: 'Kletterer',
    time: 'Zeit',
    gym: 'Halle',
    date: 'Datum',
    submitTimeBtn: 'Zeit eintragen',
    scopeGlobal: 'Global',
    scopeCz: 'Tschechische Rep.',
    scopeGym: 'Lokale Hallen',
    filterMen: 'Männer',
    filterWomen: 'Frauen',
    logbookTitle: 'Kletterzeit-Logbuch',
    noRunsYet: 'Noch keine Zeiten erfasst',
    startRunPrompt: 'Gehen Sie zur Stoppuhr für Ihren ersten Speed-Versuch.',
    cloudTitle: 'Kletterer-Profile & Wechsel',
    cloudSubtitle: 'Profile verwalten, Konten für Split-Vergleiche wechseln und Videos direkt herunterladen.',
    signIn: 'Profil wählen',
    signOut: 'Abmelden',
    signedInAs: 'Aktiver Kletterer',
    driveGoogle: 'Google Drive',
    driveOneDrive: 'Microsoft OneDrive',
    localVault: 'Gerätespeicher',
    autoUploadVideos: 'Nach Durchstieg Video-Speicherung anbieten',
    cloudSecurityNotice: 'Videos werden direkt auf Ihrem Gerät gespeichert oder in Ihren privaten Cloud-Ordner geteilt.',
    legalTitle: 'Rechtliche Rahmenbedingungen & DSGVO',
    legalSubtitle: 'Übersicht aller rechtlichen Vorgaben für Videoaufnahmen von Minderjährigen, KI-Tracking und Speicherung.',
    parentalConsentTitle: '1. Jugendschutz (U13 & U15) & Einwilligung der Eltern',
    parentalConsentDesc: 'Videoaufnahmen von Minderjährigen sind sensible personenbezogene Daten gem. Art. 8 DSGVO. Vor Aufnahmen oder Veröffentlichungen ist eine ausdrückliche elterliche Zustimmung gesetzlich zwingend erforderlich.',
    gdprTitle: '2. Betroffenenrechte & Recht auf Löschung (DSGVO)',
    gdprDesc: 'Nutzer haben die volle Datenhoheit mit dem Recht auf sofortige und vollständige Löschung aller Zeiten und Videoaufzeichnungen.',
    biometricsTitle: '3. KI-Tracking direkt auf dem Gerät (Canvas)',
    biometricsDesc: 'Die Erkennung von Fuß, Körper und Händen erfolgt in Echtzeit direkt im Browser via Canvas API ohne Übertragung von Live-Kamerastreams an externe Server.',
    cloudLegalTitle: '4. Videospeicherung & Teilen (Gerät / Google Drive / OneDrive)',
    cloudLegalDesc: 'Dateien werden direkt auf Ihrem Gerät gespeichert oder durch Sie in Ihren persönlichen Google Drive- bzw. OneDrive-Ordner geteilt.',
    disclaimerTitle: '5. Haftungsausschluss & Klettersicherheit',
    disclaimerDesc: 'Fifteen ist ein Trainingswerkzeug und ersetzt weder Trainer noch automatische Sicherungsgeräte (Auto-Belay).',
    tryOnPhone: 'Am Handy testen',
    phoneModalTitle: 'Fifteen auf dem Smartphone nutzen',
  },
};

const LANG_STORAGE_KEY = 'fifteen_lang_v1';

export function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'cs';
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'cs' || saved === 'en' || saved === 'de') return saved;
  } catch {
    // ignore
  }
  return 'cs';
}

export function saveStoredLanguage(lang: Language): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  }
}

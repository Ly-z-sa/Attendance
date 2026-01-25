// utils/constants.js
export const APP_ID = 'attendance-tracker-app';

export const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const WARNING_THRESHOLDS = {
  GOOD: { max: 2, color: 'var(--green)', status: 'Good' },
  FIRST: { max: 3, color: 'var(--yellow-dark)', status: 'FIRST WARNING' },
  LAST: { max: 4, color: 'var(--red)', status: 'LAST WARNING' },
  ERROR: { color: 'var(--red)', status: 'RED ERROR WARNING' }
};

export const STATUS_COLORS = {
  Present: 'var(--green)',
  Absent: 'var(--red)',
  Permission: 'var(--blue-accent)',
  Late: 'var(--yellow)'
};

export const STREAK_MESSAGES = {
  1: "Great start! 1 day streak!",
  3: "Amazing! 3 day streak! Keep it up!",
  5: "Fantastic! 5 day streak! You're on fire!",
  7: "Incredible! 1 week streak! Outstanding!",
  10: "Phenomenal! 10 day streak! You're unstoppable!",
  14: "Legendary! 2 week streak! Absolutely amazing!",
  21: "Epic! 3 week streak! You're a champion!",
  30: "Mythical! 30 day streak! Attendance master!"
};

export const ADJECTIVES = ["Happy", "Cool", "Bright", "Quick", "Smart", "Brave", "Kind", "Calm", "Lucky", "Swift", "Sharp", "Mighty", "Grand", "Fair", "Wise"];
export const NOUNS = ["Tiger", "Eagle", "Panda", "Fox", "Lion", "Wolf", "Owl", "Deer", "Bear", "Hawk", "Shark", "Dolphin", "Cheetah", "Phoenix", "Dragon"];

export const FIREBASE_PATHS = {
  usernames: () => `artifacts/${APP_ID}/usernames`,
  usernameDoc: (username) => `artifacts/${APP_ID}/usernames/${username}`,
  userProfile: (userId) => `artifacts/${APP_ID}/users/${userId}/profile/details`,
  semesters: (userId) => `artifacts/${APP_ID}/users/${userId}/semesters`,
  semesterDoc: (userId, id) => `artifacts/${APP_ID}/users/${userId}/semesters/${id}`,
  subjects: (userId) => `artifacts/${APP_ID}/users/${userId}/subjects`,
  subjectDoc: (userId, id) => `artifacts/${APP_ID}/users/${userId}/subjects/${id}`,
  attendance: (userId) => `artifacts/${APP_ID}/users/${userId}/attendanceRecords`,
  attendanceDoc: (userId, id) => `artifacts/${APP_ID}/users/${userId}/attendanceRecords/${id}`,
  tasks: (userId) => `artifacts/${APP_ID}/users/${userId}/tasks`,
  taskDoc: (userId, id) => `artifacts/${APP_ID}/users/${userId}/tasks/${id}`,
  focusStats: (userId) => `artifacts/${APP_ID}/users/${userId}/focus/stats`,
  bugReports: (userId) => `artifacts/${APP_ID}/users/${userId}/bug-reports`
};

export const COLOR_SCHEMES = {
  default: 'Default',
  ocean: 'Ocean Blue',
  forest: 'Forest Green',
  sunset: 'Sunset Orange',
  glass: 'Glass',
  crimson: 'Crimson',
  violet: 'Violet',
  emerald: 'Emerald',
  festive: 'Festive'
};

export const FONTS = {
  philosopher: 'Philosopher',
  inter: 'Inter',
  roboto: 'Roboto'
};

export const BACKGROUNDS = {
  default: 'Default',
  'floating-lines': 'Floating Lines',
  particles: 'Particles Network',
  matrix: 'Matrix Rain',
  prism: 'Prism',
  aurora: 'Aurora',
  snowfall: 'Snowfall',
  'lunar-new-year': 'CNY - Year of the Horse'
};

export const CLICK_EFFECTS = {
  none: 'None',
  spark: 'Spark',
  ripple: 'Ripple',
  confetti: 'Confetti',
  hearts: 'Hearts'
};

export const STREAK_REQUIREMENTS = {
  // Color Schemes
  'default': 0,
  'ocean': 0,
  'forest': 3,
  'sunset': 3,
  'glass': 7,
  'violet': 7,
  'crimson': 15,
  'emerald': 30,
  'festive': 50,

  // Backgrounds
  'default': 0,
  'floating-lines': 3,
  'prism': 7,
  'aurora': 14,
  'particles': 21,
  'matrix': 30,
  'snowfall': 45,
  'lunar-new-year': 0,

  // Fonts
  'philosopher': 0,
  'inter': 0,
  'roboto': 7,

  // Effects
  'none': 0,
  'ripple': 3,
  'spark': 7,
  'hearts': 14,
  'confetti': 30
};
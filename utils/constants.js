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

export const FIREBASE_PATHS = {
  userProfile: (userId) => `artifacts/${APP_ID}/users/${userId}/profile/details`,
  semesters: (userId) => `artifacts/${APP_ID}/users/${userId}/semesters`,
  semesterDoc: (userId, id) => `artifacts/${APP_ID}/users/${userId}/semesters/${id}`,
  subjects: (userId) => `artifacts/${APP_ID}/users/${userId}/subjects`,
  subjectDoc: (userId, id) => `artifacts/${APP_ID}/users/${userId}/subjects/${id}`,
  attendance: (userId) => `artifacts/${APP_ID}/users/${userId}/attendanceRecords`,
  attendanceDoc: (userId, id) => `artifacts/${APP_ID}/users/${userId}/attendanceRecords/${id}`,
  bugReports: () => 'bug-reports'
};

export const COLOR_SCHEMES = {
  default: 'Default',
  ocean: 'Ocean Blue',
  forest: 'Forest Green',
  sunset: 'Sunset Orange',
  glass: 'Glass',
  crimson: 'Crimson',
  violet: 'Violet',
  emerald: 'Emerald'
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
  aurora: 'Aurora'
};
// utils/helpers.js
import { DAYS_OF_WEEK, WARNING_THRESHOLDS } from '../utils/constants.js';

let realTime = null;
let timeOffset = 0;

export async function fetchRealTime() {
  try {
    const response = await fetch('https://worldtimeapi.org/api/timezone/Asia/Bangkok');
    const data = await response.json();
    const serverTime = new Date(data.datetime);
    const localTime = new Date();

    timeOffset = serverTime.getTime() - localTime.getTime();
    realTime = serverTime;

    console.log('Bangkok time synced:', serverTime.toISOString());
    return serverTime;
  } catch (error) {
    console.warn('Failed to fetch Bangkok time, using local time:', error);
    return new Date();
  }
}

export function getRealTime() {
  // We want to work with the "real" time (synced with server if possible)
  // But strictly interpreting it as Cambodia time
  if (realTime) {
    return new Date(new Date().getTime() + timeOffset);
  }
  return new Date();
}

/**
 * Returns today's date string in YYYY-MM-DD format,
 * strictly for Asia/Phnom_Penh timezone.
 */
export function getTodayDateString() {
  const now = getRealTime();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Phnom_Penh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(now);
}

/**
 * Returns today's day name (e.g., "Monday"),
 * strictly for Asia/Phnom_Penh timezone.
 */
export function getCurrentDayName() {
  const now = getRealTime();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Phnom_Penh',
    weekday: 'long'
  });
  return formatter.format(now);
}

export function getDayNameFromDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

export function getAvailableDates() {
  const dates = [];
  // Use current time in Cambodia
  const now = getRealTime();

  for (let i = 0; i < 7; i++) {
    // Create a date object sharing the same timestamp, but interpret logical day differently
    const d = new Date(now);
    d.setDate(d.getDate() - i);

    // Format strictly for Cambodia
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Phnom_Penh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const dayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Phnom_Penh',
      weekday: 'long'
    });

    dates.push({
      dateString: formatter.format(d),
      displayName: i === 0 ? 'Today' : dayFormatter.format(d)
    });
  }
  return dates;
}

export function getSemesterWeek(dateString, semester) {
  if (!semester || !semester.startDate) {
    return null;
  }
  try {
    const start = new Date(semester.startDate);
    const today = new Date(dateString);

    start.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const startDayOfWeek = (start.getDay() + 6) % 7;
    const startDateOfWeek = new Date(start.getTime() - startDayOfWeek * 24 * 60 * 60 * 1000);

    const diffTime = today.getTime() - startDateOfWeek.getTime();
    if (diffTime < 0) {
      return null;
    }

    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    const weekNumber = Math.floor(diffDays / 7) + 1;

    return weekNumber;
  } catch (e) {
    console.error("Error calculating semester week:", e);
    return null;
  }
}

export function calculateWarning(late, permission, absent) {
  const lateAsPermission = late / 3;
  const score = absent + permission + lateAsPermission;

  if (absent > 2 || (permission + absent) > 4 || score > 4) {
    return WARNING_THRESHOLDS.ERROR;
  } else if (score <= 2) {
    return WARNING_THRESHOLDS.GOOD;
  } else if (score === 3) {
    return WARNING_THRESHOLDS.FIRST;
  } else if (score === 4) {
    return WARNING_THRESHOLDS.LAST;
  }
  return { status: '', color: 'var(--grey-text)' };
}

export function formatDate(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function getRelativeTimeString(dateString) {
  const date = new Date(dateString);
  const today = getRealTime();
  const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(dateString);
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function copyToClipboard(text) {
  return navigator.clipboard.writeText(text);
}
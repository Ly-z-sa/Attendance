// utils/validation.js

export async function checkBadWords(text) {
  try {
    const response = await fetch(`https://www.purgomalum.com/service/containsprofanity?text=${encodeURIComponent(text)}`);
    const result = await response.text();
    return result === 'true';
  } catch (error) {
    return false;
  }
}

export function validatePassword(password) {
  const hasCapital = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const minLength = password.length >= 6;
  
  return {
    valid: hasCapital && hasNumber && minLength,
    hasCapital,
    hasNumber,
    minLength
  };
}

export function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  if (score <= 2) return { strength: 'Weak', color: 'var(--red)' };
  if (score <= 4) return { strength: 'Medium', color: 'var(--yellow-dark)' };
  return { strength: 'Strong', color: 'var(--green)' };
}

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validateSemesterDates(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (end < start) {
    return { valid: false, message: 'End date cannot be before start date.' };
  }
  
  const sixMonthsLater = new Date(start);
  sixMonthsLater.setMonth(start.getMonth() + 6);
  
  if (end > sixMonthsLater) {
    return { valid: false, message: 'Semester cannot be longer than 6 months.' };
  }
  
  return { valid: true };
}

export function sanitizeInput(input) {
  return input.trim().replace(/[<>]/g, '');
}
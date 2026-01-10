// utils/csrf-protection.js
// CSRF Protection utility

class CSRFProtection {
  constructor() {
    this.token = null;
    this.generateToken();
  }

  generateToken() {
    // Generate a cryptographically secure random token
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    this.token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    
    // Store in sessionStorage for this session
    sessionStorage.setItem('csrf_token', this.token);
    
    return this.token;
  }

  getToken() {
    return this.token || sessionStorage.getItem('csrf_token') || this.generateToken();
  }

  validateToken(providedToken) {
    const currentToken = this.getToken();
    return providedToken === currentToken;
  }

  addTokenToElement(element) {
    if (element) {
      element.dataset.csrfToken = this.getToken();
    }
  }

  validateElementToken(element) {
    if (!element || !element.dataset.csrfToken) {
      return false;
    }
    return this.validateToken(element.dataset.csrfToken);
  }
}

const csrfProtection = new CSRFProtection();

// Export the validateCSRFToken function that's used in home-page.js
export function validateCSRFToken() {
  return csrfProtection.getToken() !== null;
}

export default csrfProtection;
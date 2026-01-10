// utils/error-handler.js

class ErrorHandler {
    constructor() {
        this.mappings = {
            // Auth Errors
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/user-disabled': 'This account has been disabled. Please contact support.',
            'auth/user-not-found': 'No account found with this email or username.',
            'auth/wrong-password': 'Incorrect password. Please try again.',
            'auth/email-already-in-use': 'An account with this email already exists.',
            'auth/weak-password': 'Password is too weak. Please use a stronger password.',
            'auth/operation-not-allowed': 'This sign-in method is not enabled.',
            'auth/too-many-requests': 'Too many attempts. Please try again later.',
            'auth/invalid-credential': 'Incorrect email or password.',
            'auth/network-request-failed': 'Network error. Please check your internet connection.',
            'auth/popup-closed-by-user': 'Sign-in window was closed.',
            'auth/cancelled-by-user': 'Sign-in was cancelled.',
            'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
            'auth/unauthorized-domain': 'Sign-in failed. This domain is not authorized.',
            'auth/requires-recent-login': 'For security reasons, please sign out and sign in again to perform this action.',

            // Firestore Errors
            'permission-denied': 'You do not have permission to perform this action.',
            'not-found': 'The requested information could not be found.',
            'already-exists': 'This item already exists.',
            'resource-exhausted': 'System is busy. Please try again in a moment.',
            'unavailable': 'Service is temporarily unavailable. Please check your connection.',
            'deadline-exceeded': 'The request took too long. Please try again.',

            // Custom App Errors
            'username-taken': 'This username is already taken. Please try another one.',
            'invalid-username': 'Username must be 4-20 characters and contain only lowercase letters, numbers, and underscores.',
            'profanity-detected': 'Please use appropriate language.',
            'missing-fields': 'Please fill in all required fields.',
            'no-semester-selected': 'Please select a semester first.',
            'invalid-date': 'Please select a valid date.',
            'initialization-failed': 'Failed to start the application. Please refresh the page.'
        };
    }

    getFriendlyMessage(error) {
        if (!error) return 'An unexpected error occurred.';

        // If it's a string, try to map it or return as is
        if (typeof error === 'string') {
            return this.mappings[error] || error;
        }

        // If it's a Firebase error object, check the code
        const code = error.code || error.message;
        if (this.mappings[code]) {
            return this.mappings[code];
        }

        // Check for common patterns in error messages if code not found
        const message = (error.message || '').toLowerCase();

        if (message.includes('permission denied') || message.includes('missing or insufficient permissions')) {
            return this.mappings['permission-denied'];
        }

        if (message.includes('network error') || message.includes('failed to fetch')) {
            return this.mappings['auth/network-request-failed'];
        }

        if (message.includes('quota exceeded')) {
            return this.mappings['resource-exhausted'];
        }

        // Default fallback
        console.error('Unhandled technical error:', error);
        return 'Something went wrong. Please try again or refresh the page.';
    }
}

export default new ErrorHandler();

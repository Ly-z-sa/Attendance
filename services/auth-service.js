// services/auth-service.js
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateEmail,
  updatePassword,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { FIREBASE_PATHS } from '../utils/constants.js';
import { ICONS } from '../utils/icons.js';
import { validatePassword, validateEmail, checkBadWords } from '../utils/validation.js';
import toastManager from '../ui/toast-manager.js';
import modalManager from '../ui/modal-manager.js';

class AuthService {
  constructor() {
    this.auth = null;
    this.db = null;
    this.userId = null;
    this.loginAttempts = {};
    this.listenersInitialized = false;
  }

  initialize(auth, db, userId) {
    this.auth = auth;
    this.db = db;
    this.userId = userId;

    if (!this.listenersInitialized) {
      this.setupAuthEventListeners();
      this.listenersInitialized = true;
    }
  }

  setupAuthEventListeners() {
    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabType = e.target.dataset.tab;
        document.querySelectorAll('.auth-tab').forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        e.target.classList.add('active');
        e.target.setAttribute('aria-selected', 'true');

        document.getElementById('signin-form').style.display = tabType === 'signin' ? 'block' : 'none';
        document.getElementById('signup-form').style.display = tabType === 'signup' ? 'block' : 'none';
        document.getElementById('auth-modal-title').textContent = tabType === 'signin' ? 'Sign In' : 'Sign Up';
      });
    });

    // Sign in button
    document.getElementById('signin-btn').addEventListener('click', () => this.handleSignIn());

    // Sign up button
    document.getElementById('signup-btn').addEventListener('click', () => this.handleSignUp());

    // Password strength indicator
    document.getElementById('signup-password').addEventListener('input', (e) => {
      this.updatePasswordStrength(e.target.value);
    });

    // Enter key handlers
    document.getElementById('signin-email').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('signin-password').focus();
      }
    });

    document.getElementById('signin-password').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleSignIn();
      }
    });

    document.getElementById('signup-name').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('signup-email').focus();
      }
    });

    document.getElementById('signup-email').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('signup-password').focus();
      }
    });

    document.getElementById('signup-password').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleSignUp();
      }
    });
  }

  async handleSignIn() {
    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;

    if (!email || !password) {
      toastManager.warning('Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      toastManager.error('Please enter a valid email address');
      return;
    }

    if (!this.loginAttempts[email]) {
      this.loginAttempts[email] = 0;
    }

    if (this.loginAttempts[email] >= 5) {
      toastManager.error('Account locked. Contact admin at lyssa.phat@gmail.com');
      return;
    }

    const loadingToast = toastManager.loading('Signing in...');

    try {
      await signInWithEmailAndPassword(this.auth, email, password);
      this.loginAttempts[email] = 0;
      toastManager.hide(loadingToast);
      modalManager.close('auth-modal');
      toastManager.success('Signed in successfully!');
    } catch (error) {
      toastManager.hide(loadingToast);

      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        this.loginAttempts[email]++;

        if (this.loginAttempts[email] >= 5) {
          toastManager.error('Too many failed attempts. Account locked.');
        } else if (this.loginAttempts[email] > 1) {
          this.showResetPasswordOption(email);
          toastManager.error(`Wrong password. ${5 - this.loginAttempts[email]} attempts remaining.`);
        } else {
          toastManager.error('Wrong password. Try again.');
        }
      } else if (error.code === 'auth/user-not-found') {
        toastManager.error('No account found with this email.');
      } else if (error.code === 'auth/too-many-requests') {
        toastManager.error('Too many attempts. Please try again later.');
      } else {
        toastManager.error('Sign in failed: ' + error.message);
      }
    }
  }

  showResetPasswordOption(email) {
    const signinForm = document.getElementById('signin-form');
    let resetBtn = document.getElementById('reset-password-btn');

    if (!resetBtn) {
      resetBtn = document.createElement('button');
      resetBtn.id = 'reset-password-btn';
      resetBtn.className = 'btn';
      resetBtn.textContent = 'Reset Password';
      resetBtn.style.width = '100%';
      resetBtn.style.marginTop = '0.5rem';
      resetBtn.onclick = () => this.handlePasswordReset(email);
      signinForm.appendChild(resetBtn);
    }
  }

  async handlePasswordReset(email) {
    try {
      await sendPasswordResetEmail(this.auth, email);
      toastManager.success('Password reset email sent!');
    } catch (error) {
      toastManager.error('Failed to send reset email: ' + error.message);
    }
  }

  async handleSignUp() {
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const name = document.getElementById('signup-name').value.trim();

    if (!email || !password || !name) {
      toastManager.warning('Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      toastManager.error('Please enter a valid email address');
      return;
    }

    // Check for bad words in name
    if (await checkBadWords(name)) {
      toastManager.error('Please use appropriate language for your name.');
      return;
    }

    const validation = validatePassword(password);
    if (!validation.valid) {
      toastManager.error('Password must be at least 6 characters with 1 capital letter and 1 number');
      return;
    }

    const loadingToast = toastManager.loading('Creating account...');

    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      await sendEmailVerification(userCredential.user);
      await setDoc(doc(this.db, FIREBASE_PATHS.userProfile(userCredential.user.uid)), {
        name,
        major: '',
        createdAt: new Date().toISOString()
      }, { merge: true });

      toastManager.hide(loadingToast);
      modalManager.close('auth-modal');
      toastManager.success('Account created! Please check your email to verify your account.');
    } catch (error) {
      toastManager.hide(loadingToast);

      if (error.code === 'auth/email-already-in-use') {
        toastManager.error('An account with this email already exists.');
      } else if (error.code === 'auth/weak-password') {
        toastManager.error('Password is too weak. Please use a stronger password.');
      } else {
        toastManager.error('Sign up failed: ' + error.message);
      }
    }
  }

  async handleSignOut() {
    const confirmed = await modalManager.confirm('Sign Out', 'Are you sure you want to sign out?');
    if (!confirmed) return;

    const loadingToast = toastManager.loading('Signing out...');

    try {
      await signOut(this.auth);
      toastManager.hide(loadingToast);
      toastManager.success('Signed out successfully');

      // Reset UI
      this.resetUI();
    } catch (error) {
      toastManager.hide(loadingToast);
      toastManager.error('Sign out failed: ' + error.message);
    }
  }

  resetUI() {
    document.getElementById('user-info-name').textContent = 'Hello, Student';
    document.getElementById('user-info-major').textContent = 'Your Major';
    document.getElementById('user-info-semester').textContent = 'No semester selected';
    const streakEl = document.getElementById('streak-display');
    streakEl.innerHTML = `
        ${ICONS.FIRE}
        0 day streak
    `;
  }

  async sendVerificationEmail() {
    try {
      await sendEmailVerification(this.auth.currentUser);
      toastManager.success('Verification email sent! Please check your inbox.');
    } catch (error) {
      toastManager.error('Failed to send verification email: ' + error.message);
    }
  }

  async changePassword() {
    const currentPassword = await modalManager.input(
      'Change Password',
      'Enter your current password:',
      'Current password',
      true
    );
    if (!currentPassword) return;

    // Verify current password
    try {
      const credential = EmailAuthProvider.credential(this.auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(this.auth.currentUser, credential);
    } catch (error) {
      toastManager.error('Current password is incorrect');
      return;
    }

    const newPassword = await modalManager.input(
      'Change Password',
      'Enter new password (min 6 chars, 1 capital, 1 number):',
      'New password',
      true,
      validatePassword,
      currentPassword
    );
    if (!newPassword) return;

    const loadingToast = toastManager.loading('Updating password...');

    try {
      await updatePassword(this.auth.currentUser, newPassword);
      toastManager.hide(loadingToast);
      toastManager.success('Password updated successfully!');
    } catch (error) {
      toastManager.hide(loadingToast);
      toastManager.error('Failed to update password: ' + error.message);
    }
  }

  async changeEmail() {
    const newEmail = await modalManager.input('Change Email', 'Enter new email address:', 'New email');
    if (!newEmail) return;

    if (!validateEmail(newEmail)) {
      toastManager.error('Please enter a valid email address');
      return;
    }

    const password = await modalManager.input(
      'Change Email',
      'Enter your current password to confirm:',
      'Current password',
      true
    );
    if (!password) return;

    const loadingToast = toastManager.loading('Updating email...');

    try {
      const credential = EmailAuthProvider.credential(this.auth.currentUser.email, password);
      await reauthenticateWithCredential(this.auth.currentUser, credential);
      await updateEmail(this.auth.currentUser, newEmail);
      await sendEmailVerification(this.auth.currentUser);

      toastManager.hide(loadingToast);
      toastManager.success('Email updated! Please verify your new email address.');
    } catch (error) {
      toastManager.hide(loadingToast);

      if (error.code === 'auth/email-already-in-use') {
        toastManager.error('This email is already in use by another account.');
      } else {
        toastManager.error('Failed to update email: ' + error.message);
      }
    }
  }

  async deleteAccount() {
    const confirmed = await modalManager.confirm(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.'
    );
    if (!confirmed) return;

    const password = await modalManager.input(
      'Delete Account',
      'Enter your password to confirm account deletion:',
      'Password',
      true
    );
    if (!password) return;

    const loadingToast = toastManager.loading('Deleting account...');

    try {
      const credential = EmailAuthProvider.credential(this.auth.currentUser.email, password);
      await reauthenticateWithCredential(this.auth.currentUser, credential);
      await deleteUser(this.auth.currentUser);

      toastManager.hide(loadingToast);
      toastManager.success('Account deleted successfully.');
    } catch (error) {
      toastManager.hide(loadingToast);
      toastManager.error('Failed to delete account: ' + error.message);
    }
  }

  updatePasswordStrength(password) {
    const strengthEl = document.getElementById('password-strength');

    if (!password) {
      strengthEl.innerHTML = '';
      return;
    }

    const validation = validatePassword(password);
    const strength = this.getPasswordStrength(password);

    let requirements = [];
    if (!validation.minLength) requirements.push('6+ characters');
    if (!validation.hasCapital) requirements.push('1 capital letter');
    if (!validation.hasNumber) requirements.push('1 number');

    strengthEl.innerHTML = `
      <div style="color: ${strength.color}; font-weight: 500;">Strength: ${strength.strength}</div>
      ${requirements.length > 0 ? `<div style="color: var(--red); font-size: 0.8rem;">Missing: ${requirements.join(', ')}</div>` : ''}
    `;
  }

  getPasswordStrength(password) {
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

  updateUI(user) {
    const authBtn = document.getElementById('auth-btn');
    const signoutBtn = document.getElementById('signout-btn');

    if (user) {
      if (authBtn) authBtn.style.display = 'none';
      if (signoutBtn) {
        signoutBtn.style.display = 'inline-block';
        signoutBtn.onclick = () => this.handleSignOut();
      }
    } else {
      if (authBtn) {
        authBtn.style.display = 'inline-block';
        authBtn.onclick = () => this.openAuthModal();
      }
      if (signoutBtn) signoutBtn.style.display = 'none';
    }
  }

  openAuthModal() {
    modalManager.open('auth-modal');
  }
}

export default new AuthService();
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
  EmailAuthProvider,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  reauthenticateWithPopup
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, setDoc, deleteDoc, collection, getDocs, writeBatch, getDoc, runTransaction, query, where, limit } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { FIREBASE_PATHS, ADJECTIVES, NOUNS } from '../utils/constants.js';
import { ICONS } from '../utils/icons.js';
import { validatePassword, validateEmail, checkBadWords } from '../utils/validation.js';
import { sanitizeInput } from '../utils/sanitizer.js';
import toastManager from '../ui/toast-manager.js';
import modalManager from '../ui/modal-manager.js';
import errorHandler from '../utils/error-handler.js';

class AuthService {
  constructor() {
    this.auth = null;
    this.db = null;
    this.userId = null;
    this.loginAttempts = {};
    this.listenersInitialized = false;

    // Expose globally
    window.authService = this;
  }

  initialize(auth, db, userId) {
    this.auth = auth;
    this.db = db;
    this.userId = userId;

    if (userId) {
      this.ensureUsername(userId);
    }

    if (!this.listenersInitialized) {
      this.setupAuthEventListeners();
      this.listenersInitialized = true;
    }
  }

  async generateRandomUsername() {
    let username;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)].toLowerCase();
      const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)].toLowerCase();
      const num = Math.floor(10 + Math.random() * 90);
      username = `${adj}_${noun}${num}`;

      if (username.length > 20) {
        username = username.substring(0, 20);
      }

      const usernameRef = doc(this.db, FIREBASE_PATHS.usernameDoc(username));
      const docSnap = await getDoc(usernameRef);
      if (!docSnap.exists()) {
        isUnique = true;
      }
      attempts++;
    }

    return username;
  }

  async ensureUsername(userId) {
    try {
      const userDocRef = doc(this.db, FIREBASE_PATHS.userProfile(userId));
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        const username = userData.username;
        const email = userData.email || this.auth.currentUser?.email;

        if (!username) {
          const randomUsername = await this.generateRandomUsername();
          await this.updateUsername(userId, randomUsername, email);
        } else {
          // Verify registry entry exists and has email
          const usernameRef = doc(this.db, FIREBASE_PATHS.usernameDoc(username));
          const usernameSnap = await getDoc(usernameRef);

          if (!usernameSnap.exists() || !usernameSnap.data().email) {
            console.log(`Fixing missing/incomplete registry for ${username}`);
            await this.updateUsername(userId, username, email);
          }
        }
      }
    } catch (error) {
      console.error("Error ensuring username:", error);
    }
  }

  async updateUsername(userId, newUsername, userEmail = null) {
    if (!newUsername) {
      throw new Error("Username is required");
    }

    const cleanedUsername = newUsername.trim().toLowerCase();
    const usernameRegex = /^[a-z0-9_]{4,20}$/;

    if (!usernameRegex.test(cleanedUsername)) {
      throw new Error("Username must be 4-20 characters and contain only lowercase letters, numbers, and underscores.");
    }

    if (await checkBadWords(cleanedUsername)) {
      throw new Error("Invalid username content");
    }

    // Fallback to current user email if not provided
    const emailToStore = userEmail || this.auth.currentUser?.email;
    if (!emailToStore) {
      console.warn("Attempting to update username without an email association");
    }

    const usernameRef = doc(this.db, FIREBASE_PATHS.usernameDoc(cleanedUsername));
    const userRef = doc(this.db, FIREBASE_PATHS.userProfile(userId));

    try {
      await runTransaction(this.db, async (transaction) => {
        const usernameDoc = await transaction.get(usernameRef);
        if (usernameDoc.exists() && usernameDoc.data().userId !== userId) {
          throw new Error("Username already taken");
        }

        const userDoc = await transaction.get(userRef);
        const oldUsername = userDoc.data()?.username;

        if (oldUsername && oldUsername !== cleanedUsername) {
          transaction.delete(doc(this.db, FIREBASE_PATHS.usernameDoc(oldUsername)));
        }

        transaction.set(usernameRef, { userId, email: emailToStore });
        transaction.update(userRef, { username: cleanedUsername });
      });
      return true;
    } catch (error) {
      console.error("Update username error:", error);
      throw new Error(errorHandler.getFriendlyMessage(error));
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

    // Forgot password link
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    if (forgotPasswordLink) {
      forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleForgotPassword();
      });
    }
  }

  async handleSignIn(e) {
    if (e) e.preventDefault();
    // Ensure we have the latest instances
    if (!this.auth) this.auth = window.firebaseAuth;
    if (!this.db) this.db = window.firebaseDb;

    if (!this.auth || !this.db) {
      console.error("Firebase not initialized in AuthService");
      toastManager.error("Authentication system is not ready. Please refresh.");
      return;
    }

    const loginInput = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value.trim();

    if (!loginInput || !password) {
      toastManager.warning('Please fill in all fields.');
      return;
    }

    const loadingToast = toastManager.loading('Signing in...');

    try {
      let email = loginInput;

      // Check if input is a username (no @ symbol)
      if (!loginInput.includes('@')) {
        const usernameRef = doc(this.db, FIREBASE_PATHS.usernameDoc(loginInput.toLowerCase()));
        const usernameDoc = await getDoc(usernameRef);

        if (!usernameDoc.exists()) {
          toastManager.hide(loadingToast);
          toastManager.error("Username not found. Please check your spelling or use your email.");
          return;
        }

        email = usernameDoc.data().email;

        if (!email) {
          toastManager.hide(loadingToast);
          toastManager.error("Username link incomplete. Please sign in with your email address once to fix this.");
          return;
        }
      }

      if (!this.loginAttempts[email]) {
        this.loginAttempts[email] = 0;
      }

      if (this.loginAttempts[email] >= 5) {
        toastManager.hide(loadingToast);
        toastManager.error('Too many failed attempts. Account locked. Contact admin at lyssa.phat@gmail.com');
        return;
      }

      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      this.loginAttempts[email] = 0;

      // Fetch user name from Firestore for the greeting
      const userDocSnap = await getDoc(doc(this.db, FIREBASE_PATHS.userProfile(userCredential.user.uid)));
      const userName = userDocSnap.exists() ? userDocSnap.data().name : null;

      toastManager.hide(loadingToast);
      modalManager.close('auth-modal');

      // Check for profile completion
      await this.checkAndPromptProfileCompletion(userCredential.user.uid);

      toastManager.success(`Welcome back, ${userName || userCredential.user.displayName || 'Student'}!`);
    } catch (error) {
      toastManager.hide(loadingToast);
      console.error("Sign in error:", error);

      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        const email = loginInput.includes('@') ? loginInput : (await this.getEmailFromUsername(loginInput));
        if (email) {
          this.loginAttempts[email] = (this.loginAttempts[email] || 0) + 1;

          if (this.loginAttempts[email] >= 5) {
            toastManager.error('Too many failed attempts. Account locked.');
          } else if (this.loginAttempts[email] > 1) {
            this.showResetPasswordOption(email);
            toastManager.error(`Wrong password. ${5 - this.loginAttempts[email]} attempts remaining.`);
          } else {
            toastManager.error('Wrong password. Try again.');
          }
        } else {
          toastManager.error('Invalid credentials.');
        }
      } else if (error.code === 'auth/user-not-found') {
        toastManager.error('No account found with this email/username.');
      } else if (error.code === 'auth/too-many-requests') {
        toastManager.error(errorHandler.getFriendlyMessage(error));
      } else {
        toastManager.error(errorHandler.getFriendlyMessage(error));
      }
    }
  }

  async getEmailFromUsername(username) {
    try {
      const usernameRef = doc(this.db, FIREBASE_PATHS.usernameDoc(username.toLowerCase()));
      const usernameDoc = await getDoc(usernameRef);
      return usernameDoc.exists() ? usernameDoc.data().email : null;
    } catch (e) {
      return null;
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
      toastManager.error(errorHandler.getFriendlyMessage(error));
    }
  }

  async handleForgotPassword() {
    // 1. Try to get email from the sign-in input
    const loginInput = document.getElementById('signin-email').value.trim();
    let email = null;

    if (loginInput) {
      if (loginInput.includes('@')) {
        email = loginInput;
      } else {
        // Look up email if it's a username
        email = await this.getEmailFromUsername(loginInput);
      }
    }

    // 2. If no email found, prompt the user
    if (!email) {
      email = await modalManager.input(
        'Forgot Password',
        'Enter your email address to receive a reset link:',
        'your@email.com'
      );
    }

    if (!email) return;

    if (!validateEmail(email)) {
      toastManager.error('Please enter a valid email address.');
      return;
    }

    const loadingToast = toastManager.loading('Verifying account...');

    try {
      // Ensure we have the latest instances
      if (!this.auth) this.auth = window.firebaseAuth;
      if (!this.db) this.db = window.firebaseDb;

      if (!this.auth || !this.db) {
        throw new Error("Authentication system is not ready. Please refresh.");
      }

      // Manual check: See if this email exists in our registry

      // I'll use query on the collection
      const q = query(
        collection(this.db, FIREBASE_PATHS.usernames()),
        where("email", "==", email),
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toastManager.hide(loadingToast);
        toastManager.error('No account found with this email address.');
        return;
      }

      toastManager.update(loadingToast, 'Sending reset email...', 'loading');

      await sendPasswordResetEmail(this.auth, email);
      toastManager.hide(loadingToast);
      toastManager.success('Password reset email sent! Please check your inbox.');
    } catch (error) {
      toastManager.hide(loadingToast);
      console.error("Forgot password error:", error);

      if (error.code === 'permission-denied') {
        // Fallback: If query is blocked by security rules, just send the email anyway
        // and show a generic success message to prevent enumeration vulnerabilities.
        try {
          await sendPasswordResetEmail(this.auth, email);
          toastManager.success('If an account exists for this email, a reset link has been sent.');
        } catch (authError) {
          toastManager.error(errorHandler.getFriendlyMessage(authError));
        }
      } else {
        toastManager.error(errorHandler.getFriendlyMessage(error));
      }
    }
  }

  async handleSignUp() {
    // Ensure we have the latest auth instance
    if (!this.auth) this.auth = window.firebaseAuth;

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
      const randomUsername = await this.generateRandomUsername();
      await this.updateUsername(userCredential.user.uid, randomUsername, email);

      await setDoc(doc(this.db, FIREBASE_PATHS.userProfile(userCredential.user.uid)), {
        name,
        email,
        major: '',
        createdAt: new Date().toISOString()
      }, { merge: true });

      toastManager.hide(loadingToast);
      modalManager.close('auth-modal');
      toastManager.success('Account created! Please check your email to verify your account.');
    } catch (error) {
      toastManager.hide(loadingToast);

      if (error.code === 'auth/email-already-in-use') {
        toastManager.error(errorHandler.getFriendlyMessage(error));
      } else if (error.code === 'auth/weak-password') {
        toastManager.error(errorHandler.getFriendlyMessage(error));
      } else {
        toastManager.error(errorHandler.getFriendlyMessage(error));
      }
    }
  }

  async handleGoogleSignIn() {
    // Ensure we have the latest auth instance
    if (!this.auth) this.auth = window.firebaseAuth;

    const loadingToast = toastManager.loading('Connecting to Google...');

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      const user = result.user;

      // Check if user profile exists, if not create it
      // We can check if it's a new user via additionalUserInfo, but checking doc existence is safer
      // or just merge with existing data
      await setDoc(doc(this.db, FIREBASE_PATHS.userProfile(user.uid)), {
        name: user.displayName || 'Google User',
        email: user.email,
        // Don't overwrite existing major or createdAt if they exist
      }, { merge: true });

      // If it's a new user (createdAt missing), set it
      // Actually merge: true handles updates fine, but we might want to ensure createdAt is set only once.
      // For simplicity, we just updated the name/email.

      toastManager.hide(loadingToast);
      modalManager.close('auth-modal');

      // Check for profile completion
      await this.checkAndPromptProfileCompletion(user.uid);

      toastManager.success(`Welcome, ${user.displayName || 'User'}!`);

    } catch (error) {
      toastManager.hide(loadingToast);
      console.error("Google Sign In Error:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        toastManager.info(errorHandler.getFriendlyMessage(error));
      } else {
        toastManager.error(errorHandler.getFriendlyMessage(error));
      }
    }
  }

  async handleGithubSignIn() {
    // Ensure we have the latest auth instance
    if (!this.auth) this.auth = window.firebaseAuth;

    const loadingToast = toastManager.loading('Connecting to GitHub...');

    try {
      const provider = new GithubAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      const user = result.user;

      // Check if user profile exists, if not create it
      // We can check if it's a new user via additionalUserInfo, but checking doc existence is safer
      // or just merge with existing data
      await setDoc(doc(this.db, FIREBASE_PATHS.userProfile(user.uid)), {
        name: user.displayName || 'GitHub User',
        email: user.email,
        // Don't overwrite existing major or createdAt if they exist
      }, { merge: true });

      toastManager.hide(loadingToast);
      modalManager.close('auth-modal');

      // Check for profile completion
      await this.checkAndPromptProfileCompletion(user.uid);

      toastManager.success(`Welcome, ${user.displayName || 'User'}!`);

    } catch (error) {
      toastManager.hide(loadingToast);
      console.error("GitHub Sign In Error:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        toastManager.info(errorHandler.getFriendlyMessage(error));
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        toastManager.error(errorHandler.getFriendlyMessage(error));
      } else {
        toastManager.error(errorHandler.getFriendlyMessage(error));
      }
    }
  }

  async checkAndPromptProfileCompletion(uid) {
    try {
      const userDocRef = doc(this.db, FIREBASE_PATHS.userProfile(uid));
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        if (!userData.name || !userData.major) {
          // Open onboarding modal
          document.getElementById('onboarding-name').value = userData.name || '';
          document.getElementById('onboarding-major').value = userData.major || '';
          modalManager.open('onboarding-modal');
          return false; // Profile incomplete
        }
      }
      return true; // Profile complete
    } catch (error) {
      console.error("Error checking profile:", error);
      return true; // Fail safe to true to not block user if DB error
    }
  }

  async handleSaveProfile() {
    const nameInput = document.getElementById('onboarding-name');
    const majorInput = document.getElementById('onboarding-major');
    const name = nameInput.value.trim();
    const major = majorInput.value.trim();

    if (!name || !major) {
      toastManager.warning('Please fill in both Name and Major.');
      return;
    }

    if (await checkBadWords(name) || await checkBadWords(major)) {
      toastManager.error('Please use appropriate language.');
      return;
    }

    const loadingToast = toastManager.loading('Saving profile...');

    try {
      // Ensure auth is initialized
      if (!this.auth) this.auth = window.firebaseAuth;
      const user = this.auth.currentUser;

      if (!user) {
        throw new Error("No authenticated user found");
      }

      await setDoc(doc(this.db, FIREBASE_PATHS.userProfile(user.uid)), {
        name,
        major
      }, { merge: true });

      // Also update auth profile name if different
      if (user.displayName !== name) {
        // We'd need updateProfile from firebase-auth but it's not imported.
        // For now, firestore update is the source of truth for the app.
      }

      toastManager.hide(loadingToast);
      modalManager.close('onboarding-modal');
      toastManager.success('Profile updated! Welcome.');

      // Trigger any post-login UI updates (like sidebar name)
      // This might require a page reload or a specific event, checking app.js might be verified.
      // For now, reload window to ensure everything syncs is the safest for "first time" feeling
      setTimeout(() => window.location.reload(), 1000);

    } catch (error) {
      toastManager.hide(loadingToast);
      console.error("Save profile error:", error);
      toastManager.error(errorHandler.getFriendlyMessage(error));
    }
  }

  async handleSignOut() {
    // Ensure we have the latest auth instance
    if (!this.auth) this.auth = window.firebaseAuth;

    const confirmed = await modalManager.confirm('Sign Out', 'Are you sure you want to sign out?');
    if (!confirmed) return;

    // Force close any remaining modals immediately to prevent stacking issues
    modalManager.closeAll();

    const loadingToast = toastManager.loading('Signing out...');

    try {
      // 1. Reset UI immediately to avoid race conditions with auth state listeners
      this.resetUI();
      // Also forcibly hide the signout button and show auth button manually just in case
      this.updateUI(null);

      // 2. Perform sign out
      await signOut(this.auth);

      toastManager.hide(loadingToast);
      toastManager.success('Signed out successfully');

      // 3. Ensure scroll is free
      document.body.style.overflow = '';

      // 4. Force reload to clear any lingering React/DOM state if necessary (optional, but safer)
      // window.location.reload(); // Commented out to try soft reset first

      // Navigate to Dashboard
      if (window.navigateTo) {
        window.navigateTo('Dashboard');
      }

    } catch (error) {
      toastManager.hide(loadingToast);
      console.error('Sign out error:', error);
      toastManager.error(errorHandler.getFriendlyMessage(error));

      // Ensure scroll is free even on error
      document.body.style.overflow = '';
    }
  }

  resetUI() {
    try {
      const nameEl = document.getElementById('user-info-name');
      const majorEl = document.getElementById('user-info-major');
      const semEl = document.getElementById('user-info-semester');
      const streakEl = document.getElementById('streak-display');

      if (nameEl) nameEl.textContent = 'Hello, Student';
      if (majorEl) majorEl.textContent = 'Your Major';
      if (semEl) semEl.textContent = 'No semester selected';
      if (streakEl) {
        streakEl.innerHTML = `
            ${ICONS?.FIRE || '🔥'}
            0 day streak
        `;
        streakEl.style.color = 'var(--grey-text)';
      }
    } catch (e) {
      console.error('Error resetting UI:', e);
    }
  }

  async sendVerificationEmail() {
    try {
      await sendEmailVerification(this.auth.currentUser);
      toastManager.success('Verification email sent! Please check your inbox.');
    } catch (error) {
      toastManager.error(errorHandler.getFriendlyMessage(error));
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
      toastManager.error(errorHandler.getFriendlyMessage(error));
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

      toastManager.error(errorHandler.getFriendlyMessage(error));
    }
  }

  async deleteAccount() {
    const user = this.auth.currentUser;
    if (!user) return;

    const confirmed = await modalManager.confirm(
      'Delete Account',
      'Are you sure you want to delete your account? This action detects all your data (semesters, subjects, attendance) and cannot be undone.'
    );
    if (!confirmed) return;

    // Re-authentication
    const loadingReauth = toastManager.loading('Verifying identity...');
    try {
      const providerId = user.providerData[0]?.providerId;

      if (providerId === 'password') {
        const password = await modalManager.input(
          'Confirm Password',
          'Enter your password to confirm deletion:',
          'Password',
          true
        );
        if (!password) {
          toastManager.hide(loadingReauth);
          return;
        }
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
      } else if (providerId === 'google.com') {
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(user, provider);
      } else if (providerId === 'github.com') {
        const provider = new GithubAuthProvider();
        await reauthenticateWithPopup(user, provider);
      }
      toastManager.hide(loadingReauth);
    } catch (error) {
      toastManager.hide(loadingReauth);
      console.error("Re-auth failed:", error);
      toastManager.error('Authentication check failed. Please try again.');
      return;
    }

    const loadingDelete = toastManager.loading('Deleting account data...');

    try {
      // 1. Delete Firestore Data
      await this.deleteUserData(user.uid);

      // 2. Delete Auth User
      await deleteUser(user);

      toastManager.hide(loadingDelete);
      toastManager.success('Account deleted successfully.');

      // Reset UI
      this.resetUI();
      document.body.style.overflow = '';

      setTimeout(() => window.location.reload(), 1500);

    } catch (error) {
      toastManager.hide(loadingDelete);
      toastManager.error(errorHandler.getFriendlyMessage(error));
    }
  }

  async deleteUserData(uid) {
    // Helper to delete a collection
    const deleteCollection = async (path) => {
      const colRef = collection(this.db, path);
      const snapshot = await getDocs(colRef);
      const batch = writeBatch(this.db);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    };

    // Delete subcollections
    await deleteCollection(FIREBASE_PATHS.semesters(uid));
    await deleteCollection(FIREBASE_PATHS.subjects(uid));
    await deleteCollection(FIREBASE_PATHS.attendance(uid));
    await deleteCollection(FIREBASE_PATHS.tasks(uid));

    // Delete profile doc
    // Note: FIREBASE_PATHS.userProfile returns the path string "artifacts/.../profile/details"
    // We also want to delete the parent user doc if possible, but structure is:
    // artifacts/APP_ID/users/uid/ (contains profile/details, etc.)
    // We should delete the profile detail doc.
    await deleteDoc(doc(this.db, FIREBASE_PATHS.userProfile(uid)));
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
      <div style="color: ${sanitizeInput(strength.color)}; font-weight: 500;">Strength: ${sanitizeInput(strength.strength)}</div>
      ${requirements.length > 0 ? `<div style="color: var(--red); font-size: 0.8rem;">Missing: ${sanitizeInput(requirements.join(', '))}</div>` : ''}
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
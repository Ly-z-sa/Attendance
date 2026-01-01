// app.js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { onSnapshot, collection, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { FIREBASE_PATHS } from '../utils/constants.js';
import { ICONS } from '../utils/icons.js';
import { fetchRealTime } from '../utils/helpers.js';
import attendanceService from '../services/attendance-service.js';
import authService from '../services/auth-service.js';
import toastManager from '../ui/toast-manager.js';
import themeManager from '../ui/theme-manager.js';
import clickEffectManager from '../ui/click-effect-manager.js';
import dropdownManager from '../ui/dropdown-manager.js';
import dashboardPage from '../pages/dashboard-page.js';
import homePage from '../pages/home-page.js';
import weeklyReportPage from '../pages/weekly-report-page.js';
import totalPage from '../pages/total-page.js';
import settingsPage from '../pages/settings-page.js';
import navigationManager from '../ui/navigation-manager.js';

class App {
  constructor() {
    this.db = window.firebaseDb;
    this.auth = window.firebaseAuth;
    this.userId = null;
    this.currentPage = 'Dashboard';
    this.currentSemesterId = null;
    this.userProfile = {};
    this.allSemesters = [];
    this.allSubjects = [];
    this.unsubscribers = [];
  }

  async init() {
    try {
      console.log('Initializing app...');

      // Ensure firebaseAuth is available
      if (!this.auth && window.firebaseAuth) {
        this.auth = window.firebaseAuth;
      }
      if (!this.db && window.firebaseDb) {
        this.db = window.firebaseDb;
      }

      // Initialize UI managers
      toastManager.initialize();
      themeManager.initialize();
      dropdownManager.initialize();
      navigationManager.initialize();

      // Initialize pages
      dashboardPage.initialize();
      homePage.initialize();
      weeklyReportPage.initialize();
      totalPage.initialize();
      settingsPage.initialize();

      // Sync time
      await fetchRealTime();
      setInterval(fetchRealTime, 60 * 60 * 1000);

      // Setup navigation
      this.initializeNavigation();

      // Setup auth
      authService.initialize(this.auth, this.db, null);
      await this.handleAuth();

      // Initialize Click Effect Manager (replaces ClickSpark)
      clickEffectManager.initialize();

      console.log('App initialized successfully');
    } catch (error) {
      console.error('Error initializing app:', error);
      toastManager.error('Failed to initialize app. Please refresh the page.');
    }
  }

  initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        this.navigateTo(page);
      });
    });

    // Make navigateTo global for button clicks
    window.navigateTo = (page) => this.navigateTo(page);
  }

  navigateTo(pageName) {
    this.currentPage = pageName;

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.page === pageName);
    });

    // Update pages with page transition
    document.querySelectorAll('.page').forEach(page => {
      if (page.dataset.page === pageName) {
        page.style.display = 'block';
        requestAnimationFrame(() => {
          page.classList.add('active');
        });
      } else {
        page.classList.remove('active');
        setTimeout(() => {
          if (!page.classList.contains('active')) {
            page.style.display = 'none';
          }
        }, 300);
      }
    });

    this.renderCurrentPage();
  }

  async handleAuth() {
    if (!this.auth) {
      console.error('Auth not initialized. Retrying from window.firebaseAuth...');
      this.auth = window.firebaseAuth;
      if (!this.auth) {
        toastManager.error("Authentication Service Error: Please refresh the page.");
        return;
      }
    }

    onAuthStateChanged(this.auth, async (user) => {
      // Graceful handling of null/undefined user
      if (user) {
        console.log("User authenticated:", user.uid);
        this.userId = user.uid;

        // Initialize services
        attendanceService.initialize(this.db, this.userId);
        authService.initialize(this.auth, this.db, this.userId);

        // Load user data
        this.loadUserProfile();
        this.loadSemesters();
        this.loadSubjects();

        // Subscribe to attendance changes
        attendanceService.subscribe(() => {
          this.renderCurrentPage();
        });

        authService.updateUI(user);
        this.navigateTo('Dashboard');

      } else {
        console.log("User not authenticated");
        this.userId = null; // Clear userId

        // Clear Page Data
        if (dashboardPage) dashboardPage.clear();
        if (settingsPage) settingsPage.clear();

        // Clear cached data in app
        this.userProfile = {};
        this.allSemesters = [];
        this.allSubjects = [];
        this.allAttendance = [];

        authService.updateUI(null);

        // Immediate check and open
        // We use a tiny delay (50ms) just to ensure the DOM is fully ready
        setTimeout(() => {
          // ONLY open if not already open to prevent focus stealing/resetting or loops
          if (!window.modalManager.activeModals.has('auth-modal')) {
            console.log("Opening Main Auth Modal (Auto)");
            authService.openAuthModal();
          }
        }, 50);
      }
    });
  }

  loadUserProfile() {
    const unsubscribe = onSnapshot(
      doc(this.db, FIREBASE_PATHS.userProfile(this.userId)),
      (docSnap) => {
        if (docSnap.exists()) {
          this.userProfile = docSnap.data();
          this.currentSemesterId = this.userProfile.currentSemesterId || null;
        }
        this.renderCurrentPage();
      }
    );
    this.unsubscribers.push(unsubscribe);
  }

  loadSemesters() {
    const unsubscribe = onSnapshot(
      collection(this.db, FIREBASE_PATHS.semesters(this.userId)),
      (snapshot) => {
        this.allSemesters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        this.renderCurrentPage();
      }
    );
    this.unsubscribers.push(unsubscribe);
  }

  loadSubjects() {
    const unsubscribe = onSnapshot(
      collection(this.db, FIREBASE_PATHS.subjects(this.userId)),
      (snapshot) => {
        this.allSubjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        this.renderCurrentPage();
      }
    );
    this.unsubscribers.push(unsubscribe);
  }

  renderCurrentPage() {
    if (!this.userId) return;

    this.updateHeader();

    switch (this.currentPage) {
      case 'Dashboard':
        dashboardPage.render(this.currentSemesterId, this.allSemesters, this.allSubjects);
        break;
      case 'Home':
        homePage.render(this.currentSemesterId, this.allSemesters, this.allSubjects);
        break;
      case 'WeeklyReport':
        weeklyReportPage.render(this.currentSemesterId, this.allSemesters, this.allSubjects);
        break;
      case 'Total':
        totalPage.render(this.currentSemesterId, this.allSemesters, this.allSubjects);
        break;
      case 'Settings':
        settingsPage.render(this.userProfile, this.currentSemesterId, this.allSemesters, this.allSubjects);
        break;
    }
  }

  updateHeader() {
    if (this.userProfile.name) {
      document.getElementById('user-info-name').textContent = `Hello, ${this.userProfile.name}`;
    }
    if (this.userProfile.major) {
      document.getElementById('user-info-major').textContent = this.userProfile.major;
    }

    const currentSem = this.allSemesters.find(s => s.id === this.currentSemesterId);
    if (currentSem) {
      document.getElementById('user-info-semester').textContent = currentSem.name;
    } else {
      document.getElementById('user-info-semester').textContent = "No semester selected";
    }

    // Update streak
    const streak = attendanceService.calculateStreak(this.currentSemesterId, this.allSubjects);
    const streakEl = document.getElementById('streak-display');

    if (streak === 0) {
      streakEl.innerHTML = `
        ${ICONS.FIRE}
        0 day streak
      `;
      streakEl.style.color = 'var(--grey-text)';
    } else {
      streakEl.innerHTML = `
        ${ICONS.FIRE}
        ${streak} day${streak !== 1 ? 's' : ''} streak
      `;
      streakEl.style.color = 'var(--green)';
    }
  }

  cleanup() {
    this.unsubscribers.forEach(unsub => unsub());
    attendanceService.cleanup();
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();

  // Expose app globally for debugging
  window.app = app;
});
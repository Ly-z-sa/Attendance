// app.js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { onSnapshot, collection, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getTodayDateString, getCurrentDayName } from './utils/helpers.js';
import { FIREBASE_PATHS, STREAK_REQUIREMENTS } from './utils/constants.js';
import { ICONS } from './utils/icons.js';
import csrfProtection from './utils/csrf-protection.js';
import attendanceService from './services/attendance-service.js';
import authService from './services/auth-service.js';
import toastManager from './ui/toast-manager.js';
import themeManager from './ui/theme-manager.js';
import clickEffectManager from './ui/click-effect-manager.js';
import dropdownManager from './ui/dropdown-manager.js';
import assistantManager from './ui/assistant-manager.js';
import dashboardPage from './pages/dashboard-page.js';
import homePage from './pages/home-page.js';
import weeklyReportPage from './pages/weekly-report-page.js';
import totalPage from './pages/total-page.js';
import settingsPage from './pages/settings-page.js';
import focusPage from './pages/focus-page.js';
import navigationManager from './ui/navigation-manager.js';
import notificationService from './services/notification-service.js';
import errorHandler from './utils/error-handler.js';

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
    this.shownMilestones = new Set(JSON.parse(localStorage.getItem('shownMilestones') || '[]'));
    this.lastStreak = parseInt(localStorage.getItem('lastStreak') || '0');
  }

  async init() {
    try {
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
      assistantManager.initialize();

      // Initialize pages
      dashboardPage.initialize();
      homePage.initialize();
      weeklyReportPage.initialize();
      totalPage.initialize();
      settingsPage.initialize();
      focusPage.initialize();

      // Setup navigation
      this.initializeNavigation();

      // Setup auth
      authService.initialize(this.auth, this.db, null);
      await this.handleAuth();

      // Initialize Click Effect Manager
      clickEffectManager.initialize();

    } catch (error) {
      console.error('Error initializing app:', error);
      toastManager.error(errorHandler.getFriendlyMessage(error));
    }
  }

  initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      // Add CSRF token to navigation links
      csrfProtection.addTokenToElement(link);

      link.addEventListener('click', (e) => {
        e.preventDefault();

        // Validate CSRF token before navigation
        if (!csrfProtection.validateElementToken(e.currentTarget)) {
          console.warn('CSRF token validation failed for navigation');
          toastManager.error('Security validation failed. Please refresh the page.');
          return;
        }

        const page = link.dataset.page;
        this.navigateTo(page);
      });
    });

    // Make navigateTo global for button clicks with CSRF protection
    window.navigateTo = (page) => {
      // Generate a new token for programmatic navigation
      const token = csrfProtection.getToken();
      if (token) {
        this.navigateTo(page);
      } else {
        toastManager.error('Security validation failed. Please refresh the page.');
      }
    };
  }

  navigateTo(pageName) {
    try {
      if (!pageName || typeof pageName !== 'string') {
        console.warn('Invalid page name provided:', pageName);
        return;
      }

      this.currentPage = pageName;

      // Update nav links with error handling
      try {
        document.querySelectorAll('.nav-link').forEach(link => {
          if (link && link.dataset) {
            link.classList.toggle('active', link.dataset.page === pageName);
          }
        });
      } catch (navError) {
        console.error('Error updating navigation links:', navError);
      }

      // Update pages with page transition
      try {
        document.querySelectorAll('.page').forEach(page => {
          if (!page || !page.dataset) return;

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
      } catch (pageError) {
        console.error('Error updating page visibility:', pageError);
      }

      this.renderCurrentPage();
    } catch (error) {
      console.error('Error navigating to page:', error);
      toastManager.error('Navigation failed. Please try again.');
    }
  }

  async handleAuth() {
    try {
      if (!this.auth) {
        console.error('Auth not initialized. Retrying from window.firebaseAuth...');
        this.auth = window.firebaseAuth;
        if (!this.auth) {
          throw new Error('Firebase Auth service unavailable');
        }
      }

      onAuthStateChanged(this.auth, async (user) => {
        try {
          if (user) {
            this.userId = user.uid;

            // Initialize services with error handling
            try {
              attendanceService.initialize(this.db, this.userId);
              authService.initialize(this.auth, this.db, this.userId);
            } catch (serviceError) {
              console.error('Service initialization error:', serviceError);
              toastManager.error('Failed to initialize services. Some features may not work.');
            }

            // Load user data with error handling
            try {
              this.loadUserProfile();
              this.loadSemesters();
              this.loadSubjects();
            } catch (dataError) {
              console.error('Data loading error:', dataError);
              toastManager.error('Failed to load user data. Please refresh the page.');
            }

            // Subscribe to attendance changes
            try {
              attendanceService.subscribe(() => {
                this.renderCurrentPage();
              });
            } catch (subscriptionError) {
              console.error('Subscription error:', subscriptionError);
            }

            try {
              authService.updateUI(user);
              notificationService.init();
            } catch (uiError) {
              console.error('UI update error:', uiError);
            }

            // Expose for debugging
            window.notificationService = notificationService;

            this.navigateTo('Dashboard');

          } else {
            // Sign out cleanup
            this.cleanup();
            this.userId = null;

            // Clear Page Data safely
            try {
              if (dashboardPage) dashboardPage.clear();
              if (settingsPage) settingsPage.clear();
            } catch (clearError) {
              console.error('Error clearing page data:', clearError);
            }

            // Clear cached data in app
            this.userProfile = {};
            this.allSemesters = [];
            this.allSubjects = [];
            this.allAttendance = [];

            try {
              authService.updateUI(null);
            } catch (uiError) {
              console.error('Error updating UI for unauthenticated state:', uiError);
            }

            // Delayed modal opening with error handling
            setTimeout(() => {
              try {
                if (!window.modalManager?.activeModals?.has('auth-modal')) {
                  authService.openAuthModal();
                }
              } catch (modalError) {
                console.error('Error opening auth modal:', modalError);
                toastManager.error('Please sign in to continue.');
              }
            }, 50);
          }
        } catch (authStateError) {
          console.error('Auth state change error:', authStateError);
          toastManager.error('Authentication error occurred. Please refresh the page.');
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      toastManager.error('Authentication service failed to initialize. Please refresh the page.');
    }
  }

  loadUserProfile() {
    try {
      const unsubscribe = onSnapshot(
        doc(this.db, FIREBASE_PATHS.userProfile(this.userId)),
        (docSnap) => {
          try {
            if (docSnap.exists()) {
              this.userProfile = docSnap.data();
              this.currentSemesterId = this.userProfile.currentSemesterId || null;

              // Auto-assign or verify username registry association
              if (this.userId) {
                authService.ensureUsername(this.userId);
              }
            }
            this.updateNotificationContext();
            this.renderCurrentPage();
          } catch (snapshotError) {
            console.error('Error processing user profile snapshot:', snapshotError);
            toastManager.error('Failed to load user profile data.');
          }
        },
        (error) => {
          if (this.userId) { // Suppress error if we've already logged out
            console.error('User profile snapshot error:', error);
            toastManager.error('Failed to sync user profile. Please check your connection.');
          }
        }
      );
      this.unsubscribers.push(unsubscribe);
    } catch (error) {
      console.error('Error setting up user profile listener:', error);
      toastManager.error('Failed to initialize user profile sync.');
    }
  }

  loadSemesters() {
    try {
      const unsubscribe = onSnapshot(
        collection(this.db, FIREBASE_PATHS.semesters(this.userId)),
        (snapshot) => {
          try {
            this.allSemesters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.updateNotificationContext();
            this.renderCurrentPage();
          } catch (snapshotError) {
            console.error('Error processing semesters snapshot:', snapshotError);
            toastManager.error('Failed to load semester data.');
          }
        },
        (error) => {
          if (this.userId) {
            console.error('Semesters snapshot error:', error);
            toastManager.error('Failed to sync semesters. Please check your connection.');
          }
        }
      );
      this.unsubscribers.push(unsubscribe);
    } catch (error) {
      console.error('Error setting up semesters listener:', error);
      toastManager.error('Failed to initialize semesters sync.');
    }
  }

  loadSubjects() {
    try {
      const unsubscribe = onSnapshot(
        collection(this.db, FIREBASE_PATHS.subjects(this.userId)),
        (snapshot) => {
          try {
            this.allSubjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.updateNotificationContext();
            this.renderCurrentPage();
          } catch (snapshotError) {
            console.error('Error processing subjects snapshot:', snapshotError);
            toastManager.error('Failed to load subjects data.');
          }
        },
        (error) => {
          if (this.userId) {
            console.error('Subjects snapshot error:', error);
            toastManager.error('Failed to sync subjects. Please check your connection.');
          }
        }
      );
      this.unsubscribers.push(unsubscribe);
    } catch (error) {
      console.error('Error setting up subjects listener:', error);
      toastManager.error('Failed to initialize subjects sync.');
    }
  }

  renderCurrentPage() {
    try {
      if (!this.userId) return;

      this.updateHeader();
      this.updateNotificationBadge();

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
        case 'Focus':
          focusPage.render();
          break;
        default:
          console.warn('Unknown page:', this.currentPage);
          this.navigateTo('Dashboard');
      }
    } catch (error) {
      console.error('Error rendering page:', error);
      toastManager.error(errorHandler.getFriendlyMessage(error));
    }
  }

  updateNotificationContext() {
    try {
      notificationService.setContext(
        attendanceService,
        this.allSubjects,
        this.currentSemesterId,
        this.allSemesters.find(s => s.id === this.currentSemesterId)
      );
    } catch (error) {
      console.error('Error updating notification context:', error);
    }
  }

  checkMilestone() {
    const streak = attendanceService.calculateStreak(this.currentSemesterId, this.allSubjects);

    // STRICT ENFORCEMENT: Revert locked items if streak is lost
    this.enforcePersonalizationLocks(streak);

    const milestones = [3, 7, 10, 15, 21, 30, 50, 75, 100, 150, 200, 365];
    const isMilestone = milestones.includes(streak);

    if (streak === 0) {
      this.shownMilestones.clear();
      localStorage.removeItem('shownMilestones');
      this.lastStreak = 0;
      localStorage.removeItem('lastStreak');
    } else if (isMilestone && streak > this.lastStreak && !this.shownMilestones.has(streak)) {
      this.createFireAnimation();

      const milestoneMessage = this.getMilestoneMessage(streak);
      toastManager.success(milestoneMessage, 5000);
      this.shownMilestones.add(streak);
      localStorage.setItem('shownMilestones', JSON.stringify([...this.shownMilestones]));
    }
  }

  enforcePersonalizationLocks(streak) {
    let revertedCount = 0;
    const itemsReverted = [];

    // 1. Color Scheme
    const currentScheme = themeManager.getColorScheme();
    const reqScheme = STREAK_REQUIREMENTS[currentScheme] || 0;
    if (streak < reqScheme) {
      themeManager.applyColorScheme('default');
      itemsReverted.push('Color Scheme');
      revertedCount++;
    }

    // 2. Background
    const currentBg = themeManager.getBackground();
    const reqBg = STREAK_REQUIREMENTS[currentBg] || 0;
    if (streak < reqBg) {
      themeManager.applyBackground('default');
      itemsReverted.push('Background');
      revertedCount++;
    }

    // 3. Font
    const currentFont = themeManager.getFont();
    const reqFont = STREAK_REQUIREMENTS[currentFont] || 0;
    if (streak < reqFont) {
      themeManager.applyFont('philosopher');
      itemsReverted.push('Font');
      revertedCount++;
    }

    // 4. Click Effect
    const currentEffect = clickEffectManager.getEffect();
    const reqEffect = STREAK_REQUIREMENTS[currentEffect] || 0;
    if (streak < reqEffect) {
      clickEffectManager.applyEffect('none');
      itemsReverted.push('Click Effect');
      revertedCount++;
    }

    if (revertedCount > 0) {
      toastManager.warning(
        `Personalization Reset: ${itemsReverted.join(', ')} reverted because streak requirements are no longer met.`,
        6000
      );
      // Re-render settings if currently viewing it
      if (this.currentPage === 'Settings') {
        this.renderCurrentPage();
      }
    }
  }

  getMilestoneMessage(streak) {
    const messages = {
      3: '🔥 3-Day Streak! You\'re on fire!',
      7: '🌟 One Week Strong! Amazing consistency!',
      10: '💪 10 Days! You\'re building great habits!',
      15: '🚀 15-Day Streak! Unstoppable!',
      21: '💎 21 Days! Habit formation complete!',
      30: '👑 30-Day Streak! You\'re a champion!',
      50: '🏆 50 Days! Incredible dedication!',
      75: '⭐ 75-Day Streak! You\'re a legend!',
      100: '🎯 100 DAYS! Absolutely phenomenal!',
      150: '🌈 150 Days! Beyond amazing!',
      200: '🎊 200-Day Streak! You\'re unstoppable!',
      365: '🎉 ONE YEAR STREAK! You\'re absolutely incredible!'
    };
    return messages[streak] || `🔥 ${streak}-Day Streak! Keep it up!`;
  }

  updateHeader() {
    try {
      if (this.userProfile.name) {
        const nameElement = document.getElementById('user-info-name');
        if (nameElement) {
          nameElement.textContent = `Hello, ${this.userProfile.name}`;
        }
      }
      if (this.userProfile.major) {
        const majorElement = document.getElementById('user-info-major');
        if (majorElement) {
          majorElement.textContent = this.userProfile.major;
        }
      }

      const currentSem = this.allSemesters.find(s => s.id === this.currentSemesterId);
      const semesterElement = document.getElementById('user-info-semester');
      if (semesterElement) {
        if (currentSem) {
          semesterElement.textContent = currentSem.name;
        } else {
          semesterElement.textContent = "No semester selected";
        }
      }

      // Update Avatar/Username
      if (this.userProfile.username) {
        const usernameElement = document.getElementById('user-info-username');
        if (usernameElement) {
          usernameElement.textContent = `@${this.userProfile.username}`;
        }
      }

      const avatarPreview = document.getElementById('header-avatar-preview');
      if (avatarPreview) {
        if (this.userProfile.photoURL) {
          avatarPreview.style.backgroundImage = `url('${this.userProfile.photoURL}')`;
          avatarPreview.innerHTML = '';
          avatarPreview.style.cursor = 'pointer';
          avatarPreview.onclick = () => {
            if (window.settingsPage && window.settingsPage.showProfilePicture) {
              window.settingsPage.showProfilePicture(this.userProfile.photoURL);
            }
          };
        } else {
          avatarPreview.style.backgroundImage = 'none';
          avatarPreview.innerHTML = ICONS.USER_SOLID;
          avatarPreview.style.cursor = 'default';
          avatarPreview.onclick = null;
        }
      }

      // Update streak
      const streak = attendanceService.calculateStreak(this.currentSemesterId, this.allSubjects);
      const streakEl = document.getElementById('streak-display');

      if (streakEl) {
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

        this.lastStreak = streak;
        localStorage.setItem('lastStreak', streak.toString());
      }
    } catch (error) {
      console.error('Error updating header:', error);
    }
  }

  updateNotificationBadge() {
    try {
      if (!this.userId || !this.currentSemesterId) return;

      const today = getTodayDateString();
      const dayName = getCurrentDayName();

      const todaysSubjects = this.allSubjects.filter(s =>
        s.semesterId === this.currentSemesterId &&
        s.day === dayName
      );

      const todaysAttendance = attendanceService.getForDate(today);

      const unmarkedCount = todaysSubjects.filter(subject =>
        !todaysAttendance.find(r => r.subjectId === subject.id)
      ).length;

      const navLink = document.querySelector('.nav-link[data-page="Home"]');
      if (navLink) {
        let badge = navLink.querySelector('.nav-badge');
        if (unmarkedCount > 0) {
          if (!badge) {
            badge = document.createElement('span');
            badge.className = 'nav-badge';
            navLink.appendChild(badge);
          }
          badge.textContent = unmarkedCount > 9 ? '9+' : unmarkedCount;
          navLink.classList.add('has-badge');
          // Add extra padding to prevent text overlap
          navLink.style.paddingRight = '26px';
        } else {
          if (badge) badge.remove();
          navLink.classList.remove('has-badge');
          navLink.style.paddingRight = '';
        }
      }

    } catch (e) {
      console.error("Error updating badge", e);
    }
  }

  createFireAnimation() {
    const overlay = document.createElement('div');
    overlay.className = 'fire-overlay';
    document.body.appendChild(overlay);

    const colors = ['#ff4500', '#ff6b00', '#ff8c00', '#ff2d00', '#ff9500', '#ffaa00', '#ff1100'];

    // Create 40 random fire icons
    for (let i = 0; i < 40; i++) {
      setTimeout(() => {
        const fire = document.createElement('div');
        fire.className = 'fire-icon';
        fire.style.left = Math.random() * 100 + '%';
        fire.style.bottom = '-60px';
        fire.style.width = (25 + Math.random() * 35) + 'px';
        fire.style.height = fire.style.width;
        fire.style.animationDelay = Math.random() * 0.5 + 's';
        fire.style.animationDuration = (2.5 + Math.random() * 1.5) + 's';
        fire.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${colors[Math.floor(Math.random() * colors.length)]}" style="width: 100%; height: 100%;"><path fill-rule="evenodd" d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177 7.547 7.547 0 01-1.705-1.715.75.75 0 00-1.152-.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248zM15.75 14.25a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clip-rule="evenodd" /></svg>`;
        overlay.appendChild(fire);
      }, Math.random() * 1500);
    }

    setTimeout(() => {
      document.body.removeChild(overlay);
    }, 5000);
  }

  cleanup() {
    try {
      this.unsubscribers.forEach(unsub => {
        try {
          if (typeof unsub === 'function') unsub();
        } catch (unsubError) {
          console.error('Error unsubscribing:', unsubError);
        }
      });
      this.unsubscribers = [];
      attendanceService.cleanup();

      // Focus page cleanup
      if (window.focusPage && window.focusPage.cleanup) {
        window.focusPage.cleanup();
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();

  // Global error handler
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (toastManager && toastManager.error) {
      toastManager.error('An unexpected error occurred. Please refresh if issues persist.');
    }
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (toastManager && toastManager.error) {
      toastManager.error('A network or data error occurred. Please check your connection.');
    }
    event.preventDefault(); // Prevent default browser error handling
  });

  // Initialize app with error handling
  app.init().catch(error => {
    console.error('Failed to initialize app:', error);
    if (toastManager && toastManager.error) {
      toastManager.error('Failed to start the application. Please refresh the page.');
    }
  });

  // Expose app globally for debugging
  window.app = app;

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    try {
      app.cleanup();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  });
});
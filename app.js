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
import i18nService from './services/i18n-service.js';
import errorHandler from './utils/error-handler.js';
import tutorialManager from './ui/tutorial-manager.js';

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

      // Update static UI translations
      this.updateStaticTranslations();

      // Initialize Auth Language Dropdown
      const authLangDropdown = document.getElementById('auth-language-dropdown');
      if (authLangDropdown) {
        const currentLang = i18nService.getCurrentLanguage();
        const display = document.getElementById('auth-lang-display');
        const options = authLangDropdown.querySelectorAll('.dropdown-option');

        // Set initial value
        authLangDropdown.dataset.value = currentLang;
        const selectedOption = Array.from(options).find(opt => opt.dataset.value === currentLang);
        if (selectedOption && display) {
          display.textContent = selectedOption.textContent;
        }

        // Add click handlers for options
        options.forEach(option => {
          option.addEventListener('click', (e) => {
            const lang = e.target.dataset.value;
            if (lang !== i18nService.getCurrentLanguage()) {
              i18nService.setLanguage(lang);
            }
          });
        });
      }


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

  // Map page names to display titles (translated)
  getPageTitle(pageName) {
    const pageTitleKeys = {
      'Dashboard': 'nav.dashboard',
      'Home': 'nav.home',
      'WeeklyReport': 'nav.weeklyreport',
      'Total': 'nav.total',
      'Focus': 'nav.focus',
      'Settings': 'nav.settings'
    };
    const key = pageTitleKeys[pageName];
    return key ? i18nService.t(key) : pageName;
  }

  // Update the browser tab title
  updatePageTitle() {
    const pageTitle = this.getPageTitle(this.currentPage);
    const appName = i18nService.t('common.appName') || 'Attendance Tracker';
    document.title = `${pageTitle} - ${appName}`;
  }

  navigateTo(pageName) {
    try {
      if (!pageName || typeof pageName !== 'string') {
        console.warn('Invalid page name provided:', pageName);
        return;
      }

      this.currentPage = pageName;

      // Update browser tab title
      this.updatePageTitle();

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

            // Check if tutorial should be shown for new users (per account, not per device)
            // Small delay to ensure page is fully rendered
            setTimeout(() => {
              tutorialManager.startIfNeeded(this.userId);
            }, 500);

          } else {
            // User is signed out
            if (this.isAuthenticated) {
              toastManager.info(i18nService.t('toast.signedOut.title'), 3000, i18nService.t('toast.signedOut.detail'));
            }
            this.isAuthenticated = false;
            this.userId = null;
            this.userEmail = null;
            authService.updateUI(null); // Original line, assuming updateAuthUI is a new method in App.js
            // Sign out cleanup
            this.cleanup();

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

    // Personalization is now freely selectable - no streak requirements enforced

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
      1: i18nService.t('milestones.day1'),
      3: i18nService.t('milestones.day3'),
      5: i18nService.t('milestones.day5'),
      7: i18nService.t('milestones.day7'),
      10: i18nService.t('milestones.day10'),
      14: i18nService.t('milestones.day14'),
      30: i18nService.t('milestones.day30'),
      50: i18nService.t('milestones.day50'),
      100: i18nService.t('milestones.day100'),
      150: i18nService.t('milestones.day150'),
      200: i18nService.t('milestones.day200'),
      365: i18nService.t('milestones.day365')
    };
    return messages[streak] || `🔥 ${streak}-${i18nService.t('dashboard.streakCount', { count: streak })}!`;
  }

  updateStaticTranslations() {
    // Update navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
      const page = link.dataset.page;
      const key = page.toLowerCase();
      if (i18nService.languages[i18nService.getCurrentLanguage()].nav[key]) {
        // Keep the badge if it exists
        const badge = link.querySelector('.nav-badge');
        link.textContent = i18nService.t(`nav.${key}`);
        if (badge) link.appendChild(badge);
      }
    });

    // Update Page Headers
    const headers = {
      'Dashboard': 'dashboard.title',
      'Home': 'attendance.title',
      'WeeklyReport': 'nav.weeklyreport',
      'Total': 'nav.total',
      'Focus': 'nav.focus',
      'Settings': 'nav.settings'
    };

    Object.entries(headers).forEach(([page, key]) => {
      const header = document.querySelector(`.page[data-page="${page}"] .page-header h2`);
      if (header) {
        header.textContent = i18nService.t(key);
      }
    });

    // Update common static elements
    const welcomeName = document.getElementById('user-info-name');
    if (welcomeName && welcomeName.textContent === 'Hello, Student') {
      welcomeName.textContent = i18nService.t('dashboard.helloStudent');
    }

    const majorElement = document.getElementById('user-info-major');
    if (majorElement && !this.userProfile?.major) {
      majorElement.textContent = i18nService.t('settings.yourMajor');
    }

    const semesterElement = document.getElementById('user-info-semester');
    const currentSem = this.allSemesters?.find(s => s.id === this.currentSemesterId);
    if (semesterElement && !currentSem) {
      semesterElement.textContent = i18nService.t('settings.noSemesterSelected');
    }

    // Export dropdown
    const exportTypeDisplay = document.getElementById('export-type-display');
    if (exportTypeDisplay) {
      const exportDropdown = document.getElementById('export-type-dropdown');
      const currentValue = exportDropdown?.dataset?.value || '';
      exportTypeDisplay.textContent = currentValue === 'weekly' ? i18nService.t('export.weeklyReport') :
        currentValue === 'monthly' ? i18nService.t('export.monthlyReport') :
          currentValue === 'semester' ? i18nService.t('export.fullSemester') :
            i18nService.t('export.toExcel');
    }
    const exportOptions = document.querySelectorAll('#export-type-dropdown .dropdown-option');
    const exportValues = ['weekly', 'monthly', 'semester'];
    const exportKeys = ['export.weeklyReport', 'export.monthlyReport', 'export.fullSemester'];
    exportOptions.forEach(opt => {
      const idx = exportValues.indexOf(opt.dataset.value);
      if (idx !== -1) opt.textContent = i18nService.t(exportKeys[idx]);
    });

    const todayDateDisplay = document.getElementById('selected-date-display');
    if (todayDateDisplay && todayDateDisplay.textContent === 'Today') {
      todayDateDisplay.textContent = i18nService.t('common.today');
    }

    const homeDayTitle = document.getElementById('home-day-title');
    if (homeDayTitle) {
      homeDayTitle.textContent = i18nService.t('attendance.title');
    }

    // Update Onboarding Modal
    const onboardingTitle = document.getElementById('onboarding-modal-title');
    if (onboardingTitle) onboardingTitle.textContent = i18nService.t('onboarding.title');

    const onboardingSubtitle = document.querySelector('#onboarding-modal .modal-body p');
    if (onboardingSubtitle) onboardingSubtitle.textContent = i18nService.t('onboarding.subtitle');

    const nameLabel = document.querySelector('label[for="onboarding-name"]');
    if (nameLabel) nameLabel.textContent = i18nService.t('settings.fullName');

    const majorLabel = document.querySelector('label[for="onboarding-major"]');
    if (majorLabel) majorLabel.textContent = i18nService.t('settings.major');

    const onboardingSaveBtn = document.getElementById('onboarding-save-btn');
    if (onboardingSaveBtn) onboardingSaveBtn.textContent = i18nService.t('onboarding.saveAndContinue');

    // Update Report Modal
    const reportTitle = document.querySelector('#report-modal h4');
    if (reportTitle) reportTitle.textContent = i18nService.t('report.title');

    const problemTypeLabel = document.querySelector('#report-modal .form-group label');
    if (problemTypeLabel) problemTypeLabel.textContent = i18nService.t('report.type');

    const reportTypeDisplay = document.getElementById('report-type-display');
    if (reportTypeDisplay) reportTypeDisplay.textContent = i18nService.t('report.selectType');

    const reportOptions = document.querySelectorAll('#report-modal .dropdown-option');
    const reportOptionKeys = ['Bug', 'Crash', 'Feature', 'Other'];
    const reportTranslationKeys = ['report.bug', 'report.crash', 'report.feature', 'report.other'];
    reportOptions.forEach(opt => {
      const idx = reportOptionKeys.indexOf(opt.dataset.value);
      if (idx !== -1) opt.textContent = i18nService.t(reportTranslationKeys[idx]);
    });

    const reportDescLabel = document.querySelector('label[for="report-description"]');
    if (reportDescLabel) reportDescLabel.textContent = i18nService.t('report.description');

    const reportDescInput = document.getElementById('report-description');
    if (reportDescInput) reportDescInput.placeholder = i18nService.t('report.placeholder');

    const submitReportBtn = document.getElementById('submit-report-btn');
    if (submitReportBtn) submitReportBtn.textContent = i18nService.t('report.submit');

    // Update Confirm Modal
    const confirmTitle = document.getElementById('confirm-modal-title');
    if (confirmTitle) confirmTitle.textContent = 'Confirm Action'; // This is usually dynamic via modal-manager

    const confirmCancelBtn = document.querySelector('#confirm-modal .btn[data-modal-close="confirm-modal"]');
    if (confirmCancelBtn) confirmCancelBtn.textContent = i18nService.t('common.cancel');

    const confirmConfirmBtn = document.getElementById('confirm-modal-confirm');
    if (confirmConfirmBtn) confirmConfirmBtn.textContent = i18nService.t('modals.confirmAction');

    // Update Subject Modal
    const subjectTitle = document.getElementById('subject-modal-title');
    if (subjectTitle) {
      const isEdit = document.getElementById('subject-modal-id')?.value;
      subjectTitle.textContent = isEdit ? i18nService.t('modals.editSubject') : i18nService.t('modals.addSubject');
    }
    const subjectNameLabel = document.querySelector('label[for="subject-modal-name"]');
    if (subjectNameLabel) subjectNameLabel.textContent = i18nService.t('modals.subjectName');
    const subjectNameInput = document.getElementById('subject-modal-name');
    if (subjectNameInput) subjectNameInput.placeholder = i18nService.t('modals.subjectNamePlaceholder');
    const subjectDayLabel = document.querySelector('#subject-modal .form-group:nth-child(3) label');
    if (subjectDayLabel) subjectDayLabel.textContent = i18nService.t('modals.dayOfWeek');
    const subjectDayDisplay = document.getElementById('subject-modal-day-display');
    if (subjectDayDisplay && subjectDayDisplay.textContent === 'Select a day...') {
      subjectDayDisplay.textContent = i18nService.t('modals.selectDay');
    }
    const subjectSaveBtn = document.getElementById('save-subject-btn');
    if (subjectSaveBtn) subjectSaveBtn.textContent = i18nService.t('modals.saveSubject');
    const subjectCancelBtn = document.querySelector('#subject-modal .btn[data-modal-close="subject-modal"]');
    if (subjectCancelBtn) subjectCancelBtn.textContent = i18nService.t('common.cancel');

    // Update Semester Modal
    const semesterTitle = document.getElementById('semester-modal-title');
    if (semesterTitle) {
      const isEdit = document.getElementById('semester-modal-id')?.value;
      semesterTitle.textContent = isEdit ? i18nService.t('modals.editSemester') : i18nService.t('modals.addSemester');
    }
    const semesterYearLabel = document.querySelector('label[for="semester-year-input"]');
    if (semesterYearLabel) semesterYearLabel.textContent = i18nService.t('modals.year');
    const semesterYearInput = document.getElementById('semester-year-input');
    if (semesterYearInput) semesterYearInput.placeholder = i18nService.t('modals.yearPlaceholder');
    const semesterTermLabel = document.querySelector('label[for="semester-term-input"]');
    if (semesterTermLabel) semesterTermLabel.textContent = i18nService.t('modals.term');
    const semesterStartLabel = document.querySelector('#semester-modal .form-group:nth-child(3) label');
    if (semesterStartLabel) semesterStartLabel.textContent = i18nService.t('modals.startDate');
    const semesterEndLabel = document.querySelector('#semester-modal .form-group:nth-child(4) label');
    if (semesterEndLabel) semesterEndLabel.textContent = i18nService.t('modals.endDate');
    const semesterStartDisplay = document.getElementById('semester-start-date-display');
    if (semesterStartDisplay && semesterStartDisplay.textContent === 'Select start date') {
      semesterStartDisplay.textContent = i18nService.t('modals.selectStartDate');
    }
    const semesterEndDisplay = document.getElementById('semester-end-date-display');
    if (semesterEndDisplay && semesterEndDisplay.textContent === 'Select end date') {
      semesterEndDisplay.textContent = i18nService.t('modals.selectEndDate');
    }
    const semesterSaveBtn = document.getElementById('save-semester-btn');
    if (semesterSaveBtn) semesterSaveBtn.textContent = i18nService.t('modals.saveSemester');
    const semesterCancelBtn = document.querySelector('#semester-modal .btn[data-modal-close="semester-modal"]');
    if (semesterCancelBtn) semesterCancelBtn.textContent = i18nService.t('common.cancel');

    // Update Edit Attendance Modal
    const editAttTitle = document.getElementById('edit-attendance-modal-title');
    if (editAttTitle) editAttTitle.textContent = i18nService.t('modals.editAttendance');
    const editAttLabels = document.querySelectorAll('#edit-attendance-modal .form-group label');
    if (editAttLabels.length >= 4) {
      editAttLabels[0].textContent = i18nService.t('modals.subject');
      editAttLabels[1].textContent = i18nService.t('modals.date');
      editAttLabels[2].textContent = i18nService.t('modals.currentStatus');
      editAttLabels[3].textContent = i18nService.t('modals.newStatus');
      if (editAttLabels[4]) editAttLabels[4].innerHTML = `${i18nService.t('modals.reasonForEdit')} <span style="color: var(--red);">*</span>`;
    }
    const editAttStatusDisplay = document.getElementById('edit-attendance-status-display');
    if (editAttStatusDisplay && editAttStatusDisplay.textContent === 'Select new status...') {
      editAttStatusDisplay.textContent = i18nService.t('modals.selectNewStatus');
    }
    const editAttReasonInput = document.getElementById('edit-attendance-reason');
    if (editAttReasonInput) editAttReasonInput.placeholder = i18nService.t('modals.reasonPlaceholder');
    const editAttAuditNote = document.querySelector('#edit-attendance-modal .form-group div[style*="font-size: 0.8rem"]');
    if (editAttAuditNote) editAttAuditNote.textContent = i18nService.t('modals.auditNote');
    const editAttSaveBtn = document.getElementById('save-edit-attendance-btn');
    if (editAttSaveBtn) editAttSaveBtn.textContent = i18nService.t('modals.updateAttendance');
    const editAttCancelBtn = document.querySelector('#edit-attendance-modal .btn[data-modal-close="edit-attendance-modal"]');
    if (editAttCancelBtn) editAttCancelBtn.textContent = i18nService.t('common.cancel');

    const editAttOptions = document.querySelectorAll('#edit-attendance-status-dropdown .dropdown-option');
    editAttOptions.forEach(opt => {
      const val = opt.dataset.value.toLowerCase();
      if (i18nService.languages[i18nService.getCurrentLanguage()].status[val]) {
        opt.textContent = i18nService.t(`status.${val}`);
      }
    });

    const subjectDayOptions = document.querySelectorAll('#subject-modal-day-dropdown .dropdown-option');
    subjectDayOptions.forEach(opt => {
      const val = opt.dataset.value.toLowerCase();
      if (i18nService.languages[i18nService.getCurrentLanguage()].days[val]) {
        opt.textContent = i18nService.t(`days.${val}`);
      }
    });

    // Update Auth Modal
    const authEmailLabel = document.querySelector('label[for="signin-email"]');
    if (authEmailLabel) authEmailLabel.textContent = i18nService.t('settings.username') + ' ' + i18nService.t('common.or') + ' Email'; // Need common.or
    const authPassLabel = document.querySelector('label[for="signin-password"]');
    if (authPassLabel) authPassLabel.textContent = i18nService.t('settings.password');
    const authForgotLink = document.getElementById('forgot-password-link');
    if (authForgotLink) authForgotLink.textContent = i18nService.t('auth.forgotPassword');
    const authSignInBtn = document.getElementById('signin-btn');
    if (authSignInBtn) authSignInBtn.textContent = i18nService.t('settings.signIn');

    const authNameLabel = document.querySelector('label[for="signup-name"]');
    if (authNameLabel) authNameLabel.textContent = i18nService.t('settings.fullName');
    const authSignupEmailLabel = document.querySelector('label[for="signup-email"]');
    if (authSignupEmailLabel) authSignupEmailLabel.textContent = 'Email';
    const authSignupPassLabel = document.querySelector('label[for="signup-password"]');
    if (authSignupPassLabel) authSignupPassLabel.textContent = i18nService.t('settings.password');
    const authSignUpBtn = document.getElementById('signup-btn');
    if (authSignUpBtn) authSignUpBtn.textContent = i18nService.t('auth.authModalTitleSignUp');

    const signupPassInput = document.getElementById('signup-password');
    if (signupPassInput) signupPassInput.placeholder = i18nService.t('auth.passwordPlaceholder');

    // Agree text for sign in
    const signinAgreeText = document.querySelector('#signin-form p');
    if (signinAgreeText) {
      signinAgreeText.innerHTML = i18nService.t('auth.agreeText', {
        action: i18nService.t('auth.signingIn'),
        terms: `<a href="terms.html" target="_blank" style="color: var(--primary);">${i18nService.t('auth.terms')}</a>`,
        privacy: `<a href="privacy.html" target="_blank" style="color: var(--primary);">${i18nService.t('auth.privacy')}</a>`
      });
    }

    // Agree text for sign up
    const signupAgreeText = document.querySelector('#signup-form p');
    if (signupAgreeText) {
      signupAgreeText.innerHTML = i18nService.t('auth.agreeText', {
        action: i18nService.t('auth.creatingAccount'),
        terms: `<a href="terms.html" target="_blank" style="color: var(--primary);">${i18nService.t('auth.terms')}</a>`,
        privacy: `<a href="privacy.html" target="_blank" style="color: var(--primary);">${i18nService.t('auth.privacy')}</a>`
      });
    }

    const googleBtnText = document.querySelector('.google-btn-text');
    if (googleBtnText) googleBtnText.textContent = i18nService.t('auth.googleSignIn');
    const githubBtnText = document.querySelector('.github-btn-text');
    if (githubBtnText) githubBtnText.textContent = i18nService.t('auth.githubSignIn');

    const authTabs = document.querySelectorAll('.auth-tab');
    if (authTabs.length >= 2) {
      authTabs[0].textContent = i18nService.t('settings.signIn');
      authTabs[1].textContent = i18nService.t('auth.authModalTitleSignUp');
    }

    // Update Edit Attendance Modal labels
    const editAttSubjectLabel = document.querySelector('#edit-attendance-modal label[for="edit-attendance-subject-name"]');
    if (editAttSubjectLabel) editAttSubjectLabel.textContent = i18nService.t('modals.subject');
    const editAttDateLabel = document.querySelector('#edit-attendance-modal label[for="edit-attendance-date-display"]');
    if (editAttDateLabel) editAttDateLabel.textContent = i18nService.t('modals.date');
    const editAttStatusLabel = document.querySelector('#edit-attendance-modal label[for="edit-attendance-current-status"]');
    if (editAttStatusLabel) editAttStatusLabel.textContent = i18nService.t('modals.currentStatus');
    const editAttNewStatusLabel = document.querySelector('#edit-attendance-modal label[for="edit-attendance-status-dropdown"]');
    if (editAttNewStatusLabel) editAttNewStatusLabel.textContent = i18nService.t('modals.newStatus');
    const editAttReasonLabel = document.querySelector('label[for="edit-attendance-reason"]');
    if (editAttReasonLabel) editAttReasonLabel.innerHTML = i18nService.t('modals.reasonForEdit') + ' <span style="color: var(--red);">*</span>';
    const editAttReasonHint = document.querySelector('#edit-attendance-reason + div');
    if (editAttReasonHint) editAttReasonHint.textContent = i18nService.t('modals.auditNote');
    const editAttReasonPlaceholder = document.getElementById('edit-attendance-reason');
    if (editAttReasonPlaceholder) editAttReasonPlaceholder.placeholder = i18nService.t('modals.reasonPlaceholder');
    const editAttUpdateBtn = document.getElementById('save-edit-attendance-btn');
    if (editAttUpdateBtn) editAttUpdateBtn.textContent = i18nService.t('modals.updateAttendance');

    // Update Loading Overlay
    const processingLoaderText = document.querySelector('#loading-overlay div div:last-child');
    if (processingLoaderText) processingLoaderText.textContent = i18nService.t('modals.processing');

    // Update Input Modal
    const inputModalCancel = document.querySelector('#input-modal .btn[data-modal-close="input-modal"]');
    if (inputModalCancel) inputModalCancel.textContent = i18nService.t('common.cancel');
  }

  updateHeader() {
    try {
      if (this.userProfile.name) {
        const nameElement = document.getElementById('user-info-name');
        if (nameElement) {
          nameElement.textContent = i18nService.t('dashboard.welcome', { name: this.userProfile.name });
        }
      } else {
        const nameElement = document.getElementById('user-info-name');
        if (nameElement) {
          nameElement.textContent = i18nService.t('dashboard.helloStudent');
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
          semesterElement.textContent = i18nService.t('settings.noSemesterSelected');
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
      const streak = currentSem ? attendanceService.calculateStreak(this.currentSemesterId, this.allSubjects) : 0;
      const streakEl = document.getElementById('streak-display');

      if (streakEl) {
        streakEl.innerHTML = `${ICONS.FIRE} ${i18nService.t('dashboard.streakCount', { count: streak })}`;
        if (streak === 0) {
          streakEl.style.color = 'var(--grey-text)';
        } else {
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
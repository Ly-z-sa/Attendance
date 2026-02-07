import { doc, setDoc, addDoc, collection, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { FIREBASE_PATHS, COLOR_SCHEMES, FONTS, BACKGROUNDS, CLICK_EFFECTS, STREAK_REQUIREMENTS } from '../utils/constants.js';
import { checkBadWords, validateSemesterDates } from '../utils/validation.js';
import { sanitizeInput } from '../utils/sanitizer.js';
import { ICONS } from '../utils/icons.js';
import toastManager from '../ui/toast-manager.js';
import modalManager from '../ui/modal-manager.js';
import themeManager from '../ui/theme-manager.js';
import authService from '../services/auth-service.js';
import notificationService from '../services/notification-service.js';
import attendanceService from '../services/attendance-service.js';
import clickEffectManager from '../ui/click-effect-manager.js';
import i18nService from '../services/i18n-service.js';


class SettingsPage {
  constructor() {
    this.container = null;
    this.currentSemesterId = null;
    this.allSemesters = [];
    this.allSubjects = [];
    this.cropper = null;
  }

  initialize() {
    this.container = document.getElementById('settings-content');
    this.initializeDatePickers();
  }

  render(userProfile, currentSemesterId, allSemesters, allSubjects) {
    if (!this.container) return;
    // amazonq-ignore-next-line

    this.container.innerHTML = `
      ${this.renderProfileSection(userProfile)}
      ${this.renderSemestersSection(allSemesters, currentSemesterId)}
      ${this.renderSubjectsSection(allSubjects, currentSemesterId)}
      ${this.renderPersonalizationSection(currentSemesterId, allSubjects)}
      ${this.renderNotificationsSection()}
      ${this.renderAccountSection()}
      ${this.renderLegalSection()}
    `;

    // Attach event listeners
    this.attachEventListeners(currentSemesterId, allSemesters, allSubjects);
  }

  renderProfileSection(userProfile) {
    const avatarHtml = userProfile.photoURL
      ? `<div class="avatar-preview-large" style="background-image: url('${sanitizeInput(userProfile.photoURL)}'); cursor: pointer;" onclick="settingsPage.showProfilePicture('${sanitizeInput(userProfile.photoURL)}')"></div>`
      : `<div class="avatar-preview-large">${ICONS.USER_SOLID}</div>`;

    return `
      <div class="settings-section">
        <div class="settings-header collapsible collapsed" data-collapse="profile">
          <h3>${i18nService.t('settings.profile')}</h3>
          <svg class="collapse-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
        <div class="settings-content collapsed" id="profile-content">
          <div class="settings-avatar-row">
            ${avatarHtml}
            <button class="btn" id="change-picture-btn">${i18nService.t('settings.changePicture')}</button>
          </div>
          <div class="form-group">
            <label for="setting-username">${i18nService.t('settings.username')}</label>
            <div class="username-input-group">
                <span style="font-size: 1.2rem; align-self: center; margin-right: 0.25rem; color: var(--grey-text);">@</span>
                <input type="text" id="setting-username" class="form-input" placeholder="${i18nService.t('settings.usernamePlaceholder')}" value="${sanitizeInput(userProfile.username || '')}" autocomplete="off">
            </div>
            <div id="username-status" class="username-status"></div>
          </div>
          <div class="form-group">
            <label for="setting-name">${i18nService.t('settings.fullName')}</label>
            <input type="text" id="setting-name" class="form-input" placeholder="${i18nService.t('settings.yourName')}" value="${sanitizeInput(userProfile.name || '')}" autocomplete="off">
          </div>
          <div class="form-group">
            <label for="setting-major">${i18nService.t('settings.major')}</label>
            <input type="text" id="setting-major" class="form-input" placeholder="${i18nService.t('settings.yourMajor')}" value="${sanitizeInput(userProfile.major || '')}" autocomplete="off">
          </div>
          ${window.firebaseAuth?.currentUser
        ? `<div id="auth-status" style="margin-bottom: 1rem; padding: 0.75rem; border-radius: 8px; font-size: 0.9rem; background: rgba(34, 139, 34, 0.1); color: var(--green); border: 1px solid var(--green);">
                 ${i18nService.t('settings.loggedInAs', { email: sanitizeInput(window.firebaseAuth.currentUser.email) })}
               </div>`
        : ''
      }
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem;">
            <button class="btn btn-green" id="save-profile-btn">${i18nService.t('settings.saveProfile')}</button>
            ${window.firebaseAuth?.currentUser
        ? `<button class="btn btn-red" id="signout-btn" data-action="signout">${i18nService.t('settings.signOut')}</button>`
        : `<button class="btn" id="auth-btn" data-action="auth">${i18nService.t('settings.signIn')}</button>`
      }
          </div>
        </div>
      </div>
    `;
  }

  renderSemestersSection(allSemesters, currentSemesterId) {
    return `
      <div class="settings-section">
        <div class="settings-header collapsible collapsed" data-collapse="semesters">
          <h3>${i18nService.t('settings.manageSemesters')}</h3>
          <svg class="collapse-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
        <div class="settings-content collapsed" id="semesters-content">
          <button class="btn btn-green" id="add-semester-btn" style="margin-bottom: 1rem;">${i18nService.t('settings.addSemester')}</button>
          <p style="margin-bottom: 1rem; color: var(--grey-text);">${i18nService.t('settings.manageSemestersDesc')}</p>
          <div class="form-group">
            <label>${i18nService.t('settings.currentSemester')}</label>
            <div class="custom-dropdown" id="current-semester-dropdown">
              <div class="dropdown-selected" role="button" tabindex="0" aria-haspopup="listbox" aria-expanded="false">
                <span id="current-semester-display">${i18nService.t('settings.selectSemester')}</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
              </div>
              <div class="dropdown-options" role="listbox" id="current-semester-options">
                ${allSemesters.length > 0
        ? allSemesters.map(s => `<div class="dropdown-option" data-value="${sanitizeInput(s.id)}" role="option">${sanitizeInput(s.name)}</div>`).join('')
        : `<div class="dropdown-option" role="option">${i18nService.t('settings.noSemesters')}</div>`
      }
              </div>
            </div>
          </div>
          <div id="semesters-list">
            ${allSemesters.length > 0
        ? allSemesters.map(s => this.renderSemesterItem(s)).join('')
        : `<div class="empty-state-mini"><div class="empty-text">${i18nService.t('settings.noSemesters')}</div></div>`
      }
          </div>
        </div>
      </div>
    `;
  }

  renderSemesterItem(semester) {
    return `
      <div class="settings-list-item" data-id="${sanitizeInput(semester.id)}">
        <div>
          <strong>${sanitizeInput(semester.name)}</strong><br>
          <small style="color: var(--grey-text);">${sanitizeInput(semester.startDate || i18nService.t('settings.noStartDate'))} ${i18nService.t('settings.to')} ${sanitizeInput(semester.endDate || i18nService.t('settings.noEndDate'))}</small>
        </div>
        <div class="btn-group">
          <button class="btn btn-edit-semester">${i18nService.t('common.edit')}</button>
          <button class="btn btn-red btn-delete-semester">${i18nService.t('common.delete')}</button>
        </div>
      </div>
    `;
  }

  renderSubjectsSection(allSubjects, currentSemesterId) {
    const currentSemSubjects = allSubjects.filter(s => s.semesterId === currentSemesterId);

    return `
      <div class="settings-section">
        <div class="settings-header collapsible collapsed" data-collapse="subjects">
          <h3>${i18nService.t('settings.manageSubjects')}</h3>
          <svg class="collapse-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
        <div class="settings-content collapsed" id="subjects-content">
          <button class="btn btn-green" id="add-subject-btn" style="margin-bottom: 1rem;">${i18nService.t('settings.addSubject')}</button>
          <p style="margin-bottom: 1rem; color: var(--grey-text);">${i18nService.t('settings.subjectsForSem')}</p>
          <div id="subjects-list">
            ${currentSemSubjects.length > 0
        ? currentSemSubjects.map(s => this.renderSubjectItem(s)).join('')
        : `<div class="empty-state-mini"><div class="empty-text">${i18nService.t('settings.noSubjects')}</div></div>`
      }
          </div>
        </div>
      </div>
    `;
  }

  renderSubjectItem(subject) {
    const timeDisplay = subject.startTime ? `<span style="font-size: 0.85em; color: var(--grey-text); margin-left: 0.5rem;">${sanitizeInput(subject.startTime)} - ${sanitizeInput(subject.endTime || '?')}</span>` : '';
    return `
      <div class="settings-list-item" data-id="${sanitizeInput(subject.id)}">
        <span><strong>${sanitizeInput(subject.name)}</strong> (${i18nService.getDayTranslation(subject.day)})${timeDisplay}</span>
        <div class="btn-group">
          <button class="btn btn-edit-subject">${i18nService.t('common.edit')}</button>
          <button class="btn btn-red btn-delete-subject">${i18nService.t('common.delete')}</button>
        </div>
      </div>
    `;
  }

  renderLanguageDropdown() {
    const currentLang = i18nService.getCurrentLanguage();
    const langNames = { en: 'English', fr: 'Français', es: 'Español', ru: 'Русский', zh: '中文', km: 'ភាសាខ្មែរ' };

    return `
      <div class="form-group">
        <label>${i18nService.t('settings.language')}</label>
        <div class="custom-dropdown" id="language-dropdown" data-value="${currentLang}">
          <div class="dropdown-selected" role="button" tabindex="0" aria-haspopup="listbox" aria-expanded="false">
            <span id="language-display">${langNames[currentLang]}</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
          </div>
          <div class="dropdown-options" role="listbox">
            <div class="dropdown-option" data-value="en" role="option">English</div>
            <div class="dropdown-option" data-value="fr" role="option">Français</div>
            <div class="dropdown-option" data-value="es" role="option">Español</div>
            <div class="dropdown-option" data-value="ru" role="option">Русский</div>
            <div class="dropdown-option" data-value="zh" role="option">中文</div>
            <div class="dropdown-option" data-value="km" role="option">ភាសាខ្មែរ</div>
          </div>
        </div>
      </div>
    `;
  }

  renderNotificationsSection() {
    return `
      <div class="settings-section">
        <div class="settings-header collapsible collapsed" data-collapse="notifications">
          <h3>${i18nService.t('settings.notifications')}</h3>
          <svg class="collapse-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
        <div class="settings-content collapsed" id="notifications-content">
          <p style="color: var(--grey-text); margin-bottom: 1rem;">${i18nService.t('settings.notificationsDesc')}</p>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button class="btn btn-green" id="enable-notifications-btn">${i18nService.t('settings.enableNotifications')}</button>
            <button class="btn btn-red" id="disable-notifications-btn">${i18nService.t('settings.disableNotifications')}</button>
          </div>
        </div>
      </div>
    `;
  }

  renderAccountSection() {
    if (!window.firebaseAuth?.currentUser) return '';
    return `
      <div class="settings-section" id="account-management">
        <div class="settings-header">
          <h3>${i18nService.t('settings.accountManagement')}</h3>
        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
          <button class="btn" id="change-password-btn">${i18nService.t('settings.changePassword')}</button>
          <button class="btn" id="change-email-btn">${i18nService.t('settings.changeEmail')}</button>
          <button class="btn btn-red" id="delete-account-btn">${i18nService.t('settings.deleteAccount')}</button>
        </div>
      </div>
    `;
  }

  renderPersonalizationSection(currentSemesterId, allSubjects) {
    return `
      <div class="settings-section">
        <div class="settings-header collapsible collapsed" data-collapse="personalization">
          <h3>${i18nService.t('settings.personalization')}</h3>
          <svg class="collapse-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
        <div class="settings-content collapsed" id="personalization-content">
          ${this.renderLanguageDropdown()}
          ${this.renderColorSchemeDropdown()}
          ${this.renderBackgroundDropdown()}
          ${this.renderFontDropdown()}
          ${this.renderClickEffectDropdown()}
        </div>
      </div>
    `;
  }

  renderColorSchemeDropdown() {
    const currentScheme = themeManager.getColorScheme();

    return `
      <div class="form-group">
        <label>${i18nService.t('settings.colorScheme')}</label>
        <div class="custom-dropdown" id="color-scheme-dropdown" data-value="${currentScheme}">
          <div class="dropdown-selected" role="button" tabindex="0" aria-haspopup="listbox" aria-expanded="false">
            <span id="color-scheme-display">${i18nService.t(`schemes.${currentScheme}`)}</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
          </div>
          <div class="dropdown-options" role="listbox">
            ${Object.entries(COLOR_SCHEMES).map(([key, value]) => {
      return `<div class="dropdown-option" data-value="${key}" role="option">
                <span>${i18nService.t(`schemes.${key}`)}</span>
              </div>`;
    }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderBackgroundDropdown() {
    const currentBg = themeManager.getBackground();

    return `
      <div class="form-group">
        <label>${i18nService.t('settings.background')}</label>
        <div class="custom-dropdown" id="background-dropdown" data-value="${currentBg}">
          <div class="dropdown-selected" role="button" tabindex="0" aria-haspopup="listbox" aria-expanded="false">
            <span id="background-display">${i18nService.t(`backgrounds.${currentBg}`)}</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
          </div>
          <div class="dropdown-options" role="listbox">
            ${Object.entries(BACKGROUNDS).map(([key, value]) => {
      return `<div class="dropdown-option" data-value="${key}" role="option">
                <span>${i18nService.t(`backgrounds.${key}`)}</span>
              </div>`;
    }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderFontDropdown() {
    const currentFont = themeManager.getFont();

    return `
      <div class="form-group">
        <label>${i18nService.t('settings.fontStyle')}</label>
        <div class="custom-dropdown" id="font-dropdown" data-value="${currentFont}">
          <div class="dropdown-selected" role="button" tabindex="0" aria-haspopup="listbox" aria-expanded="false">
            <span id="font-display">${FONTS[currentFont]}</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
          </div>
          <div class="dropdown-options" role="listbox">
            ${Object.entries(FONTS).map(([key, value]) => {
      return `<div class="dropdown-option" data-value="${key}" role="option">
                <span>${value}</span>
              </div>`;
    }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderClickEffectDropdown() {
    const currentEffect = clickEffectManager.getEffect();

    return `
      <div class="form-group">
        <label>${i18nService.t('settings.clickAnimation')}</label>
        <div class="custom-dropdown" id="click-effect-dropdown" data-value="${currentEffect}">
          <div class="dropdown-selected" role="button" tabindex="0" aria-haspopup="listbox" aria-expanded="false">
            <span id="click-effect-display">${i18nService.t(`effects.${currentEffect}`)}</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
          </div>
          <div class="dropdown-options" role="listbox">
            ${Object.entries(CLICK_EFFECTS).map(([key, value]) => {
      return `<div class="dropdown-option" data-value="${key}" role="option">
                <span>${i18nService.t(`effects.${key}`)}</span>
              </div>`;
    }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderLegalSection() {
    return `
      <div class="settings-section">
        <div class="settings-header">
          <h3>${i18nService.t('settings.legalSupport')}</h3>
        </div>
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
          <a href="privacy.html" target="_blank" style="color: var(--primary); text-decoration: none; font-weight: 500;">${i18nService.t('settings.privacyPolicy')}</a>
          <a href="terms.html" target="_blank" style="color: var(--primary); text-decoration: none; font-weight: 500;">${i18nService.t('settings.termsOfService')}</a>
          <a href="#" id="report-problem-btn" style="color: var(--primary); text-decoration: none; font-weight: 500;">${i18nService.t('settings.reportProblem')}</a>
          <a href="#" id="contact-us-btn" style="color: var(--primary); text-decoration: none; font-weight: 500;">${i18nService.t('settings.contactUs')}</a>
        </div>
      </div>
      
      <div style="text-align: center; padding: 1rem; color: var(--grey-text); font-size: 0.9rem; border-top: 1px solid var(--border-color); margin-top: 1rem;">
        <div>© 2026 Attendance Tracker. ${i18nService.t('settings.allRightsReserved')}</div>
        <div style="margin-top: 0.25rem;">${i18nService.t('settings.version')} 3.7.2</div>
      </div>
    `;
  }

  attachEventListeners(currentSemesterId, allSemesters, allSubjects) {
    // Store reference for class methods
    this.currentSemesterId = currentSemesterId;
    this.allSemesters = allSemesters;
    this.allSubjects = allSubjects;

    // Collapse handlers
    this.setupCollapseHandlers();

    // Helper to add listener only once (prevents duplicates on modal buttons)
    const addListenerOnce = (id, event, handler) => {
      const el = document.getElementById(id);
      if (el && !el.dataset.listenerAttached) {
        el.addEventListener(event, handler);
        el.dataset.listenerAttached = 'true';
      }
    };

    // Auth buttons
    addListenerOnce('signout-btn', 'click', () => authService.handleSignOut());
    addListenerOnce('auth-btn', 'click', () => authService.openAuthModal());

    // Profile
    addListenerOnce('save-profile-btn', 'click', () => this.handleSaveProfile());

    // Change Picture button
    addListenerOnce('change-picture-btn', 'click', () => {
      document.getElementById('profile-pic-input').click();
    });

    // Profile Pic Input
    addListenerOnce('profile-pic-input', 'change', (e) => this.handleImageSelect(e));

    // Crop Apply
    addListenerOnce('apply-crop-btn', 'click', () => this.handleApplyCrop());

    // Current semester
    addListenerOnce('current-semester-dropdown', 'change', (e) => {
      this.handleCurrentSemesterChange(e.currentTarget.dataset.value);
    });

    // Semesters - modal buttons need guard
    addListenerOnce('save-semester-btn', 'click', () => this.handleAddSemester());
    addListenerOnce('add-semester-btn', 'click', () => this.openSemesterModal());

    document.querySelectorAll('.btn-edit-semester').forEach(btn => {
      if (!btn.dataset.listenerAttached) {
        btn.addEventListener('click', (e) => this.handleEditSemester(e));
        btn.dataset.listenerAttached = 'true';
      }
    });
    document.querySelectorAll('.btn-delete-semester').forEach(btn => {
      if (!btn.dataset.listenerAttached) {
        btn.addEventListener('click', (e) => this.handleDeleteSemester(e));
        btn.dataset.listenerAttached = 'true';
      }
    });

    // Subjects
    addListenerOnce('add-subject-btn', 'click', () => {
      if (!this.currentSemesterId) {
        toastManager.error('Please select or create a semester first.');
        return;
      }
      this.openSubjectModal(null, this.currentSemesterId);
    });

    document.querySelectorAll('.btn-edit-subject').forEach(btn => {
      if (!btn.dataset.listenerAttached) {
        btn.addEventListener('click', (e) => this.handleEditSubject(e));
        btn.dataset.listenerAttached = 'true';
      }
    });
    document.querySelectorAll('.btn-delete-subject').forEach(btn => {
      if (!btn.dataset.listenerAttached) {
        btn.addEventListener('click', (e) => this.handleDeleteSubject(e));
        btn.dataset.listenerAttached = 'true';
      }
    });

    // Notifications
    addListenerOnce('enable-notifications-btn', 'click', () =>
      notificationService.requestPermission()
    );
    addListenerOnce('disable-notifications-btn', 'click', () =>
      notificationService.disable()
    );

    // Language
    addListenerOnce('language-dropdown', 'change', (e) => {
      const newLang = e.currentTarget.dataset.value;
      i18nService.setLanguage(newLang);
    });

    // Account management
    addListenerOnce('change-password-btn', 'click', () =>
      authService.changePassword()
    );
    addListenerOnce('change-email-btn', 'click', () =>
      authService.changeEmail()
    );
    addListenerOnce('delete-account-btn', 'click', () =>
      authService.deleteAccount()
    );

    // Legal/Support
    addListenerOnce('report-problem-btn', 'click', (e) => {
      e.preventDefault();
      modalManager.open('report-modal');
    });
    addListenerOnce('contact-us-btn', 'click', (e) => {
      e.preventDefault();
      this.showContactInfo();
    });

    // Report modal submit
    addListenerOnce('submit-report-btn', 'click', () =>
      this.handleSubmitReport()
    );

    // Re-setup theme manager listeners
    themeManager.setupPersonalizationListeners();

    // Re-setup click effect manager listener
    clickEffectManager.setupPersonalizationListener();
  }

  setupCollapseHandlers() {
    document.querySelectorAll('.settings-header.collapsible').forEach(header => {
      const newHeader = header.cloneNode(true);
      header.parentNode.replaceChild(newHeader, header);

      newHeader.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;

        const collapseId = newHeader.dataset.collapse;
        const content = document.getElementById(collapseId + '-content');

        if (!content) return;

        const isCollapsed = content.classList.contains('collapsed');

        if (isCollapsed) {
          // Expand
          content.style.overflow = 'hidden';
          content.classList.remove('collapsed');
          newHeader.classList.remove('collapsed');
          content.style.maxHeight = content.scrollHeight + 'px';

          // After animation, set overflow to visible to allow dropdowns to show
          setTimeout(() => {
            if (!content.classList.contains('collapsed')) {
              content.style.overflow = 'visible';
              content.style.maxHeight = 'none';
            }
          }, 300);
        } else {
          // Collapse
          content.style.overflow = 'hidden';
          content.style.maxHeight = content.scrollHeight + 'px'; // Set explicit height first

          // Force reflow
          content.offsetHeight;

          requestAnimationFrame(() => {
            content.style.maxHeight = '0px';
            content.classList.add('collapsed');
            newHeader.classList.add('collapsed');
          });
        }
      });
    });
  }

  async handleSaveProfile() {
    const name = document.getElementById('setting-name').value.trim();
    const major = document.getElementById('setting-major').value.trim();
    const username = document.getElementById('setting-username').value.trim();

    if (!name || !major || !username) {
      toastManager.warning('Please fill in all fields.');
      return;
    }

    const loadingToast = toastManager.loading('Saving profile...');

    try {
      // Update username if changed
      if (username !== window.app.userProfile.username) {
        await authService.updateUsername(window.app.userId, username);
      }

      await setDoc(
        doc(window.firebaseDb, FIREBASE_PATHS.userProfile(window.app.userId)),
        { name, major },
        { merge: true }
      );
      toastManager.hide(loadingToast);
      toastManager.success(i18nService.t('toast.profileUpdated.title'), 3000, i18nService.t('toast.profileUpdated.detail'));
    } catch (error) {
      toastManager.hide(loadingToast);
      toastManager.error(error.message);
    }
  }

  handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toastManager.error(i18nService.t('settings.invalidImage')); // Need key
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.getElementById('crop-image');
      img.src = event.target.result;

      modalManager.open('crop-modal');

      if (this.cropper) {
        this.cropper.destroy();
      }

      this.cropper = new Cropper(img, {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 1,
        restore: false,
        guides: false,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
      });
    };
    reader.readAsDataURL(file);
  }

  async handleApplyCrop() {
    if (!this.cropper) return;

    const loadingToast = toastManager.loading(i18nService.t('modals.processing'));

    try {
      const canvas = this.cropper.getCroppedCanvas({
        width: 256,
        height: 256,
      });

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

      // Save to Firestore
      await setDoc(
        doc(window.firebaseDb, FIREBASE_PATHS.userProfile(window.app.userId)),
        { photoURL: dataUrl },
        { merge: true }
      );

      toastManager.hide(loadingToast);
      modalManager.close('crop-modal');
      toastManager.success(i18nService.t('toast.profilePictureUpdated'), 3000, i18nService.t('toast.profilePictureUpdated'));

      // Clear input
      document.getElementById('profile-pic-input').value = '';
    } catch (error) {
      toastManager.hide(loadingToast);
      console.error("Crop error:", error);
      toastManager.error('Failed to save cropped image');
    }
  }

  async handleCurrentSemesterChange(newSemesterId) {
    const loadingToast = toastManager.loading(i18nService.t('modals.processing'));

    try {
      await setDoc(
        doc(window.firebaseDb, FIREBASE_PATHS.userProfile(window.app.userId)),
        { currentSemesterId: newSemesterId },
        { merge: true }
      );
      toastManager.hide(loadingToast);
      toastManager.success(i18nService.t('toast.currentSemesterUpdated'), 3000, i18nService.t('toast.currentSemesterUpdated'));
    } catch (error) {
      toastManager.hide(loadingToast);
      toastManager.error('Error updating semester: ' + error.message);
    }
  }

  openSemesterModal(semester = null) {
    const modal = document.getElementById('semester-modal');
    const title = modal.querySelector('#semester-modal-title');
    const idInput = modal.querySelector('#semester-modal-id');
    const yearInput = document.getElementById('semester-year-input');
    const termInput = document.getElementById('semester-term-input');
    const startDateInput = modal.querySelector('#semester-modal-start-date');
    const endDateInput = modal.querySelector('#semester-modal-end-date');
    const startDisplay = document.getElementById('semester-start-date-display');
    const endDisplay = document.getElementById('semester-end-date-display');

    if (semester) {
      title.textContent = i18nService.t('modals.editSemester');
      idInput.value = semester.id;

      // Parse existing semester name to extract year and term
      // Expected format: "Year X, Semester Y" or similar
      const yearMatch = semester.name.match(/Year\s*(\d+)/i);
      const termMatch = semester.name.match(/(?:Semester|Term)\s*(\d+)/i);

      yearInput.value = yearMatch ? yearMatch[1] : '';
      termInput.value = termMatch ? termMatch[1] : '';

      startDateInput.value = semester.startDate || '';
      endDateInput.value = semester.endDate || '';

      if (semester.startDate) {
        startDisplay.textContent = i18nService.formatDate(semester.startDate, {
          year: 'numeric', month: 'long', day: 'numeric'
        });
      }

      if (semester.endDate) {
        endDisplay.textContent = i18nService.formatDate(semester.endDate, {
          year: 'numeric', month: 'long', day: 'numeric'
        });
      }
    } else {
      title.textContent = i18nService.t('modals.addSemester');
      idInput.value = '';
      yearInput.value = '';
      termInput.value = '';
      startDateInput.value = '';
      endDateInput.value = '';
      startDisplay.textContent = i18nService.t('modals.selectStartDate');
      endDisplay.textContent = i18nService.t('modals.selectEndDate');
    }

    modalManager.open('semester-modal');
  }

  handleEditSemester(e) {
    const id = e.target.closest('.settings-list-item').dataset.id;
    const semester = this.allSemesters.find(s => s.id === id); // Use class state
    this.openSemesterModal(semester);
  }

  async handleDeleteSemester(e) {
    const id = e.target.closest('.settings-list-item').dataset.id;
    const semester = this.allSemesters.find(s => s.id === id); // Use class state
    // Use class state for subjects too to count deletes
    const subjectsToDelete = this.allSubjects ? this.allSubjects.filter(s => s.semesterId === id) : [];
    const attendanceToDelete = window.app.allAttendance?.filter(r => r.semesterId === id) || [];

    const confirmed = await modalManager.confirm(
      i18nService.t('modals.deleteSemesterTitle'),
      i18nService.t('modals.deleteSemesterMsg', {
        name: semester?.name || i18nService.t('settings.currentSemester'),
        subjectCount: subjectsToDelete.length,
        attendanceCount: attendanceToDelete.length
      })
    );

    if (!confirmed) return;

    const loadingToast = toastManager.loading(i18nService.t('modals.processing'));

    try {
      await deleteDoc(doc(window.firebaseDb, FIREBASE_PATHS.semesterDoc(window.app.userId, id)));
      toastManager.hide(loadingToast);
      toastManager.success(i18nService.t('toast.semesterDeleted', { name: semester?.name }), 3000, i18nService.t('toast.semesterDeleted', { name: semester?.name }));
    } catch (error) {
      toastManager.hide(loadingToast);
      toastManager.error('Error deleting semester: ' + error.message);
    }
  }

  async openSubjectModal(subject = null, semesterId = null) {
    // Use passed semesterId or fallback to instance
    const targetSemesterId = semesterId || this.currentSemesterId;

    const inputs = await modalManager.multiInput(
      subject ? i18nService.t('modals.editSubject') : i18nService.t('modals.addSubject'),
      [
        { name: 'name', label: i18nService.t('modals.subjectName'), type: 'text', value: subject ? subject.name : '', placeholder: i18nService.t('modals.subjectNamePlaceholder') },
        {
          name: 'day',
          label: i18nService.t('modals.dayOfWeek'),
          type: 'select',
          options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], // These will be translated in modalManager/dropdownManager
          value: subject ? subject.day : 'Monday'
        },
        { name: 'startTime', label: i18nService.t('modals.startTime'), type: 'time', value: subject?.startTime || '' },
        { name: 'endTime', label: i18nService.t('modals.endTime'), type: 'time', value: subject?.endTime || '' }
      ]
    );

    if (inputs) {
      const name = inputs.name ? inputs.name.trim() : '';

      if (!name) {
        toastManager.error(i18nService.t('errors.subjectNameRequired'));
        return;
      }

      if (await checkBadWords(name)) {
        toastManager.error('Please use appropriate language for the subject name.');
        return;
      }

      if (inputs.startTime && inputs.endTime && inputs.startTime >= inputs.endTime) {
        toastManager.error(i18nService.t('errors.endAfterStart'));
        return;
      }

      try {
        if (subject) {
          await attendanceService.updateSubject(targetSemesterId, subject.id, {
            name: inputs.name,
            day: inputs.day,
            startTime: inputs.startTime || null,
            endTime: inputs.endTime || null
          });
          const timeInfo = inputs.startTime && inputs.endTime ? ` (${inputs.startTime} - ${inputs.endTime})` : '';
          toastManager.success(i18nService.t('toast.subjectUpdated', { name: inputs.name }), 3000, i18nService.t('toast.subjectUpdated', { name: inputs.name, day: inputs.day, time: timeInfo }));
        } else {
          if (!targetSemesterId) {
            toastManager.error(i18nService.t('errors.noSemesterSelected'));
            return;
          }
          await attendanceService.addSubject(targetSemesterId, {
            name: inputs.name,
            day: inputs.day,
            startTime: inputs.startTime || null,
            endTime: inputs.endTime || null
          });
          const timeStr = inputs.startTime && inputs.endTime ? ` (${inputs.startTime} - ${inputs.endTime})` : '';
          toastManager.success(i18nService.t('toast.subjectAdded', { name: inputs.name }), 3000, i18nService.t('toast.subjectAdded', { name: inputs.name, day: inputs.day, time: timeStr }));
        }
      } catch (error) {
        toastManager.error(error.message);
      }
    }
  }



  async handleAddSemester() {
    const modal = document.getElementById('semester-modal');
    const idInput = modal.querySelector('#semester-modal-id');
    const yearInput = document.getElementById('semester-year-input');
    const termInput = document.getElementById('semester-term-input');
    const startDateInput = modal.querySelector('#semester-modal-start-date');
    const endDateInput = modal.querySelector('#semester-modal-end-date');

    const id = idInput.value;
    const year = yearInput.value.trim();
    const term = termInput.value.trim();
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    const todayString = new Date().toISOString().split('T')[0];

    if (!year || isNaN(parseInt(year)) || parseInt(year) < 1) {
      toastManager.error(i18nService.t('errors.invalidYear'));
      return;
    }

    if (!term || isNaN(parseInt(term)) || parseInt(term) < 1 || parseInt(term) > 4) {
      toastManager.error(i18nService.t('errors.invalidTerm'));
      return;
    }

    // Construct the semester name
    const name = i18nService.t('modals.semesterName', { year, term });

    if (!startDate || !endDate) {
      toastManager.error(i18nService.t('errors.fillDates'));
      return;
    }

    if (startDate < todayString && !id) { // Only for new semesters
      toastManager.error(i18nService.t('errors.pastStartDate'));
      return;
    }

    if (startDate > endDate) {
      toastManager.error(i18nService.t('errors.endAfterStart')); // reuse or add endBeforeStartDate?
      return;
    }

    const loadingToast = toastManager.loading(i18nService.t('modals.processing'));

    try {
      if (id) {
        // Update
        await attendanceService.updateSemester(id, {
          name,
          startDate,
          endDate
        });
        toastManager.success(i18nService.t('settings.semesterUpdated'), 3000, i18nService.t('toast.semesterUpdated', { name, startDate, endDate }));
      } else {
        // Add
        await attendanceService.addSemester({
          name,
          startDate,
          endDate
        });
        toastManager.success(i18nService.t('settings.semesterAdded'), 3000, i18nService.t('toast.semesterAdded', { name, startDate, endDate }));
      }

      modalManager.close('semester-modal');
      toastManager.hide(loadingToast);

    } catch (error) {
      toastManager.hide(loadingToast);
      toastManager.error('Error saving semester: ' + error.message);
    }
  }

  handleEditSubject(e) {
    const id = e.target.closest('.settings-list-item').dataset.id;
    // Use class state
    const subject = this.allSubjects.find(s => s.id === id);
    this.openSubjectModal(subject, this.currentSemesterId);
  }

  async handleDeleteSubject(e) {
    const id = e.target.closest('.settings-list-item').dataset.id;
    // Use class state
    const subject = this.allSubjects ? this.allSubjects.find(s => s.id === id) : window.app.allSubjects.find(s => s.id === id);

    const confirmed = await modalManager.confirm(
      i18nService.t('modals.deleteSubjectTitle'),
      i18nService.t('modals.deleteSubjectMsg', { name: subject?.name || i18nService.t('settings.manageSubjects') })
    );

    if (!confirmed) return;
    const loadingToast = toastManager.loading(i18nService.t('modals.processing'));

    try {
      await deleteDoc(doc(window.firebaseDb, FIREBASE_PATHS.subjectDoc(window.app.userId, id)));
      toastManager.hide(loadingToast);
      toastManager.success(i18nService.t('toast.subjectDeleted.title'), 3000, i18nService.t('toast.subjectDeleted.detail', { name: subject?.name }));
    } catch (error) {
      toastManager.hide(loadingToast);
      toastManager.error('Error deleting subject: ' + error.message);
    }
  }

  showContactInfo() {
    const email = 'lyssa.phat@gmail.com';

    // Copy to clipboard automatically
    try {
      navigator.clipboard.writeText(email).then(() => {
        toastManager.success(i18nService.t('toast.emailCopied.title'), 3000, i18nService.t('toast.emailCopied.detail'));
      }).catch(() => {
        // Fallback if clipboard fails
        toastManager.info(`Contact us at: ${email}`, 6000);
      });
    } catch (error) {
      // Fallback if clipboard API is not available
      toastManager.info(`Contact us at: ${email}`, 6000);
    }
  }

  async handleSubmitReport() {
    const type = document.getElementById('report-type-dropdown').dataset.value;
    const description = document.getElementById('report-description').value.trim();

    if (!type || !description) {
      toastManager.warning('Please select a problem type and provide a description.');
      return;
    }

    if (await checkBadWords(description)) {
      toastManager.error('Please use appropriate language in your report.');
      return;
    }

    const reportData = {
      type,
      description,
      email: window.firebaseAuth.currentUser?.email || 'anonymous',
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      userId: window.app.userId || 'anonymous'
    };

    const loadingToast = toastManager.loading(i18nService.t('modals.processing'));

    try {
      await addDoc(collection(window.firebaseDb, FIREBASE_PATHS.bugReports(window.app.userId)), reportData);
      toastManager.hide(loadingToast);
      toastManager.success(i18nService.t('toast.reportSubmitted.title'), 4000, i18nService.t('toast.reportSubmitted.detail'));
      modalManager.close('report-modal');

      // Clear form
      document.getElementById('report-type-dropdown').dataset.value = '';
      document.getElementById('report-type-display').textContent = i18nService.t('report.selectType');
      document.getElementById('report-description').value = '';
    } catch (error) {
      toastManager.hide(loadingToast);
      toastManager.error('Failed to submit report: ' + error.message);
    }
  }

  initializeDatePickers() {
    // Date picker initialization logic
    // This would be similar to your original implementation
  }

  showProfilePicture(photoURL) {
    const img = document.getElementById('profile-pic-display');
    if (img && photoURL) {
      img.src = photoURL;
      modalManager.open('profile-pic-overlay');
    }
  }

  clear() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

export default new SettingsPage();

// Expose globally for profile picture functionality
window.settingsPage = new SettingsPage();
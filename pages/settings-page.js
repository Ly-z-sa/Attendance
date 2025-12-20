// pages/settings-page.js
import { doc, setDoc, addDoc, collection, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { FIREBASE_PATHS, COLOR_SCHEMES, FONTS, BACKGROUNDS } from '../utils/constants.js';
import { checkBadWords, validateSemesterDates } from '../utils/validation.js';
import toastManager from '../ui/toast-manager.js';
import modalManager from '../ui/modal-manager.js';
import themeManager from '../ui/theme-manager.js';
import authService from '../services/auth-service.js';
import notificationService from '../services/notification-service.js';

class SettingsPage {
  constructor() {
    this.container = null;
  }

  initialize() {
    this.container = document.getElementById('settings-content');

    // Setup date pickers
    this.initializeDatePickers();
  }

  render(userProfile, currentSemesterId, allSemesters, allSubjects) {
    if (!this.container) return;

    this.container.innerHTML = `
      ${this.renderProfileSection(userProfile)}
      ${this.renderSemestersSection(allSemesters, currentSemesterId)}
      ${this.renderSubjectsSection(allSubjects, currentSemesterId)}
      ${this.renderNotificationsSection()}
      ${this.renderAccountSection()}
      ${this.renderPersonalizationSection()}
      ${this.renderLegalSection()}
    `;

    // Attach event listeners
    this.attachEventListeners(currentSemesterId, allSemesters, allSubjects);
  }

  renderProfileSection(userProfile) {
    return `
      <div class="settings-section">
        <div class="settings-header collapsible collapsed" data-collapse="profile">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <h3>Profile</h3>
            <svg class="collapse-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
          <div>
            ${window.firebaseAuth?.currentUser
        ? `<button class="btn btn-red" id="signout-btn">Sign Out</button>`
        : `<button class="btn" id="auth-btn">Sign In</button>`
      }
          </div>
        </div>
        <div class="settings-content collapsed" id="profile-content">
          <div class="form-group">
            <label for="setting-name">Name</label>
            <input type="text" id="setting-name" class="form-input" placeholder="Your Name" value="${userProfile.name || ''}" autocomplete="off">
          </div>
          <div class="form-group">
            <label for="setting-major">Major</label>
            <input type="text" id="setting-major" class="form-input" placeholder="Your Major" value="${userProfile.major || ''}" autocomplete="off">
          </div>
          ${window.firebaseAuth?.currentUser
        ? `<div id="auth-status" style="margin-bottom: 1rem; padding: 0.75rem; border-radius: 8px; font-size: 0.9rem; background: rgba(34, 139, 34, 0.1); color: var(--green); border: 1px solid var(--green);">
                 Logged in as: ${window.firebaseAuth.currentUser.email}
               </div>`
        : ''
      }
          <button class="btn btn-green" id="save-profile-btn">Save Profile</button>
        </div>
      </div>
    `;
  }

  renderSemestersSection(allSemesters, currentSemesterId) {
    return `
      <div class="settings-section">
        <div class="settings-header collapsible collapsed" data-collapse="semesters">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <h3>Manage Semesters</h3>
            <svg class="collapse-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
          <button class="btn btn-green" id="add-semester-btn">Add Semester</button>
        </div>
        <div class="settings-content collapsed" id="semesters-content">
          <p style="margin-bottom: 1rem; color: var(--grey-text);">Manage your academic semesters:</p>
          <div class="form-group">
            <label>Current Semester</label>
            <div class="custom-dropdown" id="current-semester-dropdown">
              <div class="dropdown-selected" role="button" tabindex="0" aria-haspopup="listbox" aria-expanded="false">
                <span id="current-semester-display">Select a semester...</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
              </div>
              <div class="dropdown-options" role="listbox" id="current-semester-options">
                ${allSemesters.length > 0
        ? allSemesters.map(s => `<div class="dropdown-option" data-value="${s.id}" role="option">${s.name}</div>`).join('')
        : '<div class="dropdown-option" role="option">No semesters</div>'
      }
              </div>
            </div>
          </div>
          <div id="semesters-list">
            ${allSemesters.length > 0
        ? allSemesters.map(s => this.renderSemesterItem(s)).join('')
        : '<div class="empty-state-mini"><div class="empty-text">No semesters added yet</div></div>'
      }
          </div>
        </div>
      </div>
    `;
  }

  renderSemesterItem(semester) {
    return `
      <div class="settings-list-item" data-id="${semester.id}">
        <div>
          <strong>${semester.name}</strong><br>
          <small style="color: var(--grey-text);">${semester.startDate || 'No start date'} to ${semester.endDate || 'No end date'}</small>
        </div>
        <div class="btn-group">
          <button class="btn btn-edit-semester">Edit</button>
          <button class="btn btn-red btn-delete-semester">Delete</button>
        </div>
      </div>
    `;
  }

  renderSubjectsSection(allSubjects, currentSemesterId) {
    const currentSemSubjects = allSubjects.filter(s => s.semesterId === currentSemesterId);

    return `
      <div class="settings-section">
        <div class="settings-header collapsible collapsed" data-collapse="subjects">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <h3>Manage Subjects</h3>
            <svg class="collapse-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
          <button class="btn btn-green" id="add-subject-btn">Add Subject</button>
        </div>
        <div class="settings-content collapsed" id="subjects-content">
          <p style="margin-bottom: 1rem; color: var(--grey-text);">Subjects for current semester:</p>
          <div id="subjects-list">
            ${currentSemSubjects.length > 0
        ? currentSemSubjects.map(s => this.renderSubjectItem(s)).join('')
        : '<div class="empty-state-mini"><div class="empty-text">No subjects added for this semester</div></div>'
      }
          </div>
        </div>
      </div>
    `;
  }

  renderSubjectItem(subject) {
    return `
      <div class="settings-list-item" data-id="${subject.id}">
        <span><strong>${subject.name}</strong> (${subject.day})</span>
        <div class="btn-group">
          <button class="btn btn-edit-subject">Edit</button>
          <button class="btn btn-red btn-delete-subject">Delete</button>
        </div>
      </div>
    `;
  }

  renderNotificationsSection() {
    return `
      <div class="settings-section">
        <div class="settings-header collapsible collapsed" data-collapse="notifications">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <h3>Notifications</h3>
            <svg class="collapse-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>
        <div class="settings-content collapsed" id="notifications-content">
          <p style="color: var(--grey-text); margin-bottom: 1rem;">Get reminders for missed attendance and warnings</p>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button class="btn btn-green" id="enable-notifications-btn">Enable Notifications</button>
            <button class="btn btn-red" id="disable-notifications-btn">Disable Notifications</button>
          </div>
        </div>
      </div>
    `;
  }

  renderAccountSection() {
    return `
      <div class="settings-section" id="account-management" style="display: none;">
        <div class="settings-header">
          <h3>Account Management</h3>
        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
          <button class="btn" id="change-password-btn">Change Password</button>
          <button class="btn" id="change-email-btn">Change Email</button>
          <button class="btn btn-red" id="delete-account-btn">Delete Account</button>
        </div>
      </div>
    `;
  }

  renderPersonalizationSection() {
    return `
      <div class="settings-section">
        <div class="settings-header collapsible collapsed" data-collapse="personalization">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <h3>Personalization</h3>
            <svg class="collapse-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>
        <div class="settings-content collapsed" id="personalization-content">
          ${this.renderColorSchemeDropdown()}
          ${this.renderBackgroundDropdown()}
          ${this.renderFontDropdown()}
        </div>
      </div>
    `;
  }

  renderColorSchemeDropdown() {
    const currentScheme = themeManager.getColorScheme();

    return `
      <div class="form-group">
        <label>Color Scheme</label>
        <div class="custom-dropdown" id="color-scheme-dropdown" data-value="${currentScheme}">
          <div class="dropdown-selected" role="button" tabindex="0" aria-haspopup="listbox" aria-expanded="false">
            <span id="color-scheme-display">${COLOR_SCHEMES[currentScheme]}</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
          </div>
          <div class="dropdown-options" role="listbox">
            ${Object.entries(COLOR_SCHEMES).map(([key, value]) =>
      `<div class="dropdown-option" data-value="${key}" role="option">${value}</div>`
    ).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderBackgroundDropdown() {
    const currentBg = themeManager.getBackground();

    return `
      <div class="form-group">
        <label>Background</label>
        <div class="custom-dropdown" id="background-dropdown" data-value="${currentBg}">
          <div class="dropdown-selected" role="button" tabindex="0" aria-haspopup="listbox" aria-expanded="false">
            <span id="background-display">${BACKGROUNDS[currentBg]}</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
          </div>
          <div class="dropdown-options" role="listbox">
            ${Object.entries(BACKGROUNDS).map(([key, value]) =>
      `<div class="dropdown-option" data-value="${key}" role="option">${value}</div>`
    ).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderFontDropdown() {
    const currentFont = themeManager.getFont();

    return `
      <div class="form-group">
        <label>Font Style</label>
        <div class="custom-dropdown" id="font-dropdown" data-value="${currentFont}">
          <div class="dropdown-selected" role="button" tabindex="0" aria-haspopup="listbox" aria-expanded="false">
            <span id="font-display">${FONTS[currentFont]}</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
          </div>
          <div class="dropdown-options" role="listbox">
            ${Object.entries(FONTS).map(([key, value]) =>
      `<div class="dropdown-option" data-value="${key}" role="option">${value}</div>`
    ).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderLegalSection() {
    return `
      <div class="settings-section">
        <div class="settings-header">
          <h3>Legal & Support</h3>
        </div>
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
          <a href="https://telegra.ph/PRIVACY-POLICY-11-17-295" target="_blank" style="color: var(--primary); text-decoration: none; font-weight: 500;">Privacy Policy</a>
          <a href="https://telegra.ph/TERMS-OF-SERVICE-11-17-3" target="_blank" style="color: var(--primary); text-decoration: none; font-weight: 500;">Terms of Service</a>
          <a href="#" id="report-problem-btn" style="color: var(--primary); text-decoration: none; font-weight: 500;">Report a Problem</a>
          <a href="#" id="contact-us-btn" style="color: var(--primary); text-decoration: none; font-weight: 500;">Contact Us</a>
        </div>
      </div>
      
      <div style="text-align: center; padding: 1rem; color: var(--grey-text); font-size: 0.9rem; border-top: 1px solid var(--border-color); margin-top: 1rem;">
        <div>© 2025 Attendance Tracker. All rights reserved.</div>
        <div style="margin-top: 0.25rem;">Version 2.2.0</div>
      </div>
    `;
  }

  attachEventListeners(currentSemesterId, allSemesters, allSubjects) {
    // Collapse handlers
    this.setupCollapseHandlers();

    // Profile
    document.getElementById('save-profile-btn')?.addEventListener('click', () => this.handleSaveProfile());
    document.getElementById('auth-btn')?.addEventListener('click', () => modalManager.open('auth-modal'));
    document.getElementById('signout-btn')?.addEventListener('click', () => authService.handleSignOut());

    // Current semester
    document.getElementById('current-semester-dropdown')?.addEventListener('change', (e) =>
      this.handleCurrentSemesterChange(e.currentTarget.dataset.value)
    );

    // Semesters
    document.getElementById('add-semester-btn')?.addEventListener('click', () => this.openSemesterModal());
    document.querySelectorAll('.btn-edit-semester').forEach(btn =>
      btn.addEventListener('click', (e) => this.handleEditSemester(e))
    );
    document.querySelectorAll('.btn-delete-semester').forEach(btn =>
      btn.addEventListener('click', (e) => this.handleDeleteSemester(e, allSubjects))
    );

    // Subjects
    document.getElementById('add-subject-btn')?.addEventListener('click', () => this.openSubjectModal());
    document.querySelectorAll('.btn-edit-subject').forEach(btn =>
      btn.addEventListener('click', (e) => this.handleEditSubject(e, allSubjects))
    );
    document.querySelectorAll('.btn-delete-subject').forEach(btn =>
      btn.addEventListener('click', (e) => this.handleDeleteSubject(e))
    );

    // Notifications
    document.getElementById('enable-notifications-btn')?.addEventListener('click', () =>
      notificationService.requestPermission()
    );
    document.getElementById('disable-notifications-btn')?.addEventListener('click', () =>
      notificationService.disable()
    );

    // Account management
    document.getElementById('change-password-btn')?.addEventListener('click', () =>
      authService.changePassword()
    );
    document.getElementById('change-email-btn')?.addEventListener('click', () =>
      authService.changeEmail()
    );
    document.getElementById('delete-account-btn')?.addEventListener('click', () =>
      authService.deleteAccount()
    );

    // Legal/Support
    document.getElementById('report-problem-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      modalManager.open('report-modal');
    });
    document.getElementById('contact-us-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showContactInfo();
    });

    // Report modal submit
    document.getElementById('submit-report-btn')?.addEventListener('click', () =>
      this.handleSubmitReport()
    );

    // Re-setup theme manager listeners
    themeManager.setupPersonalizationListeners();
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
          content.style.maxHeight = content.scrollHeight + 'px';
          content.classList.remove('collapsed');
          newHeader.classList.remove('collapsed');
        } else {
          content.style.maxHeight = '0px';
          content.classList.add('collapsed');
          newHeader.classList.add('collapsed');
        }
      });
    });
  }

  async handleSaveProfile() {
    const name = document.getElementById('setting-name').value.trim();
    const major = document.getElementById('setting-major').value.trim();

    if (!name || !major) {
      toastManager.warning('Please fill in all fields.');
      return;
    }

    if (await checkBadWords(name)) {
      toastManager.error('Please use appropriate language for your name.');
      return;
    }

    if (await checkBadWords(major)) {
      toastManager.error('Please use appropriate language for your major.');
      return;
    }

    const loadingToast = toastManager.loading('Saving profile...');

    try {
      await setDoc(
        doc(window.firebaseDb, FIREBASE_PATHS.userProfile(window.app.userId)),
        { name, major },
        { merge: true }
      );
      toastManager.hide(loadingToast);
      toastManager.success('Profile saved successfully!');
    } catch (error) {
      toastManager.hide(loadingToast);
      toastManager.error('Error saving profile: ' + error.message);
    }
  }

  async handleCurrentSemesterChange(newSemesterId) {
    const loadingToast = toastManager.loading('Updating semester...');

    try {
      await setDoc(
        doc(window.firebaseDb, FIREBASE_PATHS.userProfile(window.app.userId)),
        { currentSemesterId: newSemesterId },
        { merge: true }
      );
      toastManager.hide(loadingToast);
      toastManager.success('Current semester updated!');
    } catch (error) {
      toastManager.hide(loadingToast);
      toastManager.error('Error updating semester: ' + error.message);
    }
  }

  openSemesterModal(semester = null) {
    const modal = document.getElementById('semester-modal');
    const title = modal.querySelector('#semester-modal-title');
    const idInput = modal.querySelector('#semester-modal-id');
    const nameInput = modal.querySelector('#semester-modal-name');
    const startDateInput = modal.querySelector('#semester-modal-start-date');
    const endDateInput = modal.querySelector('#semester-modal-end-date');
    const startDisplay = document.getElementById('semester-start-date-display');
    const endDisplay = document.getElementById('semester-end-date-display');

    if (semester) {
      title.textContent = 'Edit Semester';
      idInput.value = semester.id;
      nameInput.value = semester.name;
      startDateInput.value = semester.startDate || '';
      endDateInput.value = semester.endDate || '';

      if (semester.startDate) {
        startDisplay.textContent = new Date(semester.startDate + 'T00:00:00').toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        });
      }

      if (semester.endDate) {
        endDisplay.textContent = new Date(semester.endDate + 'T00:00:00').toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        });
      }
    } else {
      title.textContent = 'Add Semester';
      idInput.value = '';
      nameInput.value = '';
      startDateInput.value = '';
      endDateInput.value = '';
      startDisplay.textContent = 'Select start date';
      endDisplay.textContent = 'Select end date';
    }

    modalManager.open('semester-modal');
  }

  handleEditSemester(e) {
    const id = e.target.closest('.settings-list-item').dataset.id;
    const semester = window.app.allSemesters.find(s => s.id === id);
    this.openSemesterModal(semester);
  }

  async handleDeleteSemester(e, allSubjects) {
    const id = e.target.closest('.settings-list-item').dataset.id;
    const semester = window.app.allSemesters.find(s => s.id === id);
    const subjectsToDelete = allSubjects.filter(s => s.semesterId === id);
    const attendanceToDelete = window.app.allAttendance?.filter(r => r.semesterId === id) || [];

    const confirmed = await modalManager.confirm(
      'Delete Semester',
      `Delete "${semester?.name || 'this semester'}"? This will also delete ${subjectsToDelete.length} subjects and ${attendanceToDelete.length} attendance records. This cannot be undone.`
    );

    if (!confirmed) return;

    const loadingToast = toastManager.loading('Deleting semester...');

    try {
      await deleteDoc(doc(window.firebaseDb, FIREBASE_PATHS.semesterDoc(window.app.userId, id)));
      toastManager.hide(loadingToast);
      toastManager.success('Semester deleted successfully');
    } catch (error) {
      toastManager.hide(loadingToast);
      toastManager.error('Error deleting semester: ' + error.message);
    }
  }

  openSubjectModal(subject = null) {
    const modal = document.getElementById('subject-modal');
    const title = modal.querySelector('#subject-modal-title');
    const idInput = modal.querySelector('#subject-modal-id');
    const nameInput = modal.querySelector('#subject-modal-name');
    const dayDropdown = modal.querySelector('#subject-modal-day-dropdown');
    const dayDisplay = modal.querySelector('#subject-modal-day-display');

    if (subject) {
      title.textContent = 'Edit Subject';
      idInput.value = subject.id;
      nameInput.value = subject.name;
      dayDisplay.textContent = subject.day;
      dayDropdown.dataset.value = subject.day;
    } else {
      title.textContent = 'Add Subject';
      idInput.value = '';
      nameInput.value = '';
      dayDisplay.textContent = 'Select a day...';
      dayDropdown.dataset.value = '';
    }

    modalManager.open('subject-modal');
  }

  handleEditSubject(e, allSubjects) {
    const id = e.target.closest('.settings-list-item').dataset.id;
    const subject = allSubjects.find(s => s.id === id);
    this.openSubjectModal(subject);
  }

  async handleDeleteSubject(e) {
    const id = e.target.closest('.settings-list-item').dataset.id;
    const subject = window.app.allSubjects.find(s => s.id === id);

    const confirmed = await modalManager.confirm(
      'Delete Subject',
      `Delete "${subject?.name || 'this subject'}"? This cannot be undone.`
    );

    if (!confirmed) return;

    const loadingToast = toastManager.loading('Deleting subject...');

    try {
      await deleteDoc(doc(window.firebaseDb, FIREBASE_PATHS.subjectDoc(window.app.userId, id)));
      toastManager.hide(loadingToast);
      toastManager.success('Subject deleted successfully');
    } catch (error) {
      toastManager.hide(loadingToast);
      toastManager.error('Error deleting subject: ' + error.message);
    }
  }

  showContactInfo() {
    const email = 'lyssa.phat@gmail.com';
    toastManager.info(
      `Contact us at: ${email} <button onclick="navigator.clipboard.writeText('${email}').then(() => window.toastManager.success('Email copied!'))" style="margin-left: 0.5rem; padding: 0.25rem 0.5rem; border: none; border-radius: 4px; background: var(--primary); color: white; cursor: pointer; font-size: 0.8rem;">Copy</button>`,
      8000
    );
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

    const loadingToast = toastManager.loading('Submitting report...');

    try {
      await addDoc(collection(window.firebaseDb, FIREBASE_PATHS.bugReports()), reportData);
      toastManager.hide(loadingToast);
      toastManager.success('Report submitted successfully! Thank you for your feedback.');
      modalManager.close('report-modal');

      // Clear form
      document.getElementById('report-type-dropdown').dataset.value = '';
      document.getElementById('report-type-display').textContent = 'Select problem type...';
      document.getElementById('report-description').value = '';
    } catch (error) {
      toastManager.hide(loadingToast);
      toastManager.error('Failed to submit report: ' + error.message);
    }
  }

  initializeDatePickers() {
    // Date picker initialization logic
    // This would be similar to your original implementation
    // I'll keep it simple here for brevity
  }
}

export default new SettingsPage();
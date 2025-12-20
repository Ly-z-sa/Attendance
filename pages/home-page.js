// pages/home-page.js
import { getTodayDateString, getDayNameFromDate, getAvailableDates, getSemesterWeek } from '../utils/helpers.js';
import attendanceService from '../services/attendance-service.js';
import { ICONS } from '../utils/icons.js';
import toastManager from '../ui/toast-manager.js';
import modalManager from '../ui/modal-manager.js';

class HomePage {
  constructor() {
    this.container = null;
    this.selectedDate = null;
  }

  initialize() {
    this.container = document.getElementById('home-content');

    // Setup date selector change handler
    const dateSelector = document.getElementById('date-selector-dropdown');
    if (dateSelector) {
      dateSelector.addEventListener('change', () => {
        const value = dateSelector.dataset.value;
        this.selectedDate = value === getTodayDateString() ? null : value;
        this.render(window.app.currentSemesterId, window.app.allSemesters, window.app.allSubjects);
      });
    }

    // Setup FAB
    this.setupFAB();
  }

  setupFAB() {
    const fab = document.getElementById('quick-attendance-fab');
    if (fab) {
      fab.addEventListener('click', () => this.handleQuickMarkAll());
    }
  }

  render(currentSemesterId, allSemesters, allSubjects) {
    if (!this.container) return;

    const currentDate = this.selectedDate || getTodayDateString();
    const dayName = getDayNameFromDate(currentDate);
    const isToday = currentDate === getTodayDateString();

    // Update date selector
    this.updateDateSelector(currentDate);

    // Check if date is within semester
    const currentSem = allSemesters.find(s => s.id === currentSemesterId);
    if (!this.isDateInSemester(currentDate, currentSem)) {
      this.container.innerHTML = this.renderOutOfRangeMessage(currentSem);
      this.hideFAB();
      return;
    }

    // Check if date is more than 7 days old
    const daysDiff = Math.floor((new Date(getTodayDateString()) - new Date(currentDate)) / (1000 * 60 * 60 * 24));
    if (daysDiff > 7) {
      this.container.innerHTML = this.renderTooOldMessage();
      this.hideFAB();
      return;
    }

    const subjectsForDay = allSubjects.filter(s => s.day === dayName && s.semesterId === currentSemesterId);
    const attendanceForDay = attendanceService.getForDate(currentDate);

    if (subjectsForDay.length === 0) {
      this.container.innerHTML = this.renderNoSubjectsMessage(dayName);
      this.hideFAB();
      return;
    }

    // Show FAB if there are unmarked subjects
    const hasUnmarked = subjectsForDay.some(s => !attendanceForDay.find(r => r.subjectId === s.id));
    if (hasUnmarked && isToday) {
      this.showFAB();
    } else {
      this.hideFAB();
    }

    this.container.innerHTML = this.renderAttendanceForm(
      subjectsForDay,
      attendanceForDay,
      currentDate,
      currentSem
    );

    // Attach event listeners
    this.attachEventListeners(currentDate, currentSem);
  }

  updateDateSelector(currentDate) {
    const availableDates = getAvailableDates();
    const dateOptionsContainer = document.getElementById('date-selector-options');
    const selectedDateDisplay = document.getElementById('selected-date-display');
    const dateSelector = document.getElementById('date-selector-dropdown');

    if (!dateOptionsContainer || !selectedDateDisplay || !dateSelector) return;

    dateOptionsContainer.innerHTML = availableDates.map(date =>
      `<div class="dropdown-option" data-value="${date.dateString}" role="option">${date.displayName}</div>`
    ).join('');

    const selectedDateObj = availableDates.find(d => d.dateString === currentDate);
    selectedDateDisplay.textContent = selectedDateObj ? selectedDateObj.displayName : getDayNameFromDate(currentDate);
    dateSelector.dataset.value = currentDate;
  }

  isDateInSemester(dateString, semester) {
    if (!semester || !semester.startDate || !semester.endDate) return true;

    const date = new Date(dateString);
    const start = new Date(semester.startDate);
    const end = new Date(semester.endDate);

    return date >= start && date <= end;
  }

  renderOutOfRangeMessage(semester) {
    return `
      <div class="empty-state">
        <div class="empty-icon">${ICONS.CALENDAR}</div>
        <h3>Date Out of Range</h3>
        <p>The selected date is outside of the semester period</p>
        ${semester ? `<p class="text-muted">${semester.startDate} to ${semester.endDate}</p>` : ''}
      </div>
    `;
  }

  renderTooOldMessage() {
    return `
      <div class="empty-state">
        <div class="empty-icon">${ICONS.LOCK}</div>
        <h3>Cannot Edit Old Attendance</h3>
        <p>You can only edit attendance for the past 7 days</p>
      </div>
    `;
  }

  renderNoSubjectsMessage(dayName) {
    return `
      <div class="empty-state">
        <div class="empty-icon">${ICONS.BOOK}</div>
        <h3>No Classes Today</h3>
        <p>No subjects are scheduled for ${dayName}</p>
      </div>
    `;
  }

  renderAttendanceForm(subjects, attendance, date, semester) {
    const unmarkedCount = subjects.filter(s => !attendance.find(r => r.subjectId === s.id)).length;

    let html = '';

    // Bulk attendance option if multiple unmarked subjects
    if (unmarkedCount > 1) {
      html += `
        <div class="bulk-attendance-card">
          <div class="bulk-header">
            <span class="bulk-icon">${ICONS.LIGHTNING}</span>
            <span class="bulk-title">Quick Mark</span>
            <span class="bulk-badge">${unmarkedCount} subjects</span>
          </div>
          <div class="bulk-actions">
            <button class="bulk-btn bulk-btn-present" data-status="Present">
              <span class="bulk-btn-icon">✓</span> All Present
            </button>
            <button class="bulk-btn bulk-btn-late" data-status="Late">
              <span class="bulk-btn-icon">⏰</span> All Late
            </button>
          </div>
        </div>
      `;
    }

    // Individual subject rows
    html += subjects.map((subject, index) => {
      const record = attendance.find(r => r.subjectId === subject.id);
      const status = record ? record.status : "Select";
      const statusClass = record ? `status-${status.toLowerCase()}` : "status-present";
      const isDisabled = !!record;

      return `
        <div class="data-row ${isDisabled ? 'data-row-completed' : ''}" style="animation-delay: ${index * 0.05}s;" data-subject-id="${subject.id}">
          <div class="subject-info">
            <span class="subject-name">${subject.name}</span>
            ${isDisabled ? '<span class="subject-marked-badge">✓ Marked</span>' : ''}
          </div>
          <div class="subject-row-right">
            <div class="custom-dropdown status-dropdown" data-value="${status}" data-subject-id="${subject.id}">
              <div class="dropdown-selected ${statusClass}" role="button" tabindex="0" aria-haspopup="listbox" aria-expanded="false">
                <span>${status}</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
              </div>
              <div class="dropdown-options" role="listbox">
                <div class="dropdown-option" data-value="Present" role="option">Present</div>
                <div class="dropdown-option" data-value="Absent" role="option">Absent</div>
                <div class="dropdown-option" data-value="Permission" role="option">Permission</div>
                <div class="dropdown-option" data-value="Late" role="option">Late</div>
              </div>
            </div>
            <button class="tick-btn" data-subject-id="${subject.id}" title="Submit Attendance" aria-label="Submit attendance" ${isDisabled ? 'disabled' : ''}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    return html;
  }

  attachEventListeners(date, semester) {
    // Individual submit buttons
    this.container.querySelectorAll('.tick-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleSubmitAttendance(e, date, semester));
    });

    // Bulk submit buttons
    this.container.querySelectorAll('.bulk-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const status = e.currentTarget.dataset.status;
        this.handleBulkSubmit(status, date, semester);
      });
    });
  }

  async handleSubmitAttendance(e, date, semester) {
    const btn = e.currentTarget;
    const subjectId = btn.dataset.subjectId;
    const dropdown = this.container.querySelector(`.custom-dropdown[data-subject-id="${subjectId}"]`);
    const status = dropdown.dataset.value;

    if (status === 'Select') {
      toastManager.warning('Please select a status first.');
      return;
    }

    btn.disabled = true;
    btn.classList.add('loading');

    try {
      await attendanceService.submitAttendance(subjectId, window.app.currentSemesterId, date, status, semester);
      toastManager.success(`✓ Marked as ${status}`);

      // Mark row as completed
      const row = btn.closest('.data-row');
      if (row) {
        row.classList.add('data-row-completed');
        row.querySelector('.subject-info').innerHTML += '<span class="subject-marked-badge">✓ Marked</span>';
      }
    } catch (error) {
      btn.disabled = false;
      btn.classList.remove('loading');
      toastManager.error(error.message || 'Failed to save attendance');
    }
  }

  async handleBulkSubmit(status, date, semester) {
    const confirmed = await modalManager.confirm(
      'Mark All Subjects',
      `Mark all unmarked subjects as ${status}?`
    );

    if (!confirmed) return;

    const loadingToast = toastManager.loading('Marking attendance...');

    try {
      const subjectsForDay = window.app.allSubjects.filter(
        s => s.day === getDayNameFromDate(date) && s.semesterId === window.app.currentSemesterId
      );

      const count = await attendanceService.bulkSubmitAttendance(
        subjectsForDay,
        window.app.currentSemesterId,
        date,
        status,
        semester
      );

      toastManager.hide(loadingToast);
      toastManager.success(`✓ Marked ${count} subject${count !== 1 ? 's' : ''} as ${status}`);
    } catch (error) {
      toastManager.hide(loadingToast);
      toastManager.error(error.message || 'Failed to save attendance');
    }
  }

  async handleQuickMarkAll() {
    await this.handleBulkSubmit('Present', getTodayDateString(), window.app.allSemesters.find(s => s.id === window.app.currentSemesterId));
  }

  showFAB() {
    const fab = document.getElementById('quick-attendance-fab');
    if (fab) {
      fab.style.display = 'flex';
    }
  }

  hideFAB() {
    const fab = document.getElementById('quick-attendance-fab');
    if (fab) {
      fab.style.display = 'none';
    }
  }
}

export default new HomePage();
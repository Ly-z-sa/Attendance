// pages/home-page.js
import { getTodayDateString, getDayNameFromDate, getAvailableDates, getSemesterWeek } from '../utils/helpers.js';
import attendanceService from '../services/attendance-service.js';
import { ICONS } from '../utils/icons.js';
import { sanitizeInput } from '../utils/sanitizer.js';
import toastManager from '../ui/toast-manager.js';
import modalManager from '../ui/modal-manager.js';
import { validateCSRFToken } from '../utils/csrf-protection.js';

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
      return;
    }

    // Check if date is more than 7 days old
    const daysDiff = Math.floor((new Date(getTodayDateString()) - new Date(currentDate)) / (1000 * 60 * 60 * 24));
    if (daysDiff > 7) {
      this.container.innerHTML = this.renderTooOldMessage();
      return;
    }

    const subjectsForDay = allSubjects.filter(s => s.day === dayName && s.semesterId === currentSemesterId);
    const attendanceForDay = attendanceService.getForDate(currentDate);

    if (subjectsForDay.length === 0) {
      this.container.innerHTML = this.renderNoSubjectsMessage(dayName);
      return;
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
      `<div class="dropdown-option" data-value="${sanitizeInput(date.dateString)}" role="option">${sanitizeInput(date.displayName)}</div>`
    ).join('');

    const selectedDateObj = availableDates.find(d => d.dateString === currentDate);
    selectedDateDisplay.textContent = selectedDateObj ? sanitizeInput(selectedDateObj.displayName) : sanitizeInput(getDayNameFromDate(currentDate));
    dateSelector.dataset.value = sanitizeInput(currentDate);
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
        ${semester ? `<p class="text-muted">${sanitizeInput(semester.startDate)} to ${sanitizeInput(semester.endDate)}</p>` : ''}
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
        <p>No subjects are scheduled for ${sanitizeInput(dayName)}</p>
      </div>
    `;
  }

  renderAttendanceForm(subjects, attendance, date, semester) {
    let html = '';

    // Check for unmarked subjects to show bulk card
    const unmarkedSubjects = subjects.filter(subject =>
      !attendance.find(r => r.subjectId === subject.id)
    );

    // Show bulk attendance card if there are multiple subjects and at least one is unmarked
    if (subjects.length > 1 && unmarkedSubjects.length > 0) {
      html += this.renderBulkAttendanceCard(unmarkedSubjects.length);
    }

    // Individual subject rows
    html += subjects.map((subject, index) => {
      const record = attendance.find(r => r.subjectId === subject.id);
      const status = record ? record.status : "Select";
      const statusClass = record ? `status-${status.toLowerCase()}` : "status-present";
      const isDisabled = !!record;
      const isToday = date === getTodayDateString();

      return `
        <div class="data-row ${isDisabled ? 'data-row-completed' : ''}" style="animation-delay: ${index * 0.05}s;" data-subject-id="${sanitizeInput(subject.id)}">
          <div class="subject-info">
            <span class="subject-name">${sanitizeInput(subject.name)}</span>
            ${isDisabled ? '<span class="subject-marked-badge">✓ Marked</span>' : ''}
            ${record && record.editReason ? '<span class="subject-edited-badge" title="This record has been edited">Edited</span>' : ''}
          </div>
          <div class="subject-row-right">
            <div class="custom-dropdown status-dropdown" data-value="${sanitizeInput(status)}" data-subject-id="${sanitizeInput(subject.id)}">
              <div class="dropdown-selected ${statusClass}" role="button" tabindex="0" aria-haspopup="listbox" aria-expanded="false">
                <span>${sanitizeInput(status)}</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
              </div>
              <div class="dropdown-options" role="listbox">
                <div class="dropdown-option" data-value="Present" role="option">Present</div>
                <div class="dropdown-option" data-value="Absent" role="option">Absent</div>
                <div class="dropdown-option" data-value="Permission" role="option">Permission</div>
                <div class="dropdown-option" data-value="Late" role="option">Late</div>
              </div>
            </div>
            ${isDisabled ? `
              <button class="edit-btn" data-record-id="${sanitizeInput(record.id)}" data-subject-id="${sanitizeInput(subject.id)}" data-subject-name="${sanitizeInput(subject.name)}" data-current-status="${sanitizeInput(status)}" data-date="${sanitizeInput(date)}" title="Edit Attendance" aria-label="Edit attendance">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
              </button>
            ` : ''}
            <button class="tick-btn" data-subject-id="${sanitizeInput(subject.id)}" title="Submit Attendance" aria-label="Submit attendance" ${isDisabled ? 'disabled' : ''}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    return html;
  }

  renderBulkAttendanceCard(unmarkedCount) {
    return `
      <div class="bulk-attendance-card">
        <div class="bulk-header">
          <span class="bulk-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
            </svg>
          </span>
          <span class="bulk-title">Quick Mark All</span>
          <span class="bulk-badge">${unmarkedCount} remaining</span>
        </div>
        <div class="bulk-actions">
          <button class="bulk-btn" data-bulk-status="Present">
            <span class="bulk-btn-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </span>
            All Present
          </button>
          <button class="bulk-btn" data-bulk-status="Absent">
            <span class="bulk-btn-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </span>
            All Absent
          </button>
          <button class="bulk-btn" data-bulk-status="Permission">
            <span class="bulk-btn-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.05 4.575a1.575 1.575 0 1 0-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 0 1 3.15 0v1.5m-3.15 0 .075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 0 1 3.15 0V15M6.9 7.575a1.575 1.575 0 1 0-3.15 0v8.175a6.75 6.75 0 0 0 6.75 6.75h2.018a5.25 5.25 0 0 0 3.712-1.538l1.732-1.732a5.25 5.25 0 0 0 1.538-3.712l.003-2.024a.668.668 0 0 1 .198-.471 1.575 1.575 0 1 0-2.228-2.228 3.818 3.818 0 0 0-1.12 2.687M6.9 7.575V12m6.27 4.318A4.49 4.49 0 0 1 16.35 15" />
              </svg>
            </span>
            All Permission
          </button>
          <button class="bulk-btn" data-bulk-status="Late">
            <span class="bulk-btn-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </span>
            All Late
          </button>
        </div>
      </div>
    `;
  }

  attachEventListeners(date, semester) {
    // Individual submit buttons
    this.container.querySelectorAll('.tick-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleSubmitAttendance(e, date, semester));
    });

    // Edit buttons
    this.container.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleEditAttendance(e));
    });

    // Bulk attendance buttons
    this.container.querySelectorAll('.bulk-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleBulkAttendance(e, date, semester));
    });
  }

  async handleSubmitAttendance(e, date, semester) {
    const btn = e.currentTarget;
    const subjectId = btn.dataset.subjectId;
    const dropdown = this.container.querySelector(`.custom-dropdown[data-subject-id="${subjectId}"]`);

    if (!dropdown) {
      toastManager.error('Unable to find status dropdown');
      return;
    }

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
        const subjectInfo = row.querySelector('.subject-info');
        if (subjectInfo) {
          subjectInfo.innerHTML += '<span class="subject-marked-badge">✓ Marked</span>';
        }
      }
    } catch (error) {
      btn.disabled = false;
      btn.classList.remove('loading');
      toastManager.error(error.message || 'Failed to save attendance');
    }
  }

  handleEditAttendance(e) {
    const btn = e.currentTarget;
    const recordId = btn.dataset.recordId;
    const subjectId = btn.dataset.subjectId;
    const subjectName = btn.dataset.subjectName;
    const currentStatus = btn.dataset.currentStatus;
    const date = btn.dataset.date;

    const recordData = {
      recordId,
      subjectId,
      subjectName,
      currentStatus,
      date
    };

    modalManager.editAttendance(recordData).then(async (result) => {
      if (result.success) {
        try {
          await attendanceService.editAttendance(recordId, result.newStatus, result.reason);
          toastManager.success('✓ Attendance updated successfully');

          // Refresh the page to show updated data
          this.render(window.app.currentSemesterId, window.app.allSemesters, window.app.allSubjects);
        } catch (error) {
          toastManager.error(error.message || 'Failed to update attendance');
        }
      } else if (result.error) {
        toastManager.warning(result.error);
      }
    });
  }

  async handleBulkAttendance(e, date, semester) {
    const btn = e.currentTarget;
    const status = btn.dataset.bulkStatus;

    if (!status) {
      toastManager.error('Invalid status selected');
      return;
    }

    // Get all unmarked subjects for today
    const dayName = getDayNameFromDate(date);
    const subjectsForDay = window.app.allSubjects.filter(
      s => s.day === dayName && s.semesterId === window.app.currentSemesterId
    );
    const attendanceForDay = attendanceService.getForDate(date);
    const unmarkedSubjects = subjectsForDay.filter(
      subject => !attendanceForDay.find(r => r.subjectId === subject.id)
    );

    if (unmarkedSubjects.length === 0) {
      toastManager.warning('All subjects have already been marked!');
      return;
    }

    // Disable all bulk buttons during processing
    const allBulkBtns = this.container.querySelectorAll('.bulk-btn');
    allBulkBtns.forEach(b => b.disabled = true);
    btn.classList.add('loading');

    try {
      const count = await attendanceService.bulkSubmitAttendance(
        unmarkedSubjects,
        window.app.currentSemesterId,
        date,
        status,
        semester
      );

      toastManager.success(`✓ Marked ${count} subject${count > 1 ? 's' : ''} as ${status}`);

      // Re-render the page to show updated state
      this.render(window.app.currentSemesterId, window.app.allSemesters, window.app.allSubjects);
    } catch (error) {
      allBulkBtns.forEach(b => b.disabled = false);
      btn.classList.remove('loading');
      toastManager.error(error.message || 'Failed to save bulk attendance');
    }
  }

}

export default new HomePage();
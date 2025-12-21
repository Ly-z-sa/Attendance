// pages/weekly-report-page.js
import { getTodayDateString, getSemesterWeek } from '../utils/helpers.js';
import attendanceService from '../services/attendance-service.js';
import { ICONS } from '../utils/icons.js';

class WeeklyReportPage {
  constructor() {
    this.container = null;
  }

  initialize() {
    this.container = document.getElementById('weekly-report-content');

    // Setup week selector
    const weekSelector = document.getElementById('week-selector-dropdown');
    if (weekSelector) {
      weekSelector.addEventListener('change', () => {
        this.render(window.app.currentSemesterId, window.app.allSemesters, window.app.allSubjects);
      });
    }
  }

  render(currentSemesterId, allSemesters, allSubjects) {
    if (!this.container) return;

    const currentSem = allSemesters.find(s => s.id === currentSemesterId);
    if (!currentSem) {
      this.container.innerHTML = this.renderEmptyState();
      return;
    }

    // Update week selector
    this.updateWeekSelector(currentSemesterId, currentSem);

    // Get selected week
    const weekSelector = document.getElementById('week-selector-dropdown');
    const selectedWeek = parseInt(weekSelector?.dataset.value || 1, 10);

    // Get stats for selected week
    const weekStats = attendanceService.calculateStats(currentSemesterId, selectedWeek);
    const warnings = attendanceService.getWarningsForSemester(currentSemesterId, allSubjects);

    this.container.innerHTML = `
      <!-- Stats Cards -->
      <div class="weekly-stats-grid">
        <div class="stat-column">
          <span class="stat-label">Present</span>
          <div class="count-bubble count-green">${weekStats.counts.Present}</div>
        </div>
        <div class="stat-column">
          <span class="stat-label">Absent</span>
          <div class="count-bubble count-red">${weekStats.counts.Absent}</div>
        </div>
        <div class="stat-column">
          <span class="stat-label">Permit</span>
          <div class="count-bubble count-blue">${weekStats.counts.Permission}</div>
        </div>
        <div class="stat-column">
          <span class="stat-label">Late</span>
          <div class="count-bubble count-yellow">${weekStats.counts.Late}</div>
        </div>
      </div>

      <!-- Week Summary -->
      <div class="week-summary">
        <div class="summary-card">
          <div class="summary-icon">${ICONS.CHART}</div>
          <div class="summary-content">
            <div class="summary-value">${weekStats.percentage}%</div>
            <div class="summary-label">Attendance Rate</div>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-icon">${ICONS.CALENDAR}</div>
          <div class="summary-content">
            <div class="summary-value">${weekStats.total}</div>
            <div class="summary-label">Total Classes</div>
          </div>
        </div>
      </div>

      <!-- Warnings Section -->
      <h3 style="margin-top: 2rem; margin-bottom: 1rem; font-family: 'Iceberg', serif;">Warnings</h3>
      ${this.renderWarnings(warnings)}
    `;
  }

  updateWeekSelector(semesterId, semester) {
    const currentSemAttendance = attendanceService.getForSemester(semesterId);
    const uniqueWeeks = [...new Set(currentSemAttendance.map(r => r.semesterWeek))];
    const validWeeks = uniqueWeeks.filter(w => w != null).sort((a, b) => b - a);

    const weekOptionsContainer = document.getElementById('week-selector-options');
    const selectedWeekDisplay = document.getElementById('selected-week-display');
    const weekDropdown = document.getElementById('week-selector-dropdown');

    if (!weekOptionsContainer || !selectedWeekDisplay || !weekDropdown) return;

    if (validWeeks.length > 0) {
      weekOptionsContainer.innerHTML = validWeeks.map(week =>
        `<div class="dropdown-option" data-value="${week}" role="option">Week ${week}</div>`
      ).join('');
    } else {
      weekOptionsContainer.innerHTML = '<div class="dropdown-option" data-value="1" role="option">Week 1</div>';
    }

    const currentWeek = getSemesterWeek(getTodayDateString(), semester);
    let weekToDisplay = currentWeek && validWeeks.includes(currentWeek) ? currentWeek : validWeeks[0] || 1;

    weekDropdown.dataset.value = weekToDisplay;
    selectedWeekDisplay.textContent = `Week ${weekToDisplay}`;
  }

  renderWarnings(warnings) {
    if (warnings.length === 0) {
      return `
        <div class="empty-state-mini success-state">
          <div class="empty-icon">✓</div>
          <div class="empty-text">No warnings! All subjects are in good standing.</div>
          <div class="empty-subtext">Keep up the great work!</div>
        </div>
      `;
    }

    return `
      <div class="warnings-grid">
        ${warnings.map(w => `
          <div class="warning-card" style="border-left: 4px solid ${w.warning.color}">
            <div class="warning-card-header">
              <span class="warning-subject-name">${w.subject.name}</span>
              <span class="warning-status-badge" style="background: ${w.warning.color}">${w.warning.status}</span>
            </div>
            <div class="warning-stats">
              <div class="warning-stat">
                <span class="warning-stat-value">${w.counts.Absent}</span>
                <span class="warning-stat-label">Absent</span>
              </div>
              <div class="warning-stat">
                <span class="warning-stat-value">${w.counts.Permission}</span>
                <span class="warning-stat-label">Permission</span>
              </div>
              <div class="warning-stat">
                <span class="warning-stat-value">${w.counts.Late}</span>
                <span class="warning-stat-label">Late</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-icon">${ICONS.CHART}</div>
        <h3>No Reports Available</h3>
        <p>Start tracking attendance to see weekly reports</p>
      </div>
    `;
  }
}

export default new WeeklyReportPage();
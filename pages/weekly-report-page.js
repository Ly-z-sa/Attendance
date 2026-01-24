// pages/weekly-report-page.js
import { getTodayDateString, getSemesterWeek } from '../utils/helpers.js';
import attendanceService from '../services/attendance-service.js';
import { ICONS } from '../utils/icons.js';
import { sanitizeInput } from '../utils/sanitizer.js';
import i18nService from '../services/i18n-service.js';


class WeeklyReportPage {
  constructor() {
    this.container = null;
    this.selectedWeek = null;
    this.currentSemesterId = null;
  }

  initialize() {
    this.container = document.getElementById('weekly-report-content');

    // Setup week selector
    const weekSelector = document.getElementById('week-selector-dropdown');
    if (weekSelector) {
      weekSelector.addEventListener('change', (e) => {
        const val = e.currentTarget.dataset.value;
        if (val) {
          this.selectedWeek = parseInt(val, 10);
        }
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

    // Handle semester change
    if (this.currentSemesterId !== currentSemesterId) {
      this.currentSemesterId = currentSemesterId;
      this.selectedWeek = null; // Reset selection on semester change
    }

    // Update week selector
    this.updateWeekSelector(currentSemesterId, currentSem);

    // Get selected week
    const selectedWeek = this.selectedWeek || 1;

    // Get stats for selected week
    const weekStats = attendanceService.calculateStats(currentSemesterId, selectedWeek);
    const warnings = attendanceService.getWarningsForSemester(currentSemesterId, allSubjects);

    this.container.innerHTML = `
      <!-- Stats Cards -->
      <div class="weekly-stats-grid">
        <div class="stat-column">
          <span class="stat-label">${i18nService.t('status.present')}</span>
          <div class="count-bubble count-green">${weekStats.counts.Present}</div>
        </div>
        <div class="stat-column">
          <span class="stat-label">${i18nService.t('status.absent')}</span>
          <div class="count-bubble count-red">${weekStats.counts.Absent}</div>
        </div>
        <div class="stat-column">
          <span class="stat-label">${i18nService.t('common.permit')}</span>
          <div class="count-bubble count-blue">${weekStats.counts.Permission}</div>
        </div>
        <div class="stat-column">
          <span class="stat-label">${i18nService.t('status.late')}</span>
          <div class="count-bubble count-yellow">${weekStats.counts.Late}</div>
        </div>
      </div>

      <!-- Week Summary -->
      <div class="week-summary">
        <div class="summary-card">
          <div class="summary-icon">${ICONS.CHART}</div>
          <div class="summary-content">
            <div class="summary-value">${weekStats.percentage}%</div>
            <div class="summary-label">${i18nService.t('dashboard.attendanceRate')}</div>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-icon">${ICONS.CALENDAR}</div>
          <div class="summary-content">
            <div class="summary-value">${weekStats.total}</div>
            <div class="summary-label">${i18nService.t('common.totalClasses')}</div>
          </div>
        </div>
      </div>

      <!-- Warnings Section -->
      <h3 style="margin-top: 2rem; margin-bottom: 1rem; font-family: 'Iceberg', serif;">${i18nService.t('dashboard.warnings')}</h3>
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
        `<div class="dropdown-option" data-value="${sanitizeInput(week.toString())}" role="option">${i18nService.t('reports.weekNum', { count: week })}</div>`
      ).join('');
    } else {
      weekOptionsContainer.innerHTML = `<div class="dropdown-option" data-value="1" role="option">${i18nService.t('reports.weekNum', { count: 1 })}</div>`;
    }

    const currentWeek = getSemesterWeek(getTodayDateString(), semester);

    // Default to current week if nothing selected yet
    if (this.selectedWeek === null) {
      this.selectedWeek = currentWeek && validWeeks.includes(currentWeek) ? currentWeek : (validWeeks[0] || 1);
    }

    let weekToDisplay = this.selectedWeek;

    weekDropdown.dataset.value = weekToDisplay;
    selectedWeekDisplay.textContent = i18nService.t('reports.weekNum', { count: weekToDisplay });
  }

  renderWarnings(warnings) {
    if (warnings.length === 0) {
      return `
        <div class="empty-state-mini success-state">
          <div class="empty-icon">✓</div>
          <div class="empty-text">${i18nService.t('common.noWarnings')}</div>
          <div class="empty-subtext">${i18nService.t('common.keepItUp')}</div>
        </div>
      `;
    }

    return `
      <div class="warnings-grid">
        ${warnings.map(w => `
          <div class="warning-card" style="border-left: 4px solid ${sanitizeInput(w.warning.color)}">
            <div class="warning-card-header">
              <span class="warning-subject-name">${sanitizeInput(w.subject.name)}</span>
              <span class="warning-status-badge" style="background: ${sanitizeInput(w.warning.color)}">
                ${w.warning.status === 'Good' ? i18nService.t('common.statusGood') :
        w.warning.status === 'FIRST WARNING' ? i18nService.t('common.statusFirstWarning') :
          w.warning.status === 'LAST WARNING' ? i18nService.t('common.statusLastWarning') :
            w.warning.status === 'RED ERROR WARNING' ? i18nService.t('common.statusError') :
              sanitizeInput(w.warning.status)}
              </span>
            </div>
            <div class="warning-stats">
              <div class="warning-stat">
                <span class="warning-stat-value">${sanitizeInput(w.counts.Absent.toString())}</span>
                <span class="warning-stat-label">${i18nService.t('status.absent')}</span>
              </div>
              <div class="warning-stat">
                <span class="warning-stat-value">${sanitizeInput(w.counts.Permission.toString())}</span>
                <span class="warning-stat-label">${i18nService.t('common.permit')}</span>
              </div>
              <div class="warning-stat">
                <span class="warning-stat-value">${sanitizeInput(w.counts.Late.toString())}</span>
                <span class="warning-stat-label">${i18nService.t('status.late')}</span>
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
        <h3>${i18nService.t('reports.noReports')}</h3>
        <p>${i18nService.t('reports.startTracking')}</p>
      </div>
    `;
  }
}

export default new WeeklyReportPage();
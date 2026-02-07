// pages/total-page.js
import attendanceService from '../services/attendance-service.js';
import toastManager from '../ui/toast-manager.js';
import i18nService from '../services/i18n-service.js';


class TotalPage {
  constructor() {
    this.container = null;
  }

  initialize() {
    this.container = document.getElementById('total-content');

    // Setup export dropdown
    const exportDropdown = document.getElementById('export-type-dropdown');
    if (exportDropdown) {
      exportDropdown.addEventListener('change', (e) => {
        const exportType = e.currentTarget.dataset.value;
        if (exportType) {
          this.handleExport(exportType);
          // Reset dropdown
          e.currentTarget.dataset.value = '';
          document.getElementById('export-type-display').textContent = i18nService.t('export.toExcel');
        }
      });
    }
  }

  render(currentSemesterId, allSemesters, allSubjects) {
    if (!this.container) return;

    const currentSemSubjects = allSubjects.filter(s => s.semesterId === currentSemesterId);

    if (currentSemSubjects.length === 0) {
      this.container.innerHTML = this.renderEmptyState();
      return;
    }

    let html = `
      <div class="total-header-labels mobile-hide">
        <div class="total-header-spacer"></div>
        <div class="total-header-counts">
          <div class="total-header-label">PRS</div>
          <div class="total-header-label">ABS</div>
          <div class="total-header-label">PER</div>
          <div class="total-header-label">LAT</div>
        </div>
      </div>
    `;

    html += currentSemSubjects.map((subject, index) => {
      const stats = attendanceService.calculateSubjectStats(subject.id);

      return `
        <div class="total-subject-wrapper" style="animation-delay: ${index * 0.05}s;">
          <div class="total-subject-bar">
            <div class="subject-info-detailed">
              <div class="subject-header">
                <span class="subject-name-large">${subject.name}</span>
                <span class="subject-day-badge">${i18nService.getDayTranslation(subject.day)}</span>
              </div>
              <div class="subject-status-row">
                <span class="subject-warning" style="color: ${stats.warning.color}; font-weight: 600;">
                  ${stats.warning.status === 'Good' ? i18nService.t('common.statusGood') :
          stats.warning.status === 'FIRST WARNING' ? i18nService.t('common.statusFirstWarning') :
            stats.warning.status === 'LAST WARNING' ? i18nService.t('common.statusLastWarning') :
              stats.warning.status === 'RED ERROR WARNING' ? i18nService.t('common.statusError') :
                sanitizeInput(stats.warning.status)}
                </span>
                <span class="subject-percentage" style="color: ${this.getPercentageColor(stats.percentage)}">
                  ${i18nService.t('common.attendanceCount', { count: stats.percentage })}
                </span>
              </div>
            </div>
          </div>
          <div class="total-count-circles">
            <div class="count-circle count-green" title="${i18nService.t('status.present')}">${stats.counts.Present}</div>
            <div class="count-circle count-red" title="${i18nService.t('status.absent')}">${stats.counts.Absent}</div>
            <div class="count-circle count-blue" title="${i18nService.t('common.permit')}">${stats.counts.Permission}</div>
            <div class="count-circle count-yellow" title="${i18nService.t('status.late')}">${stats.counts.Late}</div>
          </div>
        </div>
      `;
    }).join('');

    this.container.innerHTML = html;
  }

  getPercentageColor(percentage) {
    const percent = parseFloat(percentage);
    if (percent >= 90) return 'var(--green)';
    if (percent >= 75) return 'var(--blue-accent)';
    if (percent >= 60) return 'var(--yellow-dark)';
    return 'var(--red)';
  }

  handleExport(type) {
    const currentSem = window.app.allSemesters.find(s => s.id === window.app.currentSemesterId);

    if (!currentSem) {
      toastManager.warning(i18nService.t('toast.selectSemester.title'), 3500, i18nService.t('toast.selectSemester.detail'));
      return;
    }

    try {
      const { blob, filename } = attendanceService.exportToExcel(
        type,
        currentSem,
        window.app.allSubjects
      );

      // Create and download file
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();

      toastManager.success(i18nService.t('toast.exportSuccess.title'), 3000, i18nService.t('toast.exportSuccess.detail', { type: type.charAt(0).toUpperCase() + type.slice(1) }));
    } catch (error) {
      console.error('Export error:', error);
      toastManager.error(i18nService.t('toast.exportError.title'), 4000, i18nService.t('toast.exportError.detail'));
    }
  }

  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-illustration">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="20" y="30" width="80" height="60" rx="4" stroke="var(--border-color)" stroke-width="2" fill="var(--light-grey)"/>
            <line x1="30" y1="45" x2="70" y2="45" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"/>
            <line x1="30" y1="60" x2="90" y2="60" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"/>
            <line x1="30" y1="75" x2="80" y2="75" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <h3>${i18nService.t('total.noSubjects')}</h3>
        <p>${i18nService.t('total.addSubjectsDesc')}</p>
        <button class="btn btn-primary" onclick="window.navigateTo('Settings')">${i18nService.t('total.addSubjectsBtn')}</button>
      </div>
    `;
  }
}

export default new TotalPage();
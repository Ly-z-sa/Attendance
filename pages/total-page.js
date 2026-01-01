// pages/total-page.js
import attendanceService from '../services/attendance-service.js';
import toastManager from '../ui/toast-manager.js';

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
          document.getElementById('export-type-display').textContent = 'Export to Excel';
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
      <div class="mobile-hide" style="display: flex; justify-content: flex-end; padding: 0 1.5rem; margin-bottom: 0.5rem; font-size: 0.75rem; color: var(--grey-text); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
        <div style="flex: 1;"></div>
        <div style="display: flex; gap: 1rem; width: 232px; justify-content: space-around;">
          <div style="width: 48px; text-align: center;">PRS</div>
          <div style="width: 48px; text-align: center;">ABS</div>
          <div style="width: 48px; text-align: center;">PER</div>
          <div style="width: 48px; text-align: center;">LAT</div>
        </div>
      </div>
    `;

    html += currentSemSubjects.map((subject, index) => {
      const stats = attendanceService.calculateSubjectStats(subject.id);

      return `
        <div class="total-subject-row">
          <div class="data-row" style="animation-delay: ${index * 0.05}s;">
            <div class="subject-info-detailed">
              <div class="subject-header">
                <span class="subject-name-large">${subject.name}</span>
                <span class="subject-day-badge">${subject.day}</span>
              </div>
              <div class="subject-status-row">
                <span class="subject-warning" style="color: ${stats.warning.color}; font-weight: 600;">
                  ${stats.warning.status}
                </span>
                <span class="subject-percentage" style="color: ${this.getPercentageColor(stats.percentage)}">
                  ${stats.percentage}% attendance
                </span>
              </div>
            </div>
            <div class="data-row-right">
              <div class="count-bubble count-green" title="Present">${stats.counts.Present}</div>
              <div class="count-bubble count-red" title="Absent">${stats.counts.Absent}</div>
              <div class="count-bubble count-blue" title="Permission">${stats.counts.Permission}</div>
              <div class="count-bubble count-yellow" title="Late">${stats.counts.Late}</div>
            </div>
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
      toastManager.warning('Please select a semester first.');
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

      toastManager.success(`${type.charAt(0).toUpperCase() + type.slice(1)} report exported successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      toastManager.error('Failed to export report');
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
        <h3>No Subjects Found</h3>
        <p>Add subjects to this semester to track attendance</p>
        <button class="btn btn-primary" onclick="window.navigateTo('Settings')">Add Subjects</button>
      </div>
    `;
  }
}

export default new TotalPage();
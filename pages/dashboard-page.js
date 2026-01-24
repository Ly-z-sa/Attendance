// pages/dashboard-page.js
import { getTodayDateString, getCurrentDayName, getSemesterWeek, getRelativeTimeString } from '../utils/helpers.js';
import attendanceService from '../services/attendance-service.js';
import { ICONS } from '../utils/icons.js';
import { sanitizeInput } from '../utils/sanitizer.js';
import i18nService from '../services/i18n-service.js';


class DashboardPage {
  constructor() {
    this.container = null;
    this.currentSlide = 0;
    this.slideshowInterval = null;
    this.slides = null;
    this.dotClickHandlers = [];
  }

  initialize() {
    this.container = document.getElementById('dashboard-content');
  }

  render(currentSemesterId, allSemesters, allSubjects) {
    if (!this.container) return;

    const currentSem = allSemesters.find(s => s.id === currentSemesterId);
    const slideshowHtml = this.renderSlideshow();

    if (!currentSem) {
      this.container.innerHTML = slideshowHtml + this.renderEmptyState();
      this.startSlideshow();
      return;
    }

    const today = getTodayDateString();
    const currentDay = getCurrentDayName();
    const todaysSubjects = allSubjects.filter(s => s.day === currentDay && s.semesterId === currentSemesterId);
    const todaysAttendance = attendanceService.getForDate(today);
    const semesterStats = attendanceService.calculateStats(currentSemesterId);
    const currentWeek = getSemesterWeek(today, currentSem);
    const weekStats = currentWeek ? attendanceService.calculateStats(currentSemesterId, currentWeek) : null;
    const streak = attendanceService.calculateStreak(currentSemesterId, allSubjects);
    const warnings = attendanceService.getWarningsForSemester(currentSemesterId, allSubjects);

    // Recent activity
    const recentAttendance = [...attendanceService.getForSemester(currentSemesterId)]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      // amazonq-ignore-next-line
      .slice(0, 5);

    this.container.innerHTML = `
      <!-- Photo Slideshow -->
      ${this.renderSlideshow()}

      <div class="dashboard-header">
        <h3>${i18nService.t('dashboard.quickOverview')}</h3>
        <span class="dashboard-date">${sanitizeInput(new Date().toLocaleDateString(i18nService.getCurrentLanguage(), { weekday: 'long', month: 'long', day: 'numeric' }))}</span>
      </div>

      <!-- Quick Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card stat-card-primary">
          <div class="stat-icon">${ICONS.TARGET}</div>
          <div class="stat-content">
            <div class="stat-value">${sanitizeInput(semesterStats.percentage)}%</div>
            <div class="stat-label">${i18nService.t('dashboard.attendanceRate')}</div>
          </div>
        </div>
        
        <div class="stat-card stat-card-success">
          <div class="stat-icon">${ICONS.FIRE}</div>
          <div class="stat-content">
            <div class="stat-value">${sanitizeInput(streak.toString())}</div>
            <div class="stat-label">${i18nService.t('dashboard.dayStreak')}</div>
          </div>
        </div>
        
        ${weekStats ? `
        <div class="stat-card stat-card-info">
          <div class="stat-icon">${ICONS.CALENDAR}</div>
          <div class="stat-content">
            <div class="stat-value">${i18nService.t('dashboard.week')} ${sanitizeInput(currentWeek.toString())}</div>
            <div class="stat-label">${i18nService.t('dashboard.presentOutOf', { present: weekStats.counts.Present, total: weekStats.total })}</div>
          </div>
        </div>
        ` : ''}
        
        <div class="stat-card ${warnings.length > 0 ? 'stat-card-warning' : 'stat-card-success'}">
          <div class="stat-icon">${warnings.length > 0 ? ICONS.WARNING : ICONS.CHECK}</div>
          <div class="stat-content">
            <div class="stat-value">${sanitizeInput(warnings.length.toString())}</div>
            <div class="stat-label">${warnings.length === 1 ? i18nService.t('dashboard.warning') : i18nService.t('dashboard.warnings')}</div>
          </div>
        </div>
      </div>

      <!-- Today's Subjects -->
      <div class="dashboard-section">
        <div class="section-header">
          <h3>${i18nService.t('dashboard.todaysClasses')}</h3>
          <span class="section-badge">${i18nService.t('dashboard.subjectsCount', { count: todaysSubjects.length })}</span>
        </div>
        ${this.renderTodaysSubjects(todaysSubjects, todaysAttendance)}
      </div>

      <!-- Warnings -->
      ${warnings.length > 0 ? `
      <div class="dashboard-section dashboard-warnings">
        <div class="section-header">
          <h3>${i18nService.t('dashboard.attentionNeeded')}</h3>
          <span class="section-badge section-badge-warning">${warnings.length === 1 ? i18nService.t('dashboard.warningCount', { count: warnings.length }) : i18nService.t('dashboard.warningsCount', { count: warnings.length })}</span>
        </div>
        <div class="warnings-list">
          ${warnings.map(w => `
            <div class="warning-item">
              <div class="warning-icon" style="color: ${sanitizeInput(w.warning.color)}">${ICONS.WARNING}</div>
              <div class="warning-content">
                <div class="warning-subject">${sanitizeInput(w.subject.name)}</div>
                <div class="warning-status" style="color: ${sanitizeInput(w.warning.color)}">
                  ${w.warning.status === 'Good' ? i18nService.t('common.statusGood') :
        w.warning.status === 'FIRST WARNING' ? i18nService.t('common.statusFirstWarning') :
          w.warning.status === 'LAST WARNING' ? i18nService.t('common.statusLastWarning') :
            w.warning.status === 'RED ERROR WARNING' ? i18nService.t('common.statusError') :
              sanitizeInput(w.warning.status)}
                </div>
                <div class="warning-details">${sanitizeInput(w.counts.Absent.toString())} ${i18nService.t('status.absent').toLowerCase()} • ${sanitizeInput(w.counts.Permission.toString())} ${i18nService.t('common.permit').toLowerCase()} • ${sanitizeInput(w.counts.Late.toString())} ${i18nService.t('status.late').toLowerCase()}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Recent Activity -->
      <div class="dashboard-section">
        <div class="section-header">
          <h3>${i18nService.t('dashboard.recentActivity')}</h3>
        </div>
        ${this.renderRecentActivity(recentAttendance, allSubjects)}
      </div>
    `;
    this.startSlideshow();
  }

  renderTodaysSubjects(subjects, attendance) {
    if (subjects.length === 0) {
      return `
        <div class="empty-state-mini">
          <div class="empty-icon">${ICONS.BOOK}</div>
          <div class="empty-text">${i18nService.t('dashboard.noClasses')}</div>
        </div>
      `;
    }

    return `
      <div class="todays-subjects">
        ${subjects.map(subject => {
      const record = attendance.find(r => r.subjectId === subject.id);
      const statusClass = record ? `status-${record.status.toLowerCase().replace(/[^a-z0-9-]/g, '')}` : 'status-pending';
      const statusText = record ? i18nService.t(`status.${record.status.toLowerCase()}`) : i18nService.t('attendance.notMarked');

      return `
            <div class="subject-item ${statusClass}">
              <div class="subject-status-indicator"></div>
              <div class="subject-name">${sanitizeInput(subject.name)}</div>
              <div class="subject-status">${statusText}</div>
            </div>
          `;
    }).join('')}
      </div>
    `;
  }

  renderRecentActivity(recentAttendance, allSubjects) {
    if (recentAttendance.length === 0) {
      return `
        <div class="empty-state-mini">
          <div class="empty-icon">${ICONS.CLIPBOARD}</div>
          <div class="empty-text">${i18nService.t('dashboard.noActivity')}</div>
        </div>
      `;
    }

    return `
      <div class="activity-list">
        ${recentAttendance.map(record => {
      const subject = allSubjects.find(s => s.id === record.subjectId);
      if (!subject) return ''; // Skip if subject not found
      const subjectName = sanitizeInput(subject.name);
      const statusClass = `status-${record.status.toLowerCase().replace(/[^a-z0-9-]/g, '')}`;

      return `
            <div class="activity-item">
              <div class="activity-indicator ${statusClass}"></div>
              <div class="activity-content">
                <div class="activity-subject">${subjectName}</div>
                <div class="activity-date">${sanitizeInput(i18nService.getRelativeTimeTranslation(record.date))}</div>
              </div>
              <div class="activity-status ${statusClass}">${i18nService.t(`status.${record.status.toLowerCase()}`)}</div>
            </div>
          `;
    }).join('')}
      </div>
    `;
  }

  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-illustration">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="50" fill="var(--light-grey)" opacity="0.5"/>
            <path d="M40 50 L50 60 L80 30" stroke="var(--primary)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <circle cx="60" cy="60" r="45" stroke="var(--border-color)" stroke-width="2" fill="none"/>
          </svg>
        </div>
        <h3>${i18nService.t('dashboard.welcomeTitle')}</h3>
        <p>${i18nService.t('dashboard.welcomeDesc')}</p>
        <button class="btn btn-primary" data-navigate="Settings">${i18nService.t('dashboard.getStarted')}</button>
      </div>
    `;
  }
  renderSlideshow() {
    return `
      <div class="slideshow-section">
        <div class="slideshow-container">
          <div class="slideshow-track" id="slideshow-track">
            <div class="slide slide-0"><img src="assets/slideshow_1.png" alt="Slide 1"></div>
            <div class="slide slide-1"><img src="assets/slideshow_2.png" alt="Slide 2"></div>
            <div class="slide slide-2"><img src="assets/slideshow_3.png" alt="Slide 3"></div>
            <div class="slide slide-3"><img src="assets/slideshow_4.png" alt="Slide 4"></div>
            <div class="slide slide-4"><img src="assets/slideshow_5.png" alt="Slide 5"></div>
            <div class="slide slide-5"><img src="assets/slideshow_6.png" alt="Slide 6"></div>
            <div class="slide slide-6"><img src="assets/slideshow_7.png" alt="Slide 7"></div>
          </div>
          <div class="slideshow-dots">
            <div class="dot active" onclick="goToSlide(0)"></div>
            <div class="dot" onclick="goToSlide(1)"></div>
            <div class="dot" onclick="goToSlide(2)"></div>
            <div class="dot" onclick="goToSlide(3)"></div>
            <div class="dot" onclick="goToSlide(4)"></div>
            <div class="dot" onclick="goToSlide(5)"></div>
            <div class="dot" onclick="goToSlide(6)"></div>
          </div>
        </div>
      </div>
    `;
  }

  startSlideshow() {
    this.stopSlideshow();

    setTimeout(() => {
      const track = document.getElementById('slideshow-track');
      if (!track) return;

      const slideCount = 7;

      const next = () => {
        const nextSlide = (this.currentSlide + 1) % slideCount;
        this.showSlide(nextSlide);
      };

      const start = () => {
        this.stopSlideshow();
        this.slideshowInterval = setInterval(next, 5000);
      };

      window.goToSlide = (n) => {
        this.showSlide(n);
        start();
      };

      this.showSlide(this.currentSlide);
      start();
    }, 100);
  }

  setupDotListeners() {
    if (!this.container) return;

    // Remove existing listeners to prevent memory leaks
    this.removeDotListeners();

    const dots = this.container.querySelectorAll('.dot');
    this.dotClickHandlers = [];

    dots.forEach((dot, index) => {
      const handler = () => {
        this.showSlide(index);
        this.startSlideshow(); // Restart timer on manual click
      };
      dot.addEventListener('click', handler);
      this.dotClickHandlers.push({ element: dot, handler });
    });
  }
  removeDotListeners() {
    if (this.dotClickHandlers) {
      this.dotClickHandlers.forEach(({ element, handler }) => {
        element.removeEventListener('click', handler);
      });
      this.dotClickHandlers = [];
    }
  }

  stopSlideshow() {
    if (this.slideshowInterval) {
      clearInterval(this.slideshowInterval);
      this.slideshowInterval = null;
    }
  }

  showSlide(index) {
    const track = document.querySelector('#slideshow-track');
    const dots = document.querySelectorAll('.slideshow-dots .dot');

    if (track) {
      track.style.transform = `translateX(-${index * 14.2857}%)`;
    }

    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });

    this.currentSlide = index;
  }

  clear() {
    this.stopSlideshow();
    this.removeDotListeners();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

const dashboardPageInstance = new DashboardPage();

export default dashboardPageInstance;

// Make the same instance globally accessible for onclick handlers
window.dashboardPage = dashboardPageInstance;

// Global function for dot clicks - redirects to the instance's startSlideshow if needed
// or uses the one set up in startSlideshow()
if (typeof window.goToSlide !== 'function') {
  window.goToSlide = function (index) {
    if (window.dashboardPage) {
      window.dashboardPage.showSlide(index);
      window.dashboardPage.startSlideshow();
    }
  };
}
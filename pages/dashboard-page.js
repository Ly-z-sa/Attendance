// pages/dashboard-page.js
import { getTodayDateString, getCurrentDayName, getSemesterWeek, getRelativeTimeString } from '../utils/helpers.js';
import attendanceService from '../services/attendance-service.js';
import { ICONS } from '../utils/icons.js';

class DashboardPage {
  constructor() {
    this.container = null;
  }

  initialize() {
    this.container = document.getElementById('dashboard-content');
  }

  render(currentSemesterId, allSemesters, allSubjects) {
    if (!this.container) return;

    const currentSem = allSemesters.find(s => s.id === currentSemesterId);
    if (!currentSem) {
      this.container.innerHTML = this.renderEmptyState();
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
      .slice(0, 5);

    this.container.innerHTML = `
      <div class="dashboard-header">
        <h3>Quick Overview</h3>
        <span class="dashboard-date">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
      </div>

      <!-- Quick Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card stat-card-primary">
          <div class="stat-icon">${ICONS.TARGET}</div>
          <div class="stat-content">
            <div class="stat-value">${semesterStats.percentage}%</div>
            <div class="stat-label">Attendance Rate</div>
          </div>
        </div>
        
        <div class="stat-card stat-card-success">
          <div class="stat-icon">${ICONS.FIRE}</div>
          <div class="stat-content">
            <div class="stat-value">${streak}</div>
            <div class="stat-label">Day Streak</div>
          </div>
        </div>
        
        ${weekStats ? `
        <div class="stat-card stat-card-info">
          <div class="stat-icon">${ICONS.CALENDAR}</div>
          <div class="stat-content">
            <div class="stat-value">Week ${currentWeek}</div>
            <div class="stat-label">${weekStats.counts.Present}/${weekStats.total} Present</div>
          </div>
        </div>
        ` : ''}
        
        <div class="stat-card ${warnings.length > 0 ? 'stat-card-warning' : 'stat-card-success'}">
          <div class="stat-icon">${warnings.length > 0 ? ICONS.WARNING : ICONS.CHECK}</div>
          <div class="stat-content">
            <div class="stat-value">${warnings.length}</div>
            <div class="stat-label">Warning${warnings.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>

      <!-- Today's Subjects -->
      <div class="dashboard-section">
        <div class="section-header">
          <h3>Today's Classes</h3>
          <span class="section-badge">${todaysSubjects.length} subjects</span>
        </div>
        ${this.renderTodaysSubjects(todaysSubjects, todaysAttendance)}
      </div>

      <!-- Warnings -->
      ${warnings.length > 0 ? `
      <div class="dashboard-section dashboard-warnings">
        <div class="section-header">
          <h3>Attention Needed</h3>
          <span class="section-badge section-badge-warning">${warnings.length} warning${warnings.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="warnings-list">
          ${warnings.map(w => `
            <div class="warning-item">
              <div class="warning-icon" style="color: ${w.warning.color}">${ICONS.WARNING}</div>
              <div class="warning-content">
                <div class="warning-subject">${w.subject.name}</div>
                <div class="warning-status" style="color: ${w.warning.color}">${w.warning.status}</div>
                <div class="warning-details">${w.counts.Absent} absent • ${w.counts.Permission} permission • ${w.counts.Late} late</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Recent Activity -->
      <div class="dashboard-section">
        <div class="section-header">
          <h3>Recent Activity</h3>
        </div>
        ${this.renderRecentActivity(recentAttendance, allSubjects)}
      </div>
    `;
  }

  renderTodaysSubjects(subjects, attendance) {
    if (subjects.length === 0) {
      return `
        <div class="empty-state-mini">
          <div class="empty-icon">${ICONS.BOOK}</div>
          <div class="empty-text">No classes scheduled for today</div>
        </div>
      `;
    }

    return `
      <div class="todays-subjects">
        ${subjects.map(subject => {
      const record = attendance.find(r => r.subjectId === subject.id);
      const statusClass = record ? `status-${record.status.toLowerCase()}` : 'status-pending';
      const statusText = record ? record.status : 'Not marked';

      return `
            <div class="subject-item ${statusClass}">
              <div class="subject-status-indicator"></div>
              <div class="subject-name">${subject.name}</div>
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
          <div class="empty-text">No recent activity</div>
        </div>
      `;
    }

    return `
      <div class="activity-list">
        ${recentAttendance.map(record => {
      const subject = allSubjects.find(s => s.id === record.subjectId);
      const subjectName = subject ? subject.name : 'Unknown Subject';
      const statusClass = `status-${record.status.toLowerCase()}`;

      return `
            <div class="activity-item">
              <div class="activity-indicator ${statusClass}"></div>
              <div class="activity-content">
                <div class="activity-subject">${subjectName}</div>
                <div class="activity-date">${getRelativeTimeString(record.date)}</div>
              </div>
              <div class="activity-status ${statusClass}">${record.status}</div>
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
        <h3>Welcome to Your Dashboard</h3>
        <p>Start by adding a semester and subjects to track your attendance</p>
        <button class="btn btn-primary" onclick="window.navigateTo('Settings')">Get Started</button>
      </div>
    `;
  }

  clear() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

export default new DashboardPage();
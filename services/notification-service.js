// services/notification-service.js
import { getTodayDateString, getCurrentDayName, getSemesterWeek } from '../utils/helpers.js';
import toastManager from '../ui/toast-manager.js';

class NotificationService {
  constructor() {
    this.permission = 'default';
    this.lastNotificationDate = null;
    this.hasNotifiedToday = false;
    this.intervalId = null;
  }

  async init() {
    if (!('Notification' in window)) return;
    this.permission = Notification.permission;
    if (this.permission === 'granted') {
      this.startSchedule();
    }
  }

  async requestPermission() {
    if (!('Notification' in window)) {
      toastManager.warning('Notifications are not supported in this browser.', 3500, 'Your browser does not support desktop notifications.');
      return false;
    }

    try {
      this.permission = await Notification.requestPermission();

      if (this.permission === 'granted') {
        toastManager.success(i18nService.t('toast.notificationsEnabled.title'), 3000, i18nService.t('toast.notificationsEnabled.detail'));
        this.startSchedule();
        return true;
      } else {
        toastManager.info(i18nService.t('toast.notificationsDisabled.title'), 3000, i18nService.t('toast.notificationsDisabled.detail'));
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  disable() {
    toastManager.info('To disable notifications, go to your browser settings and block notifications for this site.', 5000, i18nService.t('toast.notificationsDisabled.detail'));
  }

  send(title, body, icon = null) {
    if (!('Notification' in window)) return;
    if (this.permission !== 'granted') return;

    try {
      new Notification(title, {
        body: body,
        icon: icon || 'att-logo.svg',
        badge: 'att-logo.svg',
        tag: 'attendance-tracker',
        requireInteraction: false
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  startSchedule() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Check every minute
    this.intervalId = setInterval(() => {
      this.checkSchedule();
    }, 60 * 1000);
  }

  checkSchedule() {
    if (!this.attendanceService || !this.subjects) return;

    // Use Cambodia time for notifications logic
    const now = new Date();

    // Get Cambodia time parts
    const cambodiaTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Phnom_Penh',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });

    const parts = cambodiaTime.formatToParts(now);
    const getPart = (type) => parts.find(p => p.type === type).value;

    const hour = parseInt(getPart('hour'));
    const minute = parseInt(getPart('minute'));

    const currentDayName = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Phnom_Penh',
      weekday: 'long'
    }).format(now);

    // Map day name back to 0-6 index if needed for existing logic (0=Sunday)
    const dayMap = { "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6 };
    const dayOfWeek = dayMap[currentDayName];
    const today = getTodayDateString();

    // Reset notification state at midnight
    if (hour === 0 && minute === 0) {
      this.hasNotifiedToday = false;
      this.lastNotificationDate = null;
    }

    // Check if date has changed
    if (this.lastNotificationDate !== today) {
      this.hasNotifiedToday = false;
      this.lastNotificationDate = today;
    }

    // Morning schedule notification at 7:00 AM
    if (hour === 7 && minute === 0) {
      this.sendDailySchedule();
    }

    // Check for class reminders (1 hour before each class)
    this.checkClassReminders(hour, minute, currentDayName);

    // First reminder at 5:30 PM (17:30)
    if (hour === 17 && minute === 30) {
      this.checkMissedAttendance();
    }

    // Hourly reminders from 6:00 PM to 11:00 PM
    if (minute === 0 && hour >= 18 && hour <= 23) {
      this.hasNotifiedToday = false; // Reset for hourly reminders
      this.checkMissedAttendance();
    }

    // Daily warning check at 6 PM
    if (hour === 18 && minute === 0) {
      this.checkWarningStatus();
    }

    // Weekly report - Sunday at 8 PM
    if (dayOfWeek === 0 && hour === 20 && minute === 0) {
      this.sendWeeklyReport();
    }
  }

  sendDailySchedule() {
    if (!this.subjects || !this.currentSemesterId) return;

    const today = getCurrentDayName();
    const todaySubjects = this.subjects.filter(
      s => s.day === today && s.semesterId === this.currentSemesterId
    );

    if (todaySubjects.length === 0) return; // Don't send if no classes today

    const subjectList = todaySubjects
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
      .map(s => `${s.name}${s.startTime ? ` at ${s.startTime}` : ''}`)
      .join(', ');

    const message = todaySubjects.length === 1
      ? `You have 1 class today: ${subjectList}. Have a great day!`
      : `You have ${todaySubjects.length} classes today: ${subjectList}. Have a great day!`;

    this.send('Today\'s Schedule', message);
  }

  checkClassReminders(currentHour, currentMinute, currentDayName) {
    if (!this.subjects || !this.currentSemesterId) return;

    const todaySubjects = this.subjects.filter(
      s => s.day === currentDayName && s.semesterId === this.currentSemesterId && s.startTime
    );

    todaySubjects.forEach(subject => {
      const [startHour, startMinute] = subject.startTime.split(':').map(Number);
      const reminderHour = startHour - 1;
      const reminderMinute = startMinute;

      // Check if current time matches reminder time (1 hour before class)
      if (currentHour === reminderHour && currentMinute === reminderMinute) {
        const endTime = subject.endTime ? ` - ${subject.endTime}` : '';
        this.send(
          'Class Reminder',
          `${subject.name} starts in 1 hour at ${subject.startTime}${endTime}. Get ready!`
        );
      }
    });
  }

  checkMissedAttendance() {
    if (!this.attendanceService || !this.subjects || !this.currentSemesterId) return;

    const today = getCurrentDayName();
    const todayDate = getTodayDateString();
    const subjectsToday = this.subjects.filter(
      s => s.day === today && s.semesterId === this.currentSemesterId
    );
    const attendanceToday = this.attendanceService.getForDate(todayDate);

    if (this.hasNotifiedToday) return;

    const missedSubjects = subjectsToday.filter(
      subject => !attendanceToday.find(r => r.subjectId === subject.id)
    );

    if (missedSubjects.length > 0) {
      const subjectNames = missedSubjects.map(s => s.name).join(', ');
      const message = missedSubjects.length === 1
        ? `Don't forget to mark attendance for: ${subjectNames}`
        : `Don't forget to mark attendance for ${missedSubjects.length} subjects: ${subjectNames}`;

      this.send('Attendance Reminder', message);
      this.hasNotifiedToday = true;
    }
  }

  checkWarningStatus() {
    if (!this.attendanceService || !this.subjects || !this.currentSemesterId) return;

    const warnings = this.attendanceService.getWarningsForSemester(
      this.currentSemesterId,
      this.subjects
    );

    warnings.forEach(w => {
      if (w.warning.status === 'FIRST WARNING' ||
        w.warning.status === 'LAST WARNING' ||
        w.warning.status === 'RED ERROR WARNING') {
        this.send(
          'Attendance Warning',
          `${w.subject.name}: ${w.warning.status} - ${w.counts.Absent} absent, ${w.counts.Permission} permission, ${w.counts.Late} late`
        );
      }
    });
  }

  sendWeeklyReport() {
    if (!this.attendanceService || !this.currentSemesterId || !this.semester) return;

    const stats = this.attendanceService.calculateStats(this.currentSemesterId);
    const currentWeek = getSemesterWeek(getTodayDateString(), this.semester);

    const message = `Week ${currentWeek} Report: ${stats.counts.Present}P ${stats.counts.Absent}A ${stats.counts.Permission}Pe ${stats.counts.Late}L (${stats.percentage}% attendance)`;

    this.send('Weekly Attendance Report', message);
    this.send('Weekly Attendance Report', message);
    toastManager.info(message, 6000, 'Your weekly attendance summary is ready.');
  }

  // Method to inject dependencies
  setContext(attendanceService, subjects, currentSemesterId, semester) {
    this.attendanceService = attendanceService;
    this.subjects = subjects;
    this.currentSemesterId = currentSemesterId;
    this.semester = semester;
  }

  stopSchedule() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  cleanup() {
    this.stopSchedule();
  }
}

export default new NotificationService();
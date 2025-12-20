// services/attendance-service.js
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { FIREBASE_PATHS } from '../utils/constants.js';
import { getSemesterWeek, calculateWarning } from '../utils/helpers.js';

class AttendanceService {
  constructor() {
    this.db = null;
    this.userId = null;
    this.allAttendance = [];
    this.listeners = new Set();
    this.unsubscribe = null;
  }

  initialize(db, userId) {
    this.db = db;
    this.userId = userId;
    this.startListening();
  }

  startListening() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    const attendanceRef = collection(this.db, FIREBASE_PATHS.attendance(this.userId));

    this.unsubscribe = onSnapshot(attendanceRef, (snapshot) => {
      this.allAttendance = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      this.notifyListeners();
    }, (error) => {
      console.error("Error loading attendance:", error);
    });
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    this.listeners.forEach(callback => callback(this.allAttendance));
  }

  getForSemester(semesterId) {
    return this.allAttendance.filter(r => r.semesterId === semesterId);
  }

  getForWeek(semesterId, week) {
    return this.allAttendance.filter(
      r => r.semesterId === semesterId && r.semesterWeek === week
    );
  }

  getForSubject(subjectId) {
    return this.allAttendance.filter(r => r.subjectId === subjectId);
  }

  getForDate(date) {
    return this.allAttendance.filter(r => r.date === date);
  }

  async submitAttendance(subjectId, semesterId, date, status, semester) {
    const existingRecord = this.allAttendance.find(r =>
      r.subjectId === subjectId &&
      r.date === date &&
      r.semesterId === semesterId
    );

    if (existingRecord) {
      throw new Error('Attendance already submitted for this subject on this date.');
    }

    const semesterWeek = getSemesterWeek(date, semester);

    const record = {
      subjectId,
      semesterId,
      date,
      status,
      semesterWeek,
      createdAt: serverTimestamp()
    };

    try {
      const docRef = await addDoc(
        collection(this.db, FIREBASE_PATHS.attendance(this.userId)),
        record
      );
      return { id: docRef.id, ...record };
    } catch (error) {
      console.error("Error saving attendance:", error);
      throw error;
    }
  }

  async bulkSubmitAttendance(subjects, semesterId, date, status, semester) {
    const existingRecords = this.getForDate(date);
    const unmarkedSubjects = subjects.filter(subject =>
      !existingRecords.find(r => r.subjectId === subject.id)
    );

    if (unmarkedSubjects.length === 0) {
      throw new Error('All subjects for this date have already been marked!');
    }

    const semesterWeek = getSemesterWeek(date, semester);

    try {
      const promises = unmarkedSubjects.map(subject => {
        const record = {
          subjectId: subject.id,
          semesterId,
          date,
          status,
          semesterWeek,
          createdAt: serverTimestamp()
        };
        return addDoc(
          collection(this.db, FIREBASE_PATHS.attendance(this.userId)),
          record
        );
      });

      await Promise.all(promises);
      return unmarkedSubjects.length;
    } catch (error) {
      console.error('Error saving bulk attendance:', error);
      throw error;
    }
  }

  async deleteAttendance(recordId) {
    try {
      await deleteDoc(
        doc(this.db, FIREBASE_PATHS.attendanceDoc(this.userId, recordId))
      );
    } catch (error) {
      console.error("Error deleting attendance:", error);
      throw error;
    }
  }

  calculateStats(semesterId, week = null) {
    let data = this.getForSemester(semesterId);

    if (week !== null) {
      data = data.filter(r => r.semesterWeek === week);
    }

    const counts = {
      Present: 0,
      Absent: 0,
      Permission: 0,
      Late: 0
    };

    data.forEach(r => {
      if (counts.hasOwnProperty(r.status)) {
        counts[r.status]++;
      }
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const percentage = total > 0 ? ((counts.Present / total) * 100).toFixed(1) : '0.0';

    return { counts, total, percentage };
  }

  calculateSubjectStats(subjectId) {
    const data = this.getForSubject(subjectId);

    const counts = {
      Present: 0,
      Absent: 0,
      Permission: 0,
      Late: 0
    };

    data.forEach(r => {
      if (counts.hasOwnProperty(r.status)) {
        counts[r.status]++;
      }
    });

    const warning = calculateWarning(counts.Late, counts.Permission, counts.Absent);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const percentage = total > 0 ? ((counts.Present / total) * 100).toFixed(1) : '0.0';

    return { counts, warning, total, percentage };
  }

  calculateStreak = (semesterId, subjects) => {
    const currentSemAttendance = this.getForSemester(semesterId);
    const currentSemSubjects = subjects.filter(s => s.semesterId === semesterId);

    const attendanceByDate = {};
    currentSemAttendance.forEach(record => {
      if (!attendanceByDate[record.date]) {
        attendanceByDate[record.date] = [];
      }
      attendanceByDate[record.date].push(record);
    });

    const dates = Object.keys(attendanceByDate)
      .sort((a, b) => new Date(b) - new Date(a));

    let streak = 0;

    for (const date of dates) {
      const dayName = this.getDayNameFromDate(date);
      const subjectsForDay = currentSemSubjects.filter(s => s.day === dayName);
      const attendanceForDay = attendanceByDate[date];

      const allPresentOrLate = subjectsForDay.every(subject => {
        const record = attendanceForDay.find(r => r.subjectId === subject.id);
        return record && (record.status === 'Present' || record.status === 'Late');
      });

      if (allPresentOrLate && subjectsForDay.length > 0) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  getDayNameFromDate(dateStr) {
    // Basic date parsing often assumes UTC for YYYY-MM-DD, which works fine 
    // for just getting the day of week index if we are consistent.
    // However, to be safe and consistent with helpers.js:
    const date = new Date(dateStr + 'T00:00:00');
    // dateStr is YYYY-MM-DD. Appending T00... forces local time interpretation in some engines, 
    // or we can just rely on our helpers. But since this is inside a class method that duplicates
    // helper logic, let's just make sure it doesn't break.
    // Actually, best to delegate or replicate the simple logic:
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }

  getWarningsForSemester(semesterId, subjects) {
    const warnings = [];
    const currentSemSubjects = subjects.filter(s => s.semesterId === semesterId);

    currentSemSubjects.forEach(subject => {
      const stats = this.calculateSubjectStats(subject.id);

      if (stats.warning.status !== 'Good') {
        warnings.push({
          subject,
          warning: stats.warning,
          counts: stats.counts
        });
      }
    });

    return warnings;
  }

  exportToCSV(type, semester, subjects) {
    const currentSemAttendance = this.getForSemester(semester.id);
    let filteredData = currentSemAttendance;
    let filename = `${semester.name}_${type}_attendance`;

    if (type === 'weekly') {
      const currentWeek = getSemesterWeek(getTodayDateString(), semester);
      filteredData = currentSemAttendance.filter(r => r.semesterWeek === currentWeek);
      filename += `_week${currentWeek}`;
    } else if (type === 'monthly') {
      const currentMonth = new Date(getRealTime()).getMonth();
      filteredData = currentSemAttendance.filter(r => new Date(r.date).getMonth() === currentMonth);
      filename += `_${new Date(getRealTime()).toLocaleString('default', { month: 'long' })}`;
    }

    let csvContent = 'Date,Subject,Status,Week\n';

    filteredData.forEach(record => {
      const subject = subjects.find(s => s.id === record.subjectId);
      const subjectName = subject ? subject.name : 'Unknown Subject';
      csvContent += `${record.date},${subjectName},${record.status},${record.semesterWeek || 'N/A'}\n`;
    });

    csvContent += '\n\nSUMMARY\n';
    csvContent += 'Subject,Present,Absent,Permission,Late,Total,Percentage\n';

    subjects.filter(s => s.semesterId === semester.id).forEach(subject => {
      const stats = this.calculateSubjectStats(subject.id);
      csvContent += `${subject.name},${stats.counts.Present},${stats.counts.Absent},${stats.counts.Permission},${stats.counts.Late},${stats.total},${stats.percentage}%\n`;
    });

    return { csvContent, filename: filename + '.csv' };
  }

  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.listeners.clear();
  }
}

export default new AttendanceService();
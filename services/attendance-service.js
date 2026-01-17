// services/attendance-service.js
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { FIREBASE_PATHS } from '../utils/constants.js';
import { getSemesterWeek, calculateWarning, getTodayDateString, getRealTime } from '../utils/helpers.js';
import errorHandler from '../utils/error-handler.js';

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
    // Check milestone after attendance update
    if (window.app && window.app.checkMilestone) {
      setTimeout(() => window.app.checkMilestone(), 100);
    }
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

  async addSubject(semesterId, subjectData) {
    if (!subjectData.name || typeof subjectData.name !== 'string' || !subjectData.name.trim()) {
      throw new Error("Subject name is required and must be a valid string.");
    }
    try {
      const docRef = await addDoc(
        collection(this.db, FIREBASE_PATHS.subjects(this.userId)),
        {
          ...subjectData,
          semesterId,
          createdAt: serverTimestamp()
        }
      );
      return docRef.id;
    } catch (error) {
      console.error("Error adding subject:", error);
      throw new Error(errorHandler.getFriendlyMessage(error));
    }
  }

  async updateSubject(semesterId, subjectId, subjectData) {
    if (subjectData.name !== undefined && (!subjectData.name || typeof subjectData.name !== 'string' || !subjectData.name.trim())) {
      throw new Error("Subject name cannot be empty.");
    }
    try {
      await updateDoc(
        doc(this.db, FIREBASE_PATHS.subjectDoc(this.userId, subjectId)),
        {
          ...subjectData,
          updatedAt: serverTimestamp()
        }
      );
    } catch (error) {
      console.error("Error updating subject:", error);
      throw new Error(errorHandler.getFriendlyMessage(error));
    }
  }

  async addSemester(semesterData) {
    try {
      const docRef = await addDoc(
        collection(this.db, FIREBASE_PATHS.semesters(this.userId)),
        {
          ...semesterData,
          createdAt: serverTimestamp()
        }
      );
      return docRef.id;
    } catch (error) {
      console.error("Error adding semester:", error);
      throw new Error(errorHandler.getFriendlyMessage(error));
    }
  }

  async updateSemester(semesterId, semesterData) {
    try {
      await updateDoc(
        doc(this.db, FIREBASE_PATHS.semesterDoc(this.userId, semesterId)),
        {
          ...semesterData,
          updatedAt: serverTimestamp()
        }
      );
    } catch (error) {
      console.error("Error updating semester:", error);
      throw new Error(errorHandler.getFriendlyMessage(error));
    }
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
      throw new Error(errorHandler.getFriendlyMessage(error));
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

  async editAttendance(recordId, newStatus, reason) {
    if (!reason || reason.trim().length < 10) {
      throw new Error('Please provide a detailed reason (minimum 10 characters) for editing this attendance record.');
    }

    const record = this.allAttendance.find(r => r.id === recordId);
    if (!record) {
      throw new Error('Attendance record not found.');
    }

    // Check if record is within 7 days
    const daysDiff = Math.floor((new Date(getTodayDateString()) - new Date(record.date)) / (1000 * 60 * 60 * 24));
    if (daysDiff > 7) {
      throw new Error('Cannot edit attendance records older than 7 days.');
    }

    if (record.status === newStatus) {
      throw new Error('New status must be different from current status.');
    }

    try {
      await updateDoc(
        doc(this.db, FIREBASE_PATHS.attendanceDoc(this.userId, recordId)),
        {
          status: newStatus,
          editReason: reason.trim(),
          editedAt: serverTimestamp(),
          originalStatus: record.status
        }
      );
    } catch (error) {
      console.error("Error editing attendance:", error);
      throw new Error(errorHandler.getFriendlyMessage(error));
    }
  }

  async deleteAttendance(recordId) {
    try {
      await deleteDoc(
        doc(this.db, FIREBASE_PATHS.attendanceDoc(this.userId, recordId))
      );
    } catch (error) {
      console.error("Error deleting attendance:", error);
      throw new Error(errorHandler.getFriendlyMessage(error));
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

  exportToExcel(type, semester, subjects) {
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

    // Sort: Week (asc) -> Date (asc) -> Subject (asc)
    filteredData.sort((a, b) => {
      const weekA = parseInt(a.semesterWeek) || 0;
      const weekB = parseInt(b.semesterWeek) || 0;
      if (weekA !== weekB) return weekA - weekB;

      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (dateA - dateB !== 0) return dateA - dateB;

      const subjectA = subjects.find(s => s.id === a.subjectId)?.name || '';
      const subjectB = subjects.find(s => s.id === b.subjectId)?.name || '';
      return subjectA.localeCompare(subjectB);
    });

    // Style Definitions
    const styles = {
      header: {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4472C4" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
      },
      cell: {
        alignment: { horizontal: "center", vertical: "center" },
        border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
      },
      status: {
        Present: { fill: { fgColor: { rgb: "C6EFCE" } }, font: { color: { rgb: "006100" } } },
        Absent: { fill: { fgColor: { rgb: "FFC7CE" } }, font: { color: { rgb: "9C0006" } } },
        Late: { fill: { fgColor: { rgb: "FFEB9C" } }, font: { color: { rgb: "9C5700" } } },
        Permission: { fill: { fgColor: { rgb: "BDD7EE" } }, font: { color: { rgb: "1F4E79" } } }
      }
    };

    // Create Workbook
    const wb = XLSX.utils.book_new();

    // --- SHEET 1: ATTENDANCE RECORDS ---
    const ws1Data = [
      ['Date', 'Week', 'Subject', 'Status', 'Start Time'] // Headers
    ];

    filteredData.forEach(record => {
      const subject = subjects.find(s => s.id === record.subjectId);
      const subjectName = subject ? subject.name : 'Unknown Subject';
      ws1Data.push([
        record.date,
        record.semesterWeek ? `Week ${record.semesterWeek}` : '-',
        subjectName,
        record.status,
        record.timestamp ? new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'
      ]);
    });

    // --- Add Summary & Footer ---
    const counts = { Present: 0, Absent: 0, Late: 0, Permission: 0 };
    filteredData.forEach(r => {
      if (counts[r.status] !== undefined) counts[r.status]++;
    });
    const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);
    const percentage = totalRecords > 0 ? ((counts.Present / totalRecords) * 100).toFixed(1) : '0.0';

    const startFooterRow = ws1Data.length;

    ws1Data.push(
      ['', '', '', '', ''], // Spacer
      ['', '', 'Total Present', counts.Present, ''],
      ['', '', 'Total Absent', counts.Absent, ''],
      ['', '', 'Total Late', counts.Late, ''],
      ['', '', 'Total Permission', counts.Permission, ''],
      ['', '', 'Attendance Rate', `${percentage}%`, ''],
      ['', '', '', '', ''], // Spacer
      ['Generated by Attendance Tracker', '', '', '', ''] // Watermark
    );

    const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);

    // Apply Styles to Sheet 1
    const range1 = XLSX.utils.decode_range(ws1['!ref']);
    const labelStyle = { ...styles.cell, font: { bold: true }, fill: { fgColor: { rgb: "EFEFEF" } }, alignment: { horizontal: "right" } };
    const valueStyle = { ...styles.cell, font: { bold: true }, alignment: { horizontal: "center" } };
    const watermarkStyle = { font: { italic: true, color: { rgb: "808080" } }, alignment: { horizontal: "left" } };

    for (let R = range1.s.r; R <= range1.e.r; ++R) {
      for (let C = range1.s.c; C <= range1.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws1[cellRef]) continue;

        // Default Data Rows
        if (R < startFooterRow) {
          // Unlock data cells so users can edit/sort if needed
          ws1[cellRef].s = { ...styles.cell, protection: { locked: false } };

          // Lock Header Row
          if (R === 0) {
            ws1[cellRef].s = { ...styles.header, protection: { locked: true } };
          }
          else if (C === 3 && styles.status[ws1[cellRef].v]) {
            ws1[cellRef].s = {
              ...styles.cell,
              ...styles.status[ws1[cellRef].v],
              protection: { locked: false }
            };
          }
        }
        // Footer Rows
        else {
          ws1[cellRef].s = { ...styles.cell, protection: { locked: true } };

          if (R === range1.e.r) { // Watermark (Last row)
            if (C === 0) ws1[cellRef].s = { ...watermarkStyle, protection: { locked: true } };
          } else if (R > startFooterRow) { // Summary stats
            if (C === 2) ws1[cellRef].s = { ...labelStyle, protection: { locked: true } };
            if (C === 3) {
              ws1[cellRef].s = { ...valueStyle, protection: { locked: true } };
              if (String(ws1[cellRef].v).includes('%')) { // Percentage row
                const val = parseFloat(percentage);
                if (val >= 90) ws1[cellRef].s = { ...valueStyle, font: { bold: true, color: { rgb: "006100" } }, protection: { locked: true } };
                else if (val < 60) ws1[cellRef].s = { ...valueStyle, font: { bold: true, color: { rgb: "9C0006" } }, protection: { locked: true } };
              }
            }
          }
        }
      }
    }

    // Merge watermark
    if (!ws1['!merges']) ws1['!merges'] = [];
    ws1['!merges'].push({ s: { r: range1.e.r, c: 0 }, e: { r: range1.e.r, c: 4 } });

    // Enable Sheet Protection
    ws1['!protect'] = {
      password: "attendance_tracker",
      selectLockedCells: true,
      selectUnlockedCells: true,
      formatCells: false,
      insertRows: false,
      deleteRows: false,
      autoFilter: true,
      sort: true
    };

    // Auto-fit columns
    ws1['!cols'] = [
      { wch: 15 }, // Date
      { wch: 10 }, // Week
      { wch: 30 }, // Subject
      { wch: 15 }, // Status
      { wch: 15 }  // Time
    ];

    XLSX.utils.book_append_sheet(wb, ws1, 'Attendance Records');


    // --- SHEET 2: SUMMARY ---
    const ws2Data = [
      ['Subject', 'Present', 'Absent', 'Permission', 'Late', 'Total', 'Attendance %']
    ];

    subjects.filter(s => s.semesterId === semester.id).forEach(subject => {
      const stats = this.calculateSubjectStats(subject.id);
      ws2Data.push([
        subject.name,
        stats.counts.Present,
        stats.counts.Absent,
        stats.counts.Permission,
        stats.counts.Late,
        stats.total,
        `${stats.percentage}%`
      ]);
    });

    // Add Watermark to Summary Sheet too
    ws2Data.push(
      ['', '', '', '', '', '', ''], // Spacer
      ['Generated by Attendance Tracker', '', '', '', '', '', '']
    );

    const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);

    // Apply Styles to Sheet 2
    const range2 = XLSX.utils.decode_range(ws2['!ref']);
    for (let R = range2.s.r; R <= range2.e.r; ++R) {
      for (let C = range2.s.c; C <= range2.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws2[cellRef]) continue;

        ws2[cellRef].s = { ...styles.cell, protection: { locked: true } }; // Lock All Summary Cells

        if (R === 0) ws2[cellRef].s = { ...styles.header, protection: { locked: true } };

        // Watermark check
        if (R === range2.e.r) {
          if (C === 0) ws2[cellRef].s = { ...watermarkStyle, protection: { locked: true } };
        }
        // Percentage Color Scale (Column 6)
        else if (C === 6 && R > 0 && R < range2.e.r - 1) { // bounds check for watermark
          const val = parseFloat(ws2[cellRef].v);
          if (val >= 90) ws2[cellRef].s = { ...styles.cell, font: { color: { rgb: "006100" }, bold: true }, protection: { locked: true } };
          else if (val < 60) ws2[cellRef].s = { ...styles.cell, font: { color: { rgb: "9C0006" }, bold: true }, protection: { locked: true } };
        }
      }
    }

    // Merge Summary Watermark
    if (!ws2['!merges']) ws2['!merges'] = [];
    ws2['!merges'].push({ s: { r: range2.e.r, c: 0 }, e: { r: range2.e.r, c: 6 } });

    // Protect Summary Sheet fully
    ws2['!protect'] = {
      password: "attendance_tracker",
      selectLockedCells: true,
      selectUnlockedCells: true
    };

    ws2['!cols'] = [
      { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 14 }
    ];

    XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

    // Generate Excel binary
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    return { blob, filename: filename + '.xlsx' };
  }

  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.listeners.clear();
  }
}

export default new AttendanceService();
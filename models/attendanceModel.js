const { db, admin } = require('../config/firebase');
const ExcelJS = require('exceljs');

class AttendanceModel {
  static async takeFoodAttendance(candidateIds, date) {
    // Fetch all candidate IDs from activecandidate collection
    const activeSnapshot = await db.collection('activecandidate').get();
    const allIds = activeSnapshot.docs.map(doc => doc.data().masterId);

    // present = candidateIds (masterIds)
    const present = candidateIds;
    const absent = allIds.filter(id => !candidateIds.includes(id));

    // Use provided date or today's date in YYYY-MM-DD format
    const dateString = date || new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Create or overwrite document in foodattendance collection
    await db.collection('foodattendance').doc(dateString).set({
      date: dateString,
      absent: absent,
      present: present,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { date: dateString };
  }

  static async getFoodAttendance(date) {
    if (!date) {
      // If no date provided, use today's date
      date = new Date().toISOString().split('T')[0];
    }
    const docRef = db.collection('foodattendance').doc(date);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error('Attendance not found for the given date');
    }
    return doc.data();
  }

  static async takeDailyAttendance(candidateIds, date) {
    // Fetch all candidate IDs from activecandidate collection
    const activeSnapshot = await db.collection('activecandidate').get();
    const allIds = activeSnapshot.docs.map(doc => doc.data().masterId);

    // present = candidateIds (masterIds)
    const present = candidateIds;
    const absent = allIds.filter(id => !candidateIds.includes(id));

    // Use provided date or today's date in YYYY-MM-DD format
    const dateString = date || new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Create or overwrite document in dailyattendance collection
    await db.collection('dailyattendance').doc(dateString).set({
      date: dateString,
      absent: absent,
      present: present,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { date: dateString };
  }

  static async getDailyAttendance(date) {
    if (!date) {
      // If no date provided, use today's date
      date = new Date().toISOString().split('T')[0];
    }
    const docRef = db.collection('dailyattendance').doc(date);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error('Attendance not found for the given date');
    }
    return doc.data();
  }

  static async downloadAttendanceExcel(date, type) {
    const collection = type === 'daily' ? 'dailyattendance' : 'foodattendance';
    const docRef = db.collection(collection).doc(date);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error('Attendance not found for the given date');
    }
    const attendanceData = doc.data();

    // Fetch masterdata
    const masterdataSnapshot = await db.collection('masterdata').get();
    const masterdataMap = {};
    masterdataSnapshot.docs.forEach(doc => {
      masterdataMap[doc.id] = doc.data();
    });

    // Map present and absent
    const presentCandidates = attendanceData.present.map(id => ({ ...masterdataMap[id], masterId: id })).filter(c => c);
    const absentCandidates = attendanceData.absent.map(id => ({ ...masterdataMap[id], masterId: id })).filter(c => c);

    // Format value function
    const formatValue = (value) => {
      if (value && typeof value === 'object' && value.toDate) {
        return value.toDate().toLocaleDateString();
      }
      if (value && typeof value === 'object' && value._seconds) {
        return new Date(value._seconds * 1000).toLocaleDateString();
      }
      return value?.toString() || '';
    };

    // Collect all unique keys from candidates, excluding certain fields
    const allCandidates = presentCandidates.concat(absentCandidates);
    const excludeKeys = ['signature', 'photo', 'aadhaarCard', 'collegeIdCard']; // exclude image URLs
    const allKeys = new Set();
    allCandidates.forEach(candidate => {
      Object.keys(candidate).forEach(key => {
        if (!excludeKeys.some(ex => key.toLowerCase().includes(ex))) {
          allKeys.add(key);
        }
      });
    });
    // Add masterId explicitly if not present
    if (!allKeys.has('masterId')) {
      allKeys.add('masterId');
    }
    const columns = Array.from(allKeys).sort().map(key => ({
      header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'), // add spaces for camelCase
      key,
      width: 20
    }));

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Student Management System';
    workbook.lastModifiedBy = 'System';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Attendance Report sheet
    const reportSheet = workbook.addWorksheet('Attendance Report');
    reportSheet.columns = columns;

    // Present candidates
    presentCandidates.forEach(candidate => {
      const row = {};
      columns.forEach(col => {
        row[col.key] = formatValue(candidate[col.key]);
      });
      reportSheet.addRow(row);
    });

    // Total Present
    reportSheet.addRow({});
    reportSheet.addRow({ [columns[0].key]: `Total Present: ${presentCandidates.length}` });
    reportSheet.addRow({});

    // Absent candidates
    absentCandidates.forEach(candidate => {
      const row = {};
      columns.forEach(col => {
        row[col.key] = formatValue(candidate[col.key]);
      });
      reportSheet.addRow(row);
    });

    // Total Absent
    reportSheet.addRow({});
    reportSheet.addRow({ [columns[0].key]: `Total Absent: ${absentCandidates.length}` });

    // Total Students
    reportSheet.addRow({});
    reportSheet.addRow({ [columns[0].key]: `Total Students: ${presentCandidates.length + absentCandidates.length}` });

    return workbook;
  }
}

module.exports = AttendanceModel;

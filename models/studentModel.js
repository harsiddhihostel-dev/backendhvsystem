const { db } = require('../config/firebase');
const ExcelJS = require('exceljs');

class StudentModel {
  static async getAll(collection = 'masterdata', limit = 20, lastDocId = null, searchTerm = null, searchField = null) {
    let query = db.collection(collection).orderBy('createdAt', 'desc').orderBy('__name__', 'desc');
    let isSearch = false;
    if (searchTerm && searchField) {
      isSearch = true;
      // For search, fetch all data (high limit) to enable full collection filtering
      lastDocId = null; // Reset pagination for search
    }
    if (lastDocId) {
      const lastDoc = await db.collection(collection).doc(lastDocId).get();
      console.log('lastDoc exists:', lastDoc.exists);
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      } else {
        console.log('Invalid lastDocId, skipping startAfter');
      }
    }
    // Use high limit for search to fetch entire collection; otherwise use provided limit
    const effectiveLimit = isSearch ? 1000 : (limit > 0 ? limit : 20);
    query = query.limit(effectiveLimit);
    console.log('getAll: collection=', collection, 'effectiveLimit=', effectiveLimit, 'lastDocId=', lastDocId, 'searchTerm=', searchTerm, 'searchField=', searchField, 'isSearch=', isSearch);
    const snapshot = await query.get();
    let rawData = [];
    snapshot.forEach(doc => {
      rawData.push({ id: doc.id, ...doc.data() });
    });
    console.log('getAll raw length:', rawData.length);
    let data = rawData;
    if (isSearch && searchTerm && searchField) {
      const lowerTerm = searchTerm.toLowerCase();
      data = rawData.filter(item => {
        const value = item[searchField];
        return value && value.toString().toLowerCase().includes(lowerTerm);
      });
      console.log('Filtered length:', data.length);
      // For search, return all filtered results, no pagination
      const hasMore = false;
      return { data, lastDocId: null, hasMore };
    }
    // For non-search, use rawData as data
    console.log('getAll result length (raw):', rawData.length);
    const lastDocIdNext = rawData.length > 0 ? rawData[rawData.length - 1].id : null;
    const hasMore = rawData.length === effectiveLimit;
    return { data, lastDocId: lastDocIdNext, hasMore };
  }

  static async addStudent(studentData) {
    const docRef = await db.collection('masterdata').add(studentData);
    await this.incrementMasterDataCount();
    return { id: docRef.id };
  }

  static async updateStudent(id, updateData) {
    const docRef = db.collection('masterdata').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error('Document not found');
    }
    const oldData = doc.data();
    const oldRoomNo = oldData.roomNo;
    const newRoomNo = updateData.roomNo;

    // If roomNo changed and student is active, update counters
    if (oldRoomNo !== newRoomNo && oldData.isActive) {
      if (oldRoomNo) {
        await this.decrementRoomCounter(oldRoomNo);
      }
      if (newRoomNo) {
        await this.incrementRoomCounter(newRoomNo);
      }
    }

    await docRef.update(updateData);

    // If the student is activated, also update the activecandidate collection
    if (oldData.isActive && oldData.activeId) {
      await db.collection('activecandidate').doc(oldData.activeId).update(updateData);
    }

    return { id };
  }

  static async deleteStudent(id) {
    const docRef = db.collection('masterdata').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error('Document not found');
    }
    const data = doc.data();

    // Delete associated images from Firebase Storage
    const { bucket } = require('../config/firebase');
    const imageUrls = [
      data.aadhaarCardUrl,
      data.aadhaarCardFrontUrl,
      data.aadhaarCardBackUrl,
      data.collegeIdCardUrl,
      data.passportPhotoUrl,
      data.signatureUrl
    ].filter(url => url); // Filter out null/undefined values

    for (const url of imageUrls) {
      try {
        // Extract file path from URL
        const urlParts = url.split('/');
        const fileName = urlParts[urlParts.length - 1].split('?')[0]; // Remove query parameters
        const folder = url.includes('documents') ? 'documents' :
                      url.includes('signatures') ? 'signatures' : 'documents'; // Default to documents
        const filePath = `${folder}/${fileName}`;

        await bucket.file(filePath).delete();
        console.log(`Deleted image: ${filePath}`);
      } catch (error) {
        console.log(`Failed to delete image ${url}:`, error.message);
      }
    }

    // If student is active, decrement room counter and active student count
    if (data.isActive && data.roomNo) {
      await this.decrementRoomCounter(data.roomNo);
    }
    if (data.isActive) {
      await this.decrementActiveStudentCount();
    }

    // Delete penalty status if exists (using activeId as penalty status ID)
    if (data.activeId) {
      try {
        await db.collection('penaltystatus').doc(data.activeId).delete();
      } catch (error) {
        // Ignore if penalty status does not exist
        console.log('Penalty status not found or already deleted:', error.message);
      }
    }

    await docRef.delete();
    await this.decrementMasterDataCount();
    return { id };
  }

  static async activateStudent(id) {
    // Update in masterdata
    await db.collection('masterdata').doc(id).update({ active: true });
    // Add to activestudents if not already
    const activeDoc = await db.collection('activestudents').doc(id).get();
    if (!activeDoc.exists) {
      const masterDoc = await db.collection('masterdata').doc(id).get();
      if (masterDoc.exists) {
        await db.collection('activestudents').doc(id).set(masterDoc.data());
      }
    }
    return { id };
  }

  static async activateCandidate(id) {
    const masterdataRef = db.collection('masterdata').doc(id);
    const masterdataDoc = await masterdataRef.get();

    if (!masterdataDoc.exists) {
      throw new Error('Candidate not found in masterdata');
    }

    const candidateData = masterdataDoc.data();

    // Increment room counter if roomNo exists
    if (candidateData.roomNo) {
      await this.incrementRoomCounter(candidateData.roomNo);
    }

    // Update isActive = true in masterdata
    await masterdataRef.update({ isActive: true });

    // Remove activeId from candidateData if present
    const { activeId, ...dataWithoutActiveId } = candidateData;

    // Get current month key for fees status
    const now = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonth = monthNames[now.getMonth()];
    const currentYear = now.getFullYear();
    const currentMonthKey = `${currentMonth}, ${currentYear}`;

    // Copy candidate data to activecandidate collection with masterId = masterdata doc ID
    const activecandidateRef = await db.collection('activecandidate').add({
      ...dataWithoutActiveId,
      masterId: id,
      createdAt: new Date(),
      feesStatus: {
        [currentMonthKey]: {
          status: "Not Paid",
          feesAmount: candidateData.feesAmount || 0,
          penaltyApplied: false,
          penaltyAmount: 0,
          paidDate: null
        }
      },
      isActive: true
    });

    // Update masterdata document's activeId with new activecandidate doc ID
    await masterdataRef.update({ activeId: activecandidateRef.id });

    await this.incrementActiveStudentCount();

    return { activeId: activecandidateRef.id };
  }

  static async deactivateCandidate(id) {
    const activecandidateRef = db.collection('activecandidate').doc(id);
    const activecandidateDoc = await activecandidateRef.get();

    if (!activecandidateDoc.exists) {
      throw new Error('Active candidate not found');
    }

    const { masterId, roomNo } = activecandidateDoc.data();

    // Decrement room counter if roomNo exists
    if (roomNo) {
      await this.decrementRoomCounter(roomNo);
    }

    // Update isActive = false and activeId = null in masterdata
    await db.collection('masterdata').doc(masterId).update({ isActive: false, activeId: null });

    // Delete from activecandidate collection
    await activecandidateRef.delete();

    // Delete penalty status if exists (using activeId as penalty status ID)
    try {
      await db.collection('penaltystatus').doc(id).delete();
    } catch (error) {
      // Ignore if penalty status does not exist
      console.log('Penalty status not found or already deleted:', error.message);
    }

    await this.decrementActiveStudentCount();

    return { id };
  }

  static async incrementRoomCounter(roomNo) {
    const docRef = db.collection('roomstatus').doc(roomNo.toString());
    const doc = await docRef.get();
    const counter = doc.exists ? doc.data().counter || 0 : 0;
    await docRef.set({ counter: counter + 1, roomNo: roomNo.toString() });
  }

  static async decrementRoomCounter(roomNo) {
    const docRef = db.collection('roomstatus').doc(roomNo.toString());
    const doc = await docRef.get();
    if (doc.exists) {
      const counter = doc.data().counter || 0;
      if (counter > 1) {
        await docRef.update({ counter: counter - 1 });
      } else {
        await docRef.set({ counter: 0, roomNo: roomNo.toString() });
      }
    }
  }

  static async updateFeesStatus(id, feesStatus) {
    const docRef = db.collection('activecandidate').doc(id);
    await docRef.update({ feesStatus });
    return { id };
  }

  static async applyPenalties(currentMonthKey) {
    const snapshot = await db.collection('activecandidate').get();
    let updatedCount = 0;

    const batch = db.batch();

    snapshot.forEach(doc => {
      const data = doc.data();
      const feesStatus = data.feesStatus || {};
      const monthData = feesStatus[currentMonthKey];

      let needsUpdate = false;

      if (!monthData) {
        // If current month not found, add it with penalty
        feesStatus[currentMonthKey] = {
          status: "Not Paid",
          penaltyApplied: true,
          penaltyAmount: 500,
          paidDate: null,
          feesAmount: data.feesAmount
        };
        needsUpdate = true;
      } else if (typeof monthData === 'object' && monthData.status === 'Not Paid') {
        // If found and status is "Not Paid", ensure penalty is applied
        if (!monthData.penaltyApplied || monthData.penaltyAmount !== 500) {
          feesStatus[currentMonthKey] = {
            ...monthData,
            penaltyApplied: true,
            penaltyAmount: 500,
            feesAmount: data.feesAmount
          };
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        batch.update(doc.ref, { feesStatus });
        updatedCount++;
      }
    });

    await batch.commit();
    return { updatedCount };
  }



  static async getRoomCounters(limit = null, lastRoomNo = null, floor = null, searchTerm = null) {
    let query = db.collection('roomstatus').orderBy('__name__');
    if (searchTerm) {
      // For search, use where clause to find rooms starting with searchTerm
      query = query.where('__name__', '>=', searchTerm).where('__name__', '<', searchTerm + '\uf8ff');
    } else {
      // Normal pagination logic
      if (floor) {
        const floorIndex = ['1st', '2nd', '3rd', '4th'].indexOf(floor);
        if (floorIndex !== -1) {
          const start = (floorIndex + 1) * 100 + 1;
          const end = (floorIndex + 1) * 100 + 99;
          query = query.where('__name__', '>=', start.toString()).where('__name__', '<=', end.toString());
        }
      }
      if (lastRoomNo) {
        query = query.startAfter(lastRoomNo);
      }
      if (limit) {
        query = query.limit(limit);
      }
    }
    const snapshot = await query.get();
    const counters = {};
    snapshot.forEach(doc => {
      counters[doc.id] = doc.data().counter || 0;
    });
    return counters;
  }

  static async incrementMasterDataCount() {
    const docRef = db.collection('dashboardcounter').doc('counters');
    const doc = await docRef.get();
    const count = doc.exists ? doc.data().masterdatacount || 0 : 0;
    await docRef.set({ masterdatacount: count + 1 }, { merge: true });
  }

  static async decrementMasterDataCount() {
    const docRef = db.collection('dashboardcounter').doc('counters');
    const doc = await docRef.get();
    if (doc.exists) {
      const count = doc.data().masterdatacount || 0;
      await docRef.update({ masterdatacount: Math.max(count - 1, 0) });
    }
  }

  static async incrementActiveStudentCount() {
    const docRef = db.collection('dashboardcounter').doc('counters');
    const doc = await docRef.get();
    const count = doc.exists ? doc.data().activestudentcount || 0 : 0;
    await docRef.set({ activestudentcount: count + 1 }, { merge: true });
  }

  static async decrementActiveStudentCount() {
    const docRef = db.collection('dashboardcounter').doc('counters');
    const doc = await docRef.get();
    if (doc.exists) {
      const count = doc.data().activestudentcount || 0;
      await docRef.update({ activestudentcount: Math.max(count - 1, 0) });
    }
  }

  static async getDashboardCounters() {
    const docRef = db.collection('dashboardcounter').doc('counters');
    const doc = await docRef.get();
    if (doc.exists) {
      const data = doc.data();
      return {
        masterdatacount: data.masterdatacount || 0,
        activestudentcount: data.activestudentcount || 0
      };
    }
    return { masterdatacount: 0, activestudentcount: 0 };
  }

  static async downloadMasterDataExcel(collection) {
    if (!['masterdata', 'activecandidate'].includes(collection)) {
      throw new Error('Invalid collection. Must be masterdata or activecandidate');
    }

    // Fetch data from the specified collection
    const snapshot = await db.collection(collection).get();
    const data = [];
    snapshot.forEach(doc => {
      data.push({ id: doc.id, ...doc.data() });
    });

    if (data.length === 0) {
      throw new Error('No data found in the collection');
    }

    // Format value function
    const formatValue = (value) => {
      if (value && typeof value === 'object' && value.toDate) {
        return value.toDate().toLocaleDateString();
      }
      if (value && typeof value === 'object' && value._seconds) {
        return new Date(value._seconds * 1000).toLocaleDateString();
      }
      if (value && typeof value === 'object' && collection === 'activecandidate' && 'feesStatus' in value) {
        // Special handling for feesStatus in activecandidate
        if (typeof value === 'object' && value !== null) {
          return Object.entries(value).map(([month, details]) => {
            if (typeof details === 'object' && details !== null) {
              const { status, penaltyApplied, penaltyAmount, paidDate } = details;
              return `${month}: Status=${status}, PenaltyApplied=${penaltyApplied}, PenaltyAmount=${penaltyAmount}, PaidDate=${paidDate}`;
            } else {
              return `${month}: ${details ? 'Paid' : 'Not Paid'}`;
            }
          }).join('; ');
        }
      }
      return value?.toString() || '';
    };

    // Collect all unique keys from data, excluding certain fields
    const excludeKeys = ['signatureUrl', 'passportPhotoUrl', 'aadhaarCardUrl', 'aadhaarCardFrontUrl', 'aadhaarCardBackUrl', 'collegeIdCardUrl', 'signature', 'photo', 'aadhaarCard', 'collegeIdCard', 'feesStatus'];
    const allKeys = new Set();
    data.forEach(item => {
      Object.keys(item).forEach(key => {
        if (!excludeKeys.some(ex => key.toLowerCase().includes(ex.toLowerCase()))) {
          allKeys.add(key);
        }
      });
    });
    // Add id explicitly if not present
    if (!allKeys.has('id')) {
      allKeys.add('id');
    }
    const columns = Array.from(allKeys).sort().map(key => ({
      header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
      key,
      width: 20
    }));

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Student Management System';
    workbook.lastModifiedBy = 'System';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Report sheet
    const reportSheet = workbook.addWorksheet(`${collection.charAt(0).toUpperCase() + collection.slice(1)} Report`);
    reportSheet.columns = columns;

    // Add data rows
    data.forEach(item => {
      const row = {};
      columns.forEach(col => {
        row[col.key] = formatValue(item[col.key]);
      });
      reportSheet.addRow(row);
    });

    // Total count
    reportSheet.addRow({});
    reportSheet.addRow({ [columns[0].key]: `Total Records: ${data.length}` });

    return workbook;
  }

  static async getStudentById(id) {
    const docRef = db.collection('activecandidate').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() };
  }

  static async resetAllRoomCounters() {
    const snapshot = await db.collection('roomstatus').get();
    const batch = db.batch();
    snapshot.forEach(doc => {
      batch.update(doc.ref, { counter: 0 });
    });
    await batch.commit();
    return { updatedCount: snapshot.size };
  }

  static async initializeRoomStatus() {
    const roomSubOptions = {
      1: ['2', '3 Hall', '3 Kitchen'],
      2: ['1 Left', '1 Center', '1 Right', '2', '3'],
      3: ['2 Hall', '2 Bed', '2 Kitchen'],
      4: ['2 Bed', '2 Kitchen', '3'],
      5: ['1', '2 Bed', '2 Kitchen']
    };

    // First, delete all existing roomstatus documents
    const snapshot = await db.collection('roomstatus').get();
    if (!snapshot.empty) {
      const deleteBatch = db.batch();
      snapshot.forEach(doc => {
        deleteBatch.delete(doc.ref);
      });
      await deleteBatch.commit();
    }

    const batch = db.batch();
    const floors = [100, 200, 300, 400]; // Represents floors 1, 2, 3, 4

    floors.forEach(floor => {
      for (let room = 1; room <= 5; room++) {
        const roomNum = floor + room;
        roomSubOptions[room].forEach(sub => {
          const roomNo = `${roomNum} - ${sub}`;
          const docRef = db.collection('roomstatus').doc(roomNo);
          batch.set(docRef, { counter: 0, roomNo: roomNo });
        });
      }
    });

    await batch.commit();
    return { message: 'Room status initialized successfully' };
  }

  static async getRoomConfigurations() {
    const docRef = db.collection('roomconfigurations').doc('current');
    const doc = await docRef.get();
    if (doc.exists) {
      return doc.data();
    } else {
      // If not in DB, return default updated configurations
      const defaultConfigs = {
        1: ['2', '3 Hall', '3 Kitchen'],
        2: ['1 Left', '1 Center', '1 Right', '2', '3'],
        3: ['2 Hall', '2 Bed', '2 Kitchen'],
        4: ['2 Bed', '2 Kitchen', '3'],
        5: ['1', '2 Bed', '2 Kitchen']
      };
      // Optionally, set it in DB for future use
      await docRef.set(defaultConfigs);
      return defaultConfigs;
    }
  }

  static async addMonthlyFeesStatus() {
    const now = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonth = monthNames[now.getMonth()];
    const currentYear = now.getFullYear();
    const currentMonthKey = `${currentMonth}, ${currentYear}`;

    const snapshot = await db.collection('activecandidate').get();
    const batch = db.batch();
    let updatedCount = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      const feesStatus = data.feesStatus || {};

      // Only add if current month doesn't exist
      if (!feesStatus[currentMonthKey]) {
        feesStatus[currentMonthKey] = {
          status: "Not Paid",
          feesAmount: data.feesAmount || 0,
          penaltyApplied: false,
          penaltyAmount: 0,
          paidDate: null
        };
        batch.update(doc.ref, { feesStatus });
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
    }
    return { updatedCount };
  }
}

module.exports = StudentModel;

const { db } = require('../config/firebase');

class TechnicalSupportModel {
  static async addQuery(queryData) {
    const docRef = await db.collection('technicalsupport').add({
      ...queryData,
      createdAt: new Date(),
      status: 'pending'
    });
    return { id: docRef.id };
  }

  static async getAllQueries() {
    const snapshot = await db.collection('technicalsupport').orderBy('createdAt', 'desc').get();
    const queries = [];
    snapshot.forEach(doc => {
      queries.push({ id: doc.id, ...doc.data() });
    });
    return queries;
  }

  static async updateStatus(id, status) {
    const docRef = db.collection('technicalsupport').doc(id);
    await docRef.update({ status });
    return { id };
  }

  static async deleteQuery(id) {
    const docRef = db.collection('technicalsupport').doc(id);
    await docRef.delete();
    return { id };
  }
}

module.exports = TechnicalSupportModel;

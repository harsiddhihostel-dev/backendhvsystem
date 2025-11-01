const { db } = require('../config/firebase');

class PenaltyModel {
  static async verifyActiveId(activeId) {
    const docRef = db.collection('activecandidate').doc(activeId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() };
  }

  static async addPenalty(activeId, penaltyData) {
    const docRef = db.collection('penaltystatus').doc(activeId);
    const doc = await docRef.get();
    let penalties = [];
    if (doc.exists) {
      penalties = doc.data().penalties || [];
    }
    penalties.push({
      ...penaltyData,
      createdAt: new Date(),
      payment: penaltyData.payment || 'Pending'
    });
    await docRef.set({ penalties });
    return { activeId, penaltyIndex: penalties.length - 1 };
  }

  static async getAllPenalties() {
    const snapshot = await db.collection('penaltystatus').get();
    const penalties = [];
    for (const doc of snapshot.docs) {
      const activeId = doc.id;
      const candidateData = await this.verifyActiveId(activeId);
      if (candidateData) {
        const penaltyList = doc.data().penalties || [];
        penaltyList.forEach((penalty, index) => {
          penalties.push({
            activeId,
            penaltyIndex: index,
            candidate: candidateData,
            penalty
          });
        });
      }
    }
    return penalties;
  }

  static async deletePenalty(activeId, penaltyIndex) {
    const docRef = db.collection('penaltystatus').doc(activeId);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error('Penalty record not found');
    }
    let penalties = doc.data().penalties || [];
    if (penaltyIndex < 0 || penaltyIndex >= penalties.length) {
      throw new Error('Invalid penalty index');
    }
    penalties.splice(penaltyIndex, 1);
    if (penalties.length > 0) {
      await docRef.update({ penalties });
    } else {
      await docRef.delete();
    }
    return { activeId, penaltyIndex };
  }

  static async updatePaymentStatus(activeId, penaltyIndex, paymentStatus) {
    const docRef = db.collection('penaltystatus').doc(activeId);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error('Penalty record not found');
    }
    let penalties = doc.data().penalties || [];
    if (penaltyIndex < 0 || penaltyIndex >= penalties.length) {
      throw new Error('Invalid penalty index');
    }
    penalties[penaltyIndex].payment = paymentStatus;
    await docRef.update({ penalties });
    return { activeId, penaltyIndex, payment: paymentStatus };
  }
}

module.exports = PenaltyModel;

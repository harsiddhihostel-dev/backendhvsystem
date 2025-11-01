const PenaltyModel = require('../models/penaltyModel');
const { bucket } = require('../config/firebase');

class PenaltyController {
  static async verifyActiveId(req, res) {
    try {
      const { activeId } = req.body;
      if (!activeId) {
        return res.status(400).json({ success: false, message: 'Active ID is required' });
      }
      const candidate = await PenaltyModel.verifyActiveId(activeId.trim());
      if (!candidate) {
        return res.status(404).json({ success: false, message: 'Wrong Active ID entered.' });
      }
      res.json({ success: true, candidate });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async addPenalty(req, res) {
    try {
      const { activeId, penaltyBy, reason, penaltyRs, payment, signature } = req.body;

      if (!activeId || !penaltyBy || !reason || !penaltyRs || !payment || !signature) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
      }

      // Verify activeId
      const candidate = await PenaltyModel.verifyActiveId(activeId.trim());
      if (!candidate) {
        return res.status(404).json({ success: false, message: 'Wrong Active ID entered.' });
      }

      // Upload proof image if provided
      let proofUrl = null;
      if (req.file) {
        const file = req.file;
        const filename = `penalties/${Date.now()}_proof_${file.originalname}`;
        const firebaseFile = bucket.file(filename);
        await firebaseFile.save(file.buffer, {
          metadata: {
            contentType: file.mimetype,
          },
          public: true,
        });
        const [url] = await firebaseFile.getSignedUrl({
          action: 'read',
          expires: '03-09-2491',
        });
        proofUrl = url;
      }

      // Upload signature
      let signatureUrl = null;
      if (signature && signature.startsWith('data:image')) {
        const base64Data = signature.replace(/^data:image\/png;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `signatures/${Date.now()}_penalty_signature.png`;
        const file = bucket.file(filename);
        await file.save(buffer, {
          metadata: {
            contentType: 'image/png',
          },
          public: true,
        });
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: '03-09-2491',
        });
        signatureUrl = url;
      }

      const penaltyData = {
        penaltyBy: penaltyBy.trim(),
        reason: reason.trim(),
        proofUrl,
        penaltyRs: parseFloat(penaltyRs),
        payment: payment.trim(),
        signatureUrl
      };

      const result = await PenaltyModel.addPenalty(activeId.trim(), penaltyData);
      res.json({ success: true, message: 'Penalty added successfully', ...result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getAllPenalties(req, res) {
    try {
      const penalties = await PenaltyModel.getAllPenalties();
      res.json({ success: true, penalties });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async deletePenalty(req, res) {
    try {
      const { activeId, penaltyIndex } = req.body;
      if (!activeId || penaltyIndex === undefined) {
        return res.status(400).json({ success: false, message: 'Active ID and penalty index are required' });
      }
      const result = await PenaltyModel.deletePenalty(activeId, parseInt(penaltyIndex));
      res.json({ success: true, message: 'Penalty deleted successfully', ...result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updatePaymentStatus(req, res) {
    try {
      const { activeId, penaltyIndex, paymentStatus } = req.body;
      if (!activeId || penaltyIndex === undefined || !paymentStatus) {
        return res.status(400).json({ success: false, message: 'Active ID, penalty index, and payment status are required' });
      }
      if (!['Pending', 'Complete'].includes(paymentStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid payment status' });
      }
      const result = await PenaltyModel.updatePaymentStatus(activeId, parseInt(penaltyIndex), paymentStatus);
      res.json({ success: true, message: 'Payment status updated successfully', ...result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = PenaltyController;

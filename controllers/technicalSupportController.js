const TechnicalSupportModel = require('../models/technicalSupportModel');
const { bucket } = require('../config/firebase');

class TechnicalSupportController {
  static async submitQuery(req, res) {
    try {
      const { name, idType, idNumber, problem } = req.body;

      if (!name || !idType || !idNumber || !problem) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
      }

      let imageUrls = [];

      // Upload images if provided
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const filename = `support/${Date.now()}_${file.originalname}`;
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
          imageUrls.push(url);
        }
      }

      const queryData = {
        name,
        idType,
        idNumber,
        problem,
        imageUrls,
        status: 'pending'
      };

      const docRef = await TechnicalSupportModel.addQuery(queryData);
      res.json({ success: true, message: 'Query submitted successfully', id: docRef.id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getQueries(req, res) {
    try {
      const queries = await TechnicalSupportModel.getAllQueries();
      res.json(queries);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }

  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['pending', 'completed'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }

      await TechnicalSupportModel.updateStatus(id, status);
      res.json({ success: true, message: 'Status updated successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async deleteQuery(req, res) {
    try {
      const { id } = req.params;
      await TechnicalSupportModel.deleteQuery(id);
      res.json({ success: true, message: 'Query deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = TechnicalSupportController;

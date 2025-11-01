const { bucket } = require('../config/firebase');

class UploadController {
  static async uploadSignature(req, res) {
    try {
      const { signature } = req.body;
      if (!signature || !signature.startsWith('data:image')) {
        return res.status(400).json({ message: 'Invalid signature' });
      }

      // Extract base64 data
      const base64Data = signature.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Generate unique filename
      const filename = `signatures/${Date.now()}_signature.png`;
      const file = bucket.file(filename);

      // Upload to Firebase Storage
      await file.save(buffer, {
        metadata: {
          contentType: 'image/png',
        },
        public: true,
      });

      // Get public URL
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '03-09-2491', // Far future date for permanent access
      });

      res.json({ url });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = UploadController;

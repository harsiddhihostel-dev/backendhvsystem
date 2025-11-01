const { db } = require('../config/firebase');

const verifyPassword = async (req, res) => {
  try {
    const { password, type } = req.body; // type can be 'login', 'penalty', or 'remainder'
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    const docRef = db.collection('hvhostelstrongpassword').doc('password');
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.json({ success: false });
    }

    const data = doc.data();
    let storedPassword;

    if (type === 'penalty') {
      storedPassword = data.penaltypassword;
    } else if (type === 'remainder') {
      storedPassword = data.remainderpassword;
    } else {
      storedPassword = data.password; // default to login password
    }

    if (storedPassword === password) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    console.error('Error verifying password:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { verifyPassword };

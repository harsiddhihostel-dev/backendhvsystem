const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'hostel-management-prod.firebasestorage.app' // Replace with your actual Firebase Storage bucket name
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

module.exports = { db, admin, bucket };

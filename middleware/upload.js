const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024, fieldSize: 10 * 1024 * 1024 } }); // 10MB limit for files and fields

module.exports = upload;

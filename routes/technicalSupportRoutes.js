const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const TechnicalSupportController = require('../controllers/technicalSupportController');

router.post('/submit-query', upload.array('images', 10), TechnicalSupportController.submitQuery);
router.get('/get-queries', TechnicalSupportController.getQueries);
router.put('/update-status/:id', TechnicalSupportController.updateStatus);
router.delete('/delete-query/:id', TechnicalSupportController.deleteQuery);

module.exports = router;

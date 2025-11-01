const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const PenaltyController = require('../controllers/penaltyController');

router.post('/verify-active-id', PenaltyController.verifyActiveId);

router.post('/add-penalty', upload.single('proof'), PenaltyController.addPenalty);

router.get('/get-all-penalties', PenaltyController.getAllPenalties);

router.post('/delete-penalty', PenaltyController.deletePenalty);

router.post('/update-payment-status', PenaltyController.updatePaymentStatus);

module.exports = router;

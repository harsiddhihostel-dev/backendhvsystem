const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const StudentController = require('../controllers/studentController');

router.post('/new-admission', upload.fields([
  { name: 'aadhaarCardFrontFile', maxCount: 1 },
  { name: 'aadhaarCardBackFile', maxCount: 1 },
  { name: 'collegeIdCardFile', maxCount: 1 },
  { name: 'passportPhoto', maxCount: 1 }
]), StudentController.newAdmission);

router.put('/update-admission', upload.fields([
  { name: 'aadhaarCardFrontFile', maxCount: 1 },
  { name: 'aadhaarCardBackFile', maxCount: 1 },
  { name: 'collegeIdCardFile', maxCount: 1 },
  { name: 'passportPhoto', maxCount: 1 }
]), StudentController.updateAdmission);

router.get('/get-masterdata', StudentController.getMasterData);

router.post('/activate-student', StudentController.activateStudent);

router.post('/activate-candidate', StudentController.activateCandidate);

router.post('/deactivate-candidate', StudentController.deactivateCandidate);

router.put('/update-fees-status', StudentController.updateFeesStatus);

router.post('/apply-penalties', StudentController.applyPenalties);

router.post('/download-month-invoice', StudentController.downloadMonthInvoice);

router.post('/send-invoice-email', StudentController.sendInvoiceEmail);

router.post('/send-fees-remainder', StudentController.sendFeesRemainder);

router.get('/get-student/:id', StudentController.getStudentById);

router.delete('/delete-admission/:id', StudentController.deleteAdmission);

router.get('/get-room-counters', StudentController.getRoomCounters);
router.get('/get-dashboard-counters', StudentController.getDashboardCounters);
router.get('/download-masterdata-excel', StudentController.downloadMasterDataExcel);

router.post('/reset-room-counters', StudentController.resetRoomCounters);
router.post('/add-monthly-fees-status', StudentController.addMonthlyFeesStatus);
router.post('/initialize-room-status', StudentController.initializeRoomStatus);
router.get('/get-room-configurations', StudentController.getRoomConfigurations);

module.exports = router;

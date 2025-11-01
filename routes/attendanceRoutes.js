const express = require('express');
const router = express.Router();
const AttendanceController = require('../controllers/attendanceController');

router.post('/take-food-attendance', AttendanceController.takeFoodAttendance);

router.get('/get-food-attendance', AttendanceController.getFoodAttendance);

router.post('/take-daily-attendance', AttendanceController.takeDailyAttendance);

router.get('/get-daily-attendance', AttendanceController.getDailyAttendance);

router.get('/download-attendance-excel', AttendanceController.downloadAttendanceExcel);

module.exports = router;

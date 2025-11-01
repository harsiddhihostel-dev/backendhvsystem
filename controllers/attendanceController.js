const AttendanceModel = require('../models/attendanceModel');

class AttendanceController {
  static async takeFoodAttendance(req, res) {
    try {
      const { candidateIds, date } = req.body;
      if (!candidateIds || !Array.isArray(candidateIds)) {
        return res.status(400).json({ success: false, message: 'candidateIds array is required' });
      }
      const result = await AttendanceModel.takeFoodAttendance(candidateIds, date);
      res.json({ success: true, message: 'Food attendance taken successfully', date: result.date });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getFoodAttendance(req, res) {
    try {
      let { date } = req.query;
      const data = await AttendanceModel.getFoodAttendance(date);
      res.json({ success: true, data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async takeDailyAttendance(req, res) {
    try {
      const { candidateIds, date } = req.body;
      if (!candidateIds || !Array.isArray(candidateIds)) {
        return res.status(400).json({ success: false, message: 'Candidate IDs array is required' });
      }
      const result = await AttendanceModel.takeDailyAttendance(candidateIds, date);
      res.json({ success: true, message: 'Daily attendance taken successfully', date: result.date });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getDailyAttendance(req, res) {
    try {
      let { date } = req.query;
      const data = await AttendanceModel.getDailyAttendance(date);
      res.json({ success: true, data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async downloadAttendanceExcel(req, res) {
    try {
      const { date, type } = req.query;
      if (!date || !type) {
        return res.status(400).json({ success: false, message: 'Date and type are required' });
      }
      if (!['daily', 'food'].includes(type)) {
        return res.status(400).json({ success: false, message: 'Type must be daily or food' });
      }
      const workbook = await AttendanceModel.downloadAttendanceExcel(date, type);
      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `${type}_attendance_${date}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(buffer);
    } catch (error) {
      console.error(error);
      if (error.message === 'Attendance not found for the given date') {
        return res.status(404).json({ success: false, message: 'Attendance not taken for the given date' });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = AttendanceController;

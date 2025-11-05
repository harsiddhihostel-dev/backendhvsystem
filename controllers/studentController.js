const StudentModel = require('../models/studentModel');
const { bucket } = require('../config/firebase');
const { Resend } = require('resend');
const puppeteer = require('puppeteer-core');

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper function to safely convert numbers
const convertToSafeNumber = (value) => {
  if (value === undefined || value === null || value === '') return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

class StudentController {
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

  static async newAdmission(req, res) {
    try {
      const uploadPromises = [];

      // Upload files if present
      if (req.files.aadhaarCardFrontFile && req.files.aadhaarCardFrontFile[0]) {
        const file = req.files.aadhaarCardFrontFile[0];
        const uploadPromise = new Promise(async (resolve, reject) => {
          try {
            const filename = `documents/${Date.now()}_aadhaar_front_${file.originalname}`;
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
            req.body.aadhaarCardFrontUrl = url;
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        uploadPromises.push(uploadPromise);
      }

      if (req.files.aadhaarCardBackFile && req.files.aadhaarCardBackFile[0]) {
        const file = req.files.aadhaarCardBackFile[0];
        const uploadPromise = new Promise(async (resolve, reject) => {
          try {
            const filename = `documents/${Date.now()}_aadhaar_back_${file.originalname}`;
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
            req.body.aadhaarCardBackUrl = url;
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        uploadPromises.push(uploadPromise);
      }



      if (req.files.collegeIdCardFile && req.files.collegeIdCardFile[0]) {
        const file = req.files.collegeIdCardFile[0];
        const uploadPromise = new Promise(async (resolve, reject) => {
          try {
            const filename = `documents/${Date.now()}_college_id_${file.originalname}`;
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
            req.body.collegeIdCardUrl = url;
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        uploadPromises.push(uploadPromise);
      }

      if (req.files.passportPhoto && req.files.passportPhoto[0]) {
        const file = req.files.passportPhoto[0];
        const uploadPromise = new Promise(async (resolve, reject) => {
          try {
            const filename = `documents/${Date.now()}_passport_${file.originalname}`;
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
            req.body.passportPhotoUrl = url;
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        uploadPromises.push(uploadPromise);
      }

      // Upload signature if present
      if (req.body.signature && req.body.signature.startsWith('data:image')) {
        const base64Data = req.body.signature.replace(/^data:image\/png;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `signatures/${Date.now()}_signature.png`;
        const file = bucket.file(filename);
        await file.save(buffer, {
          metadata: {
            contentType: 'image/png',
          },
          public: true,
        });
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: '03-09-2491',
        });
        req.body.signatureUrl = url;
        delete req.body.signature;
      }

      await Promise.all(uploadPromises);

      // Remove file objects from req.body
      delete req.body.aadhaarCardFile;
      delete req.body.aadhaarCardFrontFile;
      delete req.body.aadhaarCardBackFile;
      delete req.body.collegeIdCardFile;
      delete req.body.passportPhoto;

      // Convert dateOfAdmission and dateOfBirth from YYYY-MM-DD to DD-MM-YYYY
      if (req.body.dateOfAdmission) {
        const [year, month, day] = req.body.dateOfAdmission.split('-');
        req.body.dateOfAdmission = `${day}-${month}-${year}`;
      }
      if (req.body.dateOfBirth) {
        const [year, month, day] = req.body.dateOfBirth.split('-');
        req.body.dateOfBirth = `${day}-${month}-${year}`;
      }

      // Convert numeric fields to integers safely
      console.log('Raw feesAmount:', req.body.feesAmount, 'Type:', typeof req.body.feesAmount);
      req.body.feesAmount = convertToSafeNumber(req.body.feesAmount);
      req.body.securityDeposit = convertToSafeNumber(req.body.securityDeposit);
      req.body.maintenanceCharge = convertToSafeNumber(req.body.maintenanceCharge);
      req.body.registrationFees = convertToSafeNumber(req.body.registrationFees);
      req.body.totalAmount = convertToSafeNumber(req.body.totalAmount);
      console.log('Converted feesAmount:', req.body.feesAmount);

      // Add default isActive: false for new admissions
      req.body.isActive = false;
      req.body.createdAt = new Date();

      // Save to Firestore (only masterdata for new admissions)
      const docRef = await StudentModel.addStudent(req.body);
      console.log('Final feesAmount before model save:', req.body.feesAmount);
      res.json({ success: true, message: 'Admission added successfully', id: docRef.id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateAdmission(req, res) {
    try {
      const { id, ...updateData } = req.body;
      if (!id) {
        return res.status(400).json({ success: false, message: 'ID is required for update' });
      }

      const uploadPromises = [];

      // Upload files if new file provided
      if (req.files.aadhaarCardFrontFile && req.files.aadhaarCardFrontFile[0]) {
        const file = req.files.aadhaarCardFrontFile[0];
        const uploadPromise = new Promise(async (resolve, reject) => {
          try {
            const filename = `documents/${Date.now()}_aadhaar_front_${file.originalname}`;
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
            updateData.aadhaarCardFrontUrl = url;
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        uploadPromises.push(uploadPromise);
      }

      if (req.files.aadhaarCardBackFile && req.files.aadhaarCardBackFile[0]) {
        const file = req.files.aadhaarCardBackFile[0];
        const uploadPromise = new Promise(async (resolve, reject) => {
          try {
            const filename = `documents/${Date.now()}_aadhaar_back_${file.originalname}`;
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
            updateData.aadhaarCardBackUrl = url;
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        uploadPromises.push(uploadPromise);
      }



      if (req.files.collegeIdCardFile && req.files.collegeIdCardFile[0]) {
        const file = req.files.collegeIdCardFile[0];
        const uploadPromise = new Promise(async (resolve, reject) => {
          try {
            const filename = `documents/${Date.now()}_college_id_${file.originalname}`;
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
            updateData.collegeIdCardUrl = url;
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        uploadPromises.push(uploadPromise);
      }

      if (req.files.passportPhoto && req.files.passportPhoto[0]) {
        const file = req.files.passportPhoto[0];
        const uploadPromise = new Promise(async (resolve, reject) => {
          try {
            const filename = `documents/${Date.now()}_passport_${file.originalname}`;
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
            updateData.passportPhotoUrl = url;
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        uploadPromises.push(uploadPromise);
      }

      // Upload signature if present and changed
      if (updateData.signature && updateData.signature.startsWith('data:image')) {
        const base64Data = updateData.signature.replace(/^data:image\/png;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `signatures/${Date.now()}_signature.png`;
        const file = bucket.file(filename);
        await file.save(buffer, {
          metadata: {
            contentType: 'image/png',
          },
          public: true,
        });
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: '03-09-2491',
        });
        updateData.signatureUrl = url;
        delete updateData.signature;
      }

      await Promise.all(uploadPromises);

      // Convert dateOfAdmission and dateOfBirth from YYYY-MM-DD to DD-MM-YYYY
      if (updateData.dateOfAdmission) {
        const [year, month, day] = updateData.dateOfAdmission.split('-');
        updateData.dateOfAdmission = `${day}-${month}-${year}`;
      }
      if (updateData.dateOfBirth) {
        const [year, month, day] = updateData.dateOfBirth.split('-');
        updateData.dateOfBirth = `${day}-${month}-${year}`;
      }

      // Convert numeric fields to integers safely
      if (updateData.feesAmount !== undefined) {
        console.log('Raw update feesAmount:', updateData.feesAmount, 'Type:', typeof updateData.feesAmount);
        updateData.feesAmount = convertToSafeNumber(updateData.feesAmount);
        console.log('Converted update feesAmount:', updateData.feesAmount);
      }
      if (updateData.securityDeposit !== undefined) updateData.securityDeposit = convertToSafeNumber(updateData.securityDeposit);
      if (updateData.maintenanceCharge !== undefined) updateData.maintenanceCharge = convertToSafeNumber(updateData.maintenanceCharge);
      if (updateData.registrationFees !== undefined) updateData.registrationFees = convertToSafeNumber(updateData.registrationFees);
      if (updateData.totalAmount !== undefined) updateData.totalAmount = convertToSafeNumber(updateData.totalAmount);

      // Remove file objects from updateData
      delete updateData.aadhaarCardFrontFile;
      delete updateData.aadhaarCardBackFile;
      delete updateData.collegeIdCardFile;
      delete updateData.passportPhoto;

      // Remove createdAt from updateData to prevent overwriting with [object Object]
      delete updateData.createdAt;

      // Update in Firestore (only masterdata since editing from MasterData)
      await StudentModel.updateStudent(id, updateData);

      res.json({ success: true, message: 'Admission updated successfully', id: id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getMasterData(req, res) {
    try {
      const collection = req.query.collection || 'masterdata';
      const limit = req.query.limit ? parseInt(req.query.limit) : 0;
      const lastDocId = req.query.lastDocId || null;
      const searchTerm = req.query.searchTerm || null;
      const searchField = req.query.searchField || null;
      if (lastDocId === '') lastDocId = null;
      console.log('getMasterData: collection=', collection, 'limit=', limit, 'lastDocId=', lastDocId, 'searchTerm=', searchTerm, 'searchField=', searchField);
      const result = await StudentModel.getAll(collection, limit, lastDocId, searchTerm, searchField);
      console.log('getMasterData result length:', result.data.length);
      res.json({ data: result.data, lastDocId: result.lastDocId, hasMore: result.hasMore });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }

  static async activateStudent(req, res) {
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ success: false, message: 'ID is required' });
      }
      await StudentModel.activateStudent(id);
      res.json({ success: true, message: 'Student activated successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async activateCandidate(req, res) {
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ success: false, message: 'Candidate ID is required' });
      }
      const result = await StudentModel.activateCandidate(id);
      res.json({ success: true, message: 'Candidate activated successfully', activeId: result.activeId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async deactivateCandidate(req, res) {
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ success: false, message: 'Candidate ID is required' });
      }
      await StudentModel.deactivateCandidate(id);
      res.json({ success: true, message: 'Candidate deactivated successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async deleteAdmission(req, res) {
    try {
      const { id } = req.params;
      await StudentModel.deleteStudent(id);
      res.json({ success: true, message: 'Admission deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateFeesStatus(req, res) {
    try {
      const { id, feesStatus } = req.body;
      if (!id || !feesStatus) {
        return res.status(400).json({ success: false, message: 'ID and feesStatus are required' });
      }
      await StudentModel.updateFeesStatus(id, feesStatus);
      res.json({ success: true, message: 'Fees status updated successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async applyPenalties(req, res) {
    try {
      const now = new Date();
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const currentMonth = monthNames[now.getMonth()];
      const currentYear = now.getFullYear();
      const currentMonthKey = `${currentMonth}, ${currentYear}`;

      const result = await StudentModel.applyPenalties(currentMonthKey);
      res.json({ success: true, message: `Penalties applied to ${result.updatedCount} students` });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getRoomCounters(req, res) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : null;
      const lastRoomNo = req.query.lastRoomNo || null;
      const floor = req.query.floor || null;
      const searchTerm = req.query.searchTerm || null;
      const counters = await StudentModel.getRoomCounters(limit, lastRoomNo, floor, searchTerm);
      res.json(counters);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }

  static async getDashboardCounters(req, res) {
    try {
      const counters = await StudentModel.getDashboardCounters();
      res.json(counters);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }

  static async downloadMasterDataExcel(req, res) {
    try {
      const collection = req.query.collection || 'masterdata';
      if (!['masterdata', 'activecandidate'].includes(collection)) {
        return res.status(400).json({ success: false, message: 'Invalid collection. Must be masterdata or activecandidate' });
      }
      const workbook = await StudentModel.downloadMasterDataExcel(collection);
      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `${collection}_report.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(buffer);
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getStudentById(req, res) {
    try {
      const { id } = req.params;
      const student = await StudentModel.getStudentById(id);
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }
      res.json({ success: true, student });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async downloadMonthInvoice(req, res) {
    try {
      const { studentId, month } = req.body;
      if (!studentId || !month) {
        return res.status(400).json({ success: false, message: 'Student ID and month are required' });
      }

      // Get student data
      const student = await StudentModel.getStudentById(studentId);
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }

      // Check if the month exists in feesStatus
      const feesStatus = student.feesStatus || {};
      const monthData = feesStatus[month];
      if (!monthData) {
        return res.status(404).json({ success: false, message: 'Month data not found' });
      }

      // Generate HTML for the invoice
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Invoice - ${month}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .hostel-info { margin-bottom: 20px; }
            .details { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .summary { text-align: right; font-weight: bold; }
            .thank-you { text-align: center; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Invoice</h1>
            <div class="hostel-info">
              <h2>Harsiddhi Hostel</h2>
              <p>Near Parul University, Limda Village, Gujarat 391760</p>
              <p>88 66 99 66 84 | harsiddhihostel@gmail.com</p>
              <p>http://hvhostel.in/</p>
            </div>
          </div>

          <div class="details">
            <h3>Bill To:</h3>
            <table>
              <tr>
                <td><strong>Name:</strong> ${student.fullName}</td>
                <td><strong>Date:</strong> ${new Date().toLocaleDateString()}</td>
              </tr>
              <tr>
                <td><strong>Master ID:</strong> ${student.masterId}</td>
                <td><strong>Time:</strong> ${new Date().toLocaleTimeString()}</td>
              </tr>
              <tr>
                <td><strong>Room:</strong> ${student.roomNo}</td>
                <td><strong>Contact:</strong> ${student.contactNo || 'N/A'}</td>
              </tr>
            </table>
          </div>

          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Fees Amount</th>
                <th>Status</th>
                <th>Penalty Applied</th>
                <th>Penalty Amount</th>
                <th>Paid Date</th>
                <th>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${month}</td>
                <td>₹${monthData.feesAmount || student.feesAmount || 0}</td>
                <td>${monthData.status}</td>
                <td>${monthData.penaltyApplied ? 'Yes' : 'No'}</td>
                <td>${monthData.penaltyApplied ? `₹${monthData.penaltyAmount}` : 'N/A'}</td>
                <td>${monthData.paidDate || 'N/A'}</td>
                <td>₹${(monthData.feesAmount || student.feesAmount || 0) + (monthData.penaltyApplied ? monthData.penaltyAmount || 0 : 0)}</td>
              </tr>
            </tbody>
          </table>

          <div class="summary">
            <p><strong>Total:</strong> ₹${(monthData.feesAmount || student.feesAmount || 0) + (monthData.penaltyApplied ? monthData.penaltyAmount || 0 : 0)}</p>
            <p><strong>Paid:</strong> ₹${monthData.status === 'Paid' ? (monthData.feesAmount || student.feesAmount || 0) + (monthData.penaltyApplied ? monthData.penaltyAmount || 0 : 0) : 0}</p>
          </div>

          <div class="thank-you">
            <p>Thank you for staying with us!</p>
          </div>
        </body>
        </html>
      `;

      // Use Puppeteer to generate PDF
      const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(htmlContent);
      const pdfBuffer = await page.pdf({ format: 'A4' });
      await browser.close();

      // Send PDF as response
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Invoice_${student.fullName.replace(/\s+/g, '')}_${month.replace(/\s+/g, '')}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async sendInvoiceEmail(req, res) {
    try {
      const { studentId, months, pdfBase64 } = req.body;
      if (!studentId) {
        return res.status(400).json({ success: false, message: 'Student ID is required' });
      }
      if (!pdfBase64) {
        return res.status(400).json({ success: false, message: 'PDF data is required' });
      }

      // Get student data
      const student = await StudentModel.getStudentById(studentId);
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }

      if (!student.email) {
        return res.status(400).json({ success: false, message: 'Student email not found' });
      }

      // Decode base64 PDF to buffer
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');

      // Generate current date and time for filename
      const emailNow = new Date();
      const day = String(emailNow.getDate()).padStart(2, '0');
      const month = String(emailNow.getMonth() + 1).padStart(2, '0');
      const year = emailNow.getFullYear();
      const currentDate = `${day}-${month}-${year}`; // DD-MM-YYYY format

      // Send email using Resend
      await resend.emails.send({
        from: "noreply@hvhostel.in",
        to: student.email,
        subject: `Thank You, ${student.fullName}! Here's Your Invoice from Harsiddhi Hostel - (${currentDate})`,
        html: `
          <p>Dear ${student.fullName},</p>
          <br>
          <p>Please find attached your invoice from Harsiddhi  Hostel.</p>
          <p>If you have any questions or require further assistance, feel free to contact us harsiddhihostel@gmail.com.</p>
          <p>Thank you for choosing to stay with us — we truly appreciate your trust and hope you've had a comfortable experience.</p>
          <br>
          <p>Warm regards,</p>
          <p><strong>Harsiddhi Hostel Management</strong></p>
          <p>Phone: 88 66 99 66 84  </p>
          <p>Email: <a href="mailto:harsiddhihostel@gmail.com">harsiddhihostel@gmail.com</a></p>
        `,
        attachments: [
          {
            filename: `Invoice_${(student.fullName || student.name).replace(/\s+/g, '')}_${currentDate}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });

      res.json({ success: true, message: 'Invoice sent successfully to ' + student.email });
    } catch (error) {
      console.error('Error sending invoice email:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async sendFeesRemainder(req, res) {
    try {
      // Calculate current month key
      const now = new Date();
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const currentMonth = monthNames[now.getMonth()];
      const currentYear = now.getFullYear();
      const currentMonthKey = `${currentMonth}, ${currentYear}`;

      // Helper function to check if a month is before or equal to current
      const isMonthBeforeOrEqual = (monthKey, currentKey) => {
        const [m1, y1] = monthKey.split(', ');
        const [m2, y2] = currentKey.split(', ');
        const idx1 = monthNames.indexOf(m1);
        const idx2 = monthNames.indexOf(m2);
        if (parseInt(y1) < parseInt(y2)) return true;
        if (parseInt(y1) > parseInt(y2)) return false;
        return idx1 <= idx2;
      };

      // Get all active candidates
      const result = await StudentModel.getAll('activecandidate', 0, null, null, null);
      const students = result.data;

      // Filter students with any pending fees and collect pending months
      const studentsWithPendingFees = [];
      for (const student of students) {
        if (!student.email) continue;
        const feesStatus = student.feesStatus || {};

        // Add current month if missing
        if (!feesStatus[currentMonthKey]) {
          feesStatus[currentMonthKey] = {
            status: "Not Paid",
            feesAmount: student.feesAmount || 0,
            penaltyApplied: false,
            penaltyAmount: 0
          };
        }

        const pendingMonths = [];
        for (const [monthKey, monthData] of Object.entries(feesStatus)) {
          // Only include months up to current month
          if (!isMonthBeforeOrEqual(monthKey, currentMonthKey)) continue;

          const isPaid = monthData && typeof monthData === 'object' ? monthData.status === 'Paid' : monthData === true;
          if (!isPaid) {
            const baseAmount = monthData && typeof monthData === 'object' ? monthData.feesAmount : student.feesAmount;
            const penaltyAmount = monthData && typeof monthData === 'object' && monthData.penaltyApplied ? monthData.penaltyAmount || 0 : 0;
            const totalAmount = baseAmount + penaltyAmount;
            pendingMonths.push({
              month: monthKey,
              amount: baseAmount,
              penaltyAmount: penaltyAmount,
              totalAmount: totalAmount
            });
          }
        }
        if (pendingMonths.length > 0) {
          student.pendingMonths = pendingMonths;
          studentsWithPendingFees.push(student);
        }
      }

      if (studentsWithPendingFees.length === 0) {
        return res.json({ success: true, message: 'No students with pending fees found' });
      }

      let sentCount = 0;
      const failedEmails = [];
      const sentEmails = new Set(); // To prevent duplicate emails to the same address

      // Send reminder emails
      for (const student of studentsWithPendingFees) {
        if (sentEmails.has(student.email)) {
          continue; // Skip if email already sent
        }
        try {
          const pendingMonthsList = student.pendingMonths.map(item => {
            let monthText = `${item.month}: ₹${item.amount || 'N/A'}`;
            if (item.penaltyAmount > 0) {
              monthText += ` + Penalty: ₹${item.penaltyAmount} = ₹${item.totalAmount}`;
            }
            return monthText;
          }).join('<br>');
          const totalPending = student.pendingMonths.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);

          // Send email using Resend
          await resend.emails.send({
            from: 'noreply@hvhostel.in',
            to: student.email,
            subject: `Fees Reminder - Multiple Pending Months - Harsiddhi Hostel`,
            html: `
              <p>Dear ${student.fullName},</p>
              <br>
              <p>This is a friendly reminder that you have pending fees for the following months:</p>
              <br>
              <div style="background-color: #f0f0f0; padding: 10px; border-radius: 5px;">
                ${pendingMonthsList}
              </div>
              <br>
              <p><strong>Total Pending Amount:</strong> ₹${totalPending}</p>
              <p><strong>Room Number:</strong> ${student.roomNo}</p>
              <br>
              <p>Please make the payment at your earliest convenience to avoid any penalties.</p>
              <p>If you have already paid for any of these months, please ignore this email for those specific months.</p>
              <p>For any queries, contact us at <a href="mailto:harsiddhihostel@gmail.com">harsiddhihostel@gmail.com</a> or call <strong>88 66 99 66 84</strong>.</p>
              <br>
              <p>Thank you for your attention to this matter.</p>
              <br>
              <p>Warm regards,</p>
              <p><strong>Harsiddhi Hostel Management</strong></p>
              <p>Phone: 88 66 99 66 84 | Email: <a href="mailto:harsiddhihostel@gmail.com">harsiddhihostel@gmail.com</a></p>
            `
          });

          sentEmails.add(student.email);
          sentCount++;
        } catch (emailError) {
          console.error(`Failed to send email to ${student.email}:`, emailError);
          failedEmails.push(student.email);
        }
      }

      let message = `Fees remainder sent to ${sentCount} students`;
      if (failedEmails.length > 0) {
        message += `. Failed to send to ${failedEmails.length} students: ${failedEmails.join(', ')}`;
      }

      res.json({ success: true, message, sentCount, failedCount: failedEmails.length });
    } catch (error) {
      console.error('Error sending fees remainder:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async resetRoomCounters(req, res) {
    try {
      const result = await StudentModel.resetAllRoomCounters();
      res.json({ success: true, message: `Room counters reset to 0 for ${result.updatedCount} rooms` });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async initializeRoomStatus(req, res) {
    try {
      const result = await StudentModel.initializeRoomStatus();
      res.json({ success: true, message: result.message });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async addMonthlyFeesStatus(req, res) {
    try {
      const result = await StudentModel.addMonthlyFeesStatus();
      res.json({ success: true, message: `Monthly fees status added for ${result.updatedCount} students` });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async sendEmail(req, res) {
    try {
      const { to, subject, html, attachments, from } = req.body;
      if (!to || !subject || !html) {
        return res.status(400).json({ success: false, message: 'to, subject, and html are required' });
      }

      const emailData = {
        from: from || "noreply@hvhostel.in",
        to: Array.isArray(to) ? to : [to],
        subject,
        html
      };

      if (attachments && Array.isArray(attachments)) {
        emailData.attachments = attachments;
      }

      const data = await resend.emails.send(emailData);
      res.json({ success: true, message: 'Email sent successfully', data });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getRoomConfigurations(req, res) {
    try {
      const configurations = await StudentModel.getRoomConfigurations();
      res.json({ roomConfigurations: configurations });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = StudentController;

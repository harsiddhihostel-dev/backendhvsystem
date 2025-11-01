require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const cron = require('node-cron');

// Import configs to initialize
require('./config/firebase');

// Import routes
const studentRoutes = require('./routes/studentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const technicalSupportRoutes = require('./routes/technicalSupportRoutes');
const authRoutes = require('./routes/authRoutes');
const penaltyRoutes = require('./routes/penaltyRoutes');

// Import StudentModel for cron job
const StudentModel = require('./models/studentModel');

const app = express();
const corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware to log request header size
app.use((req, res, next) => {
  const headerSize = JSON.stringify(req.headers).length;
  console.log(`Request headers size: ${headerSize} bytes`);
  next();
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Use routes
app.use('/', studentRoutes);
app.use('/', attendanceRoutes);
app.use('/', uploadRoutes);
app.use('/', technicalSupportRoutes);
app.use('/', authRoutes);
app.use('/', penaltyRoutes);

const PORT = process.env.PORT || 3001;
const server = http.createServer({ maxHeaderSize: 131072 }, app); // 128KB
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Schedule monthly fees status addition on the 1st of each month at 00:01
cron.schedule('1 0 1 * *', async () => {
  console.log('Running monthly fees status addition job...');
  try {
    const result = await StudentModel.addMonthlyFeesStatus();
    console.log(`Monthly fees status added for ${result.updatedCount} students`);
  } catch (error) {
    console.error('Error in monthly fees status addition:', error);
  }
}, {
  timezone: "Asia/Kolkata"  // Adjust timezone as needed
});

// Schedule fees remainder emails on the 1st, 2nd, 3rd, and 4th of each month at 9:00 AM
cron.schedule('0 9 1-4 * *', async () => {
  console.log('Running fees remainder email job...');
  try {
    const StudentController = require('./controllers/studentController');
    const result = await StudentController.sendFeesRemainder({ body: {} }, {
      json: (data) => console.log('Fees remainder result:', data),
      status: () => ({ json: (data) => console.log('Fees remainder error:', data) })
    });
    console.log('Fees remainder emails sent successfully');
  } catch (error) {
    console.error('Error in fees remainder email job:', error);
  }
}, {
  timezone: "Asia/Kolkata"  // Adjust timezone as needed
});

// Schedule automatic penalty application on the 5th of each month at 3:00 AM
cron.schedule('0 3 5 * *', async () => {
  console.log('Running automatic penalty application job...');
  try {
    const StudentController = require('./controllers/studentController');

    // Apply penalties first
    const penaltyResult = await StudentController.applyPenalties({ body: {} }, {
      json: (data) => console.log('Penalty application result:', data),
      status: () => ({ json: (data) => console.log('Penalty application error:', data) })
    });
    console.log('Automatic penalties applied successfully');

    // Then send fees remainder emails
    console.log('Sending fees remainder emails after penalty application...');
    const remainderResult = await StudentController.sendFeesRemainder({ body: {} }, {
      json: (data) => console.log('Fees remainder result:', data),
      status: () => ({ json: (data) => console.log('Fees remainder error:', data) })
    });
    console.log('Fees remainder emails sent successfully after penalty application');

  } catch (error) {
    console.error('Error in automatic penalty application and remainder emails:', error);
  }
}, {
  timezone: "Asia/Kolkata"  // Adjust timezone as needed
});

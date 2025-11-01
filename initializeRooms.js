const StudentModel = require('./models/studentModel');

async function initializeRooms() {
  try {
    console.log('Initializing room status...');
    const result = await StudentModel.initializeRoomStatus();
    console.log('Success:', result.message);
  } catch (error) {
    console.error('Error initializing room status:', error);
  }
}

// Run the initialization
initializeRooms();

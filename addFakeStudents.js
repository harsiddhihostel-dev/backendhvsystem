const { faker } = require('@faker-js/faker');
const { db } = require('./config/firebase');
const StudentModel = require('./models/studentModel');

async function addFakeStudents() {
  const roomSubOptions = {
    1: ['2', '3 Left', '3 Right'],
    2: ['1 Left', '1 Center', '1 Right', '2', '3'],
    3: ['2 Left','2 Center', '2 Right'],
    4: ['2 Left', '2 Right', '3'],
    5: ['1','2 Left', '2 Right']
  };

  const roomNumbers = [];
  const floors = [100, 200, 300, 400];
  floors.forEach(floor => {
    for (let room = 1; room <= 5; room++) {
      const roomNum = floor + room;
      roomSubOptions[room].forEach(sub => {
        roomNumbers.push(`${roomNum} - ${sub}`);
      });
    }
  });

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const feesStructures = ['1 month', '3 months', '6 months', '1 year'];
  const religions = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'];

  for (let i = 0; i < 44; i++) {
    // Generate createdAt with varying times, including same day different hours/minutes/seconds
    const now = new Date();
    const daysBack = faker.number.int({ min: 0, max: 7 }); // Last 7 days
    const createdAt = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    createdAt.setHours(faker.number.int({ min: 0, max: 23 }));
    createdAt.setMinutes(faker.number.int({ min: 0, max: 59 }));
    createdAt.setSeconds(faker.number.int({ min: 0, max: 59 }));

    const student = {
      dateOfAdmission: faker.date.past(),
      roomNo: faker.helpers.arrayElement(roomNumbers),
      fullName: faker.person.fullName(),
      religion: faker.helpers.arrayElement(religions),
      fathersName: faker.person.fullName(),
      mothersName: faker.person.fullName(),
      dateOfBirth: faker.date.past({ years: 20 }),
      mobileNo: faker.phone.number(),
      fatherMobileNo: faker.phone.number(),
      localContactDetails: faker.location.streetAddress(),
      fatherOccupation: faker.person.jobTitle(),
      departmentAndCollege: faker.company.name(),
      bloodGroup: faker.helpers.arrayElement(bloodGroups),
      feesStructure: faker.helpers.arrayElement(feesStructures),
      feesAmount: faker.number.int({ min: 1000, max: 10000 }),
      securityDeposit: faker.number.int({ min: 500, max: 2000 }),
      maintenanceCharge: faker.number.int({ min: 100, max: 500 }),
      registrationFees: faker.number.int({ min: 100, max: 500 }),
      totalAmount: faker.number.int({ min: 2000, max: 15000 }),
      contractPeriod: faker.helpers.arrayElement(['1 month', '3 months', '6 months', '1 year']),
      permanentAddress: faker.location.streetAddress(),
      aadhaarCardNo: faker.string.numeric({ length: 12 }),
      collegeIdCardNo: faker.string.alphanumeric({ length: 10 }),
      agreeToRules: true,
      isActive: false,
      activeId: null,
      createdAt: createdAt
    };

    const masterDocRef = await db.collection('masterdata').add(student);
    console.log(`Added student ${i + 1} to masterdata with createdAt: ${createdAt.toISOString()}`);

    // Now activate the student to add to activecandidate
    const activateResult = await StudentModel.activateCandidate(masterDocRef.id);
    console.log(`Activated student ${i + 1} to activecandidate with activeId: ${activateResult.activeId}`);
  }

  console.log('All 44 fake students added to both masterdata and activecandidate collections');
}

addFakeStudents().catch(console.error);

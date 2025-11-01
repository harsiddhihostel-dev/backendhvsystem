const { faker } = require('@faker-js/faker');
const { db } = require('./config/firebase');

const baseSampleData = {
  aadhaarCardNo: "1",
  aadhaarCardUrl: "https://res.cloudinary.com/dcq2dbvbj/image/upload/v1760167885/qfjqplvsvnxyfltbvqhv.jpg",
  agreeToRules: "true",
  bloodGroup: "B+",
  collegeIdCardNo: "",
  collegeIdCardUrl: "https://res.cloudinary.com/dcq2dbvbj/image/upload/v1760167880/x1q97xbmyxdawsphmfsp.jpg",
  contractPeriod: "1",
  dateOfAdmission: "2025-10-01",
  dateOfBirth: "2025-10-11",
  departmentAndCollege: "PIET",
  fatherMobileNo: "9106579379",
  fatherOccupation: "Businessman",
  fathersName: "Jaimin Pansuriya",
  feesAmount: "1",
  feesStatus: { "October, 2025": false },
  feesStructure: "6 months",
  fullName: "Jaimin Pansuriya", // This will be changed
  isActive: false,
  localContactDetails: "9106579379",
  maintenanceCharge: "1",
  masterId: "KCufXN8o7sVN9gksBlav", // This will be changed
  mobileNo: "9106579379",
  mothersName: "Jaimin Pansuriya",
  passportPhotoUrl: "https://res.cloudinary.com/dcq2dbvbj/image/upload/v1760167879/oouwp3nygceuibvlhjpd.jpg",
  permanentAddress: "1",
  registrationFees: "1",
  religion: "Hindu",
  roomNo: "102",
  securityDeposit: "1",
  signatureUrl: "https://res.cloudinary.com/dcq2dbvbj/image/upload/v1760167878/ebrgr7cil5fcn6ivcrbl.png",
  totalAmount: "1",
  createdAt: new Date()
};

function generateSampleData(num = 60) {
  const data = [];
  for (let i = 0; i < num; i++) {
    const sampleData = { ...baseSampleData };
    sampleData.fullName = faker.person.fullName();
    sampleData.masterId = faker.string.uuid();
    sampleData.createdAt = faker.date.past({ days: 30 });
    data.push(sampleData);
  }
  return data;
}

async function addSampleData() {
  const sampleData = generateSampleData(60);

  for (const data of sampleData) {
    await db.collection('activecandidate').add(data);
  }

  console.log('60 fake student records added to activecandidate collection successfully');
}

addSampleData().catch(console.error);

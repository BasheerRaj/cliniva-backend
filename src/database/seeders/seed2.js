require('dotenv').config();
const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://mohamad:kOk0eAz4fW4cAGTu@cluster0.uke8i.mongodb.net/clinicDB_new?retryWrites=true&w=majority';

const { Schema } = mongoose;

// -------------------- SCHEMAS --------------------
const OrganizationSchema = new Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  taxNumber: String,
  commercialRegister: String,
  ownerId: Schema.Types.ObjectId,
  logo: String,
  website: String,
  status: { type: String, enum: ['active', 'inactive', 'suspended'] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'organizations' });

const ComplexSchema = new Schema({
  name: String,
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  phone: String,
  email: String,
  workingHours: [{
    day: { type: String, enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] },
    isOpen: Boolean,
    openTime: String,
    closeTime: String
  }],
  facilities: [String],
  status: { type: String, enum: ['active', 'inactive', 'under_maintenance'] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'complexes' });

const ClinicSchema = new Schema({
  name: String,
  complexId: { type: Schema.Types.ObjectId, ref: 'Complex' },
  specialty: { type: String, required: true },
  phone: String,
  email: String,
  roomNumber: String,
  floor: String,
  capacity: Number,
  equipment: [{
    name: String,
    quantity: Number,
    status: String
  }],
  services: [{
    name: String,
    price: Number,
    duration: Number
  }],
  status: { type: String, enum: ['active', 'inactive', 'maintenance'] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'clinics' });

const UserSchema = new Schema({
  email: { type: String, unique: true },
  passwordHash: String,
  firstName: String,
  lastName: String,
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'doctor', 'nurse', 'receptionist', 'accountant']
  },
  clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic' },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
  specialties: [String],
  qualifications: [{
    degree: String,
    institution: String,
    year: Number
  }],
  schedule: [{
    day: String,
    startTime: String,
    endTime: String
  }],
  contact: {
    phone: String,
    emergency: String,
    address: String
  },
  status: { type: String, enum: ['active', 'inactive', 'suspended'] },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'users' });

const PatientSchema = new Schema({
  patientNumber: { type: String, unique: true },
  firstName: String,
  lastName: String,
  dateOfBirth: Date,
  gender: { type: String, enum: ['male', 'female', 'other'] },
  bloodType: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
  contact: {
    phone: String,
    email: String,
    emergency: String,
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String
    }
  },
  insurance: {
    provider: String,
    policyNumber: String,
    expiryDate: Date
  },
  medicalHistory: {
    allergies: [String],
    chronicDiseases: [String],
    surgeries: [{
      name: String,
      date: Date,
      hospital: String
    }],
    medications: [{
      name: String,
      dosage: String,
      frequency: String
    }]
  },
  clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic' },
  status: { type: String, enum: ['active', 'inactive', 'archived'] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'patients' });


const ServiceSchema = new Schema({
  name: String,
  clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic' },
  price: Number,
}, { collection: 'services' });

const AppointmentSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient' },
  doctorId: { type: Schema.Types.ObjectId, ref: 'User' },
  clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic' },
  serviceId: { type: Schema.Types.ObjectId, ref: 'Service' },
  date: Date,
}, { collection: 'appointments' });

const InvoiceSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient' },
  appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
  amount: Number,
  status: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { collection: 'invoices' });

const InsuranceClaimSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient' },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  amount: Number,
  status: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { collection: 'insuranceClaims' });

const MedicalReportSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient' },
  appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
  doctorId: { type: Schema.Types.ObjectId, ref: 'User' },
  description: String,
}, { collection: 'medicalReports' });

// -------------------- MODELS --------------------
const Organization = mongoose.model('Organization', OrganizationSchema);
const Complex = mongoose.model('Complex', ComplexSchema);
const Clinic = mongoose.model('Clinic', ClinicSchema);
const User = mongoose.model('User', UserSchema);
const Patient = mongoose.model('Patient', PatientSchema);
const Service = mongoose.model('Service', ServiceSchema);
const Appointment = mongoose.model('Appointment', AppointmentSchema);
const Invoice = mongoose.model('Invoice', InvoiceSchema);
const InsuranceClaim = mongoose.model('InsuranceClaim', InsuranceClaimSchema);
const MedicalReport = mongoose.model('MedicalReport', MedicalReportSchema);

// -------------------- SETTINGS --------------------
const ORG_COUNT = 2;
const COMPLEX_PER_ORG = 2;
const CLINIC_PER_COMPLEX = 2;
const DOCTORS_PER_CLINIC = 2;
const PATIENTS_PER_CLINIC = 5;
const SERVICES_PER_CLINIC = 3;
const APPOINTMENTS_PER_CLINIC = 10;
const DEFAULT_PASSWORD = 'Password123!';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const users = [];
    const patients = [];
    const services = [];
    const appointments = [];
    const invoices = [];

    for (let i = 1; i <= ORG_COUNT; i++) {
      const org = await Organization.create({
        name: `Org ${i} - ${faker.company.name()}`,
        email: faker.internet.email(),
        phone: faker.phone.number('+9665########'),
        address: {
          street: faker.location.street(),
          city: faker.location.city(),
          state: faker.location.state(),
          postalCode: faker.location.zipCode(),
          country: 'Saudi Arabia'
        },
        taxNumber: faker.string.numeric(15),
        commercialRegister: faker.string.numeric(10),
        ownerId: new mongoose.Types.ObjectId(),
        logo: faker.image.url(),
        website: faker.internet.url(),
        status: 'active'
      });

      for (let j = 1; j <= COMPLEX_PER_ORG; j++) {
        const complex = await Complex.create({
          name: `Complex ${j} of Org ${i}`,
          organizationId: org._id,
          address: {
            street: faker.location.street(),
            city: faker.location.city(),
            state: faker.location.state(),
            postalCode: faker.location.zipCode(),
            country: 'Saudi Arabia'
          },
          phone: faker.phone.number('+9665########'),
          email: faker.internet.email(),
          workingHours: [{
            day: 'sunday',
            isOpen: true,
            openTime: '08:00',
            closeTime: '17:00'
          }],
          facilities: ['Parking', 'WiFi', 'Cafeteria'],
          status: 'active'
        });

        for (let k = 1; k <= CLINIC_PER_COMPLEX; k++) {
          const clinic = await Clinic.create({
            name: `Clinic ${k} of Complex ${j}`,
            complexId: complex._id,
            specialty: faker.commerce.department(),
            phone: faker.phone.number('+9665########'),
            email: faker.internet.email(),
            roomNumber: faker.string.numeric(3),
            floor: faker.string.numeric(2),
            capacity: faker.number.int({ min: 5, max: 20 }),
            equipment: [{
              name: 'X-Ray Machine',
              quantity: 1,
              status: 'operational'
            }],
            services: [{
              name: 'General Checkup',
              price: 100,
              duration: 30
            }],
            status: 'active'
          });

          // Doctors
          for (let d = 1; d <= DOCTORS_PER_CLINIC; d++) {
            const firstName = faker.person.firstName();
            const lastName = faker.person.lastName();
            const email = `dr.${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
            const doctor = await User.create({
              email,
              passwordHash,
              firstName,
              lastName,
              role: 'doctor',
              clinicId: clinic._id,
              organizationId: org._id,
              specialties: [faker.commerce.department()],
              qualifications: [{
                degree: 'MBBS',
                institution: 'King Saud University',
                year: 2015
              }],
              schedule: [{
                day: 'sunday',
                startTime: '08:00',
                endTime: '17:00'
              }],
              contact: {
                phone: faker.phone.number('+9665########'),
                emergency: faker.phone.number('+9665########'),
                address: faker.location.streetAddress()
              },
              status: 'active'
            });
            users.push(doctor);
          }

          // Patients
          for (let p = 1; p <= PATIENTS_PER_CLINIC; p++) {
            const patientNumber = `P-${i}${j}${k}${p}-${faker.string.alphanumeric(6)}`;
            const patient = await Patient.create({
              firstName: faker.person.firstName(),
              lastName: faker.person.lastName(),
              dateOfBirth: faker.date.birthdate({ mode: 'year', min: 1950, max: 2015 }),
              phone: faker.phone.number('+9665########'),
              clinicId: clinic._id,
              patientNumber, // ← هنا
              gender: faker.helpers.arrayElement(['male', 'female', 'other']),
              bloodType: faker.helpers.arrayElement(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
              contact: {
                phone: faker.phone.number('+9665########'),
                email: faker.internet.email(),
                emergency: faker.phone.number('+9665########'),
                address: {
                  street: faker.location.street(),
                  city: faker.location.city(),
                  state: faker.location.state(),
                  postalCode: faker.location.zipCode()
                }
              },
              insurance: {
                provider: faker.company.name(),
                policyNumber: faker.string.alphanumeric(10),
                expiryDate: faker.date.future()
              },
              medicalHistory: {
                allergies: [faker.lorem.word()],
                chronicDiseases: [faker.lorem.word()],
                surgeries: [{
                  name: faker.lorem.word(),
                  date: faker.date.past(),
                  hospital: faker.company.name()
                }],
                medications: [{
                  name: faker.lorem.word(),
                  dosage: '1 pill',
                  frequency: 'daily'
                }]
              },
              status: 'active'
            });
            patients.push(patient);
          }


          // Services
          for (let s = 1; s <= SERVICES_PER_CLINIC; s++) {
            const service = await Service.create({
              name: faker.commerce.productName(),
              clinicId: clinic._id,
              price: faker.number.int({ min: 50, max: 500 }),
            });
            services.push(service);
          }

          // Appointments
          for (let a = 1; a <= APPOINTMENTS_PER_CLINIC; a++) {
            const appointment = await Appointment.create({
              patientId: faker.helpers.arrayElement(patients)._id,
              doctorId: faker.helpers.arrayElement(users)._id,
              clinicId: clinic._id,
              serviceId: faker.helpers.arrayElement(services)._id,
              date: faker.date.future(),
            });
            appointments.push(appointment);

            // Invoices
            const invoice = await Invoice.create({
              patientId: appointment.patientId,
              appointmentId: appointment._id,
              amount: faker.number.int({ min: 50, max: 500 }),
              status: faker.helpers.arrayElement(['paid', 'pending', 'cancelled']),
              createdBy: faker.helpers.arrayElement(users)._id,
            });
            invoices.push(invoice);

            // Insurance Claims
            await InsuranceClaim.create({
              patientId: appointment.patientId,
              invoiceId: invoice._id,
              amount: invoice.amount,
              status: faker.helpers.arrayElement(['approved', 'pending', 'rejected']),
              createdBy: faker.helpers.arrayElement(users)._id,
            });

            // Medical Reports
            await MedicalReport.create({
              patientId: appointment.patientId,
              appointmentId: appointment._id,
              doctorId: appointment.doctorId,
              description: faker.lorem.sentence(),
            });
          }
        }
      }
    }

    console.log('🎉 Full seeding completed!');
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err);
    await mongoose.disconnect();
  }
}

seed();

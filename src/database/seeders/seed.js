
require('dotenv').config();
const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker'); // ✅ المكتبة الصحيحة
const bcrypt = require('bcrypt');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://mohamad:kOk0eAz4fW4cAGTu@cluster0.uke8i.mongodb.net/clinicDB_new?retryWrites=true&w=majority';

const { Schema } = mongoose;

// ⬇️ تعريف السكيمات الخفيفة
const OrganizationSchema = new Schema({
    name: String,
    legalName: String,
    registrationNumber: String,
    email: String,
    phone: String,
    address: String,
    ownerId: Schema.Types.ObjectId,
}, { collection: 'organizations' });

const ComplexSchema = new Schema({
    name: String,
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    address: String,
}, { collection: 'complexes' });

const ClinicSchema = new Schema({
    name: String,
    complexId: { type: Schema.Types.ObjectId, ref: 'Complex' },
    address: String,
    phone: String,
}, { collection: 'clinics' });

const UserSchema = new Schema({
    email: String,
    passwordHash: String,
    firstName: String,
    lastName: String,
    role: String,
    clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic' },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    isActive: { type: Boolean, default: true },
}, { collection: 'users' });

// موديلات
const Organization = mongoose.model('Organization', OrganizationSchema);
const Complex = mongoose.model('Complex', ComplexSchema);
const Clinic = mongoose.model('Clinic', ClinicSchema);
const User = mongoose.model('User', UserSchema);

// إعدادات التوليد
const ORG_COUNT = 2;
const COMPLEX_PER_ORG = 2;
const CLINIC_PER_COMPLEX = 2;
const DOCTORS_PER_CLINIC = 2;

const DEFAULT_PASSWORD = 'Password123!';

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB:', MONGO_URI);

        const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

        for (let i = 1; i <= ORG_COUNT; i++) {
            const org = await Organization.create({
                name: `Org ${i} - ${faker.company.name()}`,
                legalName: `${faker.company.name()} LLC`,
                registrationNumber: `REG-${faker.string.alphanumeric(6)}`,
                email: `org${i}@example.com`,
                phone: faker.phone.number('+1-###-###-####'),
                address: `${faker.location.streetAddress()}, ${faker.location.city()}`,
                ownerId: new mongoose.Types.ObjectId(),
            });
            console.log(`🏢 Organization ${i}: ${org._id}`);

            for (let j = 1; j <= COMPLEX_PER_ORG; j++) {
                const complex = await Complex.create({
                    name: `Complex ${j} of Org ${i}`,
                    organizationId: org._id,
                    address: `${faker.location.streetAddress()}, ${faker.location.city()}`,
                });
                console.log(`  🏬 Complex ${j}: ${complex._id}`);

                for (let k = 1; k <= CLINIC_PER_COMPLEX; k++) {
                    const clinic = await Clinic.create({
                        name: `Clinic ${k} of Complex ${j}`,
                        complexId: complex._id,
                        address: `${faker.location.streetAddress()}, ${faker.location.city()}`,
                        phone: faker.phone.number('+1-###-###-####'),
                    });
                    console.log(`    🏥 Clinic ${k}: ${clinic._id}`);

                    for (let d = 1; d <= DOCTORS_PER_CLINIC; d++) {
                        const firstName = faker.person.firstName();
                        const lastName = faker.person.lastName();
                        const email = `dr.${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}${j}${k}${d}@example.com`;

                        const doctor = await User.create({
                            email,
                            passwordHash,
                            firstName,
                            lastName,
                            role: 'doctor',
                            clinicId: clinic._id,
                            organizationId: org._id,
                            isActive: true,
                        });
                        console.log(`      👨‍⚕️ Doctor ${doctor.email}`);
                    }
                }
            }
        }

        console.log('🎉 Seeding completed!');
        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ Error:', err);
        await mongoose.disconnect();
    }
}

seed();

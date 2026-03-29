import { config } from 'dotenv';
import * as mongoose from 'mongoose';

// Load environment variables
config();

/**
 * Migration script to backfill subscriptionId on existing documents
 * that predate the tenant data isolation hardening (M1/M2).
 *
 * Collections affected:
 *   - specialties: derived via complexId → complexes.subscriptionId
 *   - services: derived via complexId or clinicId → subscriptionId
 *   - departments: derived via complexdepartments junction → complexes.subscriptionId
 *
 * Run with:
 *   npm run migrate:backfill-sub
 */
async function run() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cliniva';

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB. Starting backfill...\n');

  const db = mongoose.connection.db;

  // ── 1. Backfill Specialty ──────────────────────────────────────────────────
  const specialties = await db
    .collection('specialties')
    .find({ subscriptionId: { $exists: false }, complexId: { $exists: true } })
    .toArray();

  console.log(`Found ${specialties.length} specialties to backfill`);

  let specialtyUpdated = 0;
  for (const s of specialties) {
    const complex = await db
      .collection('complexes')
      .findOne({ _id: s.complexId });
    if (complex?.subscriptionId) {
      await db
        .collection('specialties')
        .updateOne({ _id: s._id }, { $set: { subscriptionId: complex.subscriptionId } });
      specialtyUpdated++;
    }
  }
  console.log(`  → Updated ${specialtyUpdated} specialties\n`);

  // ── 2. Backfill Service ───────────────────────────────────────────────────
  const services = await db
    .collection('services')
    .find({ subscriptionId: { $exists: false } })
    .toArray();

  console.log(`Found ${services.length} services to backfill`);

  let serviceUpdated = 0;
  for (const svc of services) {
    let subscriptionId: mongoose.Types.ObjectId | undefined;

    if (svc.complexId) {
      const complex = await db
        .collection('complexes')
        .findOne({ _id: svc.complexId });
      subscriptionId = complex?.subscriptionId;
    } else if (svc.clinicId) {
      const clinic = await db
        .collection('clinics')
        .findOne({ _id: svc.clinicId });
      subscriptionId = clinic?.subscriptionId;
    }

    if (subscriptionId) {
      await db
        .collection('services')
        .updateOne({ _id: svc._id }, { $set: { subscriptionId } });
      serviceUpdated++;
    }
  }
  console.log(`  → Updated ${serviceUpdated} services\n`);

  // ── 3. Backfill Department ────────────────────────────────────────────────
  const depts = await db
    .collection('departments')
    .find({ subscriptionId: { $exists: false } })
    .toArray();

  console.log(`Found ${depts.length} departments to backfill`);

  let deptUpdated = 0;
  for (const dept of depts) {
    // Departments have no direct scope fields — derive from ComplexDepartment junction
    const link = await db
      .collection('complexdepartments')
      .findOne({ departmentId: dept._id, isActive: true });

    if (link?.complexId) {
      const complex = await db
        .collection('complexes')
        .findOne({ _id: link.complexId });
      if (complex?.subscriptionId) {
        await db.collection('departments').updateOne(
          { _id: dept._id },
          {
            $set: {
              subscriptionId: complex.subscriptionId,
              complexId: link.complexId,
            },
          },
        );
        deptUpdated++;
      }
    }
  }
  console.log(`  → Updated ${deptUpdated} departments\n`);

  console.log('Backfill complete.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

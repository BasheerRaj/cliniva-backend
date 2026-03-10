// #!/usr/bin/env ts-node
// /**
//  * Migration: add-complex-scoping-to-patients
//  *
//  * UC-3at2c5 (M5 Patients Management) — adds tenant scoping to existing patients.
//  *
//  * Phase 1: Backfill clinicId/complexId/organizationId on existing patients
//  *          by deriving from their most recent appointment.
//  * Phase 2: Create compound indexes for UC-3at2c5 patient list queries.
//  *
//  * Idempotent: patients that already have clinicId set are skipped.
//  * Patients with no appointments remain with null scope fields (expected).
//  *
//  * Usage:
//  *   MONGODB_URI=mongodb://localhost:27017/cliniva npx ts-node scripts/migrations/add-complex-scoping-to-patients.ts
//  *   npx ts-node scripts/migrations/add-complex-scoping-to-patients.ts  (uses MONGODB_URI env)
//  */

// import { connect, connection, disconnect } from 'mongoose';
// import { ObjectId } from 'mongodb';

// const MONGODB_URI =
//   process.env.MONGODB_URI || 'mongodb://localhost:27017/cliniva';

// async function up() {
//   console.log('🔄 Migration: add-complex-scoping-to-patients\n');
//   console.log(`📡 Connecting to: ${MONGODB_URI.replace(/:[^:@]+@/, ':***@')}`);

//   await connect(MONGODB_URI);
//   console.log('✅ Connected\n');

//   const db = connection.db;
//   const patientsCol = db.collection('patients');
//   const appointmentsCol = db.collection('appointments');
//   const clinicsCol = db.collection('clinics');

//   // ── Phase 1: Backfill scope fields ─────────────────────────────────────────

//   // Find patients without clinicId (not yet migrated and not soft-deleted)
//   const unscopedPatients = await patientsCol
//     .find({ clinicId: { $exists: false }, deletedAt: { $exists: false } })
//     .project({ _id: 1 })
//     .toArray();

//   console.log(`📊 Found ${unscopedPatients.length} patients without clinicId`);

//   let resolved = 0;
//   let unresolved = 0;

//   for (const patient of unscopedPatients) {
//     // Find the most recent appointment for this patient to get clinic context
//     const appt = await appointmentsCol.findOne(
//       {
//         patientId: patient._id,
//         clinicId: { $exists: true },
//         isDeleted: { $ne: true },
//       },
//       {
//         sort: { createdAt: -1 },
//         projection: { clinicId: 1, complexId: 1 },
//       },
//     );

//     if (!appt) {
//       unresolved++;
//       continue; // No appointment — leave null, needs manual assignment
//     }

//     // Look up the clinic to get organizationId
//     const clinic = await clinicsCol.findOne(
//       { _id: appt.clinicId },
//       { projection: { complexId: 1, organizationId: 1 } },
//     );

//     await patientsCol.updateOne(
//       { _id: patient._id },
//       {
//         $set: {
//           clinicId: appt.clinicId,
//           complexId: appt.complexId || clinic?.complexId || null,
//           organizationId: clinic?.organizationId || null,
//         },
//       },
//     );
//     resolved++;
//   }

//   console.log(`  ✅ Resolved:    ${resolved} patients`);
//   console.log(`  ⚠️  Unresolved: ${unresolved} patients (no appointments — manual assignment needed)\n`);

//   // Report unscoped count for ops team
//   const unscopedCount = await patientsCol.countDocuments({
//     clinicId: { $exists: false },
//     deletedAt: { $exists: false },
//   });
//   if (unscopedCount > 0) {
//     console.log(`⚠️  ${unscopedCount} patients remain without scope after migration.`);
//     console.log(
//       '   Use PATCH /api/v1/patients/:id/assign-clinic to manually assign them.\n',
//     );
//   }

//   // ── Phase 2: Create compound indexes ───────────────────────────────────────

//   console.log('📑 Creating compound indexes...');

//   const indexOperations = [
//     { key: { complexId: 1 },                                     name: 'idx_patients_complex' },
//     { key: { clinicId: 1 },                                      name: 'idx_patients_clinic' },
//     { key: { organizationId: 1 },                                name: 'idx_patients_org' },
//     { key: { complexId: 1, deletedAt: 1 },                       name: 'idx_patients_complex_deleted' },
//     { key: { complexId: 1, status: 1, deletedAt: 1 },            name: 'idx_patients_complex_status' },
//     { key: { complexId: 1, insuranceStatus: 1, deletedAt: 1 },   name: 'idx_patients_complex_insurance' },
//     { key: { complexId: 1, gender: 1, deletedAt: 1 },            name: 'idx_patients_complex_gender' },
//     { key: { complexId: 1, status: 1, insuranceStatus: 1, deletedAt: 1 }, name: 'idx_patients_complex_status_insurance' },
//     { key: { clinicId: 1, status: 1, deletedAt: 1 },             name: 'idx_patients_clinic_status' },
//   ];

//   for (const op of indexOperations) {
//     try {
//       await patientsCol.createIndex(op.key, { name: op.name, background: true });
//       console.log(`  ✅ ${op.name}`);
//     } catch (err: any) {
//       if (err.code === 85 || err.codeName === 'IndexOptionsConflict') {
//         console.log(`  ⏭️  ${op.name} (already exists)`);
//       } else if (err.code === 86 || err.codeName === 'IndexKeySpecsConflict') {
//         console.log(`  ⏭️  ${op.name} (equivalent index exists)`);
//       } else {
//         console.error(`  ❌ ${op.name}: ${err.message}`);
//       }
//     }
//   }

//   console.log('\n✅ Migration complete!\n');
//   await disconnect();
// }

// up().catch((err) => {
//   console.error('❌ Migration failed:', err);
//   process.exit(1);
// });

import { connect, connection } from 'mongoose';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

async function fixProfilePictureUrls() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cliniva';
    await connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const db = connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    const patientsCollection = db.collection('patients');

    // Find all patients with full URL profile pictures
    const patientsWithFullUrls = await patientsCollection
      .find({
        profilePicture: { $regex: '^http://' }
      })
      .toArray();

    console.log(`Found ${patientsWithFullUrls.length} patients with full URL profile pictures`);

    // Update each patient
    for (const patient of patientsWithFullUrls) {
      const oldUrl = patient.profilePicture;
      
      // Extract the relative path from the full URL
      // Example: http://localhost:3000/uploads/file.jpg -> /uploads/file.jpg
      const urlMatch = oldUrl.match(/\/uploads\/.+$/);
      
      if (urlMatch) {
        const relativePath = urlMatch[0];
        
        await patientsCollection.updateOne(
          { _id: patient._id },
          { $set: { profilePicture: relativePath } }
        );
        
        console.log(`✅ Updated patient ${patient._id}: ${oldUrl} -> ${relativePath}`);
      } else {
        console.log(`⚠️  Could not extract path from: ${oldUrl}`);
      }
    }

    // Also fix documents array if needed
    const patientsWithFullDocUrls = await patientsCollection
      .find({
        documents: { $elemMatch: { $regex: '^http://' } }
      })
      .toArray();

    console.log(`\nFound ${patientsWithFullDocUrls.length} patients with full URL documents`);

    for (const patient of patientsWithFullDocUrls) {
      const updatedDocuments = patient.documents.map((doc: string) => {
        if (doc.startsWith('http://')) {
          const urlMatch = doc.match(/\/uploads\/.+$/);
          return urlMatch ? urlMatch[0] : doc;
        }
        return doc;
      });

      await patientsCollection.updateOne(
        { _id: patient._id },
        { $set: { documents: updatedDocuments } }
      );

      console.log(`✅ Updated documents for patient ${patient._id}`);
    }

    console.log('\n✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  }
}

// Run the migration
fixProfilePictureUrls();

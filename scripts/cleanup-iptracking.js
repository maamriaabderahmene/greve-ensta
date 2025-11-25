/**
 * Cleanup Script: Remove Invalid IPTracking Records
 * 
 * This script removes IPTracking records that have missing or invalid session values
 * which can cause issues with the new session-based attendance system.
 */

const mongoose = require('mongoose');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-system';

const IPTrackingSchema = new mongoose.Schema({
  ipAddress: String,
  email: String,
  deviceFingerprint: String,
  session: String,
  date: Date,
  createdAt: Date
});

const IPTracking = mongoose.model('IPTracking', IPTrackingSchema);

async function cleanupIPTracking() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const validSessions = ['session0', 'session1', 'session2', 'session3', 'session4'];

    // Find records with missing or invalid session
    const invalidRecords = await IPTracking.find({
      $or: [
        { session: { $exists: false } },
        { session: null },
        { session: { $nin: validSessions } }
      ]
    });

    console.log(`📊 Found ${invalidRecords.length} invalid IPTracking records`);

    if (invalidRecords.length > 0) {
      console.log('\n⚠️  Sample invalid records:');
      invalidRecords.slice(0, 5).forEach(record => {
        console.log(`   - Email: ${record.email}, Session: ${record.session || 'undefined'}, Date: ${record.date}`);
      });

      console.log('\n🗑️  Deleting invalid records...');
      const result = await IPTracking.deleteMany({
        $or: [
          { session: { $exists: false } },
          { session: null },
          { session: { $nin: validSessions } }
        ]
      });

      console.log(`✅ Deleted ${result.deletedCount} invalid records`);
    } else {
      console.log('✅ No invalid records found!');
    }

    // Verify all remaining records are valid
    const totalRecords = await IPTracking.countDocuments();
    const validRecords = await IPTracking.countDocuments({
      session: { $in: validSessions }
    });

    console.log('\n📈 Cleanup Summary:');
    console.log(`   - Total remaining records: ${totalRecords}`);
    console.log(`   - Valid records: ${validRecords}`);
    console.log(`   - Invalid records: ${totalRecords - validRecords}`);

    if (totalRecords === validRecords) {
      console.log('\n✅ All IPTracking records are now valid!');
    } else {
      console.log('\n⚠️  Some records still need attention');
    }

    console.log('\n🎉 Cleanup completed!');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run cleanup
cleanupIPTracking();

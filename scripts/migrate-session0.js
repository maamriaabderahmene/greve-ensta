/**
 * Migration Script: Add Session0 to SessionControl
 * 
 * This script ensures that session0 exists in the sessioncontrols collection
 * and all sessions are properly initialized.
 * 
 * Run this script after deploying the session0 update to ensure backward compatibility.
 */

const mongoose = require('mongoose');

// MongoDB connection string - UPDATE THIS WITH YOUR MONGODB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-system';

const SessionControlSchema = new mongoose.Schema({
  session: {
    type: String,
    required: true,
    unique: true,
    enum: ['session0', 'session1', 'session2', 'session3', 'session4']
  },
  isEnabled: {
    type: Boolean,
    default: true
  },
  updatedBy: String,
  updatedAt: Date
}, { timestamps: true });

const SessionControl = mongoose.model('SessionControl', SessionControlSchema);

async function migrateSessionControl() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check existing sessions
    const existingSessions = await SessionControl.find({});
    console.log(`📊 Found ${existingSessions.length} existing session control records`);

    const allSessions = ['session0', 'session1', 'session2', 'session3', 'session4'];
    const existingSessionIds = existingSessions.map(s => s.session);

    let added = 0;
    let updated = 0;

    for (const sessionId of allSessions) {
      if (!existingSessionIds.includes(sessionId)) {
        // Create missing session
        await SessionControl.create({
          session: sessionId,
          isEnabled: true,
          updatedBy: 'migration-script',
          updatedAt: new Date()
        });
        console.log(`✅ Added ${sessionId} (enabled by default)`);
        added++;
      } else {
        console.log(`ℹ️  ${sessionId} already exists`);
        updated++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   - Sessions added: ${added}`);
    console.log(`   - Sessions existing: ${updated}`);
    console.log(`   - Total sessions: ${allSessions.length}`);

    // Verify all sessions exist
    const finalSessions = await SessionControl.find({}).sort({ session: 1 });
    console.log('\n✅ Final session states:');
    finalSessions.forEach(s => {
      console.log(`   - ${s.session}: ${s.isEnabled ? '🟢 Enabled' : '🔴 Disabled'}`);
    });

    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run migration
migrateSessionControl();

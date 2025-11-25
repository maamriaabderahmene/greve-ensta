/**
 * Migration Script: Fix Old Attendance Records Without Session Field
 * 
 * This script updates all existing attendance records that don't have a 'session' field
 * or have invalid session values, assigning them a default session based on when they
 * were created or defaulting to 'session4'.
 * 
 * Run this immediately after the session0 update to fix validation errors.
 */

const mongoose = require('mongoose');

// MongoDB connection string - UPDATE THIS WITH YOUR MONGODB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-system';

const StudentSchema = new mongoose.Schema({
  name: String,
  email: String,
  specialty: String,
  major: String,
  attendanceRecords: [{
    date: Date,
    session: String,
    location: {
      lat: Number,
      lng: Number
    },
    verified: Boolean,
    distance: Number,
    deviceFingerprint: String,
    addedByAdmin: Boolean
  }],
  createdAt: Date,
  updatedAt: Date
});

const Student = mongoose.model('Student', StudentSchema);

/**
 * Determine session based on the time of attendance
 */
function determineSessionFromTime(date) {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const timeValue = hour + minute / 60;

  if (timeValue >= 0 && timeValue < 8) {
    return 'session0'; // 12:00 AM - 8:00 AM
  } else if (timeValue >= 8 && timeValue < 9.5) {
    return 'session1'; // 8:00 AM - 9:30 AM
  } else if (timeValue >= 9.5 && timeValue < 11) {
    return 'session2'; // 9:30 AM - 11:00 AM
  } else if (timeValue >= 11 && timeValue < 12.5) {
    return 'session3'; // 11:00 AM - 12:30 PM
  } else {
    return 'session4'; // 12:30 PM - End of Day
  }
}

async function migrateAttendanceRecords() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all students
    const students = await Student.find({});
    console.log(`📊 Found ${students.length} students`);

    let studentsUpdated = 0;
    let recordsFixed = 0;

    for (const student of students) {
      let needsUpdate = false;
      let recordsFixedForStudent = 0;

      for (let i = 0; i < student.attendanceRecords.length; i++) {
        const record = student.attendanceRecords[i];
        
        // Check if session is missing or invalid
        const validSessions = ['session0', 'session1', 'session2', 'session3', 'session4'];
        if (!record.session || !validSessions.includes(record.session)) {
          needsUpdate = true;
          recordsFixedForStudent++;

          // Determine session from timestamp
          const determinedSession = record.date 
            ? determineSessionFromTime(new Date(record.date))
            : 'session4';

          console.log(`  📝 Fixing record for ${student.email}: ${record.session || 'undefined'} → ${determinedSession}`);
          
          // Update the record
          student.attendanceRecords[i].session = determinedSession;
        }
      }

      if (needsUpdate) {
        try {
          // Disable validation temporarily for this update
          await student.save({ validateBeforeSave: false });
          studentsUpdated++;
          recordsFixed += recordsFixedForStudent;
          console.log(`  ✅ Updated ${student.email}: Fixed ${recordsFixedForStudent} record(s)`);
        } catch (error) {
          console.error(`  ❌ Failed to update ${student.email}:`, error.message);
        }
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   - Total students: ${students.length}`);
    console.log(`   - Students updated: ${studentsUpdated}`);
    console.log(`   - Records fixed: ${recordsFixed}`);

    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    const studentsWithIssues = await Student.find({
      'attendanceRecords.session': { $nin: ['session0', 'session1', 'session2', 'session3', 'session4'] }
    });

    if (studentsWithIssues.length === 0) {
      console.log('✅ All attendance records now have valid sessions!');
    } else {
      console.log(`⚠️  ${studentsWithIssues.length} students still have records with invalid sessions`);
      studentsWithIssues.forEach(s => {
        console.log(`   - ${s.email}`);
      });
    }

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
migrateAttendanceRecords();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Hardcoded for initialization - change in production
const MONGODB_URI = 'mongodb+srv://dimahania6_db_user:RxvYxTxaiJRZATUQ@cluster0.i5qcvc9.mongodb.net/attendance_system';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env.local');
  process.exit(1);
}

// Define schemas inline for the script
const AdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const AttendanceLocationSchema = new mongoose.Schema({
  locationName: { type: String, required: true },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  radius: { type: Number, default: 100 },
  isActive: { type: Boolean, default: true }
});

async function initializeDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
    const AttendanceLocation = mongoose.models.AttendanceLocation || 
      mongoose.model('AttendanceLocation', AttendanceLocationSchema);

    // Create default admin if doesn't exist
    const existingAdmin = await Admin.findOne({ email: 'admin@test.com' });
    
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await Admin.create({
        email: 'admin@test.com',
        password: hashedPassword
      });
      console.log('✅ Default admin created (email: admin@test.com, password: admin123)');
    } else {
      console.log('ℹ️  Default admin already exists');
    }

    // Create default attendance location if doesn't exist
    const existingLocation = await AttendanceLocation.findOne({ 
      locationName: 'Main Campus' 
    });
    
    if (!existingLocation) {
      await AttendanceLocation.create({
        locationName: 'Main Campus',
        coordinates: {
          lat: 36.7489,  // Example: Tizi Ouzou, Algeria coordinates
          lng: 3.0588
        },
        radius: 100,
        isActive: true
      });
      console.log('✅ Default attendance location created');
    } else {
      console.log('ℹ️  Default attendance location already exists');
    }

    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   Email: admin@test.com');
    console.log('   Password: admin123');
    console.log('\n⚠️  IMPORTANT: Change these credentials in production!\n');

  } catch (error) {
    console.error('❌ Error initializing database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

initializeDatabase();

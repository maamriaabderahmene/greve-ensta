const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://dimahania6_db_user:RxvYxTxaiJRZATUQ@cluster0.i5qcvc9.mongodb.net/attendance_system';

// Admins to create
const admins = [
  {
    email: 'aa.maamria@ensta.edu.dz',
    password: '@Tt2022.230.08570'
  },
  {
    email: 'moderator1@ensta.edu.dz',
    password: '@enstagreve321rami'
  },
  {
    email: 'moderator2@ensta.edu.dz',
    password: '@enstagreve321lilia'
  }
];

async function initializeAdmins() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Access the admins collection directly
    const db = mongoose.connection.db;
    const adminsCollection = db.collection('admins');

    // Drop old username index if it exists
    try {
      await adminsCollection.dropIndex('username_1');
      console.log('🗑️ Dropped old username index');
    } catch (error) {
      // Index might not exist, that's fine
      console.log('ℹ️ No username index to drop');
    }

    // Remove old admin if exists
    const oldAdmin = await adminsCollection.findOne({ email: 'admin@test.com' });
    if (oldAdmin) {
      await adminsCollection.deleteOne({ email: 'admin@test.com' });
      console.log('🗑️ Removed old admin: admin@test.com');
    }

    // Create new admins
    for (const admin of admins) {
      const existingAdmin = await adminsCollection.findOne({ email: admin.email });
      
      if (existingAdmin) {
        console.log(`⚠️ Admin already exists: ${admin.email}`);
        // Update password
        const hashedPassword = await bcrypt.hash(admin.password, 12);
        await adminsCollection.updateOne(
          { email: admin.email },
          { 
            $set: { 
              password: hashedPassword,
              updatedAt: new Date()
            }
          }
        );
        console.log(`✅ Updated password for: ${admin.email}`);
      } else {
        // Create new admin
        const hashedPassword = await bcrypt.hash(admin.password, 12);
        await adminsCollection.insertOne({
          email: admin.email,
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`✅ Created admin: ${admin.email}`);
      }
    }

    // Ensure email index exists
    await adminsCollection.createIndex({ email: 1 }, { unique: true });
    console.log('✅ Email index created');

    console.log('\n✅ All admins initialized successfully!');
    console.log('\nAdmin Accounts:');
    console.log('1. aa.maamria@ensta.edu.dz');
    console.log('2. moderator1@ensta.edu.dz');
    console.log('3. moderator2@ensta.edu.dz');
    
  } catch (error) {
    console.error('❌ Error initializing admins:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

initializeAdmins();

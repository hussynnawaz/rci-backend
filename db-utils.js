import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import FormSubmission from './models/FormSubmission.js';

dotenv.config();

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rci_database';
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
};

const closeDB = async () => {
  await mongoose.connection.close();
  console.log('🔌 Database connection closed');
};

// Database utility functions
const dbUtils = {
  // List all users
  async listUsers() {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    console.log('\n👥 Users:');
    users.forEach(user => {
      console.log(`- ${user.fullName} (${user.email}) - Role: ${user.role}, Active: ${user.isActive}`);
    });
    return users;
  },

  // List all form submissions
  async listSubmissions() {
    const submissions = await FormSubmission.find({})
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    console.log('\n📝 Form Submissions:');
    submissions.forEach(sub => {
      const user = sub.userId ? `${sub.userId.firstName} ${sub.userId.lastName}` : 'Unknown User';
      console.log(`- ${sub.formType} by ${user} - Status: ${sub.status} (${new Date(sub.createdAt).toLocaleDateString()})`);
    });
    return submissions;
  },

  // Create a test user
  async createTestUser(email = 'test@example.com', role = 'user') {
    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        console.log(`ℹ️  User ${email} already exists`);
        return existingUser;
      }

      const user = await User.create({
        firstName: 'Test',
        lastName: 'User',
        email: email,
        password: 'password123',
        role: role,
        isVerified: true,
        isActive: true
      });

      console.log(`✅ Created test user: ${email} (${role})`);
      return user;
    } catch (error) {
      console.error('❌ Error creating test user:', error.message);
    }
  },

  // Delete a user by email
  async deleteUser(email) {
    try {
      const result = await User.deleteOne({ email });
      if (result.deletedCount > 0) {
        console.log(`✅ Deleted user: ${email}`);
      } else {
        console.log(`ℹ️  User not found: ${email}`);
      }
      return result;
    } catch (error) {
      console.error('❌ Error deleting user:', error.message);
    }
  },

  // Get database statistics
  async getStats() {
    const db = mongoose.connection.db;
    const stats = await db.stats();
    const userCount = await User.countDocuments();
    const submissionCount = await FormSubmission.countDocuments();
    const adminCount = await User.countDocuments({ role: 'admin' });

    console.log('\n📊 Database Statistics:');
    console.log(`Database: ${stats.db}`);
    console.log(`Total Collections: ${stats.collections}`);
    console.log(`Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Total Users: ${userCount} (${adminCount} admins)`);
    console.log(`Form Submissions: ${submissionCount}`);

    return {
      database: stats.db,
      collections: stats.collections,
      dataSize: stats.dataSize,
      users: userCount,
      admins: adminCount,
      submissions: submissionCount
    };
  },

  // Clear all data (use with caution!)
  async clearAllData() {
    console.log('⚠️  This will delete ALL data from the database!');
    console.log('This action cannot be undone.');
    
    // In a real scenario, you'd want user confirmation here
    await User.deleteMany({});
    await FormSubmission.deleteMany({});
    
    console.log('🗑️  All data cleared');
  },

  // Reset to initial state
  async resetDatabase() {
    await this.clearAllData();
    
    // Recreate admin user
    await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: process.env.ADMIN_EMAIL || 'admin@replicacopyindustries.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'admin',
      isVerified: true,
      isActive: true
    });

    console.log('🔄 Database reset to initial state');
  }
};

// CLI interface
const runCommand = async () => {
  const command = process.argv[2];
  
  const connected = await connectDB();
  if (!connected) {
    process.exit(1);
  }

  try {
    switch (command) {
      case 'users':
        await dbUtils.listUsers();
        break;
      case 'submissions':
        await dbUtils.listSubmissions();
        break;
      case 'stats':
        await dbUtils.getStats();
        break;
      case 'create-test-user':
        const email = process.argv[3] || 'test@example.com';
        const role = process.argv[4] || 'user';
        await dbUtils.createTestUser(email, role);
        break;
      case 'delete-user':
        const userEmail = process.argv[3];
        if (!userEmail) {
          console.log('❌ Please provide email: npm run db-utils delete-user email@example.com');
          break;
        }
        await dbUtils.deleteUser(userEmail);
        break;
      case 'reset':
        await dbUtils.resetDatabase();
        break;
      default:
        console.log('🛠️  Available commands:');
        console.log('  users              - List all users');
        console.log('  submissions        - List all form submissions');
        console.log('  stats              - Show database statistics');
        console.log('  create-test-user   - Create a test user');
        console.log('  delete-user        - Delete user by email');
        console.log('  reset              - Reset database to initial state');
        console.log('');
        console.log('Usage: node db-utils.js [command]');
        console.log('Example: node db-utils.js users');
        break;
    }
  } catch (error) {
    console.error('❌ Command failed:', error.message);
  } finally {
    await closeDB();
    process.exit();
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCommand();
}

export default dbUtils;

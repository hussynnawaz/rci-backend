import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import FormSubmission from './models/FormSubmission.js';

// Load environment variables
dotenv.config();

// Database initialization script
const initializeDatabase = async () => {
  try {
    console.log('🚀 Starting database initialization...');
    
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rci_database';
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });
    
    console.log('✅ Connected to MongoDB successfully');
    
    // Get database instance
    const db = mongoose.connection.db;
    
    // Create collections if they don't exist
    console.log('📂 Creating collections...');
    
    // List existing collections
    const existingCollections = await db.listCollections().toArray();
    const collectionNames = existingCollections.map(col => col.name);
    
    console.log('📋 Existing collections:', collectionNames);
    
    // Collections to create
    const collectionsToCreate = [
      {
        name: 'users',
        model: User,
        description: 'User accounts and authentication data'
      },
      {
        name: 'formsubmissions',
        model: FormSubmission,
        description: 'Form submissions and order data'
      }
    ];
    
    // Create collections and indexes
    for (const collection of collectionsToCreate) {
      if (!collectionNames.includes(collection.name)) {
        await db.createCollection(collection.name);
        console.log(`✅ Created collection: ${collection.name} - ${collection.description}`);
      } else {
        console.log(`ℹ️  Collection already exists: ${collection.name}`);
      }
      
      // Ensure indexes are created
      try {
        await collection.model.createIndexes();
        console.log(`🔍 Created indexes for: ${collection.name}`);
      } catch (error) {
        console.log(`⚠️  Indexes may already exist for: ${collection.name}`);
      }
    }
    
    // Create admin user if it doesn't exist
    console.log('👤 Creating admin user...');
    
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@replicacopyindustries.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (!existingAdmin) {
      const adminUser = await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        isVerified: true,
        isActive: true
      });
      
      console.log('✅ Admin user created successfully');
      console.log(`📧 Admin Email: ${adminEmail}`);
      console.log(`🔑 Admin Password: ${adminPassword}`);
    } else {
      console.log('ℹ️  Admin user already exists');
    }
    
    // Database statistics
    console.log('\n📊 Database Statistics:');
    const stats = await db.stats();
    console.log(`Database: ${stats.db}`);
    console.log(`Collections: ${stats.collections}`);
    console.log(`Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    
    // Collection counts
    console.log('\n📈 Collection Counts:');
    const userCount = await User.countDocuments();
    const formCount = await FormSubmission.countDocuments();
    
    console.log(`Users: ${userCount}`);
    console.log(`Form Submissions: ${formCount}`);
    
    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\n📝 Next Steps:');
    console.log('1. Update your .env file with the correct MongoDB connection string');
    console.log('2. Start your server with: npm start');
    console.log('3. Test user registration and login');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Connection Tips:');
      console.log('1. Check your MongoDB Atlas connection string in .env');
      console.log('2. Ensure your IP is whitelisted in MongoDB Atlas');
      console.log('3. Verify your username and password are correct');
      console.log('4. Make sure your cluster is running');
    }
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit();
  }
};

// Run the initialization
initializeDatabase();

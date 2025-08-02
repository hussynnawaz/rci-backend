import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod;

export const connectTestDB = async () => {
  try {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    
    console.log('📊 Starting in-memory MongoDB for development...');
    console.log(`📍 Database URI: ${uri}`);
    
    await mongoose.connect(uri);
    console.log('✅ Connected to in-memory MongoDB');
    
    return uri;
  } catch (error) {
    console.error('❌ Failed to start in-memory MongoDB:', error);
    throw error;
  }
};

export const disconnectTestDB = async () => {
  try {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (mongod) {
      await mongod.stop();
    }
    console.log('🔌 Disconnected from in-memory MongoDB');
  } catch (error) {
    console.error('❌ Error disconnecting from test DB:', error);
  }
};

// If running this file directly
if (import.meta.url === `file://${process.argv[1]}`) {
  connectTestDB()
    .then((uri) => {
      console.log(`\n🎉 Development database is ready!`);
      console.log(`📋 Copy this URI to your .env file:`);
      console.log(`MONGODB_URI=${uri}`);
      console.log(`\n⚠️  This is a temporary database for development only.`);
      console.log(`📝 For production, use your MongoDB Atlas connection string.`);
    })
    .catch(console.error);
}

import 'dotenv/config';
import mongoose from 'mongoose';
import FormSubmission from './models/FormSubmission.js';
import User from './models/User.js';

async function testDatabaseAndFormSubmission() {
  console.log('=== DATABASE & FORM SUBMISSION TEST ===');

  // Test 1: Database Connection
  console.log('\n🔗 Test 1: Connecting to database...');
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    return;
  }

  // Test 2: Create a test user
  console.log('\n👤 Test 2: Creating a test user...');
  let testUser;
  try {
    testUser = await User.create({
      firstName: 'Test',
      lastName: 'User',
      email: `test-${Date.now()}@example.com`,
      password: 'password123'
    });
    console.log('✅ Test user created:', testUser._id);
  } catch (error) {
    console.log('❌ Test user creation failed:', error.message);
  }

  // Test 3: Create a test form submission
  console.log('\n📝 Test 3: Creating a test form submission...');
  try {
    const submissionData = {
      user: testUser._id,
      // Personal information (required)
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      email: testUser.email,
      // Service details (using valid enum values)
      serviceType: 'custom_printing',
      quantity: 1,
      urgency: 'standard',
      // Files
      files: [
        {
          originalName: 'test-file.txt',
          fileName: 'test-file.txt',
          ftpPath: '/test/path/test-file.txt',
          mimeType: 'text/plain',
          size: 1234
        }
      ]
    };
    
    const submission = await FormSubmission.create(submissionData);
    console.log('✅ Test form submission created:', submission._id);
  } catch (error) {
    console.log('❌ Test form submission creation failed:', error.message);
  }
  
  // Test 4: Find form submissions
  console.log('\n📂 Test 4: Finding form submissions...');
  try {
    const submissions = await FormSubmission.find({ user: testUser._id });
    console.log(`✅ Found ${submissions.length} form submissions`);
    
    if (submissions.length > 0) {
      console.log('📝 Latest submission:', submissions[0]);
    }
    
  } catch (error) {
    console.log('❌ Failed to find form submissions:', error.message);
  }

  // Clean up test data
  console.log('\n🧹 Test 5: Cleaning up test data...');
  try {
    if (testUser) {
      await User.findByIdAndDelete(testUser._id);
      console.log('✅ Deleted test user');
    }
    
    await FormSubmission.deleteMany({ serviceType: 'custom_printing', user: testUser._id });
    console.log('✅ Deleted test form submissions');
    
  } catch (error) {
    console.log('⚠️ Cleanup failed:', error.message);
  }

  await mongoose.connection.close();
  console.log('\n✅ Database test completed!');
}

testDatabaseAndFormSubmission();

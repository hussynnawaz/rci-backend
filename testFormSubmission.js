import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import http from 'http';

// Start a test server to simulate form submission
const app = express();
app.use(cors());
app.use(express.json());

// Create test files
function createTestFiles() {
  const testFiles = [];
  const tempDir = './uploads/temp';
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Create test images
  for (let i = 1; i <= 3; i++) {
    const fileName = `test-image-${i}.txt`;
    const filePath = path.join(tempDir, fileName);
    const content = `This is test file ${i} created at ${new Date().toISOString()}\nContent for testing FTP upload functionality.`;
    
    fs.writeFileSync(filePath, content);
    testFiles.push({
      name: fileName,
      path: filePath,
      size: fs.statSync(filePath).size
    });
  }
  
  return testFiles;
}

async function testFormSubmission() {
  console.log('=== FORM SUBMISSION TEST ===');
  
  try {
    // Create test files
    console.log('\n1. Creating test files...');
    const testFiles = createTestFiles();
    console.log(`✅ Created ${testFiles.length} test files:`);
    testFiles.forEach(file => {
      console.log(`   📄 ${file.name} (${file.size} bytes)`);
    });

    // Prepare form data
    console.log('\n2. Preparing form submission...');
    const formData = new FormData();
    
    // Add form fields
    formData.append('serviceType', 'printing');
    formData.append('quantity', '100');
    formData.append('paperType', 'A4');
    formData.append('size', 'standard');
    formData.append('color', 'full-color');
    formData.append('sides', 'double');
    formData.append('finishing', 'none');
    formData.append('urgency', 'standard');
    formData.append('specialInstructions', 'This is a test submission from automated script');

    // Add files
    testFiles.forEach((file, index) => {
      const fileStream = fs.createReadStream(file.path);
      formData.append('files', fileStream, {
        filename: file.name,
        contentType: 'text/plain' // Simulating file upload
      });
    });

    console.log('✅ Form data prepared');

    // You'll need to get an auth token first
    console.log('\n3. Authentication required...');
    console.log('❗ Please make sure you have a valid JWT token for testing');
    console.log('❗ You can get one by logging in through your frontend first');
    console.log('❗ Then update this script with the token');
    
    // For now, let's just simulate the form data structure
    const simulatedFormSubmission = {
      serviceType: 'printing',
      quantity: 100,
      paperType: 'A4',
      size: 'standard',
      color: 'full-color',
      sides: 'double',
      finishing: 'none',
      urgency: 'standard',
      specialInstructions: 'Test submission',
      files: testFiles
    };

    console.log('\n📋 Simulated form submission data:');
    console.log(JSON.stringify(simulatedFormSubmission, null, 2));

    console.log('\n4. Manual testing instructions:');
    console.log('   1. Start your backend server: npm start');
    console.log('   2. Open your frontend application');
    console.log('   3. Login with a valid user account');
    console.log('   4. Go to the form submission page');
    console.log('   5. Fill out the form and upload 1-3 files');
    console.log('   6. Submit the form');
    console.log('   7. Check the backend console logs for detailed debug info');
    console.log('   8. Check FTP server for uploaded files');

    // Clean up test files
    console.log('\n5. Cleaning up test files...');
    testFiles.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
        console.log(`   🗑️ Deleted: ${file.name}`);
      }
    });

    console.log('\n✅ Test preparation completed!');
    console.log('\n🔧 Next steps:');
    console.log('   1. Use the enhanced logging in forms.js to debug');
    console.log('   2. Watch the backend console during form submission');
    console.log('   3. Check for any upload errors in the logs');
    console.log('   4. Verify files appear on FTP server after submission');

  } catch (error) {
    console.error('\n❌ Test preparation failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Function to check backend status
async function checkBackendStatus() {
  try {
    console.log('\n🔍 Checking backend status...');
    
    // Check if backend is running
    const response = await fetch('http://localhost:5000/api/forms/test', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend is running:', data.message);
      return true;
    } else {
      console.log('❌ Backend is not responding properly');
      return false;
    }
  } catch (error) {
    console.log('❌ Backend is not running or not accessible');
    console.log('   Please start your backend server with: npm start');
    return false;
  }
}

async function main() {
  await checkBackendStatus();
  await testFormSubmission();
}

main();

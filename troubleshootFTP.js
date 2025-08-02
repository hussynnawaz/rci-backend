import 'dotenv/config';
import { Client } from 'basic-ftp';

async function troubleshootFTPConnection() {
  console.log('=== FTP CONNECTION TROUBLESHOOTING ===');
  
  const ftpConfig = {
    host: process.env.FTP_HOST,
    user: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
    port: parseInt(process.env.FTP_PORT) || 21
  };
  
  console.log(`\n🔧 Testing connection to: ${ftpConfig.host}:${ftpConfig.port}`);
  console.log(`👤 User: ${ftpConfig.user}`);
  
  // Test 1: Basic connection test
  console.log('\n📡 Test 1: Basic Connection...');
  let client1 = new Client();
  try {
    client1.ftp.timeout = 10000; // 10 second timeout
    await client1.access(ftpConfig);
    console.log('✅ Basic connection successful');
    
    // Try a simple command
    try {
      const response = await client1.send('PWD');
      console.log('✅ PWD command successful:', response.message);
    } catch (pwdError) {
      console.log('❌ PWD command failed:', pwdError.message);
    }
    
    client1.close();
  } catch (error) {
    console.log('❌ Basic connection failed:', error.message);
    client1.close();
  }
  
  // Test 2: Connection with verbose logging
  console.log('\n📡 Test 2: Verbose Connection...');
  let client2 = new Client();
  try {
    client2.ftp.verbose = true; // Enable verbose logging
    client2.ftp.timeout = 15000; // 15 second timeout
    
    await client2.access(ftpConfig);
    console.log('✅ Verbose connection successful');
    
    // Try to list root directory
    try {
      console.log('📂 Attempting to list root directory...');
      const files = await client2.list('/');
      console.log('✅ Directory listing successful');
      console.log(`📊 Found ${files.length} items in root directory`);
      
      if (files.length > 0) {
        console.log('📁 Root directory contents:');
        files.slice(0, 5).forEach(file => {
          console.log(`   ${file.type === 1 ? '📄' : '📁'} ${file.name} (${file.size || 'dir'} bytes)`);
        });
      }
    } catch (listError) {
      console.log('❌ Directory listing failed:', listError.message);
      
      // Check if it's a passive mode issue
      if (listError.message.includes('passive mode') || listError.message.includes('ETIMEDOUT')) {
        console.log('🔍 This appears to be a passive mode connectivity issue');
        console.log('💡 Possible solutions:');
        console.log('   • FTP server firewall blocking passive mode ports');
        console.log('   • NAT/Router configuration issue');
        console.log('   • ISP blocking FTP passive mode');
        console.log('   • Try using active mode (if supported)');
      }
    }
    
    client2.close();
  } catch (error) {
    console.log('❌ Verbose connection failed:', error.message);
    client2.close();
  }
  
  // Test 3: Alternative port test
  console.log('\n📡 Test 3: Alternative Configuration...');
  let client3 = new Client();
  try {
    // Try with different timeout and settings
    client3.ftp.timeout = 30000; // 30 second timeout
    client3.ftp.verbose = false;
    
    const altConfig = {
      ...ftpConfig,
      secure: false,
      // Add any other configuration options
    };
    
    await client3.access(altConfig);
    console.log('✅ Alternative configuration successful');
    
    // Try binary mode
    try {
      await client3.send('TYPE I');
      console.log('✅ Binary mode set successfully');
    } catch (typeError) {
      console.log('⚠️ Could not set binary mode:', typeError.message);
    }
    
    // Try to check current directory
    try {
      const pwdResponse = await client3.send('PWD');
      console.log('✅ Current directory:', pwdResponse.message);
    } catch (pwdError) {
      console.log('❌ PWD failed:', pwdError.message);
    }
    
    client3.close();
  } catch (error) {
    console.log('❌ Alternative configuration failed:', error.message);
    client3.close();
  }
  
  // Test 4: Upload test (if basic connection works)
  console.log('\n📡 Test 4: Upload Test...');
  let client4 = new Client();
  try {
    await client4.access(ftpConfig);
    console.log('✅ Connected for upload test');
    
    // Create a small test file
    const testContent = `FTP Test File\nCreated: ${new Date().toISOString()}\nConnection troubleshooting test`;
    const testFileName = 'uploads/temp/ftp-test.txt';
    
    // Ensure directory exists
    const fs = await import('fs');
    if (!fs.default.existsSync('uploads/temp')) {
      fs.default.mkdirSync('uploads/temp', { recursive: true });
    }
    
    fs.default.writeFileSync(testFileName, testContent);
    console.log('📝 Created test file:', testFileName);
    
    // Try to upload
    try {
      const remotePath = '/test-upload.txt';
      await client4.uploadFrom(testFileName, remotePath);
      console.log('✅ Test file uploaded successfully');
      
      // Try to delete the test file
      try {
        await client4.remove(remotePath);
        console.log('✅ Test file deleted successfully');
      } catch (deleteError) {
        console.log('⚠️ Could not delete test file:', deleteError.message);
      }
      
    } catch (uploadError) {
      console.log('❌ Test file upload failed:', uploadError.message);
    }
    
    // Clean up local test file
    fs.default.unlinkSync(testFileName);
    console.log('🧹 Cleaned up local test file');
    
    client4.close();
  } catch (error) {
    console.log('❌ Upload test connection failed:', error.message);
    client4.close();
  }
  
  // Summary and recommendations
  console.log('\n📋 SUMMARY & RECOMMENDATIONS:');
  console.log('\n🔍 If you see "passive mode" or "ETIMEDOUT" errors:');
  console.log('   1. Contact your hosting provider about FTP passive mode');
  console.log('   2. Ask them to configure passive mode port range');
  console.log('   3. Ensure firewall allows FTP data connections');
  console.log('   4. Consider using SFTP instead of FTP if available');
  
  console.log('\n💡 Alternative Solutions:');
  console.log('   1. Use FTP in active mode (less secure, rarely supported)');
  console.log('   2. Switch to SFTP (SSH File Transfer Protocol)');
  console.log('   3. Use a different file upload method (direct HTTP upload)');
  console.log('   4. Use a cloud storage service (AWS S3, etc.)');
  
  console.log('\n🛠️ For immediate fix:');
  console.log('   1. Contact your FTP hosting provider');
  console.log('   2. Ask them to whitelist your IP for passive mode');
  console.log('   3. Request passive mode port range configuration');
  console.log('   4. Test with a different FTP client (FileZilla) first');
  
  console.log('\n✅ Troubleshooting completed!');
}

troubleshootFTPConnection().catch(error => {
  console.error('Troubleshooting script failed:', error.message);
});

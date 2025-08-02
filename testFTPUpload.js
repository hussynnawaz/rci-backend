import 'dotenv/config';
import ftpClient, { generateRemoteFilePath } from './utils/ftpClient.js';
import fs from 'fs';
import path from 'path';

async function testFTPUpload() {
  console.log('=== FTP UPLOAD TEST ===');

  try {
    // Test connection
    console.log('\n1. Testing FTP connection...');
    const connected = await ftpClient.checkConnection();
    if (!connected) {
      console.error('❌ FTP connection failed');
      return;
    }
    console.log('✅ FTP connection successful');

    // Create a test file
    console.log('\n2. Creating test file...');
    const testFilePath = './uploads/temp/test-upload.txt';
    const testContent = `Test file created at ${new Date().toISOString()}\nThis is a test upload to verify FTP functionality.`;
    
    // Ensure temp directory exists
    const tempDir = path.dirname(testFilePath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log(`✅ Created directory: ${tempDir}`);
    }
    
    fs.writeFileSync(testFilePath, testContent);
    console.log(`✅ Test file created: ${testFilePath}`);
    console.log(`📄 File size: ${fs.statSync(testFilePath).size} bytes`);

    // Test upload
    console.log('\n3. Testing file upload...');
    const testUserId = '688943dfbd6d82efbcae240e'; // Use existing user from FTP test
    const testSubmissionId = `test_${Date.now()}`;
    const remotePath = generateRemoteFilePath(testUserId, testSubmissionId, 'test-upload.txt');
    
    console.log(`📤 Uploading to: ${remotePath}`);
    
    const uploadResult = await ftpClient.uploadFile(testFilePath, remotePath);
    console.log('✅ Upload successful:', uploadResult);

    // Verify upload by listing directory
    console.log('\n4. Verifying upload...');
    const remoteDir = path.dirname(remotePath).replace(/\\/g, '/');
    const filesInDir = await ftpClient.listFiles(remoteDir);
    console.log(`📁 Files in ${remoteDir}:`, filesInDir);

    const uploadedFile = filesInDir.find(f => f.name === 'test-upload.txt');
    if (uploadedFile) {
      console.log('✅ File found in directory:', uploadedFile);
      if (uploadedFile.size === fs.statSync(testFilePath).size) {
        console.log('✅ File size matches local file');
      } else {
        console.log('⚠️ File size mismatch!');
        console.log(`Local: ${fs.statSync(testFilePath).size}, Remote: ${uploadedFile.size}`);
      }
    } else {
      console.log('❌ File not found in directory listing!');
    }

    // Test multiple file upload
    console.log('\n5. Testing multiple file upload...');
    const multipleFiles = [];
    for (let i = 1; i <= 3; i++) {
      const filePath = `./uploads/temp/test-multi-${i}.txt`;
      const content = `Multi-file test ${i} created at ${new Date().toISOString()}`;
      fs.writeFileSync(filePath, content);
      
      multipleFiles.push({
        localPath: filePath,
        remotePath: generateRemoteFilePath(testUserId, `multi_test_${Date.now()}`, `test-multi-${i}.txt`)
      });
    }

    const multiUploadResult = await ftpClient.uploadMultipleFiles(multipleFiles);
    console.log('📊 Multiple upload results:', {
      total: multiUploadResult.totalFiles,
      successful: multiUploadResult.successCount,
      failed: multiUploadResult.failureCount
    });

    if (multiUploadResult.failureCount > 0) {
      console.log('❌ Failed uploads:', multiUploadResult.failed);
    }

    // Clean up test files
    console.log('\n6. Cleaning up...');
    fs.unlinkSync(testFilePath);
    multipleFiles.forEach(file => {
      if (fs.existsSync(file.localPath)) {
        fs.unlinkSync(file.localPath);
      }
    });
    console.log('✅ Local test files cleaned up');

    await ftpClient.disconnect();
    console.log('\n✅ FTP upload test completed successfully!');

  } catch (error) {
    console.error('\n❌ FTP upload test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testFTPUpload();

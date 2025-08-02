import 'dotenv/config';
import ftpClient from './utils/ftpClient.js';
import FormSubmission from './models/FormSubmission.js';
import mongoose from 'mongoose';

async function diagnoseFTPIssues() {
  console.log('=== FTP DIAGNOSIS TOOL ===');

  try {
    // Connect to database
    console.log('\n1. Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected');

    // Connect to FTP
    console.log('\n2. Connecting to FTP...');
    const connected = await ftpClient.checkConnection();
    if (!connected) {
      console.error('❌ FTP connection failed');
      return;
    }
    console.log('✅ FTP connected');

    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    console.log(`\n3. Analyzing uploads for ${today}...`);

    // List today's FTP directories
    const todayPath = `/uploads/${today}`;
    let todayDirs = [];
    try {
      todayDirs = await ftpClient.listFiles(todayPath);
      console.log(`📁 Found ${todayDirs.length} user directories in ${todayPath}`);
    } catch (error) {
      console.log(`❌ Could not list ${todayPath}: ${error.message}`);
      return;
    }

    // Check each user directory
    for (const userDir of todayDirs.filter(d => d.type === 'directory')) {
      console.log(`\n📂 Checking user directory: ${userDir.name}`);
      
      const userPath = `${todayPath}/${userDir.name}`;
      const submissionDirs = await ftpClient.listFiles(userPath);
      
      console.log(`  📊 Found ${submissionDirs.length} submission directories`);
      
      // Check each submission directory
      for (const submissionDir of submissionDirs.filter(d => d.type === 'directory')) {
        const submissionPath = `${userPath}/${submissionDir.name}`;
        const files = await ftpClient.listFiles(submissionPath);
        
        const fileCount = files.filter(f => f.type === 'file').length;
        
        if (fileCount === 0) {
          console.log(`  ❌ EMPTY: ${submissionDir.name} (created: ${submissionDir.modifiedAt})`);
          
          // Check database for this submission
          const submissionTimestamp = submissionDir.name.replace('submission_', '');
          const submissionTime = new Date(parseInt(submissionTimestamp));
          
          const dbSubmission = await FormSubmission.findOne({
            submittedAt: { 
              $gte: new Date(submissionDir.modifiedAt.getTime() - 300000), // 5 minutes before
              $lte: new Date(submissionDir.modifiedAt.getTime() + 300000)  // 5 minutes after
            }
          });
          
          if (dbSubmission) {
            console.log(`    📄 Found DB record:`, {
              id: dbSubmission._id,
              user: dbSubmission.user,
              filesCount: dbSubmission.files?.length || 0,
              status: dbSubmission.status,
              submittedAt: dbSubmission.submittedAt
            });
            
            if (dbSubmission.files && dbSubmission.files.length > 0) {
              console.log(`    📂 Expected files:`, dbSubmission.files.map(f => ({
                name: f.originalName,
                size: f.size,
                ftpPath: f.ftpPath
              })));
            }
          } else {
            console.log(`    ❓ No matching DB record found`);
          }
        } else {
          console.log(`  ✅ OK: ${submissionDir.name} (${fileCount} files)`);
        }
      }
    }

    // Check for recent form submissions without FTP files
    console.log(`\n4. Checking recent database submissions...`);
    const recentSubmissions = await FormSubmission.find({
      submittedAt: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    }).sort({ submittedAt: -1 }).limit(10);

    console.log(`📊 Found ${recentSubmissions.length} recent submissions`);

    for (const submission of recentSubmissions) {
      console.log(`\n📄 Submission ${submission._id}:`);
      console.log(`  👤 User: ${submission.user}`);
      console.log(`  📅 Submitted: ${submission.submittedAt}`);
      console.log(`  📁 Files in DB: ${submission.files?.length || 0}`);
      
      if (submission.files && submission.files.length > 0) {
        for (const file of submission.files) {
          if (file.ftpPath) {
            try {
              // Check if file exists on FTP
              const remoteDir = file.ftpPath.substring(0, file.ftpPath.lastIndexOf('/'));
              const filesInDir = await ftpClient.listFiles(remoteDir);
              const fileName = file.ftpPath.split('/').pop();
              const ftpFile = filesInDir.find(f => f.name === fileName);
              
              if (ftpFile) {
                console.log(`    ✅ ${file.originalName} (${ftpFile.size} bytes)`);
              } else {
                console.log(`    ❌ MISSING: ${file.originalName} at ${file.ftpPath}`);
              }
            } catch (error) {
              console.log(`    ❌ ERROR checking ${file.originalName}: ${error.message}`);
            }
          }
        }
      }
    }

    await ftpClient.disconnect();
    await mongoose.connection.close();
    console.log('\n✅ Diagnosis completed');

  } catch (error) {
    console.error('\n❌ Diagnosis failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

diagnoseFTPIssues();

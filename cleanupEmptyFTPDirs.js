import 'dotenv/config';
import ftpClient from './utils/ftpClient.js';

async function cleanupEmptyFTPDirectories() {
  console.log('=== FTP CLEANUP TOOL ===');

  try {
    console.log('\n🔌 Connecting to FTP...');
    const connected = await ftpClient.checkConnection();
    if (!connected) {
      console.error('❌ FTP connection failed');
      return;
    }
    console.log('✅ FTP connected');

    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    console.log(`\n🗓️ Checking uploads for ${today}...`);

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

    let totalEmptyDirs = 0;
    let cleanedDirs = 0;

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
          totalEmptyDirs++;
          console.log(`  🗑️ EMPTY: ${submissionDir.name} (created: ${submissionDir.modifiedAt})`);
          
          // Ask user if they want to delete empty directories
          try {
            console.log(`    🗑️ Removing empty directory: ${submissionPath}`);
            await ftpClient.client.removeDir(submissionPath);
            cleanedDirs++;
            console.log(`    ✅ Removed: ${submissionPath}`);
          } catch (deleteError) {
            console.log(`    ❌ Failed to remove ${submissionPath}: ${deleteError.message}`);
          }
        }
      }
    }

    console.log(`\n📊 Cleanup Summary:`);
    console.log(`   Empty directories found: ${totalEmptyDirs}`);
    console.log(`   Directories cleaned: ${cleanedDirs}`);
    
    if (cleanedDirs > 0) {
      console.log(`✅ Cleanup completed successfully!`);
    } else if (totalEmptyDirs === 0) {
      console.log(`✅ No empty directories found. Everything looks good!`);
    } else {
      console.log(`⚠️ Some directories could not be cleaned.`);
    }

    await ftpClient.disconnect();

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

cleanupEmptyFTPDirectories();

import dotenv from 'dotenv';
import ftpClient from './utils/ftpClient.js';

dotenv.config();

async function testFTP() {
    try {
        console.log('Testing FTP connection...');
        
        // Test connection
        const connected = await ftpClient.checkConnection();
        console.log('Connection successful:', connected);
        
        // List root directory
        console.log('\nListing root directory:');
        const rootFiles = await ftpClient.listFiles('/');
        console.log('Root files:', rootFiles);
        
        // List uploads directory
        console.log('\nListing uploads directory:');
        try {
            const uploadsFiles = await ftpClient.listFiles('/uploads');
            console.log('Uploads files:', uploadsFiles);
        } catch (error) {
            console.log('Uploads directory not found or empty:', error.message);
        }
        
        // List today's uploads
        const today = new Date().toISOString().split('T')[0];
        console.log(`\nListing today's uploads (${today}):`);
        try {
            const todayFiles = await ftpClient.listFiles(`/uploads/${today}`);
            console.log('Today files:', todayFiles);
            
            // Check user directory
            const userId = '688943dfbd6d82efbcae240e';
            console.log(`\nListing user directory (${userId}):`);
            const userFiles = await ftpClient.listFiles(`/uploads/${today}/${userId}`);
            console.log('User files:', userFiles);
            
            // Check each submission directory
            for (const file of userFiles) {
                if (file.type === 'directory') {
                    console.log(`\nListing submission directory (${file.name}):`);
                    try {
                        const submissionFiles = await ftpClient.listFiles(`/uploads/${today}/${userId}/${file.name}`);
                        console.log('Submission files:', submissionFiles);
                    } catch (error) {
                        console.log('Error listing submission:', error.message);
                    }
                }
            }
        } catch (error) {
            console.log('Today directory not found or empty:', error.message);
        }
        
        await ftpClient.disconnect();
        console.log('\nFTP test completed.');
        
    } catch (error) {
        console.error('FTP test failed:', error.message);
    }
}

testFTP();

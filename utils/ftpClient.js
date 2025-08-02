import { Client } from 'basic-ftp';
import fs from 'fs';
import path from 'path';

class FTPClient {
  constructor() {
    this.client = new Client();
    this.isConnected = false;
  }

  async connect() {
    try {
      if (this.isConnected) {
        return true;
      }

      // Add verbose logging for debugging
      this.client.ftp.verbose = false; // Set to true for detailed FTP logs
      
      // Configure FTP client for better compatibility
      this.client.ftp.timeout = 30000; // 30 second timeout
      
      await this.client.access({
        host: process.env.FTP_HOST,
        user: process.env.FTP_USER,
        password: process.env.FTP_PASSWORD,
        port: parseInt(process.env.FTP_PORT) || 21,
        secure: false // Set to true if using FTPS
      });
      
      // Try to set passive mode explicitly
      try {
        await this.client.send('TYPE I'); // Binary mode
        console.log('✅ Set binary transfer mode');
      } catch (typeError) {
        console.warn('⚠️ Could not set binary mode:', typeError.message);
      }

      this.isConnected = true;
      console.log('✅ Connected to FTP server');
      return true;
    } catch (error) {
      console.error('❌ FTP connection failed:', error.message);
      this.isConnected = false;
      
      // Try to reconnect once
      if (!error.message.includes('reconnect attempt')) {
        console.log('🔄 Attempting to reconnect...');
        this.client.close();
        this.client = new Client();
        try {
          await this.client.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASSWORD,
            port: parseInt(process.env.FTP_PORT) || 21,
            secure: false
          });
          this.isConnected = true;
          console.log('✅ Reconnected to FTP server');
          return true;
        } catch (reconnectError) {
          console.error('❌ Reconnection failed:', reconnectError.message);
          throw new Error(`FTP connection failed (reconnect attempt): ${reconnectError.message}`);
        }
      }
      
      throw new Error(`FTP connection failed: ${error.message}`);
    }
  }

  async disconnect() {
    try {
      if (this.isConnected) {
        this.client.close();
        this.isConnected = false;
        console.log('✅ Disconnected from FTP server');
      }
    } catch (error) {
      console.error('❌ FTP disconnect error:', error.message);
    }
  }

  async ensureDirectory(remotePath) {
    try {
      await this.client.ensureDir(remotePath);
      console.log(`✅ Directory ensured: ${remotePath}`);
    } catch (error) {
      console.error(`❌ Failed to ensure directory ${remotePath}:`, error.message);
      throw new Error(`Failed to create directory: ${error.message}`);
    }
  }

  async uploadFile(localFilePath, remoteFilePath) {
    try {
      console.log(`🔄 Starting upload: ${localFilePath} -> ${remoteFilePath}`);
      
      if (!this.isConnected) {
        console.log('🔌 Connecting to FTP server...');
        await this.connect();
      }

      // Check if local file exists
      if (!fs.existsSync(localFilePath)) {
        throw new Error(`Local file does not exist: ${localFilePath}`);
      }

      const fileStats = fs.statSync(localFilePath);
      console.log(`📄 Local file size: ${fileStats.size} bytes`);

      // Ensure the remote directory exists
      const remoteDir = path.dirname(remoteFilePath).replace(/\\/g, '/');
      console.log(`📁 Ensuring remote directory: ${remoteDir}`);
      await this.ensureDirectory(remoteDir);

      // Upload the file
      console.log(`⬆️ Uploading file...`);
      await this.client.uploadFrom(localFilePath, remoteFilePath);
      
      // Verify upload by checking file size
      try {
        const remoteSize = await this.client.size(remoteFilePath);
        console.log(`📄 Remote file size: ${remoteSize} bytes`);
        
        if (remoteSize !== fileStats.size) {
          throw new Error(`Upload verification failed: local size ${fileStats.size}, remote size ${remoteSize}`);
        }
      } catch (sizeError) {
        console.warn(`⚠️ Could not verify file size: ${sizeError.message}`);
      }
      
      console.log(`✅ File uploaded successfully: ${localFilePath} -> ${remoteFilePath}`);
      return {
        success: true,
        localPath: localFilePath,
        remotePath: remoteFilePath,
        size: fileStats.size
      };
    } catch (error) {
      console.error(`❌ File upload failed: ${localFilePath} -> ${remoteFilePath}`);
      console.error(`❌ Error details:`, error.message);
      console.error(`❌ Error stack:`, error.stack);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  async uploadMultipleFiles(files) {
    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const result = await this.uploadFile(file.localPath, file.remotePath);
        results.push(result);
      } catch (error) {
        errors.push({
          file: file.localPath,
          error: error.message
        });
      }
    }

    return {
      successful: results,
      failed: errors,
      totalFiles: files.length,
      successCount: results.length,
      failureCount: errors.length
    };
  }

  async downloadFile(remoteFilePath, localFilePath) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      await this.client.downloadTo(localFilePath, remoteFilePath);
      
      console.log(`✅ File downloaded: ${remoteFilePath} -> ${localFilePath}`);
      return {
        success: true,
        remotePath: remoteFilePath,
        localPath: localFilePath
      };
    } catch (error) {
      console.error(`❌ File download failed: ${remoteFilePath} -> ${localFilePath}`, error.message);
      throw new Error(`File download failed: ${error.message}`);
    }
  }

  async deleteFile(remoteFilePath) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      await this.client.remove(remoteFilePath);
      
      console.log(`✅ File deleted: ${remoteFilePath}`);
      return {
        success: true,
        deletedPath: remoteFilePath
      };
    } catch (error) {
      console.error(`❌ File deletion failed: ${remoteFilePath}`, error.message);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  async listFiles(remotePath = '/') {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const files = await this.client.list(remotePath);
      
      console.log(`✅ Listed files in: ${remotePath}`);
      return files.map(file => ({
        name: file.name,
        type: file.type === 1 ? 'file' : 'directory',
        size: file.size,
        modifiedAt: file.modifiedAt
      }));
    } catch (error) {
      console.error(`❌ Failed to list files in: ${remotePath}`, error.message);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  async checkConnection() {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      // Test connection by listing root directory
      await this.client.list('/');
      return true;
    } catch (error) {
      console.error('❌ FTP connection check failed:', error.message);
      return false;
    }
  }
}

// Create a singleton instance
const ftpClient = new FTPClient();

// Helper function to generate remote file path
export const generateRemoteFilePath = (userId, submissionId, originalFileName) => {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const sanitizedFileName = originalFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${process.env.UPLOAD_PATH || '/uploads'}/${timestamp}/${userId}/${submissionId}/${sanitizedFileName}`;
};

// Helper function to clean up local files after upload
export const cleanupLocalFiles = (filePaths) => {
  filePaths.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ Cleaned up local file: ${filePath}`);
      }
    } catch (error) {
      console.error(`❌ Failed to cleanup local file: ${filePath}`, error.message);
    }
  });
};

export default ftpClient;

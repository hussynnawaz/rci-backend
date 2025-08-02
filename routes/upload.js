import express from 'express';
import multer from 'multer';
import { asyncHandler } from '../middleware/errorHandler.js';
import { protect } from '../middleware/auth.js';
import ftpClient, { generateRemoteFilePath, cleanupLocalFiles } from '../utils/ftpClient.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/temp/'); // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB default
    files: parseInt(process.env.MAX_FILES_PER_FORM) || 10
  },
  fileFilter: function (req, file, cb) {
    // Allow only specific file types
    const allowedTypes = /pdf|jpeg|jpg|png|gif|doc|docx|txt/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, images, and document files are allowed!'));
    }
  }
});

// @desc    Upload files to FTP server
// @route   POST /api/upload
// @access  Private
router.post('/', protect, upload.array('files', 10), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No files uploaded'
    });
  }

  const submissionId = req.body.submissionId || `temp_${Date.now()}`;
  const uploadResults = [];
  const failedUploads = [];

  for (const file of req.files) {
    try {
      const remotePath = generateRemoteFilePath(req.user._id, submissionId, file.originalname);
      
      await ftpClient.uploadFile(file.path, remotePath);
      
      uploadResults.push({
        originalName: file.originalname,
        fileName: file.filename,
        ftpPath: remotePath,
        mimeType: file.mimetype,
        size: file.size,
        uploadedAt: new Date()
      });
    } catch (error) {
      failedUploads.push({
        originalName: file.originalname,
        error: error.message
      });
    }
  }

  // Clean up local files
  cleanupLocalFiles(req.files.map(file => file.path));

  if (failedUploads.length > 0) {
    return res.status(500).json({
      success: false,
      error: 'Some files failed to upload',
      failed: failedUploads,
      successful: uploadResults
    });
  }

  res.status(200).json({
    success: true,
    message: 'Files uploaded successfully',
    data: uploadResults
  });
}));

// @desc    Test FTP connection
// @route   GET /api/upload/test-ftp
// @access  Private
router.get('/test-ftp', protect, asyncHandler(async (req, res) => {
  try {
    const isConnected = await ftpClient.checkConnection();
    
    if (isConnected) {
      res.status(200).json({
        success: true,
        message: 'FTP connection successful'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'FTP connection failed'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

export default router;

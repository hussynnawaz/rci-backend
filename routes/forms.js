import express from 'express';
import multer from 'multer';
import OrderForm from '../models/OrderForm.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { protect } from '../middleware/auth.js';
import ftpClient, { generateRemoteFilePath, cleanupLocalFiles } from '../utils/ftpClient.js';

const router = express.Router();

// Multer file storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/temp/'); // temporary directory
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB
  },
  fileFilter(req, file, callback) {
    if (!file.originalname.match(/\.(pdf|jpeg|jpg|png|gif)$/)) {
      return callback(new Error('Please upload a valid file type (PDF, JPEG, PNG, etc.)'));
    }
    callback(null, true);
  }
}).array('files', parseInt(process.env.MAX_FILES_PER_FORM) || 10);

// @desc    Submit a new order
// @route   POST /api/forms
// @access  Private
router.post('/', protect, upload, asyncHandler(async (req, res) => {

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, error: 'At least one file must be uploaded' });
  }

  const { name, email, service, phone, orderCity, orderState, orderAddress, deliveryCity, deliveryState, deliveryAddress, message } = req.body;

  if (!name || !email || !service || !phone || !orderCity || !orderState || !orderAddress || !deliveryCity || !deliveryState || !deliveryAddress || !message) {
    return res.status(400).json({ success: false, error: 'All fields are required' });
  }

  const filesToUpload = req.files.map(file => ({
    localPath: file.path,
    remotePath: generateRemoteFilePath(req.user._id, `order_${Date.now()}`, file.originalname)
  }));

  const uploadedFiles = await ftpClient.uploadMultipleFiles(filesToUpload);

  if (uploadedFiles.failureCount > 0) {
    return res.status(500).json({
      success: false,
      error: 'Some files failed to upload.',
      failedFiles: uploadedFiles.failed
    });
  }

  const newOrder = await OrderForm.create({
    addedBy: req.user._id,
    name,
    email,
    service,
    phone,
    orderCity,
    orderState,
    orderAddress,
    deliveryCity,
    deliveryState,
    deliveryAddress,
    message,
    documents: uploadedFiles.successful.map(file => file.remotePath)
  });

  cleanupLocalFiles(req.files.map(file => file.path));

  res.status(201).json({
    success: true,
    message: 'Order submitted successfully',
    data: newOrder
  });
}));

// @desc    Get user's orders
// @route   GET /api/forms
// @access  Private
router.get('/', protect, asyncHandler(async (req, res) => {
  const orders = await OrderForm.find({ addedBy: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: orders });
}));

// @desc    Get a single order
// @route   GET /api/forms/:id
// @access  Private
router.get('/:id', protect, asyncHandler(async (req, res) => {
  const order = await OrderForm.findOne({ _id: req.params.id, addedBy: req.user._id });

  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  res.status(200).json({ success: true, data: order });
}));

export default router;

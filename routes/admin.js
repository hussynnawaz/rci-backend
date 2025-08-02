import express from 'express';
import fs from 'fs';
import { asyncHandler } from '../middleware/errorHandler.js';
import { protect, authorize } from '../middleware/auth.js';
import OrderForm from '../models/OrderForm.js';
import User from '../models/User.js';
import ftpClient from '../utils/ftpClient.js';

const router = express.Router();

// @desc    Get all orders for admin
// @route   GET /api/admin/forms
// @access  Private/Admin
router.get('/forms', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = {};

  // Add filters if provided
  if (req.query.service) {
    query.service = req.query.service;
  }

  const orders = await OrderForm.find(query)
    .populate('addedBy', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await OrderForm.countDocuments(query);

  res.status(200).json({
    success: true,
    data: orders,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total
    }
  });
}));

// @desc    Get single order details for admin
// @route   GET /api/admin/forms/:id
// @access  Private/Admin
router.get('/forms/:id', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const order = await OrderForm.findById(req.params.id)
    .populate('addedBy', 'firstName lastName email phone');

  if (!order) {
    return res.status(404).json({
      success: false,
      error: 'Order not found'
    });
  }

  res.status(200).json({
    success: true,
    data: order
  });
}));

// @desc    Download a file from FTP
// @route   GET /api/admin/files/download
// @access  Private/Admin
router.get('/files/download', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const { ftpPath } = req.query;

  if (!ftpPath) {
    return res.status(400).json({
      success: false,
      error: 'FTP path is required'
    });
  }

  const localFilePath = `/tmp/${Date.now()}_${ftpPath.split('/').pop()}`;

  await ftpClient.downloadFile(ftpPath, localFilePath);

  res.download(localFilePath, (err) => {
    if (err) {
      console.error('Download Error:', err);
    }

    // Clean up local file after download
    fs.unlink(localFilePath, (err) => {
      if (err) {
        console.error('Cleanup Error:', err);
      }
    });
  });
}));

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private/Admin
router.get('/dashboard/stats', protect, authorize('admin'), asyncHandler(async (req, res) => {
  // Get counts for different statuses
  const totalOrders = await OrderForm.countDocuments();

  // Get total users
  const totalUsers = await User.countDocuments({ role: 'user' });

  // Get recent submissions (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recentOrders = await OrderForm.countDocuments({
    createdAt: { $gte: weekAgo }
  });

  // Get service type breakdown
  const serviceStats = await OrderForm.aggregate([
    {
      $group: {
        _id: '$service',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalOrders,
      totalUsers,
      recentOrders,
      serviceStats
    }
  });
}));

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
router.get('/users', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const users = await User.find({ role: 'user' })
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await User.countDocuments({ role: 'user' });

  res.status(200).json({
    success: true,
    data: users,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total
    }
  });
}));


export default router;


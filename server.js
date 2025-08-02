import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Import routes
import authRoutes from './routes/auth.js';
import formRoutes from './routes/forms.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/upload.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'https://replicacopyindustries.com',
    'https://rci-frontend-main.vercel.app', // Canonical frontend URL (works for all deployments)
    'http://localhost:5173', // For development (Vite)
    'http://localhost:3000',  // For development (React)
    'http://localhost:3001'  // For development (alternative)
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());


// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    console.log('🔗 Attempting to connect to MongoDB...');
    
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });
    
    console.log('✅ Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('💡 Tips:');
    console.log('   1. Check if MongoDB is running locally');
    console.log('   2. Update MONGODB_URI in .env with your Atlas connection string');
    console.log('   3. For development, you can use: npm run dev-db');
    
    // Don't exit the process, let the server run without DB for now
    console.log('⚠️  Server starting without database connection...');
  }
};

connectDB();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'RCI Backend Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Replica Copy Industries Backend API',
    version: '1.0.0',
    endpoints: {
      auth: {
        base: '/api/auth',
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        profile: 'GET /api/auth/me',
        updateProfile: 'PUT /api/auth/profile',
        updatePassword: 'PUT /api/auth/updatepassword',
        deleteAccount: 'DELETE /api/auth/account',
        checkEmail: 'POST /api/auth/check-email'
      },
      forms: {
        base: '/api/forms',
        submit: 'POST /api/forms',
        getAll: 'GET /api/forms',
        getById: 'GET /api/forms/:id'
      },
      admin: {
        base: '/api/admin',
        forms: 'GET /api/admin/forms',
        formById: 'GET /api/admin/forms/:id',
        downloadFiles: 'GET /api/admin/files/download',
        dashboardStats: 'GET /api/admin/dashboard/stats',
        users: 'GET /api/admin/users'
      },
      upload: {
        base: '/api/upload',
        uploadFiles: 'POST /api/upload',
        testFtp: 'GET /api/upload/test-ftp'
      },
      health: 'GET /health'
    }
  });
});

// Error handling middleware (should be last)
app.use(errorHandler);

// Handle 404 routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The route ${req.originalUrl} does not exist on this server`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 RCI Backend Server is running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'https://replicacopyindustries.com'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});

export default app;

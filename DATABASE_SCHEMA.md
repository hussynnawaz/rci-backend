# RCI Database Schema

## Database: `rci_database`

This document outlines the database structure for the Replica Copy Industries (RCI) project.

## Collections

### 1. `users` Collection

**Purpose**: Store user accounts and authentication data

**Schema**:
```javascript
{
  _id: ObjectId,
  firstName: String, // Required, 2-50 characters
  lastName: String,  // Required, 2-50 characters
  email: String,     // Required, unique, valid email format
  password: String,  // Required, hashed, min 6 characters
  phone: String,     // Optional, valid phone format
  company: String,   // Optional, max 100 characters
  role: String,      // Enum: ['user', 'admin'], default: 'user'
  isVerified: Boolean,    // Default: false
  isActive: Boolean,      // Default: true
  lastLogin: Date,        // Updated on successful login
  resetPasswordToken: String,     // For password reset
  resetPasswordExpire: Date,      // Token expiration
  verificationToken: String,      // For email verification
  verificationExpire: Date,       // Token expiration
  createdAt: Date,   // Auto-generated
  updatedAt: Date    // Auto-generated
}
```

**Indexes**:
- `email` (unique)
- `createdAt` (descending)
- `role`

**Sample Data**:
```javascript
{
  "_id": ObjectId("..."),
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "$2a$12$...",  // bcrypt hash
  "phone": "+1-555-123-4567",
  "company": "Law Firm ABC",
  "role": "user",
  "isVerified": false,
  "isActive": true,
  "createdAt": ISODate("2025-01-29T..."),
  "updatedAt": ISODate("2025-01-29T...")
}
```

### 2. `formsubmissions` Collection

**Purpose**: Store form submissions and order data from various forms

**Schema**:
```javascript
{
  _id: ObjectId,
  userId: ObjectId,          // Reference to users collection
  formType: String,          // Type of form submitted
  formData: {                // Dynamic object containing form fields
    // Content varies based on formType
    // Common fields might include:
    companyName: String,
    contactPerson: String,
    email: String,
    phone: String,
    serviceType: String,
    description: String,
    urgency: String,
    budget: Number,
    // ... other dynamic fields
  },
  files: [{                  // Array of uploaded files
    filename: String,        // Original filename
    storedFilename: String,  // Filename on server/FTP
    mimetype: String,        // File MIME type
    size: Number,            // File size in bytes
    uploadPath: String,      // Path where file is stored
    uploadedAt: Date
  }],
  status: String,            // Enum: ['pending', 'processing', 'completed', 'cancelled']
  priority: String,          // Enum: ['low', 'medium', 'high', 'urgent']
  assignedTo: ObjectId,      // Reference to admin user
  notes: [{                  // Admin notes
    note: String,
    addedBy: ObjectId,       // Reference to admin user
    addedAt: Date
  }],
  estimatedCost: Number,     // Estimated project cost
  actualCost: Number,        // Final project cost
  estimatedDelivery: Date,   // Expected completion date
  completedAt: Date,         // Actual completion date
  ftpUploaded: Boolean,      // Whether files were uploaded to FTP
  ftpPath: String,           // FTP path for uploaded files
  createdAt: Date,           // Auto-generated
  updatedAt: Date            // Auto-generated
}
```

**Indexes**:
- `userId`
- `formType`
- `status`
- `createdAt` (descending)
- `priority`

**Sample Data**:
```javascript
{
  "_id": ObjectId("..."),
  "userId": ObjectId("..."),
  "formType": "printing_order",
  "formData": {
    "companyName": "Smith & Associates",
    "contactPerson": "Jane Smith",
    "email": "jane@smithlaw.com",
    "phone": "555-987-6543",
    "serviceType": "Document Printing",
    "description": "Legal brief printing - 500 pages",
    "urgency": "high",
    "copies": 10,
    "paperType": "standard",
    "binding": "spiral"
  },
  "files": [
    {
      "filename": "legal_brief.pdf",
      "storedFilename": "1706563200000_legal_brief.pdf",
      "mimetype": "application/pdf",
      "size": 2048576,
      "uploadPath": "/uploads/printing/",
      "uploadedAt": ISODate("2025-01-29T...")
    }
  ],
  "status": "pending",
  "priority": "high",
  "ftpUploaded": false,
  "createdAt": ISODate("2025-01-29T..."),
  "updatedAt": ISODate("2025-01-29T...")
}
```

## Relationships

- `formsubmissions.userId` → `users._id` (Many-to-One)
- `formsubmissions.assignedTo` → `users._id` (Many-to-One)
- `formsubmissions.notes.addedBy` → `users._id` (Many-to-One)

## Default Admin User

The system creates a default admin user:
- **Email**: `admin@replicacopyindustries.com`
- **Password**: `admin123`
- **Role**: `admin`
- **Status**: Active and verified

## Security Features

1. **Password Hashing**: Uses bcrypt with salt rounds of 12
2. **JWT Tokens**: For authentication and authorization
3. **Input Validation**: Express-validator for request validation
4. **Rate Limiting**: Prevents brute force attacks
5. **CORS Protection**: Configured for specific origins

## File Storage

- **Local Storage**: Files uploaded to `/uploads` directory
- **FTP Integration**: Files can be transferred to external FTP server
- **File Metadata**: Stored in database with references to physical files

## Database Operations

### User Operations
- Registration with email verification
- Login with JWT token generation
- Password reset functionality
- Profile updates
- Admin user management

### Form Submission Operations
- Create new submissions with file uploads
- Update submission status
- Add admin notes
- File management and FTP uploads
- Search and filter submissions

## Environment Variables Required

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rci_database
DB_NAME=rci_database
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
ADMIN_EMAIL=admin@replicacopyindustries.com
ADMIN_PASSWORD=admin123
```

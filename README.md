# RCI Backend - Replica Copy Industries

A comprehensive backend API for Replica Copy Industries printing company management system.

## Features

- **User Authentication**: JWT-based authentication with signup/signin
- **Form Submissions**: Handle printing job requests with detailed specifications
- **File Upload**: Support for up to 10 files per submission with FTP storage
- **Admin Dashboard**: Complete admin interface for managing submissions
- **FTP Integration**: Automatic file upload to your FTP server
- **Security**: Rate limiting, CORS, helmet security headers

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud)
- FTP server access
- npm or yarn

## Installation

1. **Clone and setup:**
   ```bash
   cd rci-backend
   npm install
   ```

2. **Environment Configuration:**
   Copy `.env` file and update the following variables:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/rci_database
   
   # JWT
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
   
   # FTP (already configured for your server)
   FTP_HOST=ftp.replicacopyindustries.com
   FTP_USER=Webftp
   FTP_PASSWORD=-ug.l.wzkXCq>6oj
   
   # Frontend URL
   FRONTEND_URL=https://replicacopyindustries.com
   ```

3. **Create required directories:**
   ```bash
   mkdir -p uploads/temp
   ```

4. **Start the server:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `POST /logout` - User logout
- `GET /me` - Get current user
- `PUT /profile` - Update user profile
- `PUT /updatepassword` - Change password

### Forms (`/api/forms`)
- `POST /` - Submit new form with files
- `GET /` - Get user's submissions
- `GET /:id` - Get single submission
- `PUT /:id` - Update submission (if pending)
- `DELETE /:id` - Cancel submission

### Admin (`/api/admin`)
- `GET /forms` - Get all submissions
- `GET /forms/:id` - Get submission details
- `PUT /forms/:id/status` - Update submission status
- `POST /forms/:id/notes` - Add admin note
- `PUT /forms/:id/pricing` - Update pricing
- `GET /dashboard/stats` - Dashboard statistics
- `GET /users` - Get all users
- `GET /files/download` - Download files from FTP

### Upload (`/api/upload`)
- `POST /` - Upload files to FTP
- `GET /test-ftp` - Test FTP connection

## File Upload Specifications

- **Maximum files per form**: 10
- **Maximum file size**: 10MB per file
- **Supported formats**: PDF, JPEG, PNG, GIF, DOC, DOCX, TXT
- **Storage**: All files are stored on your FTP server at `ftp.replicacopyindustries.com`

## FTP File Structure

Files are organized on your FTP server as:
```
/uploads/
  └── YYYY-MM-DD/
      └── userId/
          └── submissionId/
              ├── file1.pdf
              ├── file2.jpg
              └── ...
```

## Admin Account Setup

To create an admin account, you can either:

1. **Register normally then update in database:**
   ```javascript
   // In MongoDB shell or database GUI
   db.users.updateOne(
     { email: "admin@replicacopyindustries.com" },
     { $set: { role: "admin" } }
   )
   ```

2. **Or create directly:**
   ```javascript
   // Create admin user in MongoDB
   db.users.insertOne({
     firstName: "Admin",
     lastName: "User",
     email: "admin@replicacopyindustries.com",
     password: "$2a$12$hashedPasswordHere", // Use bcrypt to hash
     role: "admin",
     isActive: true,
     createdAt: new Date()
   })
   ```

## Deployment

### Production Deployment Steps:

1. **Server Setup:**
   ```bash
   # Install Node.js and MongoDB
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs mongodb
   
   # Clone your backend
   git clone <your-repo-url> /var/www/rci-backend
   cd /var/www/rci-backend
   npm install --production
   ```

2. **Environment Variables:**
   ```bash
   # Create production .env file
   nano .env
   # Update all values for production
   ```

3. **Process Manager (PM2):**
   ```bash
   npm install -g pm2
   pm2 start server.js --name "rci-backend"
   pm2 startup
   pm2 save
   ```

4. **Nginx Reverse Proxy:**
   ```nginx
   server {
       listen 80;
       server_name api.replicacopyindustries.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## Frontend Integration

Your React frontend should make API calls to:
- **Development**: `http://localhost:5000/api/`
- **Production**: `https://api.replicacopyindustries.com/api/`

### Example API Usage:

```javascript
// User registration
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'password123'
  })
});

// Form submission with files
const formData = new FormData();
formData.append('serviceType', 'business_cards');
formData.append('quantity', '100');
files.forEach(file => formData.append('files', file));

const response = await fetch('/api/forms', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

## Support

For technical issues or questions, contact the development team.

## Security Notes

- Change the JWT_SECRET in production
- Use HTTPS in production
- Regularly update dependencies
- Monitor FTP server access logs
- Set up proper database backups

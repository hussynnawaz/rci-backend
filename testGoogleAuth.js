import 'dotenv/config';

console.log('=== GOOGLE OAUTH SETUP VERIFICATION ===');

console.log('\n📋 Current Environment Variables:');
console.log(`✅ Google Client ID: ${process.env.GOOGLE_CLIENT_ID ? 'Configured' : '❌ Missing'}`);
console.log(`✅ Google Client Secret: ${process.env.GOOGLE_CLIENT_SECRET ? 'Configured' : '❌ Missing'}`);
console.log(`✅ Google Callback URL: ${process.env.GOOGLE_CALLBACK_URL || 'Using default'}`);
console.log(`✅ Session Secret: ${process.env.SESSION_SECRET ? 'Configured' : '⚠️ Using default'}`);
console.log(`✅ Frontend URL: ${process.env.FRONTEND_URL}`);

console.log('\n🔗 Google OAuth URLs:');
console.log(`🚀 Initiate Login: http://localhost:3000/api/auth/google`);
console.log(`🔄 Callback URL: ${process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback'}`);
console.log(`📊 Status Check: http://localhost:3000/api/auth/google/status`);

console.log('\n📝 Setup Instructions:');

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.log('❌ Google OAuth credentials are missing!');
  console.log('\n🛠️ To set up Google OAuth:');
  console.log('1. Go to https://console.cloud.google.com/');
  console.log('2. Create a new project or select existing one');
  console.log('3. Go to "APIs & Services" > "Library"');
  console.log('4. Search for "Google+ API" and enable it');
  console.log('5. Go to "APIs & Services" > "Credentials"');
  console.log('6. Click "Create Credentials" > "OAuth 2.0 Client IDs"');
  console.log('7. Application type: "Web application"');
  console.log('8. Name: "RCI Backend Google Auth"');
  console.log('9. Authorized redirect URIs:');
  console.log('   - http://localhost:3000/api/auth/google/callback');
  console.log('   - https://replicacopyindustries.com/api/auth/google/callback');
  console.log('10. Copy the Client ID and Client Secret to your .env file');
  console.log('\n📝 Update your .env file:');
  console.log('GOOGLE_CLIENT_ID=your_actual_google_client_id_here');
  console.log('GOOGLE_CLIENT_SECRET=your_actual_google_client_secret_here');
} else {
  console.log('✅ Google OAuth credentials are configured!');
  console.log('\n🚀 Next Steps:');
  console.log('1. Start your backend server: npm start');
  console.log('2. Test the status endpoint: http://localhost:3000/api/auth/google/status');
  console.log('3. Test Google login: http://localhost:3000/api/auth/google');
  console.log('4. Update your frontend to use the Google OAuth flow');
}

console.log('\n🎨 Frontend Integration:');
console.log('Add this to your frontend login page:');
console.log(`<a href="http://localhost:3000/api/auth/google" class="google-signin-btn">`);
console.log('  Sign in with Google');
console.log('</a>');

console.log('\n🔧 Backend Routes Available:');
console.log('GET  /api/auth/google          - Initiate Google OAuth');
console.log('GET  /api/auth/google/callback - Handle OAuth callback');
console.log('GET  /api/auth/google/status   - Check OAuth status');

console.log('\n✅ Setup verification completed!');

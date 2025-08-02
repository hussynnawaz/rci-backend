// Cloudflare Workers entry point for Express app
export default {
  async fetch(request, env, ctx) {
    try {
      // Set environment variables from Workers environment
      if (env.DATABASE_URL) process.env.MONGODB_URI = env.DATABASE_URL;
      if (env.JWT_SECRET) process.env.JWT_SECRET = env.JWT_SECRET;
      if (env.FTP_HOST) process.env.FTP_HOST = env.FTP_HOST;
      if (env.FTP_USER) process.env.FTP_USER = env.FTP_USER;
      if (env.FTP_PASSWORD) process.env.FTP_PASSWORD = env.FTP_PASSWORD;
      if (env.FRONTEND_URL) process.env.FRONTEND_URL = env.FRONTEND_URL;

      // Parse the URL
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      // Health check endpoint
      if (path === '/health' && method === 'GET') {
        return new Response(JSON.stringify({
          status: 'OK',
          message: 'RCI Backend Server is running on Cloudflare Workers',
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Root endpoint
      if (path === '/' && method === 'GET') {
        return new Response(JSON.stringify({
          message: 'Welcome to Replica Copy Industries Backend API',
          version: '1.0.0',
          platform: 'Cloudflare Workers',
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
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Handle API routes - placeholder for now
      if (path.startsWith('/api/')) {
        // Extract body for POST/PUT requests
        let body = null;
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
          const contentType = request.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            body = await request.json();
          } else if (contentType.includes('application/x-www-form-urlencoded')) {
            const formData = await request.formData();
            body = Object.fromEntries(formData);
          } else {
            body = await request.text();
          }
        }

        // Basic CORS headers
        const corsHeaders = {
          'Access-Control-Allow-Origin': env.FRONTEND_URL || 'https://replicacopyindustries.com',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true'
        };

        // Handle CORS preflight
        if (method === 'OPTIONS') {
          return new Response(null, {
            status: 200,
            headers: corsHeaders
          });
        }

        // For now, return a message that the API is being migrated
        return new Response(JSON.stringify({ 
          message: 'API endpoints are being migrated to Cloudflare Workers',
          path: path,
          method: method,
          note: 'This is a work in progress. Full API functionality will be available soon.'
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // Default 404 response
      return new Response(JSON.stringify({ 
        error: 'Route not found',
        message: `The route ${path} does not exist on this server`
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal Server Error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

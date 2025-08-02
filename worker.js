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

      // Global CORS preflight handler
      if (method === 'OPTIONS') {
        const allowedOrigins = [
          env.FRONTEND_URL || 'https://replicacopyindustries.com',
          'https://rci-frontend-main.vercel.app',
          'http://localhost:5173',
          'http://localhost:3000',
          'http://localhost:3001'
        ];
        
        const origin = request.headers.get('Origin');
        const isAllowedOrigin = allowedOrigins.includes(origin) || 
                               (origin && origin.includes('rci-frontend-main') && origin.includes('vercel.app'));
        
        return new Response(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': isAllowedOrigin ? origin : 'https://rci-frontend-main.vercel.app',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie, X-Requested-With',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400'
          }
        });
      }

      // Health check endpoint
      if (path === '/health' && method === 'GET') {
        const corsHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        };
        
        return new Response(JSON.stringify({
          status: 'OK',
          message: 'RCI Backend Server is running on Cloudflare Workers',
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }), {
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // Root endpoint
      if (path === '/' && method === 'GET') {
        const corsHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        };
        
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
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // Handle API routes
      if (path.startsWith('/api/')) {
        // Extract body for POST/PUT requests
        let body = null;
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
          const contentType = request.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            try {
              body = await request.json();
            } catch (e) {
              body = null;
            }
          } else if (contentType.includes('application/x-www-form-urlencoded')) {
            const formData = await request.formData();
            body = Object.fromEntries(formData);
          } else {
            body = await request.text();
          }
        }

        // Enhanced CORS headers
        const allowedOrigins = [
          env.FRONTEND_URL || 'https://replicacopyindustries.com',
          'https://rci-frontend-main.vercel.app',
          'http://localhost:5173',
          'http://localhost:3000',
          'http://localhost:3001'
        ];
        
        const origin = request.headers.get('Origin');
        const isAllowedOrigin = allowedOrigins.includes(origin) || 
                               (origin && origin.includes('rci-frontend-main') && origin.includes('vercel.app'));
        
        const corsHeaders = {
          'Access-Control-Allow-Origin': isAllowedOrigin ? origin : 'https://rci-frontend-main.vercel.app',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie, X-Requested-With',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400'
        };

        // Handle CORS preflight
        if (method === 'OPTIONS') {
          return new Response(null, {
            status: 200,
            headers: corsHeaders
          });
        }

        // Handle specific API endpoints
        if (path === '/api/auth/login' && method === 'POST') {
          try {
            // Validate request body
            if (!body || !body.email || !body.password) {
              return new Response(JSON.stringify({ 
                success: false,
                error: 'Email and password are required'
              }), {
                status: 400,
                headers: { 
                  'Content-Type': 'application/json',
                  ...corsHeaders
                }
              });
            }

            // Basic email validation
            const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
            if (!emailRegex.test(body.email)) {
              return new Response(JSON.stringify({ 
                success: false,
                error: 'Please provide a valid email'
              }), {
                status: 400,
                headers: { 
                  'Content-Type': 'application/json',
                  ...corsHeaders
                }
              });
            }

            // TODO: Add database connectivity to validate user credentials
            // For now, return a message indicating what needs to be implemented
            return new Response(JSON.stringify({ 
              success: false,
              message: 'Login endpoint structure is ready',
              next_steps: [
                '1. Add MongoDB Atlas connection or D1 database',
                '2. Implement password hashing/comparison (bcrypt)',
                '3. Add JWT token generation',
                '4. Add user validation logic'
              ],
              received_data: {
                email: body.email,
                password_provided: !!body.password
              }
            }), {
              status: 501, // Not Implemented
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          } catch (error) {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Invalid request data',
              details: error.message
            }), {
              status: 400,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }
        }

        if (path === '/api/auth/register' && method === 'POST') {
          try {
            // Validate request body
            if (!body || !body.email || !body.password || !body.firstName || !body.lastName) {
              return new Response(JSON.stringify({ 
                success: false,
                error: 'Email, password, firstName, and lastName are required'
              }), {
                status: 400,
                headers: { 
                  'Content-Type': 'application/json',
                  ...corsHeaders
                }
              });
            }

            // Basic email validation
            const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
            if (!emailRegex.test(body.email)) {
              return new Response(JSON.stringify({ 
                success: false,
                error: 'Please provide a valid email'
              }), {
                status: 400,
                headers: { 
                  'Content-Type': 'application/json',
                  ...corsHeaders
                }
              });
            }

            // Password length validation
            if (body.password.length < 6) {
              return new Response(JSON.stringify({ 
                success: false,
                error: 'Password must be at least 6 characters'
              }), {
                status: 400,
                headers: { 
                  'Content-Type': 'application/json',
                  ...corsHeaders
                }
              });
            }

            // TODO: Add database connectivity to create user
            return new Response(JSON.stringify({ 
              success: false,
              message: 'Registration endpoint structure is ready',
              next_steps: [
                '1. Add MongoDB Atlas connection or D1 database',
                '2. Implement password hashing (bcrypt)',
                '3. Add user creation logic',
                '4. Add JWT token generation'
              ],
              received_data: {
                email: body.email,
                firstName: body.firstName,
                lastName: body.lastName,
                phone: body.phone,
                company: body.company,
                password_provided: !!body.password
              }
            }), {
              status: 501, // Not Implemented
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          } catch (error) {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Invalid request data',
              details: error.message
            }), {
              status: 400,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }
        }

        // For other API endpoints, return a generic response
        return new Response(JSON.stringify({ 
          success: false,
          message: 'API endpoints are being migrated to Cloudflare Workers',
          path: path,
          method: method,
          note: 'This endpoint is not yet implemented. Please add the logic to worker.js'
        }), {
          status: 501,
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

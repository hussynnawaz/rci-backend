// Cloudflare Workers entry point for Express app

const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + (env.JWT_SECRET || 'default_salt'));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const generateJWT = async (userId, env) => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    id: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60
  };

  const encode = (obj) => btoa(JSON.stringify(obj)).replace(/[+/]/g, c => c === '+' ? '-' : '_').replace(/=/g, '');
  const headerEncoded = encode(header);
  const payloadEncoded = encode(payload);
  const message = `${headerEncoded}.${payloadEncoded}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.JWT_SECRET || 'default_secret'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  const signatureEncoded = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/[+/]/g, c => c === '+' ? '-' : '_').replace(/=/g, '');

  return `${message}.${signatureEncoded}`;
};

const queryMongoDB = async (env, operation, collection, query = {}, document = null) => {
  const API_URL = `https://data.mongodb-api.com/app/data-api/endpoint/data/v1/action/${operation}`;
  const mongoUri = env.MONGODB_URI || env.DATABASE_URL;
  const clusterMatch = mongoUri.match(/@([^.]+)\.mongodb\.net/);
  const cluster = clusterMatch ? clusterMatch[1] : 'Cluster0';

  const requestBody = {
    dataSource: cluster,
    database: env.DB_NAME || 'test',
    collection,
    ...query
  };

  if (document) requestBody.document = document;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': env.MONGO_DATA_API_KEY
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) throw new Error(`MongoDB API error: ${response.statusText}`);
  return await response.json();
};

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      if (method === 'OPTIONS') {
        const allowedOrigins = [
          env.FRONTEND_URL || 'https://replicacopyindustries.com',
          'https://rci-frontend-main.vercel.app',
          'http://localhost:5173',
          'http://localhost:3000',
          'http://localhost:3001'
        ];
        const origin = request.headers.get('Origin');
        const isAllowedOrigin = allowedOrigins.includes(origin) || (origin?.includes('rci-frontend-main') && origin.includes('vercel.app'));

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

      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true'
      };

      if (path === '/health') {
        return new Response(JSON.stringify({
          status: 'OK',
          message: 'RCI Backend Server is running on Cloudflare Workers',
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      if (!path.startsWith('/api/')) {
        return new Response(JSON.stringify({
          error: 'Route not found',
          message: `The route ${path} does not exist on this server`
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

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

      if (path === '/api/auth/login' && method === 'POST') {
        if (!body?.email || !body?.password) {
          return new Response(JSON.stringify({ success: false, error: 'Email and password are required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const userResp = await queryMongoDB(env, 'findOne', 'users', {
          filter: { email: body.email }
        });

        const user = userResp.document;
        if (!user) {
          return new Response(JSON.stringify({ success: false, error: 'User not found' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const hashed = await hashPassword(body.password);
        if (user.password !== hashed) {
          return new Response(JSON.stringify({ success: false, error: 'Invalid credentials' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const token = await generateJWT(user._id, env);
        return new Response(JSON.stringify({
          success: true,
          message: 'Login successful',
          token,
          user: {
            id: user._id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      if (path === '/api/auth/register' && method === 'POST') {
        const { email, password, firstName, lastName } = body || {};
        if (!email || !password || !firstName || !lastName) {
          return new Response(JSON.stringify({ success: false, error: 'All fields are required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email)) {
          return new Response(JSON.stringify({ success: false, error: 'Invalid email format' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const checkUser = await queryMongoDB(env, 'findOne', 'users', {
          filter: { email }
        });

        if (checkUser.document) {
          return new Response(JSON.stringify({ success: false, error: 'Email already registered' }), {
            status: 409,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const hashedPassword = await hashPassword(password);
        const newUser = await queryMongoDB(env, 'insertOne', 'users', {}, {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          createdAt: new Date().toISOString()
        });

        const token = await generateJWT(newUser.insertedId, env);
        return new Response(JSON.stringify({
          success: true,
          message: 'Registration successful',
          token
        }), {
          status: 201,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      return new Response(JSON.stringify({
        success: false,
        message: 'This endpoint is not yet implemented',
        path,
        method
      }), {
        status: 501,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import userRoutes from './routes/user.routes';
import matchRoutes from './routes/match.routes';
import messageRoutes from './routes/message.routes';
import safetyRoutes from './routes/safety.routes';
import accountRoutes from './routes/account.routes';
import passRoutes from './routes/pass.routes';
import { initializeSocket } from './socket/socket';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// CORS configuration for multiple origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost',
  'https://localhost',
  'capacitor://localhost',
  // Website (the bare domain redirects to www). The old matchflix-frontend.vercel.app address is retired.
  'https://cinephileph.com',
  'https://www.cinephileph.com',
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

const io = new Server(httpServer, {
  cors: corsOptions,
});
// Lets HTTP handlers (e.g. sending a photo) broadcast over the socket: req.app.get('io')
app.set('io', io);

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/users', userRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/likes', matchRoutes); // Also mount match routes at /api/likes for convenience
app.use('/api/passes', passRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/safety', safetyRoutes);
app.use('/api/account', accountRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    name: 'MatchFlix API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      profile: '/api/profile',
      users: '/api/users',
      matches: '/api/matches',
      likes: '/api/likes',
      passes: '/api/passes',
      messages: '/api/messages'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MatchFlix API is running' });
});

// Initialize Socket.io
initializeSocket(io);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io server ready`);
});

export { io };

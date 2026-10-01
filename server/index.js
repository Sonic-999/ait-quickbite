import express from 'express';
import http from 'http';
import cors from 'cors';
import { seedDatabase } from './seed.js';
import apiRouter from './routes/api.js';
import { initSocketServer } from './socket.js';
import { seedRecentTrendingOrders, startTrendingBackgroundWorker } from './services/trendingService.js';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize and seed SQLite database
seedDatabase();
seedRecentTrendingOrders();

// Initialize Socket.IO WebSockets Server
initSocketServer(server);

// Start Trending Recommendation Background Worker (30s interval)
startTrendingBackgroundWorker(30000);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Request logger for debugging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.url.startsWith('/api') || req.url.startsWith('/menu') || req.url.startsWith('/checkout') || req.url.startsWith('/vendor')) {
      console.log(`[Express] ${req.method} ${req.url} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Mount Routes (supports both /api/* and root endpoints like /menu, /checkout, /vendor/orders)
app.use(apiRouter);

// Root fallback
app.get('/', (req, res) => {
  res.json({
    name: 'AIT QuickBite Full-Stack API Server',
    status: 'online',
    endpoints: [
      'GET /menu (or /api/menu)',
      'POST /checkout (or /api/checkout)',
      'GET /vendor/orders (or /api/vendor/orders)',
      'POST /vendor/orders (or /api/vendor/orders)',
      'GET /orders/:id (or /api/orders/:id)',
      'GET /health (or /api/health)',
    ],
  });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.url}` });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Express Server Error]', err);
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 AIT QuickBite Backend Server listening on port ${PORT}`);
  console.log(`   - WebSockets:       ws://localhost:${PORT}/socket.io`);
  console.log(`   - Menu Endpoint:    http://localhost:${PORT}/api/menu`);
  console.log(`   - Checkout:         http://localhost:${PORT}/api/checkout`);
  console.log(`   - Vendor Orders:    http://localhost:${PORT}/api/vendor/orders`);
  console.log(`   - Health Check:     http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[Express] Shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('[Express] Shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

export default app;

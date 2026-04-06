<<<<<<< HEAD
// Coffee POS System - Express.js REST API Server with Real-time Sync

// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const morgan = require('morgan');

// Import modular components
const databaseService = require('./src/services/database');
const socketService = require('./src/services/socket');
const errorHandler = require('./src/middleware/errorHandler');

// Import routes
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const productRoutes = require('./src/routes/products');
const orderRoutes = require('./src/routes/orders');
const categoryRoutes = require('./src/routes/categories');
const reportRoutes = require('./src/routes/reports');
const settingsRoutes = require('./src/routes/settings');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
=======
﻿// Coffee POS System - Server entry point
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const http    = require('http');
const path    = require('path');

const db                         = require('./src/db');
const { initSocket, broadcast }  = require('./src/socket');
>>>>>>> acbaef74e4deb37ef63c984d184b45dcbd99c93d

const app    = express();
const PORT   = process.env.PORT || 3000;
const server = http.createServer(app);

// Real-time sync
initSocket(server);

<<<<<<< HEAD
// ============== MIDDLEWARE ==============

// Security middleware - Configure Helmet with relaxed CSP for static assets
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP to allow external fonts/icons
    crossOriginEmbedderPolicy: false // Allow loading external resources
}));

// CORS middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Static files
app.use(express.static(path.join(__dirname)));

// ============== DATABASE INITIALIZATION ==============

try {
    databaseService.initialize();
} catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
}

// ============== SOCKET.IO INITIALIZATION ==============

socketService.initialize(io);

// ============== ROUTES ==============

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Coffee POS API is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        connectedUsers: socketService.getConnectedUsersCount()
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============== ERROR HANDLING ==============

// 404 handler
app.use(errorHandler.notFoundHandler);

// Global error handler
app.use(errorHandler.errorHandler);

// ============== SERVER STARTUP ==============

server.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('☕ Coffee POS System - Express.js Server');
    console.log('='.repeat(50));
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Database: SQLite (coffee_pos.db)`);
    console.log(`🔌 Real-time: Socket.IO enabled`);
    console.log(`📝 Logging: Morgan HTTP logger`);
    console.log('='.repeat(50));
    console.log(`💻 API: http://localhost:${PORT}/api/health`);
    console.log(`🖥️  Frontend: http://localhost:${PORT}`);
    console.log('='.repeat(50));
=======
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth',       require('./src/routes/auth')(db));
app.use('/api/users',      require('./src/routes/users')(db, broadcast));
app.use('/api/categories', require('./src/routes/categories')(db));
app.use('/api/products',   require('./src/routes/products')(db, broadcast));
app.use('/api/orders',     require('./src/routes/orders')(db, broadcast));
app.use('/api/reports',    require('./src/routes/reports')(db));
app.use('/api/settings',   require('./src/routes/settings')(db));

// Start
server.listen(PORT, () => {
    console.log('');
    console.log('☕ Coffee POS running on http://localhost:' + PORT);
    console.log('📊 Database: coffee_pos.db');
    console.log('🔌 Real-time: Socket.io enabled');
    console.log('');
>>>>>>> acbaef74e4deb37ef63c984d184b45dcbd99c93d
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📡 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('💤 Process terminated');
        databaseService.close();
    });
});

process.on('SIGINT', () => {
    console.log('📡 SIGINT received. Shutting down gracefully...');
    server.close(() => {
        console.log('💤 Process terminated');
        databaseService.close();
    });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
    server.close(() => process.exit(1));
});

module.exports = { app, server, io };

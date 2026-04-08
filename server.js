// Coffee POS System - Express.js REST API Server with Real-time Sync

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const morgan = require('morgan');

const databaseService = require('./src/services/database');
const socketService = require('./src/services/socket');
const errorHandler = require('./src/middleware/errorHandler');

const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const productRoutes = require('./src/routes/products');
const orderRoutes = require('./src/routes/orders');
const categoryRoutes = require('./src/routes/categories');
const reportRoutes = require('./src/routes/reports');
const settingsRoutes = require('./src/routes/settings');
const roleRoutes = require('./src/routes/roles');

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
    }
});

socketService.initialize(io);   

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

app.use(express.static(path.join(__dirname, 'public')));

try {
    databaseService.initialize();
} catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
}

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Coffee POS API is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        connectedUsers: socketService.getConnectedUsersCount()
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/roles', roleRoutes);

app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return next();
    }

    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(errorHandler.notFoundHandler);
app.use(errorHandler.errorHandler);

server.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('☕ Coffee POS System - Express.js Server');
    console.log('='.repeat(50));
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('📊 Database: SQLite (coffee_pos.db)');
    console.log('🔌 Real-time: Socket.IO enabled');
    console.log('📝 Logging: Morgan HTTP logger');
    console.log('='.repeat(50));
    console.log(`💻 API: http://localhost:${PORT}/api/health`);
    console.log(`🖥️  Frontend: http://localhost:${PORT}`);
    console.log('='.repeat(50));
});

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

process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
    server.close(() => process.exit(1));
});

module.exports = { app, server, io };

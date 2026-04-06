// Socket.io setup and broadcast helper
const { Server } = require('socket.io');

let io;
const connectedUsers = new Map();

function initSocket(server) {
    io = new Server(server, {
        cors: { origin: '*', methods: ['GET', 'POST'] }
    });

    io.on('connection', (socket) => {
        console.log('🔌 Client connected:', socket.id);

        socket.on('user-login', (userData) => {
            connectedUsers.set(socket.id, {
                id:       userData.id,
                username: userData.username,
                role:     userData.role,
                fullname: userData.fullname
            });
            socket.userData = userData;
            io.emit('user-status', {
                type:        'online',
                userId:      userData.id,
                username:    userData.username,
                fullname:    userData.fullname,
                onlineCount: connectedUsers.size
            });
            console.log(`👤 User logged in: ${userData.username} (${socket.id})`);
        });

        socket.on('user-logout', () => {
            if (socket.userData) {
                connectedUsers.delete(socket.id);
                io.emit('user-status', {
                    type:        'offline',
                    userId:      socket.userData.id,
                    username:    socket.userData.username,
                    onlineCount: connectedUsers.size
                });
                console.log(`👤 User logged out: ${socket.userData.username}`);
            }
        });

        socket.on('disconnect', () => {
            if (socket.userData) {
                connectedUsers.delete(socket.id);
                io.emit('user-status', {
                    type:        'offline',
                    userId:      socket.userData.id,
                    username:    socket.userData.username,
                    onlineCount: connectedUsers.size
                });
            }
            console.log('🔌 Client disconnected:', socket.id);
        });

        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    });

    return io;
}

function broadcast(eventType, data) {
    if (!io) return;
    io.emit(eventType, {
        type:      eventType,
        data,
        timestamp: new Date().toISOString()
    });
}

module.exports = { initSocket, broadcast };

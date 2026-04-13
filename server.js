require('dotenv').config();

const http = require('http');
//const { Server } = require('socket.io');
const app = require('./src/app');
const { connectDB } = require('./src/config/prisma');
const notificationService = require('./src/services/NotificationService');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// WebSocket setup for real-time notifications
/*const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  },
});
// Store connected users
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('New WebSocket connection');

  // User identifies themselves
  socket.on('authenticate', (userId) => {
    socket.userId = userId;
    connectedUsers.set(userId, socket.id);
    console.log(`User ${userId} authenticated for notifications`);
  });

  // Join user's personal room
  socket.on('join', (userId) => {
    socket.join(`user:${userId}`);
    console.log(`User ${userId} joined personal room`);
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      console.log(`User ${socket.userId} disconnected`);
    }
  });
});

// Function to send real-time notification to a user
const sendNotification = (userId, notification) => {
  io.to(`user:${userId}`).emit('notification', notification);
};

// Make io available to services
app.set('io', io);
app.set('sendNotification', sendNotification);
*/
const start = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`  Running  : http://localhost:${PORT}`);
      console.log(`  Mode     : ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Health   : http://localhost:${PORT}/health`);
      //console.log(`  WebSocket: ws://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Server failed to start:', err.message);
    process.exit(1);
  }
};

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

start();
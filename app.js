require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http'); // Import HTTP module
const socketIo = require('socket.io'); // Import Socket.io
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const app = express();
const uri = process.env.MONGO_URI;
const scoketPort = process.env.SOCKET_PORT || 5000;
// Connect to MongoDB
mongoose.connect(uri).then(()=>console.log("Database connected"));
// Middleware
app.use(express.json());
// Allow requests from your Laravel frontend (http://127.0.0.1:8000)
app.use(cors({
    origin: '*', // Allow Laravel frontend origin
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true // Allow credentials (like cookies or auth headers) if needed
}));

// Create HTTP server and Socket.io
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: 'http://127.0.0.1:8000', // Allow Laravel frontend origin
        methods: ['GET', 'POST'],
        credentials: true
    }
});
io.on('connection', (socket) => {
    console.log('New socket client connected', socket.id);
    socket.on('disconnect', () => {
      console.log('Socket Client disconnected');
    });
  });
// Attach the Socket.io instance to the app
app.set('io', io); // This allows access to io in your routes/controllers
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
server.listen(scoketPort, () => {
  console.log(`Socket Server running on port ws://127.0.0.1:${scoketPort}`);
});
module.exports = app;
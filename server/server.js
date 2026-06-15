require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const recordingsRouter = require('./routes/recordings');
const transcriptsRouter = require('./routes/transcripts');
const summariesRouter = require('./routes/summaries');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] }
});

// Make io accessible in routes via req.app.get('io')
app.set('io', io);

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/recordings', recordingsRouter);
app.use('/api/transcripts', transcriptsRouter);
app.use('/api/summaries', summariesRouter);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-recording', (recordingId) => {
    socket.join(recordingId);
    console.log(`Socket ${socket.id} joined room ${recordingId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/meeting-recorder')
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
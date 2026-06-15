const mongoose = require('mongoose');

const recordingSchema = new mongoose.Schema({
  userId: { type: String },
  title: String,
  videoUrl: String,   // S3/GridFS reference
  audioUrl: String,
  status: { type: String, enum: ['recording', 'processing', 'completed'], default: 'recording' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Recording', recordingSchema);
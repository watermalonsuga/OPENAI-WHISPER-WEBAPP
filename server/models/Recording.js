const mongoose = require('mongoose');

const recordingSchema = new mongoose.Schema({
  userId: { type: String },
  title: String,
  videoUrl: String,
  audioUrl: String,
  source: { 
    type: String, 
    enum: ['meeting', 'youtube', 'voice'], 
    default: 'meeting' 
  },
  status: { type: String, enum: ['recording', 'processing', 'completed'], default: 'recording' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Recording', recordingSchema);

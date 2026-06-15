const mongoose = require('mongoose');
const transcriptSchema = new mongoose.Schema({
  recordingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recording' },
  segments: [{
    text: String,
    timestamp: Number, // seconds into recording
    speaker: String    // optional, for future speaker diarization
  }],
  fullText: String
});

module.exports = mongoose.model('Transcript', transcriptSchema);
const mongoose = require('mongoose');
const summarySchema = new mongoose.Schema({
  recordingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recording' },
  summary: String,
  keyPoints: [String],
  actionItems: [String],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Summary', summarySchema);
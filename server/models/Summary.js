const mongoose = require('mongoose');

const langBlockSchema = new mongoose.Schema({
  summary: String,
  keyPoints: [String],
  actionItems: [String],
  generatedAt: { type: Date, default: Date.now }
}, { _id: false });

const summarySchema = new mongoose.Schema({
  recordingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recording' },
  // legacy fields — untouched, old data still readable
  summary: String,
  keyPoints: [String],
  actionItems: [String],
  // new: per-language storage
  summaries: {
    english: langBlockSchema,
    hindi: langBlockSchema,
    bengali: langBlockSchema
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Summary', summarySchema);

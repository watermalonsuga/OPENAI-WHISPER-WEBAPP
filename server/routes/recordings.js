const Summary = require('../models/Summary');
const express = require('express');
const multer = require('multer');
const router = express.Router();

const Recording = require('../models/Recording');
const Transcript = require('../models/Transcript');
const { storeRecording } = require('../services/storageService');
const { transcribeAudio } = require('../services/whisperService');

const upload = multer({ storage: multer.memoryStorage() });

// GET all recordings
router.get('/', async (req, res) => {
  try {
    const recordings = await Recording.find().sort({ createdAt: -1 });
    res.json(recordings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single recording
router.get('/:id', async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id);
    if (!recording) return res.status(404).json({ error: 'Not found' });
    res.json(recording);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new recording (when "Start Recording" is clicked)
router.post('/', async (req, res) => {
  try {
    const { title, userId } = req.body;
    const recording = new Recording({
      title: title || 'Untitled Meeting',
      userId,
      status: 'recording'
    });
    await recording.save();
    const io = req.app.get('io');        // ADD THIS LINE
    io.emit('recording-created', recording);
    res.status(201).json(recording);
  } catch (err) {
    console.error('Error creating recording:', err); // ADD THIS
    res.status(500).json({ error: err.message });
  }
});

// POST upload full recording file (on stop)
router.post('/:id/upload', upload.single('recording'), async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id);
    if (!recording) return res.status(404).json({ error: 'Not found' });

    const fileId = await storeRecording(req.file.buffer, `${req.params.id}.webm`);

    recording.videoUrl = fileId.toString();
    recording.status = 'processing';
    await recording.save();

    res.json({ message: 'Recording uploaded', fileId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST audio chunk for real-time transcription
router.post('/:id/chunk', upload.single('chunk'), async (req, res) => {
  try {
    const recordingId = req.params.id;
    const io = req.app.get('io');

    // Send chunk to Whisper service
    const result = await transcribeAudio(req.file.buffer, `chunk_${Date.now()}.webm`);

    if (result.text && result.text.trim()) {
      // Save to transcript
      let transcript = await Transcript.findOne({ recordingId });
      if (!transcript) {
        transcript = new Transcript({ recordingId, segments: [], fullText: '' });
      }

      transcript.segments.push({
        text: result.text,
        timestamp: Date.now()
      });
      transcript.fullText += ' ' + result.text;
      await transcript.save();

      // Emit to connected clients in this recording's room
      io.to(recordingId).emit('transcript-update', { text: result.text });
    }

    res.json({ text: result.text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update recording status (e.g., mark as completed)
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const recording = await Recording.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    const io = req.app.get('io');         // ADD THIS LINE
    io.emit('recording-updated', recording);  // ADD THIS LINE
    res.json(recording);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Recording.findByIdAndDelete(req.params.id);
    await Transcript.deleteOne({ recordingId: req.params.id });
    await Summary.deleteOne({ recordingId: req.params.id });

    const io = req.app.get('io');
    io.emit('recording-deleted', req.params.id);

    res.json({ message: 'Recording deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const Transcript = require('../models/Transcript');

// GET transcript by recording ID
router.get('/:recordingId', async (req, res) => {
  try {
    const transcript = await Transcript.findOne({ recordingId: req.params.recordingId });
    if (!transcript) return res.status(404).json({ error: 'No transcript found' });
    res.json(transcript);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
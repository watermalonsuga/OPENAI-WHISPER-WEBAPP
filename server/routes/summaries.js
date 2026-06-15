const express = require('express');
const router = express.Router();
const Summary = require('../models/Summary');
const Transcript = require('../models/Transcript');
const { generateSummary } = require('../services/llmService');

// GET summary by recording ID
router.get('/:recordingId', async (req, res) => {
  try {
    const summary = await Summary.findOne({ recordingId: req.params.recordingId });
    if (!summary) return res.status(404).json({ error: 'No summary found' });
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST generate summary from transcript
router.post('/:recordingId/generate', async (req, res) => {
  try {
    const transcript = await Transcript.findOne({ recordingId: req.params.recordingId });
    if (!transcript || !transcript.fullText.trim()) {
      return res.status(400).json({ error: 'No transcript available to summarize' });
    }

    const result = await generateSummary(transcript.fullText);

    // result expected to be parsed JSON: { summary, keyPoints, actionItems }
    let summary = await Summary.findOne({ recordingId: req.params.recordingId });
    if (!summary) {
      summary = new Summary({ recordingId: req.params.recordingId });
    }

    summary.summary = result.summary;
    summary.keyPoints = result.keyPoints || [];
    summary.actionItems = result.actionItems || [];
    await summary.save();

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/:recordingId/generate', async (req, res) => {
  try {
    console.log('Step 1: Looking up transcript');
    const transcript = await Transcript.findOne({ recordingId: req.params.recordingId });
    
    if (!transcript || !transcript.fullText.trim()) {
      console.log('Step 1 FAILED: No transcript or empty');
      return res.status(400).json({ error: 'No transcript available to summarize' });
    }
    
    console.log('Step 2: Transcript found, length:', transcript.fullText.length);
    console.log('Step 3: Calling Ollama...');

    const result = await generateSummary(transcript.fullText);

    console.log('Step 4: Ollama responded:', result);

    let summary = await Summary.findOne({ recordingId: req.params.recordingId });
    if (!summary) {
      summary = new Summary({ recordingId: req.params.recordingId });
    }

    summary.summary = result.summary;
    summary.keyPoints = result.keyPoints || [];
    summary.actionItems = result.actionItems || [];
    await summary.save();

    console.log('Step 5: Saved summary');
    res.json(summary);
  } catch (err) {
    console.error('Summary generation error:', err);
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;
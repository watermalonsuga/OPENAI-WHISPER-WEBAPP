const express = require('express');
const router = express.Router();
const Summary = require('../models/Summary');
const Transcript = require('../models/Transcript');
const Recording = require('../models/Recording');
const { generateSummary } = require('../services/llmService');

const VALID_LANGS = ['english', 'hindi', 'bengali'];

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

// Generate a short smart title from the summary result
function generateSmartTitle(result) {
  // Try to use the first key point — it's usually the most topic-specific
  if (result.keyPoints && result.keyPoints.length > 0) {
    const point = result.keyPoints[0];
    // Trim to max 40 chars at a word boundary
    if (point.length <= 40) return point.toUpperCase();
    const trimmed = point.substring(0, 40).replace(/\s\S*$/, '');
    return trimmed.toUpperCase();
  }

  // Fallback: use first sentence of summary
  if (result.summary) {
    const firstSentence = result.summary.split('.')[0].trim();
    if (firstSentence.length <= 40) return firstSentence.toUpperCase();
    const trimmed = firstSentence.substring(0, 40).replace(/\s\S*$/, '');
    return trimmed.toUpperCase();
  }

  return 'MEETING';
}

router.post('/:recordingId/generate', async (req, res) => {
  try {
    const language = VALID_LANGS.includes(req.body?.language) ? req.body.language : 'english';

    console.log('Step 1: Looking up transcript');
    const transcript = await Transcript.findOne({ recordingId: req.params.recordingId });

    if (!transcript || !transcript.fullText.trim()) {
      console.log('Step 1 FAILED: No transcript or empty');
      return res.status(400).json({ error: 'No transcript available to summarize' });
    }

    console.log('Step 2: Transcript found, length:', transcript.fullText.length);
    console.log('Step 3: Calling Groq for language:', language);

    const result = await generateSummary(transcript.fullText, language);

    console.log('Step 4: Groq responded:', result);

    // Save summary
    let summary = await Summary.findOne({ recordingId: req.params.recordingId });
    if (!summary) {
      summary = new Summary({ recordingId: req.params.recordingId });
    }
    if (!summary.summaries) summary.summaries = {};

    // write into per-language slot only — sibling languages untouched
    summary.summaries[language] = {
      summary: result.summary,
      keyPoints: result.keyPoints || [],
      actionItems: result.actionItems || [],
      generatedAt: new Date()
    };

    // keep legacy top-level fields in sync for English only (back-compat for old frontend code paths)
    if (language === 'english') {
      summary.summary = result.summary;
      summary.keyPoints = result.keyPoints || [];
      summary.actionItems = result.actionItems || [];
    }

    summary.markModified('summaries');
    await summary.save();
    console.log('Step 5: Saved summary for', language);

    // ── Auto-rename the recording based on summary content (English only) ──
    if (language === 'english') {
      const smartTitle = generateSmartTitle(result);
      await Recording.findByIdAndUpdate(req.params.recordingId, { title: smartTitle });
      console.log('Step 6: Recording renamed to:', smartTitle);
    }

    res.json(summary);
  } catch (err) {
    console.error('Summary generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

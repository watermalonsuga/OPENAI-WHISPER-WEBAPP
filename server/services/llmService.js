const axios = require('axios');

async function generateSummary(transcriptText) {
  const response = await axios.post('http://localhost:11434/api/generate', {
    model: 'llama3.2',
    prompt: `You are summarizing a meeting transcript. Respond ONLY with valid JSON (no markdown, no code fences, no explanation) in this exact format:
{
  "summary": "a 2-3 sentence overview of the meeting",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "actionItems": ["action 1", "action 2"]
}

Transcript:
${transcriptText}`,
    stream: false,
    format: 'json'
  });

  const text = response.data.response;
  const clean = text.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(clean);
  } catch (err) {
    console.error('Failed to parse LLM response:', text);
    return {
      summary: 'Summary generation failed - could not parse response',
      keyPoints: [],
      actionItems: []
    };
  }
}

module.exports = { generateSummary };
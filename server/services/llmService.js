const axios = require('axios');

async function generateSummary(transcriptText) {
  const response = await axios.post('http://localhost:11434/api/generate', {
    model: 'llama3.2',
    prompt: `You are an advanced AI Meeting Assistant.

Analyze the meeting transcript carefully and return ONLY valid JSON.

The summary must:
- Be detailed (6-10 sentences)
- Mention the most important topics discussed
- Mention conclusions reached
- Mention concerns, challenges, or recommendations if present
- Avoid generic statements
- Use information directly from the transcript

Return JSON in exactly this format:

{
  "summary": "Detailed executive summary",
  "keyPoints": [
    "Important point 1",
    "Important point 2",
    "Important point 3",
    "Important point 4",
    "Important point 5"
  ],
  "actionItems": [
    "Action item 1",
    "Action item 2"
  ]
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
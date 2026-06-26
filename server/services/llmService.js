const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const LANG_INSTRUCTIONS = {
  english: "Write the entire JSON output (summary, keyPoints, actionItems) in English.",
  hindi: "Write the entire JSON output (summary, keyPoints, actionItems) in Hindi (Devanagari script).",
  bengali: "Write the entire JSON output (summary, keyPoints, actionItems) in Bengali (Bangla script)."
};

// Strip ```json ... ``` or ``` ... ``` fences some models wrap around output.
// Seen most often on Bengali output, but applied generically since it can
// happen for any language.
function stripCodeFence(text) {
  if (!text) return text;
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

async function generateSummary(transcriptText, language = "english") {
  const langInstruction = LANG_INSTRUCTIONS[language] || LANG_INSTRUCTIONS.english;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.3,
    messages: [
      {
        role: "user",
        content: `You are an advanced AI Meeting Assistant.

Analyze the meeting transcript carefully and return ONLY valid JSON.
Do not wrap the JSON in markdown code fences or backticks. Return raw JSON only.

${langInstruction}

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
      },
    ],
  });

  const raw = completion.choices[0].message.content;
  const text = stripCodeFence(raw);

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("Failed to parse Groq response:", raw);

    return {
      summary: text,
      keyPoints: [],
      actionItems: [],
    };
  }
}

module.exports = { generateSummary };
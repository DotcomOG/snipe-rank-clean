import OpenAI from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL parameter is required.' });

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000);

    const prompt = `
You are an AI SEO expert. A user has submitted the following webpage content for analysis:

"${bodyText}"

Your job is to:
1. Assign an overall AI SEO score (from 1 to 100)
2. List 5 AI SEO Superpowers (what’s working well)
3. List 10 AI SEO Opportunities (what’s missing or hurting performance)
   - Each opportunity must be 3–5 lines
   - Explain in layman's terms:
     - What’s wrong
     - Why it matters for AI-powered search (not just traditional SEO)
     - How to begin addressing it
4. List 5 short AI Engine Insights — one-line notes per engine (Gemini, ChatGPT, Copilot, Perplexity)

Return ONLY this JSON format:

{
  "url": "Submitted URL",
  "score": 82,
  "superpowers": [...],
  "opportunities": [...],
  "insights": [...]
}
No extra formatting. No code blocks. No commentary. Only valid JSON.
`;

    const chat = await openai.chat.completions.create({
      model: 'gpt-4',
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    const output = chat.choices[0].message.content;

    try {
      const parsed = JSON.parse(output);
      parsed.url = url;
      return res.status(200).json(parsed);
    } catch (jsonErr) {
      console.error('Failed to parse OpenAI output:', output);
      return res.status(500).json({ error: 'Invalid JSON from OpenAI', raw: output });
    }
  } catch (err) {
    console.error('Error in /api/friendly:', err);
    return res.status(500).json({ error: 'Failed to analyze URL', detail: err.message });
  }
}

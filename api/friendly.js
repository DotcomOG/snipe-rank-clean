
// =========================
// ✅ api/friendly.js (ESM-safe + debug)
// =========================
import OpenAI from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL is required.' });

  const run = async () => {
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format.' });
    }

    let html = '';
    try {
      const response = await axios.get(url, { timeout: 8000 });
      html = response.data;
    } catch (err) {
      console.error('❌ axios error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch site.', detail: err.message });
    }

    const $ = cheerio.load(html);
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 6000);

const prompt = `
You are an AI SEO expert. A user has submitted the following webpage content for analysis:

"${bodyText}"

Your task is to return a JSON object with the following structure:

{
  "url": "Submitted URL",
  "score": 1–100,
  "superpowers": [5 detailed items],
  "opportunities": [10 detailed items],
  "engine_insights": [5 one-liners: Gemini, ChatGPT, Claude, Copilot, Perplexity]
}

Each field must follow these rules:

1. "score": A whole number (1–100) summarizing overall AI SEO readiness.

2. "superpowers": Return **exactly 5** bullet points. Each one must be a persuasive paragraph (3–5 full sentences). Focus on strengths that help AI search visibility, indexing, trust, and clickability.

3. "opportunities": Return **exactly 10** bullet points. Each one must be a persuasive paragraph (5–6 full sentences). Focus on what's lacking. Do not include how to fix anything. Highlight the impact this has on AI visibility, brand credibility, or missed reach.

4. "engine_insights": Return 5 one-liner insights — one each from Gemini, ChatGPT, Claude, Copilot, and Perplexity — explaining how the page would likely be interpreted by those AI engines.

Important:
- Return only the JSON object.
- No markdown, no commentary.
- Format strictly for JSON.parse() compliance.
`;
    let output = '';
    try {
      const chat = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      });
      output = chat.choices[0].message.content;
      console.log('✅ OpenAI Output:', output);
    } catch (err) {
      console.error('❌ OpenAI error:', err.message);
      return res.status(500).json({ error: 'OpenAI request failed.', detail: err.message });
    }

    try {
      const parsed = JSON.parse(output);
      parsed.url = url;
      return res.status(200).json(parsed);
    } catch (err) {
      console.error('❌ Parse error:', output);
      return res.status(500).json({ error: 'Invalid JSON from OpenAI', raw: output });
    }
  };

  return run();
}

import OpenAI from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required.' });
  }

try {
  new URL(url); // throws if not a valid URL
} catch {
  return res.status(400).json({ error: 'Invalid URL format.' });
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 6000);

    const prompt = `
You are an AI SEO expert. A user has submitted the following webpage content for analysis:

"${bodyText}"

Your job is to:
1. Assign an overall AI SEO score (1–100)

2. List 5 AI SEO Superpowers — features that work well
   - Each item must be 2–4 sentences
   - Focus on how the feature helps visibility, indexing, trust, or clickability in AI-driven search

3. List 10 AI SEO Opportunities — serious issues or gaps
   - Each item must be a full paragraph (3–5 sentences)
   - Describe the issue in persuasive, non-technical terms
   - Emphasize the consequences for AI visibility, reputation, or search reach
   - DO NOT include solutions or suggestions — let the concern stand on its own
   - DO NOT include labels like “Issue:” or “Importance:”

4. List 5 short AI Engine Insights — one line per engine (Gemini, ChatGPT, Copilot, Perplexity, Claude)

Return ONLY this JSON format:

{
  "url": "Submitted URL",
  "score": 82,
  "superpowers": ["..."],
  "opportunities": ["..."],
  "insights": ["..."]
}

No extra commentary. No markdown. Only valid JSON.
`;

    const chat = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }]
    });

    const output = chat.choices[0].message.content;

    console.log('OpenAI Raw Output:', output);

    try {
      const parsed = JSON.parse(output);
      parsed.url = url;
      return res.status(200).json(parsed);
    } catch (jsonErr) {
      console.error('❌ Failed to parse OpenAI output:', output);
      return res.status(500).json({ error: 'Invalid JSON from OpenAI', raw: output });
    }
  } catch (err) {
    console.error('🔥 API Error [friendly]:', err.response?.data || err.message || err);
    return res.status(500).json({
      error: 'Failed to analyze URL',
      detail: err.response?.data || err.message || err
    });
  }
}

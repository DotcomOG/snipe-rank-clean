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

2. List 5 AI SEO Superpowers — things the page is doing well
   - Each item should be 2–4 lines
   - Explain why this superpower helps the site succeed in AI-powered search
   - Avoid buzzwords — use clear, persuasive, benefit-focused language

3. List 10 AI SEO Opportunities — areas that need improvement
   - Each opportunity must include:
     - A one-line description of the issue
     - A 3–5 line explanation (in layman's terms) of why it matters for AI-powered search
     - DO NOT include a solution or how to fix it

4. List 5 AI Engine Insights — short readiness notes for Gemini, ChatGPT, Copilot, and Perplexity

Return ONLY this JSON format:

{
  "url": "Submitted URL",
  "score": 82,
  "superpowers": ["..."],
  "opportunities": [
    {
      "issue": "...",
      "importance": "..."
    }
  ],
  "insights": ["..."]
}

Only return valid JSON. No extra commentary, no markdown, no code blocks.
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


// api/friendly.js — Last updated: 2025-06-07 17:41 ET
// @vercel/node@20

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
    new URL(url); // Validate URL
  } catch {
    return res.status(400).json({ error: 'Invalid URL format.' });
  }

  let html = '';
  try {
    const response = await axios.get(url, { timeout: 8000 });
    html = response.data;
  } catch (axiosErr) {
    console.error('❌ axios failed to fetch URL:', axiosErr.message || axiosErr);
    return res.status(500).json({
      error: 'Failed to fetch content from the provided URL.',
      detail: axiosErr.message || axiosErr
    });
  }

  const $ = cheerio.load(html);
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 6000);

  const prompt = `
You are an AI SEO expert. A user has submitted the following webpage content for analysis:

"${bodyText}"

Your job is to return a valid JSON object with the following structure:

{
  "url": "Submitted URL",
  "score": 1–100,
  "superpowers": [5 items],
  "opportunities": [10 items],
  "engine_insights": [5 items]
}

Instructions:

1. "score": A whole number from 1–100 evaluating the site’s AI SEO readiness.

2. "superpowers": Return exactly 5 items. Each must be a **3–5 sentence persuasive paragraph**. Focus on elements that help visibility, indexing, trust, or AI search relevance.

3. "opportunities": Return exactly 10 items. Each must be a **4–6 sentence paragraph** highlighting a weakness or gap. Do NOT suggest how to fix. Focus only on what’s missing and why it matters.

4. "engine_insights": Return exactly 5 one-liners — one each for:
   - Gemini
   - ChatGPT
   - Claude
   - Copilot
   - Perplexity

Important:
- DO NOT include markdown
- DO NOT explain anything
- Return **only valid JSON**
- Your output will be parsed by JSON.parse()

Return ONLY the structured JSON.
`;

  try {
    const chat = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }]
    });

    const output = chat.choices[0].message.content;

    try {
      const parsed = JSON.parse(output);
      parsed.url = url;
      return res.status(200).json(parsed);
    } catch (jsonErr) {
      console.error('❌ Failed to parse OpenAI output:', output);
      return res.status(500).json({
        error: 'Invalid JSON from OpenAI',
        raw: output
      });
    }
  } catch (err) {
    console.error('❌ OpenAI API error:', err);
    return res.status(500).json({
      error: 'OpenAI request failed',
      detail: err.message || err
    });
  }
}

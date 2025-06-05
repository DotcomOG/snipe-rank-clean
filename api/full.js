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
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 7000);

    const prompt = `
You are an AI SEO expert. A user has submitted the following webpage content for in-depth analysis:

"${bodyText}"

Your job is to generate a **detailed AI SEO report**. Please provide:

1. An overall AI SEO score (1–100)

2. 5 AI SEO Superpowers
   - Each superpower should be 2–4 full sentences
   - Describe how it helps visibility, indexing, authority, or AI search trust

3. 10 AI SEO Opportunities
   - Each item should be a full paragraph (at least 3–5 sentences)
   - Use persuasive, plain English
   - Focus on impact and risks — do not include any “how to fix” instructions
   - Do not label sections with "issue", "importance", or "solution"

4. 5 one-line AI Engine Insights for Gemini, ChatGPT, Copilot, and Perplexity

Return ONLY this JSON format:

{
  "url": "Submitted URL",
  "score": 87,
  "superpowers": ["..."],
  "opportunities": ["..."],
  "insights": ["..."]
}

Do not include markdown, commentary, explanations, or formatting outside the JSON.
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
    console.error('Error in /api/full:', err);
    return res.status(500).json({ error: 'Failed to analyze URL', detail: err.message });
  }
}

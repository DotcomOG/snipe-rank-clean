import axios from 'axios';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL parameter is required.' });

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000);

    const prompt = `
You are an AI SEO analyst. A user has submitted the following webpage content:

"${bodyText}"

Return a JSON object in this format:
{
  "url": "Submitted URL",
  "score": 82,
  "superpowers": [...],
  "opportunities": [...],
  "insights": [...]
}
Only return valid JSON.
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


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
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 7000);

    const prompt = `
You are an advanced AI SEO consultant. A user has submitted a webpage for full AI SEO analysis.

Here is the visible content from their site:

"${bodyText}"

Please return a fully detailed JSON object ONLY, using this format:
{
  "url": "Submitted URL",
  "score": 87,
  "superpowers": ["10 detailed strengths with useful commentary"],
  "opportunities": ["Up to 25 weaknesses, each with an actionable recommendation"],
  "insights": {
    "gemini": ["Readiness for Google Gemini/Bard AI"],
    "chatgpt": ["Readiness for ChatGPT"],
    "copilot": ["Readiness for Microsoft Copilot"],
    "perplexity": ["Readiness for Perplexity.ai"]
  }
}

Return only the valid JSON. No explanation or prose.
    `;

    const chat = await openai.chat.completions.create({
      model: 'gpt-4',
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = chat.choices[0].message.content;

    try {
      const parsed = JSON.parse(raw);
      parsed.url = url;
      const combinedInsights = [
        ...(parsed.insights?.gemini || []),
        ...(parsed.insights?.chatgpt || []),
        ...(parsed.insights?.copilot || []),
        ...(parsed.insights?.perplexity || [])
      ];
      parsed.insights = combinedInsights;
      return res.status(200).json(parsed);
    } catch (jsonErr) {
      console.error('JSON parsing error from OpenAI:', raw);
      return res.status(500).json({ error: 'OpenAI returned invalid JSON.', raw });
    }
  } catch (err) {
    console.error('Full analysis server error:', err);
    return res.status(500).json({ error: 'Server error during full analysis.', detail: err.message });
  }
}


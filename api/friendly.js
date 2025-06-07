
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

    const prompt = `You are an AI SEO expert. Analyze this content: \n\n\"${bodyText}\" \n\nReturn JSON with score (1-100), 5 superpowers (3-5 lines each), 10 opportunities (5 lines each), and 5 engine insights (1 line each).`;

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

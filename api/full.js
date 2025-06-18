// api/full.js — Debug version — June 18, 2025 @ 2:32 PM ET
import OpenAI from 'openai';
import dotenv from 'dotenv';
import axios from 'axios';
import * as cheerio from 'cheerio';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) return res.status(400).json({ success: false, error: "Missing URL" });

  try {
    const html = (await axios.get(url)).data;
    const $ = cheerio.load(html);
    const bodyText = $('p').map((_, el) => $(el).text()).get().join("\n");

    const prompt = `
You are an AI SEO consultant preparing a full audit of this website: ${url}

Return only valid JSON with this format:
{
  "success": true,
  "score": number,
  "ai_strengths": [...],
  "ai_opportunities": [...],
  "engine_insights": [...]
}
Each ai_strengths item should be 3+ sentences.
Each ai_opportunities item should be 7+ sentences.
Each engine_insights item should be 8+ sentences.
Do not return markdown or code blocks. Return JSON only.
Content:
${bodyText.slice(0, 4000)}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      temperature: 0.7,
      max_tokens: 2500,
      messages: [
        { role: 'system', content: 'You are a professional AI SEO analyst.' },
        { role: 'user', content: prompt }
      ]
    });

    const raw = completion.choices[0].message.content.trim();
    console.log("🔎 RAW GPT RESPONSE:\n", raw);

    const json = raw.startsWith("```") ? raw.replace(/```json|```/g, "").trim() : raw;
    const parsed = JSON.parse(json);

    // TEMP: Skip sentence validation
    parsed.success = true;
    parsed.score = Math.max(60, Math.min(95, parseInt(parsed.score, 10) || 60));
    return res.json(parsed);

  } catch (err) {
    console.error("🔥 /api/full error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
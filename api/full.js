// api/full.js — Debug version (logging + forced success) — June 18, 2025 @ 2:44 PM ET
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

Return valid JSON only:
{
  "success": true,
  "score": 60–95,
  "ai_strengths": [7 paragraphs, 3+ sentences each],
  "ai_opportunities": [20 items, 7+ sentences each],
  "engine_insights": [5 items, 8+ sentences each]
}
Avoid markdown or code blocks.

Page content:
${bodyText.slice(0, 4000)}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      temperature: 0.7,
      max_tokens: 2500,
      messages: [
        { role: 'system', content: 'You are a persuasive AI SEO auditor.' },
        { role: 'user', content: prompt }
      ]
    });

    const raw = completion.choices[0].message.content.trim();
    console.log("🟡 RAW GPT RESPONSE:\n", raw);

    const json = raw.startsWith("```") ? raw.replace(/```json|```/g, "").trim() : raw;
    const parsed = JSON.parse(json);

    // ✅ Force success even if validation fails
    parsed.success = true;
    parsed.score = Math.max(60, Math.min(95, parseInt(parsed.score, 10) || 60));

    return res.json(parsed);

  } catch (err) {
    console.error("🔥 /api/full error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
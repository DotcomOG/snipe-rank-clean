// api/full.js — Last updated: June 18, 2025 @ 2:25 PM ET
import OpenAI from 'openai';
import dotenv from 'dotenv';
import axios from 'axios';
import * as cheerio from 'cheerio';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function countSentences(text) {
  return (text.match(/[.?!]\s/g) || []).length + 1;
}

function validateOutput(data, limits) {
  const validStrengths = Array.isArray(data.ai_strengths) && data.ai_strengths.every(p => countSentences(p) >= limits.minS);
  const validOpps = Array.isArray(data.ai_opportunities) && data.ai_opportunities.every(p => countSentences(p) >= limits.minO);
  const validInsights = Array.isArray(data.engine_insights) && data.engine_insights.every(p => countSentences(p) >= limits.minE);
  return validStrengths && validOpps && validInsights;
}

export default async function handler(req, res) {
  const { url } = req.query;
  const limits = { minS: 3, minO: 7, minE: 8 };

  if (!url) return res.status(400).json({ success: false, error: "Missing URL" });

  try {
    const html = (await axios.get(url)).data;
    const $ = cheerio.load(html);
    const bodyText = $('p').map((_, el) => $(el).text()).get().join("\n");

    const prompt = `
You are an AI SEO consultant preparing a full audit of this website: ${url}

Instructions:
Return ONLY valid JSON with this structure:
{
  "success": true,
  "score": [number between 60–95],
  "ai_strengths": [7 items, each at least ${limits.minS} full sentences],
  "ai_opportunities": [20 items, each at least ${limits.minO} sentences],
  "engine_insights": [5 items, each at least ${limits.minE} sentences]
}
Tone: professional, persuasive, client-facing. Avoid technical jargon. Do not wrap in code blocks or bullets.

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

    const json = raw.startsWith("```") ? raw.replace(/```json|```/g, "").trim() : raw;
    const parsed = JSON.parse(json);

    if (!validateOutput(parsed, limits)) {
      return res.status(500).json({ success: false, error: 'AI output did not meet length requirements', raw });
    }

    parsed.success = true;
    parsed.score = Math.max(60, Math.min(95, parseInt(parsed.score, 10) || 60));
    return res.json(parsed);

  } catch (err) {
    console.error("🔥 /api/full error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
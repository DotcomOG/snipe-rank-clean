// 📄 friendly.js — Updated June 19, 2025 @ 2:40 PM ET

import OpenAI from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import express from 'express';

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function extractVisibleText(html) {
  const $ = cheerio.load(html);
  $('script, style, noscript').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
}

function isValidJson(str) {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

function cleanResponse(text) {
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) return null;
  const jsonString = text.slice(jsonStart, jsonEnd + 1);
  return isValidJson(jsonString) ? JSON.parse(jsonString) : null;
}

function lineCount(str) {
  return str.split(/[.!?]/).filter(line => line.trim().length > 30).length;
}

function validateStructure(data) {
  if (!data || typeof data !== 'object') return false;
  const { ai_superpowers, ai_opportunities, ai_engine_insights } = data;
  if (!Array.isArray(ai_superpowers) || ai_superpowers.length !== 5) return false;
  if (!Array.isArray(ai_opportunities) || ai_opportunities.length !== 10) return false;
  const engines = ['ChatGPT', 'Claude', 'Google Gemini', 'Microsoft Copilot', 'Perplexity'];
  for (const insight of ai_superpowers) {
    if (!insight.explanation || lineCount(insight.explanation) < 3) return false;
  }
  for (const opp of ai_opportunities) {
    if (!opp.explanation || lineCount(opp.explanation) < 3) return false;
  }
  for (const engine of engines) {
    if (!ai_engine_insights[engine] || lineCount(ai_engine_insights[engine]) < 5) return false;
  }
  return true;
}

router.get('/friendly', async (req, res) => {
  const url = req.query.url;
  if (!url || !/^https?:\\/\\//.test(url)) {
    return res.status(400).json({ error: 'Invalid or missing URL parameter' });
  }

  try {
    const htmlResponse = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SnipeRankBot/1.0)' }
    });
    const visibleText = extractVisibleText(htmlResponse.data);

    const prompt = `You are an expert in AI SEO analysis. Based on the following website content, generate a JSON response with the structure below. Each section must be persuasive, detailed, and meet line count rules:\\n\\nContent:\\n\"\"\"${visibleText.slice(0, 7000)}\"\"\"\\n\\nRespond only in JSON:\\n{\\n  \"ai_superpowers\": [\\n    { \"title\": \"...\", \"explanation\": \"...\" } // x5, 3+ lines each\\n  ],\\n  \"ai_opportunities\": [\\n    { \"title\": \"...\", \"explanation\": \"...\" } // x10, 3–5 lines each\\n  ],\\n  \"ai_engine_insights\": {\\n    \"ChatGPT\": \"...\",\\n    \"Claude\": \"...\",\\n    \"Google Gemini\": \"...\",\\n    \"Microsoft Copilot\": \"...\",\\n    \"Perplexity\": \"...\"\\n  } // each 5+ lines of text\n}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    const raw = completion.choices[0]?.message?.content || '';
    const parsed = cleanResponse(raw);
    if (!validateStructure(parsed)) {
      return res.status(500).json({ error: 'AI response validation failed' });
    }

    res.json(parsed);
  } catch (err) {
    console.error('Analysis error:', err.message);
    res.status(500).json({ error: 'Analysis failed. Try again.' });
  }
});

export default router;// Trigger redeploy

// Last updated: June 11, 2025 @ 13:32 PM ET
import axios from 'axios';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
  throw new Error("❌ OPENAI_API_KEY is missing. Please set it in your Render or .env configuration.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function isValidPublicUrl(input) {
  try {
    const parsed = new URL(input);
    const host = parsed.hostname;
    const blocked = ["localhost", "127.0.0.1"];
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      !blocked.includes(host) &&
      !/^10\.\d+\.\d+\.\d+/.test(host) &&
      !/^192\.168\.\d+\.\d+/.test(host) &&
      !/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+/.test(host)
    );
  } catch {
    return false;
  }
}

async function resolveFinalURL(initialUrl, maxHops = 5) {
  let currentUrl = initialUrl;
  for (let i = 0; i < maxHops; i++) {
    const response = await axios.head(currentUrl, {
      maxRedirects: 0,
      validateStatus: () => true,
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.location;
      if (!location) break;
      currentUrl = new URL(location, currentUrl).toString();
    } else {
      return currentUrl; // 200 OK
    }
  }
  return currentUrl; // fallback to last reached URL
}

function extractJSONBlock(text) {
  const match =
    text.match(/```(?:json)?\s*({[\s\S]*?})\s*```/) ||
    text.match(/({[\s\S]*})/);
  return match ? match[1] : null;
}

export default async function friendlyRoute(req, res) {
  const { url, mode = 'short' } = req.query;

  if (!url || !isValidPublicUrl(url)) {
    return res.status(400).json({ success: false, reason: 'Invalid or missing URL' });
  }

  try {
    const finalUrl = await resolveFinalURL(url);
    const getRes = await axios.get(finalUrl, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
    });

    const html = getRes.data;
    const $ = cheerio.load(html);

    const title = $('title').text().trim();
    const meta = $('meta[name="description"]').attr('content') || '';
    const h1 = $('h1').first().text().trim();

    let bodyText = '';
    $('p').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 40) bodyText += text + '\n';
    });

    const limitsMap = {
      short: { strengths: 5, issues: 10 },
      full: { strengths: 7, issues: 20 },
    };
    const limits = limitsMap[mode] || limitsMap.short;

    const prompt = `
You are an AI SEO expert auditing a webpage for how well it performs in AI-driven search results.

Here is the page content from: ${finalUrl}

Title: "${title}"
Meta: "${meta}"
H1: "${h1}"
Content:
${bodyText.slice(0, 4000)}

Your task is to evaluate it and return JSON like this:
{
  "success": true,
  "score": [integer between 60–95],
  "ai_strengths": [...],
  "ai_opportunities": [...],
  "engine_insights": [...]
}

Instructions:
- Return exactly ${limits.strengths} 'ai_strengths'
- Return exactly ${limits.issues} 'ai_opportunities'
- Return 5 engine_insights (Gemini, ChatGPT, Copilot, Claude, Perplexity)
- ✅ RETURN ONLY VALID JSON. Do NOT wrap it in \`\`\` or any code block.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      temperature: 0.7,
      max_tokens: 1800,
      messages: [
        { role: 'system', content: 'You are a helpful AI SEO analysis assistant.' },
        { role: 'user', content: prompt },
      ],
    });

    const rawOutput = completion.choices[0]?.message?.content || '';
    console.log('🧠 GPT OUTPUT:\n', rawOutput);

    const jsonText = extractJSONBlock(rawOutput);
    if (!jsonText) throw new Error('Could not extract valid JSON from GPT output.');

    const parsed = JSON.parse(jsonText);
    return res.json(parsed);
  } catch (err) {
    console.error('🔥 Error in /friendly:', err.message);
    return res.status(500).json({
      success: false,
      reason: 'Failed to analyze site or generate content',
      error: err.message,
    });
  }
}
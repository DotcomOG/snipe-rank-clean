// Last updated: June 11, 2025 @ 17:06 PM ET
import axios from 'axios';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
  throw new Error('❌ OPENAI_API_KEY is missing. Please set it in your Render or .env configuration.');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function isValidPublicUrl(input) {
  try {
    const parsed = new URL(input);
    const host = parsed.hostname;
    const blocked = ['localhost', '127.0.0.1'];
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      !blocked.includes(host) &&
      !/^10\.\d+\.\d+\.\d+/.test(host) &&
      !/^192\.168\.\d+\.\d+/.test(host) &&
      !/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+/.test(host)
    );
  } catch {
    return false;
  }
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
    const headRes = await axios.head(url, {
      maxRedirects: 0,
      validateStatus: () => true,
    });

    const redirectStatuses = [301, 302, 303, 307, 308];
    const resolvedUrl =
      redirectStatuses.includes(headRes.status) && headRes.headers.location
        ? new URL(headRes.headers.location, url).toString()
        : url;

    const getRes = await axios.get(resolvedUrl, {
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: (status) => status < 400,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      },
    });

    const finalUrl = getRes.request?.res?.responseUrl || resolvedUrl;
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
      short: {
        strengths: 5,
        issues: 10,
        minS: 3,
        minI: 7,
        minE: 8
      },
      full: {
        strengths: 7,
        issues: 20,
        minS: 5,
        minI: 10,
        minE: 10
      }
    };

    const limits = limitsMap[mode] || limitsMap.short;

    const prompt = `
You are an AI SEO expert creating a client-facing audit of this webpage: ${finalUrl}

Here is the context:
- Title: "${title}"
- Meta: "${meta}"
- H1: "${h1}"
- Page content:
${bodyText.slice(0, 4000)}

INSTRUCTIONS:
Return JSON like:
{
  "success": true,
  "score": [60–95],
  "ai_strengths": [...],
  "ai_opportunities": [...],
  "engine_insights": [...]
}

Content guidelines:
1. Each ai_strengths item must be a persuasive paragraph with at least ${limits.minS} full sentences. Highlight strengths clearly and show how they help AI understand, trust, or rank the site.
2. Each ai_opportunities item MUST be a rich paragraph with at least ${limits.minI} full sentences. Do NOT summarize. Each paragraph should feel like part of a real consulting report — explain what’s missing, why it matters, what can go wrong, and hint that professional help is the logical next step.
3. Each engine_insights item must be at least ${limits.minE} full sentences. Provide detailed, brand-specific insight for Gemini, ChatGPT, Copilot, Claude, and Perplexity.
4. Your tone is smart, persuasive, client-facing. You're writing to marketing executives, not developers.
5. Do NOT use bullets. Do NOT wrap in code blocks. Return raw JSON only — no formatting, no markdown.

FAILURE TO FOLLOW ANY SENTENCE COUNT REQUIREMENTS SHOULD BE CONSIDERED AN INVALID RESPONSE.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      temperature: 0.7,
      max_tokens: 3000,
      messages: [
        { role: 'system', content: 'You are an AI SEO consultant creating persuasive full-length audits for business leaders.' },
        { role: 'user', content: prompt },
      ],
    });

    const rawOutput = completion.choices[0]?.message?.content || '';
    console.log('🧠 GPT OUTPUT:\n', rawOutput);

    let jsonText = extractJSONBlock(rawOutput);
    if (!jsonText && rawOutput.trim().startsWith("{")) jsonText = rawOutput.trim();

    if (!jsonText) {
      return res.status(500).json({
        success: false,
        reason: "AI returned non-parseable output",
        raw: rawOutput.slice(0, 300),
      });
    }

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
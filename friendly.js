// Last updated: June 11, 2025 @ 16:51 PM ET
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
        sentenceCount: {
          strengths: 3,
          issues: 6,
          insights: 6
        }
      },
      full: {
        strengths: 7,
        issues: 20,
        sentenceCount: {
          strengths: 4,
          issues: 9,
          insights: 9
        }
      }
    };

    const limits = limitsMap[mode] || limitsMap.short;

    const prompt = `
You are a senior AI SEO consultant. Analyze the following page and return structured JSON.

Site: ${finalUrl}

Title: "${title}"
Meta: "${meta}"
H1: "${h1}"
Text:
${bodyText.slice(0, 4000)}

Return JSON like this:
{
  "success": true,
  "score": [60–95],
  "ai_strengths": [...],
  "ai_opportunities": [...],
  "engine_insights": [...]
}

Instructions:
- Each ai_strengths item must be a ${limits.sentenceCount.strengths}-sentence paragraph that speaks confidently and affirms what the site is doing right for AI visibility.
- Each ai_opportunities item must be a ${limits.sentenceCount.issues}-sentence persuasive paragraph. Emphasize the business risk of ignoring the issue. Make it feel urgent and expensive. End with language that suggests expert help is needed.
- Each engine_insights item must be a ${limits.sentenceCount.insights}-sentence paragraph, one each for Gemini, ChatGPT, Copilot, Claude, Perplexity. Explain how each engine interprets the site — clearly, no jargon.
- Use a client-facing tone for business owners, CMOs, or marketing directors.
- ✅ Return valid JSON only. No markdown, no bullets, no formatting wrappers.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      temperature: 0.7,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: 'You are an AI SEO consultant writing persuasive audit reports for business leaders.' },
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
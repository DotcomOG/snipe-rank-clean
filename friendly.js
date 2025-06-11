// Last updated: June 11, 2025 @ 4:54 PM ET
import axios from "axios";
import * as cheerio from "cheerio";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper to extract clean JSON from GPT output
function extractJSONBlock(text) {
  const match = text.match(/```(?:json)?\s*({[\s\S]*?})\s*```/) || text.match(/({[\s\S]*})/);
  return match ? match[1] : null;
}

export default async function friendlyRoute(req, res) {
  const { url, mode = "full" } = req.query;

  if (!url) {
    return res.status(400).json({ success: false, reason: "Missing URL" });
  }

  try {
    // Step 1: Follow redirect manually
    const headRes = await axios.head(url, { maxRedirects: 0, validateStatus: () => true });
    const finalUrl = [301, 302, 307].includes(headRes.status) && headRes.headers.location
      ? new URL(headRes.headers.location, url).toString()
      : url;

    // Step 2: Fetch full HTML
    const response = await axios.get(finalUrl, { timeout: 10000 });
    const html = response.data;
    const $ = cheerio.load(html);

    const title = $("title").text().trim();
    const meta = $('meta[name="description"]').attr("content") || "";
    const h1 = $("h1").first().text().trim();

    let bodyText = "";
    $("p").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 40) bodyText += text + "\n";
    });

    const limits = {
      short: { strengths: 5, issues: 10 },
      full: { strengths: 7, issues: 20 },
    }[mode] || limits.full;

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
      model: "gpt-4-turbo",
      temperature: 0.7,
      max_tokens: 1800,
      messages: [
        { role: "system", content: "You are a helpful AI SEO analysis assistant." },
        { role: "user", content: prompt }
      ],
    });

    const rawOutput = completion.choices[0].message.content;
    console.log("🧠 GPT OUTPUT:\n", rawOutput);

    const jsonText = extractJSONBlock(rawOutput);
    if (!jsonText) throw new Error("Could not extract valid JSON from GPT output.");

    const parsed = JSON.parse(jsonText);
    return res.json(parsed);

  } catch (err) {
    console.error("🔥 Error in /friendly:", err.message);
    return res.status(500).json({
      success: false,
      reason: "Failed to analyze site or generate content",
      error: err.message,
    });
  }
}
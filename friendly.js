// Last updated: June 10, 2025 @ 2:46 PM ET
import axios from "axios";
import * as cheerio from "cheerio";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function friendlyRoute(req, res) {
  const { url, mode = "full" } = req.query;

  if (!url) {
    return res.status(400).json({ success: false, reason: "Missing URL" });
  }

  try {
    const response = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
    });

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

Here is the page content from: ${url}

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

Requirements:
- Return exactly ${limits.strengths} items in 'ai_strengths'
- Return exactly ${limits.issues} items in 'ai_opportunities'
- Return 5 detailed 'engine_insights' paragraphs (1 for each: Gemini, ChatGPT, Copilot, Claude, Perplexity)

All items must be unique, persuasive, and clear to a non-technical decision maker.
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

    const parsed = JSON.parse(completion.choices[0].message.content);
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
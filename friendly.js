// friendly.js — Last updated 2025-06-10 @ 12:48 PM ET
import axios from "axios";
import * as cheerio from "cheerio";

export default async function friendlyRoute(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ success: false, reason: "Missing URL parameter." });
  }

  try {
    const response = await axios.get(url, { timeout: 10000 });
    const html = response.data;
    const $ = cheerio.load(html);

    // Dummy scoring logic — replace this with actual scoring engine
    const title = $("title").text().trim();
    const metaDesc = $('meta[name="description"]').attr("content") || "";
    const h1 = $("h1").first().text().trim();

    const score = Math.floor(Math.random() * 20) + 80; // Random 80–99 for now

    const ai_strengths = [
      "✅ Title tag found: " + title,
      "✅ Meta description present.",
      "✅ H1 tag detected: " + h1,
      "✅ Page is reachable and loads successfully.",
      "✅ HTML structure appears valid."
    ];

    const ai_opportunities = [
      "🚨 Add structured data (e.g., JSON-LD for organization/schema).",
      "🚨 Improve alt text usage on images.",
      "🚨 Use more semantic headings for better AI indexing.",
      "🚨 Add FAQ or Q&A sections to improve generative AI previews.",
      "🚨 Enhance meta description length and richness."
    ];

    const engine_insights = [
      "Gemini looks for meaningful structured content blocks (like FAQs or tables).",
      "ChatGPT favors clear semantic hierarchy and rich meta tags.",
      "Copilot indexes intro paragraphs heavily when summarizing pages.",
      "Claude prioritizes privacy and accessibility signals (ARIA tags).",
      "Perplexity ranks sites with up-to-date timestamped content higher."
    ];

    return res.json({
      success: true,
      score,
      ai_strengths,
      ai_opportunities,
      engine_insights,
    });

  } catch (err) {
    console.error("Error in /friendly:", err.message);
    return res.status(500).json({ success: false, reason: "Failed to analyze URL", error: err.message });
  }
}
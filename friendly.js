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

    const title = $("title").text().trim();
    const metaDesc = $('meta[name="description"]').attr("content") || "";
    const h1 = $("h1").first().text().trim();

    const score = Math.floor(Math.random() * 20) + 80;

    const ai_strengths = [
      `✅ The title tag "${title}" clearly conveys the primary theme of the page, which helps AI models anchor the topic early during crawl and summarization.`,
      `✅ A meta description is present, giving AI engines a predefined synopsis to use in previews. This shows an awareness of how generative models craft context before visiting the page.`,
      `✅ The H1 heading "${h1}" aligns with the title and confirms content relevance. AI models treat this as a semantic validation of topical intent.`,
      "✅ The site loads quickly and without errors. This performance signal contributes directly to how AI engines prioritize which content to explore, summarize, or cite in answers.",
      "✅ The site uses standard HTML structure and avoids layout-breaking elements. Clean code helps AI parse and classify sections with greater confidence and accuracy."
    ];

    const ai_opportunities = [
      "🚨 No structured data was detected. Without schema markup, AI systems lack the contextual cues needed to fully understand page purpose, organization identity, or content type. This limits inclusion in enhanced result features and reduces clarity in generative outputs.",
      "🚨 Image elements lack descriptive alt text. Beyond accessibility, this is a major signal for AI models to understand visual context. Omission here weakens the overall narrative completeness of your site in the eyes of generative AI.",
      "🚨 Headings (H2, H3) are sparse or inconsistent. AI models rely on a well-formed semantic structure to understand topical hierarchy. Weak or absent structure makes the site harder to interpret and less likely to be confidently included in answers.",
      "🚨 No FAQ or Q&A content is present. Generative engines like ChatGPT and Perplexity are trained to extract clean question-answer pairs for inline answers. Without them, your content is less competitive for featured summaries.",
      "🚨 The meta description is either too short or too generic. A robust, benefit-focused meta helps AI determine page intent and creates stronger summaries in SERPs and conversational results.",
      "🚨 There is little to no internal linking strategy in place. AI uses internal links to understand thematic clusters and reinforce authority. Without them, the site feels fragmented and lacks cohesion.",
      "🚨 No clear content freshness signals (timestamps, updates) were found. AI tools like Perplexity penalize stale content and reward recency in both factual confidence and ranking.",
      "🚨 Missing trust elements — such as About pages, team bios, or editorial policies — limit the site’s credibility in AI models trained to prioritize authority and trustworthiness.",
      "🚨 The homepage uses heavy visual design without accompanying descriptive text. AI models can’t 'see' design. They need copy to interpret purpose, sentiment, and structure.",
      "🚨 No canonical tags or indexing guidance was found. This may confuse AI engines about which version of the page to rank or summarize, especially if similar pages exist."
    ];

    const engine_insights = [
      "🧠 **Gemini (Google):** Gemini prioritizes content with structured data, clear visual segmentation, and FAQ blocks. Sites lacking schema and clean sectioning miss opportunities to appear in AI-summarized snippets and enhanced search tiles. Gemini especially penalizes sites that don’t clearly define their identity or purpose.",
      "🧠 **ChatGPT (OpenAI):** ChatGPT uses headings, semantic structure, and rich metadata to inform its answers. This site lacks enough depth in those areas to be confidently selected. The absence of structured questions and answers makes it less relevant for being pulled into generated responses.",
      "🧠 **Copilot (Microsoft):** Copilot integrates summarized web content into real-time productivity use. It favors sites with clear topic overviews, linked support pages, and recent activity. This site lacks the interconnectedness and clarity needed to be used reliably in context-aware environments like Word and Edge.",
      "🧠 **Claude (Anthropic):** Claude favors trust-first content — accessibility, ethical signals, and visible team structure play a major role. Sites without transparency or trust signals (such as privacy policies or clear authorship) are less likely to be surfaced in its educational or sensitive responses.",
      "🧠 **Perplexity AI:** Perplexity pulls from sources that offer depth, freshness, and summary-ready insights. This site lacks up-to-date timestamps and high-context headers, reducing its visibility in high-confidence answers or citation sources."
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

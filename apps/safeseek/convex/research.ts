"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

// Trusted educational domains for research
const TRUSTED_DOMAINS = [
  "nasa.gov",
  "nationalgeographic.com",
  "britannica.com",
  "smithsonianmag.com",
  "sciencekids.co.nz",
  "natgeokids.com",
  "dkfindout.com",
  "khanacademy.org",
  "pbs.org",
];

// Map age range to approximate grade level
function ageToGrade(ageMin: number): string {
  if (ageMin <= 5) return "kindergarten";
  if (ageMin <= 6) return "1st";
  if (ageMin <= 7) return "2nd";
  if (ageMin <= 8) return "3rd";
  if (ageMin <= 9) return "4th";
  if (ageMin <= 10) return "5th";
  if (ageMin <= 11) return "6th";
  if (ageMin <= 12) return "7th";
  if (ageMin <= 13) return "8th";
  if (ageMin <= 14) return "9th";
  if (ageMin <= 15) return "10th";
  if (ageMin <= 16) return "11th";
  return "12th";
}

// Extract readable site name from domain
function getSiteName(domain: string): string {
  const names: Record<string, string> = {
    "nasa.gov": "NASA",
    "nationalgeographic.com": "National Geographic",
    "britannica.com": "Britannica",
    "smithsonianmag.com": "Smithsonian",
    "sciencekids.co.nz": "Science Kids",
    "natgeokids.com": "Nat Geo Kids",
    "dkfindout.com": "DK Find Out",
    "khanacademy.org": "Khan Academy",
    "pbs.org": "PBS",
  };
  return names[domain] || domain;
}

// Extract domain from URL
function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    // Match against trusted domains
    for (const d of TRUSTED_DOMAINS) {
      if (hostname === d || hostname.endsWith("." + d)) return d;
    }
    return hostname;
  } catch {
    return "";
  }
}

// Strip HTML tags and get plain text
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

type SourceCard = {
  title: string;
  siteName: string;
  siteDomain: string;
  originalUrl: string;
  content: string;
  snippet: string;
  grade: string;
};

/**
 * Core research action - fetches articles from trusted sites and rewrites for kid's level
 */
export const performResearch = internalAction({
  args: {
    kidProfileId: v.id("kidProfiles"),
    query: v.string(),
  },
  handler: async (ctx, args): Promise<{ sources: SourceCard[] }> => {
    // Get kid profile
    const kidProfile = await ctx.runQuery(api.kidProfiles.getProfile, {
      kidProfileId: args.kidProfileId,
    });

    if (!kidProfile) {
      throw new Error("Kid profile not found");
    }

    const ageMin = kidProfile.ageRange.min;
    const grade = ageToGrade(ageMin);

    // Step 1: Search trusted educational sites via Serper
    const SERPER_KEY = process.env.SERPER_API_KEY;
    if (!SERPER_KEY) {
      throw new Error("SERPER_API_KEY not configured");
    }

    const siteFilter = TRUSTED_DOMAINS.map((d) => `site:${d}`).join(" OR ");
    const searchQuery = `${args.query} ${siteFilter}`;

    const serperResponse = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: searchQuery,
        num: 5,
        safe: "active",
      }),
    });

    if (!serperResponse.ok) {
      console.error("[research] Serper search failed:", serperResponse.status);
      return { sources: [] };
    }

    const serperData = await serperResponse.json();
    const organicResults = serperData.organic || [];

    if (organicResults.length === 0) {
      return { sources: [] };
    }

    // Step 2: Fetch and extract text from top results (up to 5, aim for 3 good ones)
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const sources: SourceCard[] = [];

    for (const result of organicResults) {
      if (sources.length >= 3) break;

      const url: string = result.link;
      const title: string = result.title || "";
      const domain = extractDomain(url);

      if (!domain) continue;

      // Fetch the page HTML
      let textContent = "";
      try {
        const pageResponse = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; SafeNet/1.0; +https://getsafefamily.com)",
          },
          signal: AbortSignal.timeout(8000),
        });

        if (!pageResponse.ok) continue;

        const html = await pageResponse.text();
        textContent = stripHtml(html).slice(0, 2000);
      } catch (err) {
        console.error(`[research] Failed to fetch ${url}:`, err);
        continue;
      }

      // Skip if too little content
      if (textContent.length < 200) continue;

      // Step 3: Rewrite with OpenAI
      try {
        const rewriteResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "user",
                  content: `Rewrite this article for a ${grade} grader. Keep the key facts. Use simple language. Max 300 words. Do not add information not in the source. Return plain text only, no markdown.\n\n${textContent}`,
                },
              ],
              max_tokens: 500,
              temperature: 0.3,
            }),
          }
        );

        if (!rewriteResponse.ok) {
          console.error(
            "[research] OpenAI rewrite failed:",
            rewriteResponse.status
          );
          continue;
        }

        const rewriteData = await rewriteResponse.json();
        const rewrittenContent =
          rewriteData.choices?.[0]?.message?.content?.trim() || "";

        if (rewrittenContent.length < 50) continue;

        sources.push({
          title: title,
          siteName: getSiteName(domain),
          siteDomain: domain,
          originalUrl: url,
          content: rewrittenContent,
          snippet: rewrittenContent.slice(0, 150) + (rewrittenContent.length > 150 ? "..." : ""),
          grade: `${grade} Grade`,
        });
      } catch (err) {
        console.error("[research] OpenAI call failed:", err);
        continue;
      }
    }

    return { sources };
  },
});

/**
 * Public-facing research action - checks canSearch first, then calls performResearch
 */
export const researchFromKid = action({
  args: {
    kidProfileId: v.id("kidProfiles"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if kid can search (time limits)
    const searchCheck = await ctx.runQuery(api.timeLimits.canSearch, {
      kidProfileId: args.kidProfileId,
    });

    if (!searchCheck.canSearch) {
      return {
        sources: [],
        blocked: true,
        reason: searchCheck.reason,
      };
    }

    // Validate query
    const trimmedQuery = args.query.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) {
      return {
        sources: [],
        blocked: false,
      };
    }

    // Perform research
    const result = await ctx.runAction(internal.research.performResearch, {
      kidProfileId: args.kidProfileId,
      query: trimmedQuery,
    });

    return result;
  },
});

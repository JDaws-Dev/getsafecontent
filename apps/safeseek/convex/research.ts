"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

// Trusted educational domains for research — any result from these sites is allowed
const TRUSTED_DOMAINS = [
  "nasa.gov",
  "nationalgeographic.com",
  "britannica.com",
  "kids.britannica.com",
  "smithsonianmag.com",
  "sciencekids.co.nz",
  "natgeokids.com",
  "dkfindout.com",
  "khanacademy.org",
  "pbs.org",
  "education.com",
  "wonderopolis.org",
  "howstuffworks.com",
  "livescience.com",
  "sciencenewsforstudents.org",
  "si.edu",
  "amnh.org",
  "worldwildlife.org",
  "history.com",
  "coolkidfacts.com",
  "ducksters.com",
  "kiddle.co",
  "timeforkids.com",
  "scholastic.com",
  "funkidslive.com",
  "bbc.co.uk",
  "simple.wikipedia.org",
  "en.wikipedia.org",
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

    // Search the whole web with SafeSearch, then filter to trusted domains
    const searchQuery = `${args.query} for kids educational`;

    const serperResponse = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: searchQuery,
        num: 15,
        safe: "active",
      }),
    });

    if (!serperResponse.ok) {
      console.error("[research] Serper search failed:", serperResponse.status);
      return { sources: [] };
    }

    const serperData = await serperResponse.json();
    const allResults = serperData.organic || [];
    console.log(`[research] Serper returned ${allResults.length} total results`);

    // Filter to only trusted educational domains
    const organicResults = allResults.filter((r: any) => {
      const domain = extractDomain(r.link || "");
      return domain && TRUSTED_DOMAINS.some((td) => domain.includes(td) || td.includes(domain));
    });
    console.log(`[research] ${organicResults.length} results from trusted domains`);

    if (organicResults.length === 0) {
      // If no trusted results, try again with more results
      console.log("[research] No trusted domain results found");
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

      // Fetch the page HTML — fallback to Serper snippet if fetch fails
      console.log(`[research] Fetching: ${url}`);
      let textContent = "";
      try {
        const pageResponse = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          redirect: "follow",
        });

        if (pageResponse.ok) {
          const html = await pageResponse.text();
          textContent = stripHtml(html).slice(0, 2000);
        }
      } catch (err) {
        console.log(`[research] Fetch failed for ${url}, using snippet`);
      }

      // Fallback to Serper's snippet if page fetch failed or returned little
      if (textContent.length < 200) {
        const snippet = result.snippet || result.description || "";
        if (snippet.length > 50) {
          textContent = snippet;
          console.log(`[research] Using Serper snippet for ${domain} (${snippet.length} chars)`);
        } else {
          console.log(`[research] Skipping ${domain} — no content available`);
          continue;
        }
      } else {
        console.log(`[research] Extracted ${textContent.length} chars from ${domain}`);
      }

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
    // Check subscription status before any AI calls
    const kidProfile = await ctx.runQuery(api.kidProfiles.getProfile, {
      kidProfileId: args.kidProfileId,
    });
    if (!kidProfile) {
      return { sources: [], blocked: true, reason: "no_profile" };
    }

    const subCheck = await ctx.runQuery(internal.users.checkSubscriptionActive, {
      userId: kidProfile.userId,
    });
    if (!subCheck.allowed) {
      return {
        sources: [],
        blocked: true,
        reason: "subscription_expired",
        message: subCheck.message,
      };
    }

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

    // Rate limit check
    if (kidProfile) {
      const rateCheck = await ctx.runMutation(api.rateLimit.checkAndRecord, {
        userId: kidProfile.userId,
        action: "research",
      });
      if (!rateCheck.allowed) {
        return {
          sources: [],
          blocked: true,
          reason: "rate_limited",
          message: rateCheck.message || "Too many research requests. Please wait a moment and try again.",
        };
      }
    }

    // Perform research
    const result = await ctx.runAction(internal.research.performResearch, {
      kidProfileId: args.kidProfileId,
      query: trimmedQuery,
    });

    return result;
  },
});

import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import OpenAI from "openai";
import {
  fetchTriggerWarnings,
  formatTriggerWarnings,
} from "./lib/doesTheDogDie";

const verdictValues = v.union(
  v.literal("safe"),
  v.literal("caution"),
  v.literal("warning"),
  v.literal("no_verdict")
);

const severityValues = v.union(
  v.literal("none"),
  v.literal("mild"),
  v.literal("moderate"),
  v.literal("heavy")
);

/**
 * List recent analyses with their associated book data.
 * Returns the most recent analyses (newest first), limited by `count`.
 */
export const listRecent = query({
  args: {
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.count ?? 10;
    // Over-fetch to account for duplicates that get filtered out
    const analyses = await ctx.db
      .query("analyses")
      .order("desc")
      .take(limit * 2);

    const results = await Promise.all(
      analyses.map(async (analysis) => {
        const book = await ctx.db.get(analysis.bookId);
        return { ...analysis, book };
      })
    );

    // Deduplicate by bookId, keeping only the newest (first seen) per book
    const seen = new Set<string>();
    const deduped = results.filter((r) => {
      if (!r.book) return false;
      const key = r.bookId as string;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return deduped.slice(0, limit);
  },
});

/**
 * Get a cached analysis for a book.
 * One analysis per book (objective, profile-independent).
 */
export const getByBook = query({
  args: {
    bookId: v.id("books"),
  },
  handler: async (ctx, args) => {
    // Return the most recent analysis for this book
    return await ctx.db
      .query("analyses")
      .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
      .order("desc")
      .first();
  },
});

/**
 * Get analyses for multiple books at once.
 * Returns a map of bookId → analysis (or null) for each requested book.
 */
export const getByBooks = query({
  args: {
    bookIds: v.array(v.id("books")),
  },
  handler: async (ctx, args) => {
    const results: Array<{
      bookId: Id<"books">;
      verdict: string;
      ageRecommendation?: string;
    } | null> = [];
    for (const bookId of args.bookIds) {
      const analysis = await ctx.db
        .query("analyses")
        .withIndex("by_book", (q) => q.eq("bookId", bookId))
        .order("desc")
        .first();
      if (analysis) {
        results.push({
          bookId: analysis.bookId,
          verdict: analysis.verdict,
          ageRecommendation: analysis.ageRecommendation,
        });
      } else {
        results.push(null);
      }
    }
    return results;
  },
});

/**
 * Internal mutation to store an analysis result.
 * Called by the analyze action after OpenAI returns a verdict.
 */
export const store = internalMutation({
  args: {
    bookId: v.id("books"),
    verdict: verdictValues,
    ageRecommendation: v.optional(v.string()),
    summary: v.string(),
    contentFlags: v.array(
      v.object({
        category: v.string(),
        severity: severityValues,
        details: v.string(),
      })
    ),
    reasoning: v.optional(v.string()),
    // Enhanced fields (v2)
    parentCommunityNotes: v.optional(v.string()),
    challengedBookStatus: v.optional(
      v.object({
        isChallenged: v.boolean(),
        reason: v.string(),
        context: v.string(),
      })
    ),
    seriesContext: v.optional(
      v.object({
        seriesName: v.string(),
        bookNumber: v.optional(v.string()),
        contentProgression: v.string(),
      })
    ),
    ageGuidance: v.optional(
      v.object({
        readAloud: v.optional(v.string()),
        independentReader: v.optional(v.string()),
        matureEnoughToProcess: v.optional(v.string()),
      })
    ),
    parentTalkingPoints: v.optional(v.array(v.string())),
    comparableBooks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("analyses", args);
  },
});

/**
 * Analyze a book's content objectively.
 *
 * Flow:
 * 1. Look up the book from the DB
 * 2. Check for cached analysis
 * 3. If no cache, call OpenAI GPT-4o with structured output
 * 4. Store and return the result
 *
 * Returns "no_verdict" when the book lacks sufficient data for analysis.
 */
export const analyze = action({
  args: {
    bookId: v.id("books"),
    email: v.string(),
  },
  handler: async (ctx, args): Promise<AnalysisResult> => {
    // 1. Fetch book
    const book = await ctx.runQuery(internal.analyses.getBookById, {
      bookId: args.bookId,
    });
    if (!book) {
      throw new Error("Book not found");
    }

    // 2. Check cache — cached results are free for everyone
    const cached = await ctx.runQuery(internal.analyses.getCachedAnalysis, {
      bookId: args.bookId,
    });
    if (cached) {
      return cached as AnalysisResult;
    }

    // 3. Paywall check — only for new (non-cached) analyses
    const access = await ctx.runQuery(api.subscriptions.checkAccess, { email: args.email });
    if (!access.hasAccess) {
      throw new Error("UPGRADE_REQUIRED");
    }

    // 4. Run analysis (checks data sufficiency, calls OpenAI, returns result)
    const result = await runOpenAIAnalysis(book, args.bookId);

    // 5. Store in cache
    await ctx.runMutation(internal.analyses.store, result);

    // 6. Increment analysis count
    await ctx.runMutation(api.subscriptions.incrementAnalysisCount, { email: args.email });

    return result;
  },
});

/**
 * Internal query to fetch a book by ID (used by the analyze action).
 */
export const getBookById = internalQuery({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.bookId);
  },
});

/**
 * Re-analyze a book, bypassing the cache.
 *
 * Deletes the existing cached analysis (if any), then runs a fresh OpenAI call.
 */
export const reanalyze = action({
  args: {
    bookId: v.id("books"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Paywall check — re-analysis always counts as new
    const access = await ctx.runQuery(api.subscriptions.checkAccess, { email: args.email });
    if (!access.hasAccess) {
      throw new Error("UPGRADE_REQUIRED");
    }

    // 2. Delete existing cached analysis
    await ctx.runMutation(internal.analyses.deleteByBook, {
      bookId: args.bookId,
    });

    // 3. Fetch book
    const book = await ctx.runQuery(internal.analyses.getBookById, {
      bookId: args.bookId,
    });
    if (!book) {
      throw new Error("Book not found");
    }

    // 4. Run fresh analysis
    const result = await runOpenAIAnalysis(book, args.bookId);

    // 5. Store new result
    await ctx.runMutation(internal.analyses.store, result);

    // 6. Increment analysis count
    await ctx.runMutation(api.subscriptions.incrementAnalysisCount, { email: args.email });

    return result;
  },
});

/**
 * Internal cache lookup (used by the analyze action).
 */
export const getCachedAnalysis = internalQuery({
  args: {
    bookId: v.id("books"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("analyses")
      .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
      .order("desc")
      .first();
  },
});

/**
 * Internal mutation to delete a cached analysis for a book.
 * Used by the reanalyze action to clear the cache before a fresh analysis.
 */
export const deleteByBook = internalMutation({
  args: {
    bookId: v.id("books"),
  },
  handler: async (ctx, args) => {
    // Delete all analyses for this book (handles duplicates)
    const existing = await ctx.db
      .query("analyses")
      .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
      .collect();
    for (const record of existing) {
      await ctx.db.delete(record._id);
    }
  },
});

/**
 * Suggest alternative books that cover similar themes but with less mature content.
 * Uses OpenAI to generate recommendations based on the analyzed book.
 */
export const suggestAlternatives = action({
  args: {
    bookId: v.id("books"),
  },
  handler: async (ctx, args) => {
    const book = await ctx.runQuery(internal.analyses.getBookById, {
      bookId: args.bookId,
    });
    if (!book) {
      throw new Error("Book not found");
    }

    const analysis = await ctx.runQuery(internal.analyses.getCachedAnalysis, {
      bookId: args.bookId,
    });

    const openai = new OpenAI();
    const bookContext = buildBookContext(book);

    const analysisContext = analysis
      ? `\nCurrent verdict: ${analysis.verdict}\nAge recommendation: ${analysis.ageRecommendation ?? "N/A"}\nSummary: ${analysis.summary}\nContent flags: ${analysis.contentFlags
          .filter(
            (f: { severity: string; category: string; details: string }) =>
              f.severity !== "none"
          )
          .map(
            (f: { severity: string; category: string; details: string }) =>
              `${f.category} (${f.severity}): ${f.details}`
          )
          .join("; ")}`
      : "";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: ALTERNATIVES_PROMPT,
        },
        {
          role: "user",
          content: `## Book Information\n${bookContext}${analysisContext}\n\nSuggest alternative books and return as JSON.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error("OpenAI returned an empty response");
    }

    const parsed = JSON.parse(raw) as {
      alternatives: Array<{
        title: string;
        author: string;
        reason: string;
        ageRange: string;
      }>;
    };

    return parsed.alternatives ?? [];
  },
});

/**
 * Internal query: recent analyses with book data (for chat context).
 * Returns the most recent unique-book analyses, newest first.
 */
export const listRecentInternal = internalQuery({
  args: {
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.count ?? 5;
    const analyses = await ctx.db
      .query("analyses")
      .order("desc")
      .take(limit * 2);

    const results = await Promise.all(
      analyses.map(async (analysis) => {
        const book = await ctx.db.get(analysis.bookId);
        return { ...analysis, book };
      })
    );

    const seen = new Set<string>();
    const deduped = results.filter((r) => {
      if (!r.book) return false;
      const key = r.bookId as string;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return deduped.slice(0, limit);
  },
});

// --- Helpers ---

type BookData = {
  title: string;
  authors: string[];
  description?: string;
  categories?: string[];
  pageCount?: number;
  publishedDate?: string;
  maturityRating?: string;
  firstSentence?: string;
};

type AnalysisResult = {
  bookId: Id<"books">;
  verdict: "safe" | "caution" | "warning" | "no_verdict";
  ageRecommendation?: string;
  summary: string;
  contentFlags: Array<{
    category: string;
    severity: "none" | "mild" | "moderate" | "heavy";
    details: string;
  }>;
  reasoning?: string;
  // Enhanced fields (v2)
  parentCommunityNotes?: string;
  challengedBookStatus?: {
    isChallenged: boolean;
    reason: string;
    context: string;
  };
  seriesContext?: {
    seriesName: string;
    bookNumber?: string;
    contentProgression: string;
  };
  ageGuidance?: {
    readAloud?: string;
    independentReader?: string;
    matureEnoughToProcess?: string;
  };
  parentTalkingPoints?: string[];
  comparableBooks?: string;
};

/**
 * Runs an OpenAI GPT-4o analysis on a book.
 * Returns "no_verdict" if the book lacks sufficient data.
 */
async function runOpenAIAnalysis(
  book: BookData,
  bookId: Id<"books">
): Promise<AnalysisResult> {
  if (!book.description && !book.categories?.length) {
    return {
      bookId,
      verdict: "no_verdict",
      summary:
        "Insufficient book data available for content analysis. Try searching for this book again or check back later.",
      contentFlags: [],
    };
  }

  const openai = new OpenAI();
  const bookContext = buildBookContext(book);

  // Fetch community trigger warnings from DoesTheDogDie (best-effort)
  const dtddApiKey = process.env.DOES_THE_DOG_DIE_API_KEY;
  const triggerWarnings = await fetchTriggerWarnings(book.title, dtddApiKey);
  const triggerContext = triggerWarnings
    ? `\n\n## Community Content Warnings\n${formatTriggerWarnings(triggerWarnings)}`
    : "";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: `## Book Information\n${bookContext}${triggerContext}\n\nAnalyze this book and return your content review as JSON.`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("OpenAI returned an empty response");
  }

  const parsed = JSON.parse(raw) as OpenAIVerdictResponse;

  const validVerdicts = ["safe", "caution", "warning", "no_verdict"] as const;
  const verdict = validVerdicts.includes(
    parsed.verdict as (typeof validVerdicts)[number]
  )
    ? (parsed.verdict as (typeof validVerdicts)[number])
    : ("no_verdict" as const);

  const validSeverities = ["none", "mild", "moderate", "heavy"] as const;
  const contentFlags = (parsed.contentFlags ?? []).map((flag) => ({
    category: String(flag.category),
    severity: validSeverities.includes(
      flag.severity as (typeof validSeverities)[number]
    )
      ? (flag.severity as (typeof validSeverities)[number])
      : ("none" as const),
    details: String(flag.details),
  }));

  const result: AnalysisResult = {
    bookId,
    verdict,
    ageRecommendation: parsed.ageRecommendation
      ? String(parsed.ageRecommendation)
      : undefined,
    summary: String(parsed.summary ?? "No summary provided."),
    contentFlags,
    reasoning: parsed.reasoning ? String(parsed.reasoning) : undefined,
  };

  // Enhanced fields (v2) — only include if present
  if (parsed.parentCommunityNotes) {
    result.parentCommunityNotes = String(parsed.parentCommunityNotes);
  }
  if (parsed.challengedBookStatus && typeof parsed.challengedBookStatus === "object") {
    result.challengedBookStatus = {
      isChallenged: Boolean(parsed.challengedBookStatus.isChallenged),
      reason: String(parsed.challengedBookStatus.reason ?? ""),
      context: String(parsed.challengedBookStatus.context ?? ""),
    };
  }
  if (parsed.seriesContext && typeof parsed.seriesContext === "object" && parsed.seriesContext.seriesName) {
    result.seriesContext = {
      seriesName: String(parsed.seriesContext.seriesName),
      bookNumber: parsed.seriesContext.bookNumber
        ? String(parsed.seriesContext.bookNumber)
        : undefined,
      contentProgression: String(parsed.seriesContext.contentProgression ?? ""),
    };
  }
  if (parsed.ageGuidance && typeof parsed.ageGuidance === "object") {
    result.ageGuidance = {
      readAloud: parsed.ageGuidance.readAloud
        ? String(parsed.ageGuidance.readAloud)
        : undefined,
      independentReader: parsed.ageGuidance.independentReader
        ? String(parsed.ageGuidance.independentReader)
        : undefined,
      matureEnoughToProcess: parsed.ageGuidance.matureEnoughToProcess
        ? String(parsed.ageGuidance.matureEnoughToProcess)
        : undefined,
    };
  }
  if (Array.isArray(parsed.parentTalkingPoints) && parsed.parentTalkingPoints.length > 0) {
    result.parentTalkingPoints = parsed.parentTalkingPoints.map(String);
  }
  if (parsed.comparableBooks) {
    result.comparableBooks = String(parsed.comparableBooks);
  }

  return result;
}

interface OpenAIVerdictResponse {
  verdict: string;
  ageRecommendation?: string;
  summary: string;
  contentFlags?: Array<{
    category: string;
    severity: string;
    details: string;
  }>;
  reasoning?: string;
  // Enhanced fields (v2)
  parentCommunityNotes?: string;
  challengedBookStatus?: {
    isChallenged: boolean;
    reason: string;
    context: string;
  };
  seriesContext?: {
    seriesName: string;
    bookNumber?: string;
    contentProgression: string;
  };
  ageGuidance?: {
    readAloud?: string;
    independentReader?: string;
    matureEnoughToProcess?: string;
  };
  parentTalkingPoints?: string[];
  comparableBooks?: string;
}

function buildBookContext(book: {
  title: string;
  authors: string[];
  description?: string;
  categories?: string[];
  pageCount?: number;
  publishedDate?: string;
  maturityRating?: string;
  firstSentence?: string;
}): string {
  const lines = [
    `Title: ${book.title}`,
    `Author(s): ${book.authors.join(", ")}`,
  ];
  if (book.publishedDate) lines.push(`Published: ${book.publishedDate}`);
  if (book.pageCount) lines.push(`Page count: ${book.pageCount}`);
  if (book.categories?.length)
    lines.push(`Categories: ${book.categories.join(", ")}`);
  if (book.maturityRating)
    lines.push(`Google Books maturity rating: ${book.maturityRating}`);
  if (book.firstSentence)
    lines.push(`First sentence: "${book.firstSentence}"`);
  if (book.description) lines.push(`\nDescription:\n${book.description}`);
  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are SafeReads, an AI book content analyst. Your job is to provide objective, factual content reviews of books so parents can make informed decisions for their families.

You will receive book metadata (title, author, description, categories). Provide a neutral, objective assessment of the content — do NOT personalize for any specific reader or sensitivity level.

Respond with a JSON object containing:

{
  "verdict": "safe" | "caution" | "warning" | "no_verdict",
  "ageRecommendation": "string (e.g., '12+', '16+', 'All ages')",
  "ageGuidance": {
    "readAloud": "Age at which a parent could read this aloud, pausing to discuss or skip sections (e.g., '7+')",
    "independentReader": "Age for independent reading (e.g., '10+')",
    "matureEnoughToProcess": "Age to fully process the themes emotionally (e.g., '12+')"
  },
  "summary": "A 2-3 sentence plain-language summary of the book's content, highlighting what parents should know.",
  "contentFlags": [
    {
      "category": "one of the 10 categories listed below",
      "severity": "none" | "mild" | "moderate" | "heavy",
      "details": "Specific, factual description — see detail guidelines below"
    }
  ],
  "parentCommunityNotes": "A 2-3 sentence summary of what parent review communities (Common Sense Media, Goodreads parent reviews, homeschool community discussions) generally say about this book. What do real parents praise or warn about? If you don't have specific community knowledge, note that and provide your best assessment of how parent communities would likely view this book.",
  "challengedBookStatus": {
    "isChallenged": true/false,
    "reason": "Why the book has been challenged or banned (e.g., 'Challenged for depictions of witchcraft and anti-authority themes'). Empty string if not challenged.",
    "context": "Additional context — were challenges upheld or overturned? Is the controversy substantive or overblown? What should a parent actually take away from the controversy? Empty string if not challenged."
  },
  "seriesContext": {
    "seriesName": "Name of the series (omit this entire object if the book is standalone)",
    "bookNumber": "Position in series (e.g., '3 of 7')",
    "contentProgression": "How content maturity changes across the series (e.g., 'Violence and dark themes escalate significantly from book 4 onward. The first three books are safe for ages 8+, but later books are better suited for 12+.')"
  },
  "parentTalkingPoints": [
    "A conversation starter for parents to discuss the book's themes with their child (2-4 items)",
    "e.g., 'Ask your child how they would handle the moral dilemma the protagonist faces in choosing between loyalty and honesty.'"
  ],
  "comparableBooks": "Help parents calibrate: 'If your child handled [well-known book X], this book is similar in intensity. If [well-known book Y] felt too mature, this one may also be challenging because [specific reason].' Use 2-3 widely known comparison books.",
  "reasoning": "Your detailed reasoning for the verdict and age recommendation."
}

## Content Categories (provide a flag for ALL 10)

1. **Violence** — Physical conflict, fighting, weapons, war, gore, threat of harm, murder, torture, abuse.
   - none: No physical conflict | mild: Schoolyard scuffles, minor peril | moderate: Battle scenes, injuries, real danger | heavy: Graphic injuries, torture, realistic war violence
   - DETAIL SPECIFICS: State the type (fantasy, realistic, war, domestic), whether injuries are described in detail, whether death occurs on-page, whether violence is glorified or shown with consequences.

2. **Language** — Profanity, slurs, crude humor, vulgar language, name-calling, hate speech.
   - none: Clean language | mild: Occasional "damn"/"hell", mild name-calling | moderate: Regular moderate profanity (s-word, b-word) | heavy: Frequent f-bombs, slurs, pervasive vulgarity
   - DETAIL SPECIFICS: Categorize the strongest language used (mild oaths, moderate profanity, strong profanity, slurs), approximate frequency (rare, occasional, frequent, pervasive), whether profanity comes from protagonists or antagonists.

3. **Sexual Content & Nudity** — Explicit sexual acts, sexual references, innuendo, nudity, sexual humor. (Romantic relationships without sexual content belong in Romance. LGBTQ+ identity themes belong in Identity & Gender.)
   - none: No sexual content | mild: Brief kissing, vague references to sex | moderate: Making out, implied sex ("fade to black") | heavy: Explicit sex scenes, graphic descriptions, sexual assault depicted
   - DETAIL SPECIFICS: State what actually happens (kissing, implied intimacy, on-page sex), whether nudity is described, whether consent issues are present, whether sexual assault occurs and how it is handled.

4. **Substance Use** — Alcohol, drugs (illegal and prescription misuse), tobacco, vaping, intoxication.
   - none: No substance use | mild: Background alcohol at meals, historical tobacco | moderate: Teen drinking, drug references | heavy: Addiction depicted, drug culture central to plot
   - DETAIL SPECIFICS: Name the substances, whether use is by teens/adults/protagonists, whether consequences of use are depicted, whether it is normalized or cautioned against.

5. **Dark Themes & Mental Health** — Death and grief, abuse (emotional/physical), trauma, depression, anxiety, suicide, self-harm, eating disorders, mental illness, trafficking, slavery.
   - none: No dark themes | mild: Pet death, mild sadness | moderate: Parent death, bullying, depression, divorce | heavy: Suicide depicted, self-harm, severe abuse, eating disorders central to plot
   - DETAIL SPECIFICS: Name the specific themes present, whether they are central or peripheral, whether the book depicts recovery/hope or leaves themes unresolved, whether depictions could be triggering.

6. **Supernatural & Occult** — Magic systems, witchcraft, sorcery, divination, demons, ghosts, seances, paranormal activity, pagan rituals. (Distinct from religious worldview content.) Describe both the content and how the book frames or presents it (e.g., "witchcraft portrayed as whimsical fantasy" vs "occult practices presented as real spiritual paths").
   - none: No supernatural elements | mild: Fairy-tale magic, whimsical fantasy | moderate: Structured magic systems, witches/wizards, ghosts as plot devices | heavy: Occult rituals in detail, demon summoning, dark spiritual practices

7. **Religious & Worldview Content** — Explicit religious themes (Christianity, Islam, Judaism, etc.), atheism/agnosticism as worldview, secular humanism, nihilism, moral relativism, anti-religious messaging, evangelism, spiritual searching. Describe both the content and how the book frames or presents it (e.g., "faith portrayed as a source of strength" vs "religion portrayed as oppressive and harmful").
   - none: No notable religious/worldview content | mild: Characters attend services, casual religious references | moderate: Faith as significant theme, character questions belief, specific worldview presented | heavy: Overt evangelism or anti-religious argument, worldview is central thesis

8. **Romance** — Romantic relationships, crushes, dating, love triangles, heartbreak, romantic tension (all orientations). About the romantic relationship content, not sexual content (cat 3) or identity of people involved (cat 9).
   - none: No romantic content | mild: First crush, hand-holding | moderate: Dating central to plot, kissing, heartbreak, love triangle | heavy: Intense/obsessive romantic relationships, co-dependency, romance is dominant focus

9. **Identity & Gender** — LGBTQ+ characters and themes, gender identity exploration, sexual orientation as a theme, transgender experiences, non-binary identity, coming out narratives, same-sex relationships, gender role questioning. Describe both the content and how the book frames or presents it (e.g., "gender nonconformity portrayed as courageous self-discovery" vs "character questions identity but narrative doesn't advocate a position").
   - none: No identity/gender themes | mild: Minor LGBTQ+ side character, brief mention of diverse family structures | moderate: Coming-out narrative as significant subplot, gender identity exploration by main character | heavy: Identity/gender is central theme, detailed transition exploration, sexuality as primary narrative arc

10. **Social & Political Themes** — Racism and racial justice, political ideology/messaging, activism, social class/inequality, immigration, environmentalism as advocacy, anti-authority/rebellion, propaganda, censorship themes. Describe both the content and how the book frames or presents it (e.g., "historical racism depicted to educate" vs "overt political activism presented as a moral imperative").
    - none: No notable social/political themes | mild: Background awareness of social differences, historical context | moderate: Racism/injustice as significant theme, political systems explored, activism depicted | heavy: Overt political advocacy, heavy ideological messaging, graphic depictions of systemic oppression

## Guidelines

### Verdict rules
- "safe" = content is generally appropriate for most young readers (roughly ages 8+), with no significant mature themes
- "caution" = content contains some mature elements that parents may want to be aware of (roughly ages 12+)
- "warning" = content contains significant mature themes and is best suited for older teens or adults (roughly ages 16+)
- "no_verdict" = insufficient information to make a determination
- VERDICT ESCALATION: If ANY category is rated "moderate", the overall verdict MUST be at least "caution". If ANY category is rated "heavy", the overall verdict MUST be "warning". No exceptions — parents deserve to know when notable content is present, regardless of which category it falls in.

### Content flag rules
- Always provide content flags for ALL 10 categories, even if severity is "none"
- Be specific and factual in details — follow the DETAIL SPECIFICS guidance for each category
- Be objective — describe what the content IS, not whether it's good or bad. Parents decide that.

### Source and confidence
- Base your analysis on widely known information about the book, its reviews, and its content
- Draw on your knowledge of Common Sense Media reviews, Goodreads parent reviews, book award records, ALA banned/challenged book lists, and homeschool community discussions about this book
- If you're unsure about specific content, note your uncertainty in the reasoning and err on the side of caution
- The age recommendation should reflect general community standards, not any individual family's values

### Special signals
- If the Google Books maturity rating is "MATURE", the verdict should be at least "caution" — this is a publisher/platform signal that the content is intended for mature audiences
- If community content warnings from DoesTheDogDie.com are provided, use them as additional evidence to validate or supplement your analysis. These are crowdsourced reports from real readers. High vote counts indicate strong community consensus. Do NOT ignore them, but weigh them alongside your own knowledge of the book.

### Enhanced fields
- "challengedBookStatus": Only set isChallenged to true if the book has actually appeared on ALA challenged/banned lists, been removed from school libraries, or faced organized removal campaigns. Do NOT flag a book as challenged just because some parents dislike it.
- "seriesContext": Only include if the book is part of a named series. Omit entirely for standalone books.
- "parentTalkingPoints": Focus on the book's most impactful themes. These should help a parent have a productive conversation, not just repeat content warnings.
- "comparableBooks": Use widely-known books that most parents would recognize. This helps parents calibrate whether the content level is right for their child.`;

const ALTERNATIVES_PROMPT = `You are SafeReads, an AI book recommendation assistant for parents. A parent has just reviewed a book and seen its content flags. Your job is to suggest 3-5 SAFER alternative books that:

1. Cover similar themes, genres, or topics (same appeal — adventure, friendship, coming-of-age, etc.)
2. Have LESS mature content across all categories — lower severity in violence, language, sexual content, substance use, dark themes, supernatural/occult, identity/gender, romance, social/political themes
3. Are well-known, widely available, and highly regarded

The alternatives should be books a parent would feel MORE comfortable giving to their child. If the original book was flagged "warning", suggest books that would be "caution" or "safe". If "caution", suggest books that would be "safe".

Respond with a JSON object:

{
  "alternatives": [
    {
      "title": "Full book title",
      "author": "Author name",
      "reason": "One sentence explaining what it shares with the original AND specifically why it's safer/more appropriate",
      "ageRange": "Suggested age range (e.g., '8+', '10+', '12+')"
    }
  ]
}

Guidelines:
- CRITICAL: Alternatives must have LESS intense content than the original. Look at the content flags provided and recommend books that cover similar ground with lower severity ratings.
- Focus on the same genre and appeal — a kid who wanted to read the original should find these interesting too
- Include a mix of age ranges, skewing younger than the original
- Only recommend books you are confident exist and are accurately described
- If the original book is already rated "safe" with no significant flags, suggest books with similar themes the reader might also enjoy (no need to be "safer" in this case)
- Keep recommendations diverse — different authors, different perspectives`;

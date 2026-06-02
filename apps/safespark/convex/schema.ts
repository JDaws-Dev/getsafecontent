import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // Parent Clerk users only. Kids never sign up via Clerk in the
  // SafeFamily pattern — they enter the family code on the device.
  users: defineTable({
    // Marketing-Central /provisionUser writes rows here with a synthetic
    // clerkUserId of the form `marketing:<email>` so the field stays
    // required. Clerk-issued rows continue to use the real `user_xxx`
    // subject. legacyClerkUserId carries the original Clerk subject during
    // the federated-auth migration for one release cycle as a fallback.
    clerkUserId: v.string(),
    legacyClerkUserId: v.optional(v.string()),
    email: v.string(),
    role: v.union(v.literal('learner'), v.literal('parent')),  // 'learner' kept for back-compat
    displayName: v.string(),
    linkedKidProfileId: v.optional(v.id('kidProfiles')),  // back-compat; new flow uses kidSessions
    familyId: v.optional(v.id('families')),               // parents own their family
    // SafeFamily-parity subscription state. Defaults to 'lifetime' since
    // SafeSpark isn't charging yet. Central marketing Convex will be the
    // eventual source of truth once verifyAppAccess is wired.
    subscriptionStatus: v.optional(
      v.union(
        v.literal('trial'),
        v.literal('active'),
        v.literal('lifetime'),
        v.literal('cancelled'),
        v.literal('expired'),
        v.literal('inactive'),
      ),
    ),
    subscriptionUpdatedAt: v.optional(v.number()),
    stripeCustomerId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()),
    name: v.optional(v.string()),  // mirrors Marketing-provisioned `name` (separate from displayName)
    // Shared SafeFamily family code on the user row, in addition to the
    // existing `families` table. Lets a future migration align with the
    // SafeTunes/SafeTube/SafeReads/SafeStudy convention of one code per
    // user that works across every Safe Family app.
    familyCode: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_clerk_id', ['clerkUserId'])
    .index('by_legacy_clerk_id', ['legacyClerkUserId'])
    .index('by_role', ['role'])
    .index('by_email', ['email'])
    .index('by_family_code', ['familyCode']),

  // One family per parent. Holds the shared 6-char family code that
  // any kid in the family enters on a device to pick their profile.
  // All marketplace state (sales, products, domains) hangs off familyId.
  families: defineTable({
    parentUserId: v.id('users'),
    familyCode: v.string(),                    // 6-char alphanumeric, case-insensitive
    familyName: v.optional(v.string()),        // 'The Daws Family' — optional display
    createdAt: v.number(),
  })
    .index('by_parent', ['parentUserId'])
    .index('by_code', ['familyCode']),

  // Per-kid profile, owned by a family. SafeFamily pattern: kids don't
  // have Clerk accounts. They pick their profile from a list after
  // entering the family code; optional PIN gates per-profile privacy.
  kidProfiles: defineTable({
    familyId: v.optional(v.id('families')),    // optional during migration; v2+ always set
    parentUserId: v.id('users'),               // legacy back-compat; same as family's parent
    displayName: v.string(),
    age: v.optional(v.number()),
    sex: v.union(v.literal('boy'), v.literal('girl'), v.literal('adult')),
    interests: v.array(v.string()),
    avoidTopics: v.array(v.string()),
    customNote: v.optional(v.string()),
    pin: v.optional(v.string()),               // 4-digit PIN for per-profile privacy (siblings)
    avatarColor: v.optional(v.string()),       // 'violet' | 'pink' | 'emerald' | 'amber' | 'sky' for the picker tile
    joinCode: v.optional(v.string()),          // legacy back-compat from previous design
    claimed: v.optional(v.boolean()),          // legacy back-compat
    personalityLayers: v.array(v.string()),
    catchphrase: v.optional(v.string()),
    opinionTolerance: v.optional(v.union(v.literal('soft'), v.literal('balanced'), v.literal('honest'))),
    memorableFacts: v.optional(v.array(v.string())),
    // Parent-controlled per-kid kill switches. `undefined` = ON (default).
    // Surface on /parent and enforced server-side in /api/demo.
    allowImageRestyle: v.optional(v.boolean()),
    allowVoice: v.optional(v.boolean()),
    allowWebData: v.optional(v.boolean()),
    allowSharing: v.optional(v.boolean()),
    // Topics Spark must refuse to build for this kid. Lowercased, deduped,
    // capped to 50 entries by setBlockedTopics.
    blockedTopics: v.optional(v.array(v.string())),
    // Parent dashboard Phase 2 (2026-05-29):
    //   accessPaused: true → Spark refuses any new build for this kid.
    //   dailyQueryBudget: per-day prompt cap. undefined = no cap.
    // Both surfaced on /parent and enforced server-side in /api/demo
    // before the LLM call, so a paused kid never burns a token.
    accessPaused: v.optional(v.boolean()),
    dailyQueryBudget: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_family', ['familyId'])
    .index('by_parent', ['parentUserId'])
    .index('by_join_code', ['joinCode']),

  // A "session" identifies which kid is currently using a given device.
  // Created when a kid picks their profile after entering the family
  // code; stored as a token in the browser. Convex queries take this
  // token as an arg (no Clerk identity required for the kid side).
  kidSessions: defineTable({
    sessionToken: v.string(),                  // opaque 32-byte token in the kid's localStorage
    familyId: v.id('families'),
    kidProfileId: v.id('kidProfiles'),
    deviceLabel: v.optional(v.string()),       // 'Bella\'s Chromebook'
    lastSeenAt: v.number(),
    createdAt: v.number(),
  })
    .index('by_token', ['sessionToken'])
    .index('by_profile', ['kidProfileId']),

  // Perplexity-style "Spaces" — themed rooms with their own standing
  // instructions + persistent memory. Conversations belong to a space.
  // Each user has at least one default Space ("General") created on signup.
  spaces: defineTable({
    userId: v.id('users'),
    name: v.string(),                      // "School", "Dance", "Business ideas"
    emoji: v.string(),                     // "📚", "🩰", "💡"
    accent: v.string(),                    // tailwind gradient class for the chip
    customInstructions: v.optional(v.string()),  // injected into system prompt for this space
    memories: v.optional(v.array(v.string())),   // free-text facts the agent has stored
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId', 'updatedAt']),

  conversations: defineTable({
    userId: v.id('users'),
    spaceId: v.optional(v.id('spaces')),   // optional for backwards compat; v1.2+ always set
    title: v.string(),                     // auto-titled from first user message
    mode: v.union(
      v.literal('chat'),
      v.literal('build'),
      v.literal('learn'),
      v.literal('make'),
      v.literal('game'),
      v.literal('music'),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId', 'updatedAt'])
    .index('by_space', ['spaceId', 'updatedAt']),

  messages: defineTable({
    conversationId: v.id('conversations'),
    role: v.union(v.literal('user'), v.literal('assistant'), v.literal('system')),
    content: v.string(),
    // For assistant turns: which tools fired and what they produced
    toolCalls: v.optional(v.array(v.object({
      name: v.string(),
      input: v.any(),
      output: v.optional(v.string()),
      durationMs: v.optional(v.number()),
    }))),
    // For image-gen / artifact output
    attachments: v.optional(v.array(v.object({
      kind: v.union(v.literal('image'), v.literal('webapp'), v.literal('doc')),
      url: v.string(),
      caption: v.optional(v.string()),
    }))),
    // Web search citations the assistant used — [{n: 1, title, url, snippet}, ...]
    citations: v.optional(v.array(v.object({
      n: v.number(),
      title: v.string(),
      url: v.string(),
      snippet: v.optional(v.string()),
    }))),
    // Three suggested follow-up questions (Perplexity-style "you might also wonder")
    followUps: v.optional(v.array(v.string())),
    tokensIn: v.optional(v.number()),
    tokensOut: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_conversation', ['conversationId', 'createdAt']),

  // Everything the kid creates or saves: images, web apps, scripts, drafts,
  // and quick "save this from chat" notes. One unified table so the Studio
  // gallery has one source of truth.
  projects: defineTable({
    userId: v.id('users'),
    spaceId: v.optional(v.id('spaces')),
    kind: v.union(
      v.literal('webapp'),
      v.literal('image'),
      v.literal('apps_script'),
      v.literal('doc'),
      v.literal('business_idea'),
      v.literal('draft'),
      v.literal('note'),            // brain note saved from chat
      v.literal('other'),
    ),
    title: v.string(),
    description: v.optional(v.string()),
    url: v.optional(v.string()),         // hosted URL or exported artifact URL
    storageId: v.optional(v.string()),   // Convex storage for images/files
    body: v.optional(v.string()),        // markdown notes / draft text
    tags: v.optional(v.array(v.string())),
    pinned: v.optional(v.boolean()),
    sourceConversationId: v.optional(v.id('conversations')),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId', 'createdAt'])
    .index('by_user_pinned', ['userId', 'pinned', 'createdAt'])
    .index('by_space', ['spaceId', 'createdAt']),

  // SafeSpark maker projects — tied to a Clerk user (email signup). Stores
  // the full HTML + chat transcript so a kid can pick up any project later
  // from any device once signed in. Separate from `projects` so the BELLA
  // family/learning data model stays decoupled from the SafeSpark product.
  safesparkProjects: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    title: v.string(),
    html: v.string(),
    messages: v.array(
      v.object({
        role: v.union(v.literal('user'), v.literal('assistant')),
        content: v.string(),
      }),
    ),
    nextSteps: v.optional(v.array(v.string())),
    lastPrompt: v.optional(v.string()),
    lastReply: v.optional(v.string()),
    deletedAt: v.optional(v.number()),       // soft-delete timestamp; cleaned out after 30 days
    // Phase 4 — flagged when Spark builds cross-user communication
    // (chat room, message wall, guestbook, shared whiteboard). Set by
    // the LLM via `communicationProject` in its JSON response; surfaced
    // on /parent so the parent sees an amber "Has shared chat/message"
    // badge and knows to inspect the spark.db contents.
    isCommunication: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_clerk_id', ['clerkUserId', 'updatedAt']),

  // Phase 4 — concerning-query escalation. When the kid's prompt to
  // Spark trips an always-escalate intent category (self-harm-adjacent,
  // ED-adjacent), the build is refused with 988/NEDA helpline text AND
  // a row is inserted here so the parent dashboard can surface it at
  // the top with one-click acknowledge. Mirrors SafeStudy's
  // `kidConcernAlerts`. Dedupe: 24h window on (kidProfileId, query,
  // category) prevents retries from spamming the parent.
  safesparkConcernAlerts: defineTable({
    parentUserId: v.id('users'),
    kidProfileId: v.id('kidProfiles'),
    kidName: v.string(),                       // denormalized for fast list rendering
    query: v.string(),                         // the prompt that fired the alert (capped 1000 chars)
    category: v.union(
      v.literal('self_harm_adjacent'),
      v.literal('eating_disorder_adjacent'),
    ),
    rationale: v.string(),                     // short sentence from the classifier
    acknowledged: v.boolean(),
    acknowledgedAt: v.optional(v.number()),
    acknowledgedBy: v.optional(v.string()),    // parent email for audit
    notifiedAt: v.optional(v.number()),        // email-sent timestamp
    createdAt: v.number(),
  })
    .index('by_parent_unack', ['parentUserId', 'acknowledged', 'createdAt'])
    .index('by_kid_time', ['kidProfileId', 'createdAt']),

  // Phase 3 parent dashboard — topic request approval workflow.
  // When a kid hits a topic on their parent's blocklist, the friendly
  // refusal includes an "ask my parent" button. Tapping it inserts a
  // row here. The parent sees pending requests on /parent and approves
  // or denies. Approve = remove the matched phrase from the kid's
  // blockedTopics. Deny = mark resolved (the kid is told quietly).
  safesparkTopicRequests: defineTable({
    parentUserId: v.id('users'),
    kidProfileId: v.id('kidProfiles'),
    kidName: v.string(),                       // denormalized for fast list rendering
    matchedPhrase: v.string(),                 // the blocklist phrase that fired
    originalPrompt: v.string(),                // what the kid typed (capped at 1000 chars)
    status: v.union(v.literal('pending'), v.literal('approved'), v.literal('denied')),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.string()),        // parent email for audit
  })
    .index('by_parent_status', ['parentUserId', 'status', 'createdAt'])
    .index('by_kid_time', ['kidProfileId', 'createdAt']),

  // Per-project context checkpoint — a periodically-regenerated markdown
  // recap of "what this project is, what we've built, design decisions,
  // recent work." Generated by an LLM call after every ~10 conversation
  // turns (or > 24h of inactivity); prepended to the system prompt on
  // future turns so Spark doesn't forget the game premise / art direction
  // / blocklist nuance after the rolling 8-turn window slides past it.
  // Knox reported "Spark forgot what my game was about" 2026-05-28 —
  // this is the structural fix. Only the latest checkpoint per project
  // is used; older ones kept for parent visibility / project journal.
  safesparkCheckpoints: defineTable({
    projectId: v.id('safesparkProjects'),
    clerkUserId: v.string(),                  // owner key (kid:<id> for kid-built projects)
    content: v.string(),                       // markdown recap, ~400-600 words
    fromTurnCount: v.number(),                 // total messages seen when this checkpoint was generated
    htmlSize: v.number(),                      // bytes of html at checkpoint time (for debugging drift)
    model: v.string(),                         // which model produced the recap
    createdAt: v.number(),
  })
    .index('by_project_latest', ['projectId', 'createdAt']),

  // Per-version snapshot of a SafeSpark project. Every successful build
  // writes a row here so the kid can scroll back through how a project
  // evolved — exactly like the Knox DESIGN_LOG flow. Restore is a copy of
  // the row's html back into the project.
  safesparkVersions: defineTable({
    projectId: v.id('safesparkProjects'),
    clerkUserId: v.string(),
    html: v.string(),
    label: v.string(),                       // e.g. 'Bigger sprites + sound'
    summary: v.optional(v.string()),         // 1-line "what changed"
    prompt: v.optional(v.string()),          // the kid's ask for this version
    // Optional message-thread snapshot. Stored on rows created after
    // 2026-05-29 so the revert UX can roll back BOTH the html AND the
    // chat history to that point (otherwise rewinding html leaves a
    // confusing chat where the kid sees their later prompts but the
    // game state is older). Older version rows don't have this — for
    // those, restore patches html only.
    messagesSnapshot: v.optional(
      v.array(
        v.object({
          role: v.union(v.literal('user'), v.literal('assistant')),
          content: v.string(),
        }),
      ),
    ),
    createdAt: v.number(),
  })
    .index('by_project_time', ['projectId', 'createdAt'])
    .index('by_clerk_id', ['clerkUserId', 'createdAt']),

  // Server-side error log so silent failures stop being silent. Every
  // /api/demo error (token cap, OpenAI 5xx, timeout, transform refusal)
  // writes a row.
  safesparkErrors: defineTable({
    clerkUserId: v.optional(v.string()),
    email: v.optional(v.string()),
    prompt: v.string(),
    kind: v.string(),                   // 'json_parse' | 'openai_error' | 'timeout' | 'image_transform' | 'blocked_topic' | 'other'
    message: v.string(),
    contextSize: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_time', ['createdAt'])
    // Added 2026-05-29 for the parent dashboard's per-kid blocked-topic
    // lookup. The kid's clerkUserId is `kid:<profileId>`; we scan their
    // recent errors and filter to kind=='blocked_topic' in JS rather
    // than adding a compound (kid, kind, time) index — error volume per
    // kid is small enough that the post-filter is cheap.
    .index('by_clerk_id_time', ['clerkUserId', 'createdAt']),

  // Public share snapshots — each row is a self-contained published copy of
  // a project. Short IDs (8 chars) keep URLs short ("/s/aB7xQ2pK") so a
  // kid can send a link to family without an unreadable gzipped hash.
  safesparkShares: defineTable({
    shortId: v.string(),
    title: v.string(),
    html: v.string(),
    // Optional — set on shares created after the spark.db SDK landed. Lets
    // the share viewer wire shared state (leaderboards, etc.) back to the
    // originating project so all viewers see the same data.
    projectId: v.optional(v.id('safesparkProjects')),
    ownerClerkUserId: v.optional(v.string()),
    ownerEmail: v.optional(v.string()),
    views: v.number(),
    createdAt: v.number(),
  })
    .index('by_short_id', ['shortId'])
    // Added so `opsCreateShareForProject` can dedupe by projectId
    // (idempotent: calling twice for the same project reuses the share).
    .index('by_project', ['projectId']),

  // P0 safety gate: pre-share parent approval for chat-shaped projects.
  // When a kid hits Share on a project where isCommunication === true
  // (chat room, message wall, guestbook, shared whiteboard — anything
  // that uses spark.db for cross-user state), the share link is NOT
  // generated immediately. A row is inserted here in `pending` state;
  // the parent sees it on /parent and one-tap approves or denies.
  // - Approved: kid can hit Share again to generate the link.
  // - Denied: kid sees a message; parent can re-deny without re-checking.
  // Dedupe: at most one PENDING row per (kidProfileId, projectId) — if
  // the kid taps Share twice, the second tap finds the existing pending
  // row and doesn't spam the parent.
  safesparkShareApprovals: defineTable({
    parentUserId: v.id('users'),
    kidProfileId: v.id('kidProfiles'),
    kidName: v.string(),                       // denormalized for fast list rendering
    projectId: v.id('safesparkProjects'),
    projectTitle: v.string(),                  // denormalized; project title can change
    status: v.union(
      v.literal('pending'),
      v.literal('approved'),
      v.literal('denied'),
    ),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.string()),        // parent email for audit
    createdAt: v.number(),
  })
    .index('by_parent_status', ['parentUserId', 'status', 'createdAt'])
    .index('by_project_status', ['projectId', 'status'])
    .index('by_kid_project', ['kidProfileId', 'projectId']),

  // Monthly cost rollup per SafeSpark identity (parent OR kid). One row per
  // (clerkUserId, yearMonth). Used by the parent dashboard to show "you've
  // spent $X this month" — no charging, no caps yet, just visibility.
  safesparkUsage: defineTable({
    clerkUserId: v.string(),         // parent's Clerk id OR `kid:<profileId>`
    email: v.string(),
    yearMonth: v.string(),           // 'YYYY-MM' UTC
    chatTurns: v.number(),
    chatInputTokens: v.number(),
    chatOutputTokens: v.number(),
    imageTransforms: v.number(),
    totalCents: v.number(),          // running total in US cents
    updatedAt: v.number(),
  })
    .index('by_clerk_month', ['clerkUserId', 'yearMonth']),

  // Per-prompt audit log for SafeSpark — what each signed-in kid asked Spark
  // to build. Used for product eval, abuse review, and family activity records.
  // Guests are not logged (no identity to attach to).
  safesparkRequests: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    prompt: v.string(),
    projectId: v.optional(v.id('safesparkProjects')),
    projectTitle: v.optional(v.string()),
    // Per-turn reply text. Was previously denormalized off the project's
    // lastReply field for the ops review feed, which made every prompt
    // in a project show the SAME reply (the latest one) — masking real
    // canned-reply loops behind a display artifact. Now stored per row.
    // Optional for back-compat with old rows.
    reply: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_clerk_id_time', ['clerkUserId', 'createdAt'])
    .index('by_time', ['createdAt']),

  // Kid-built projects can persist shared state across visitors via the
  // `spark.db` SDK injected at render time. One row per (project, key).
  // Value is JSON-stringified, capped at 4 KB per row, 200 keys per project.
  sparkProjectData: defineTable({
    projectId: v.id('safesparkProjects'),
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
    createdAt: v.number(),
  }).index('by_project_key', ['projectId', 'key']),

  // Async build jobs — survives tab close, navigation, mobile background.
  // Pattern: client creates a job before fetching /api/demo, persists the
  // jobId to localStorage keyed by (clerkUserId or sessionToken). Server
  // dual-writes the final result to the job row independent of whether
  // the client is still streaming. On page load the client looks for a
  // pending job for the current identity, queries it, and applies the
  // result if status='complete'. Daily cron purges rows older than 24h.
  // Added 2026-05-29 after Jeremiah navigated away mid-build and lost work.
  safesparkJobs: defineTable({
    // Identity — one of these two will be set, used for rehydration lookup.
    clerkUserId: v.optional(v.string()),       // signed-in parent identity
    sessionToken: v.optional(v.string()),      // kid session token
    // What the kid asked + the project context. The route reconstructs
    // its request from these fields when retrying, so the client only
    // needs to remember the jobId.
    prompt: v.string(),
    projectId: v.optional(v.id('safesparkProjects')),
    // Lifecycle. 'pending' = created; 'running' = route started; 'complete'
    // = result is set; 'failed' = errorMessage is set; 'claimed' = client
    // has rehydrated this result already (so we don't replay it twice if
    // the kid reopens the same tab).
    status: v.union(
      v.literal('pending'),
      v.literal('running'),
      v.literal('complete'),
      v.literal('failed'),
      v.literal('claimed'),
    ),
    // Final result — populated when status='complete'. Mirrors the shape
    // /api/demo streams back on the `r:` line (DemoReply).
    resultJson: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_session_pending', ['sessionToken', 'status', 'createdAt'])
    .index('by_clerk_pending', ['clerkUserId', 'status', 'createdAt'])
    .index('by_created', ['createdAt']),

  // OpenAI TTS cache. Most kids re-listen to the same reply, so a hash-
  // keyed cache turns the second tap (and every tap by every other kid
  // who hears the same canned line) into a free read. Audio stored as
  // base64 inline — typical 200-char reply ≈ 30 KB mp3, well under the
  // 1 MB Convex row limit. Older entries pruned by a daily cron.
  safesparkTtsCache: defineTable({
    hash: v.string(), // sha256(text + voice + model)
    voice: v.string(),
    audioBase64: v.string(),
    sizeBytes: v.number(),
    createdAt: v.number(),
    lastUsedAt: v.number(),
    hitCount: v.number(),
  }).index('by_hash', ['hash'])
    .index('by_last_used', ['lastUsedAt']),

  // Per-kid daily TTS call counter — protects against spam-tapping the
  // Listen button. Resets per UTC day. Mirrors the existing
  // dailyQueryBudget pattern on kidProfiles.
  safesparkTtsUsage: defineTable({
    kidProfileId: v.id('kidProfiles'),
    yearMonthDay: v.string(), // "2026-05-29"
    calls: v.number(),
    cachedHits: v.number(),
    updatedAt: v.number(),
  }).index('by_kid_day', ['kidProfileId', 'yearMonthDay']),

  // Cached Wikipedia / search results — keeps cost down on common factual
  // questions. Lifted shape from safecontent/apps/safeseek/convex/searchCache.ts.
  searchCache: defineTable({
    normalizedQuery: v.string(),
    source: v.union(v.literal('wikipedia'), v.literal('simple_wikipedia'), v.literal('web')),
    content: v.string(),
    title: v.optional(v.string()),
    url: v.optional(v.string()),
    expiresAt: v.number(),
    timesReused: v.number(),
    createdAt: v.number(),
  })
    .index('by_query_source', ['normalizedQuery', 'source'])
    .index('by_expires', ['expiresAt']),

  // Curriculum progress: one row per (user, module).
  curriculumProgress: defineTable({
    userId: v.id('users'),
    moduleSlug: v.string(),
    status: v.union(
      v.literal('locked'),
      v.literal('available'),
      v.literal('in_progress'),
      v.literal('completed'),
    ),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index('by_user_module', ['userId', 'moduleSlug'])
    .index('by_user', ['userId']),

  // Hard monthly Anthropic + OpenAI spend cap so the parent dashboard has
  // a single source of truth and the agent can be honest with Bella when
  // she's near the ceiling.
  budgetUsage: defineTable({
    userId: v.id('users'),
    yearMonth: v.string(),               // '2026-05'
    anthropicTokensIn: v.number(),
    anthropicTokensOut: v.number(),
    anthropicUsdCents: v.number(),
    openaiUsdCents: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_month', ['userId', 'yearMonth']),

  // Gamification: per-user XP, level, streak, achievements, unlocked features.
  // Master lists for achievements + features live in code (src/lib/gamification.ts)
  // so they can be referenced statically; only the per-user state lives here.
  playerStats: defineTable({
    userId: v.id('users'),
    xp: v.number(),
    level: v.number(),
    streakDays: v.number(),
    longestStreakDays: v.number(),
    lastActiveDate: v.string(),       // 'YYYY-MM-DD' in user TZ
    achievementsUnlocked: v.array(v.string()),  // IDs from ACHIEVEMENTS
    featuresUnlocked: v.array(v.string()),      // IDs from FEATURES
    modulesCompleted: v.array(v.string()),      // curriculum module slugs
    updatedAt: v.number(),
  })
    .index('by_user', ['userId']),

  // Per-event log of XP awards — feeds the journey timeline and parent
  // dashboard. Separate from activityLog so we can show a clean play-by-play
  // of "what made Bella level up" without all the chat noise.
  xpEvents: defineTable({
    userId: v.id('users'),
    kind: v.string(),                 // 'message_sent', 'image_generated', 'module_completed', 'achievement_unlocked', 'streak_bonus'
    xp: v.number(),
    achievementId: v.optional(v.string()),
    featureUnlockedId: v.optional(v.string()),
    evidenceKind: v.optional(v.union(
      v.literal('ask'),
      v.literal('check'),
      v.literal('improve'),
      v.literal('own'),
      v.literal('build'),
    )),
    evidenceText: v.optional(v.string()),
    summary: v.string(),
    createdAt: v.number(),
  })
    .index('by_user_time', ['userId', 'createdAt']),

  // Capability requests — when Lumi can't do something the kid asked for,
  // log it so the parent dashboard surfaces a queue of "build this next."
  // Pattern lifted from Mozart's andrew_capability_requests.
  capabilityRequests: defineTable({
    kidProfileId: v.id('kidProfiles'),
    request: v.string(),                   // what the kid asked for
    context: v.optional(v.string()),       // surrounding conversation snippet
    sourceConversationId: v.optional(v.id('conversations')),
    status: v.union(
      v.literal('open'),
      v.literal('shipped'),
      v.literal('declined'),
    ),
    statusNote: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_kid_status', ['kidProfileId', 'status', 'createdAt']),

  // Daily morning-surface cards — once-a-day continuity message generated
  // per active kid by the dailyCard cron. Pinned to the chat page until
  // the kid dismisses or sends it as a follow-up.
  dailyCards: defineTable({
    kidProfileId: v.id('kidProfiles'),
    yearMonthDay: v.string(),              // 'YYYY-MM-DD'
    body: v.string(),                      // short friendly continuity message
    dismissed: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_kid_date', ['kidProfileId', 'yearMonthDay'])
    .index('by_kid_dismissed', ['kidProfileId', 'dismissed', 'createdAt']),

  // Audit log of significant actions — feeds the parent dashboard "what
  // did Bella do today" summary cards.
  activityLog: defineTable({
    userId: v.id('users'),
    kind: v.string(),                    // 'message_sent', 'image_generated', 'project_saved', 'module_completed'
    summary: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index('by_user_time', ['userId', 'createdAt']),
});

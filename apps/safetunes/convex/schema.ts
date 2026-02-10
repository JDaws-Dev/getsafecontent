import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  // Spread Convex Auth tables (authAccounts, authRefreshTokens, authSessions, authVerificationCodes, authVerifiers, etc.)
  ...authTables,

  // Override the users table with Convex Auth fields + SafeTunes custom fields
  users: defineTable({
    // Convex Auth required fields
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.float64()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.float64()),
    isAnonymous: v.optional(v.boolean()),

    // SafeTunes custom fields
    familyCode: v.optional(v.string()), // 6-character code for kids to access their profiles
    createdAt: v.optional(v.number()), // When user was created
    subscriptionStatus: v.optional(v.string()), // "active", "trial", "canceled", "lifetime", "past_due"
    subscriptionId: v.optional(v.string()), // Stripe subscription ID
    stripeCustomerId: v.optional(v.string()), // Stripe customer ID
    subscriptionEndsAt: v.optional(v.number()), // When subscription ends (for canceled subs or trial end)
    couponCode: v.optional(v.string()), // Coupon code used for signup (e.g., "DAWSFRIEND")
    appleMusicAuthorized: v.optional(v.boolean()), // Whether user has connected Apple Music
    appleMusicAuthDate: v.optional(v.number()), // When they authorized Apple Music
    onboardingCompleted: v.optional(v.boolean()), // Whether user completed onboarding
    // Notification preferences
    notifyOnRequest: v.optional(v.boolean()), // Email when kids submit new requests
    notifyOnWeeklyDigest: v.optional(v.boolean()), // Weekly summary email
    notifyOnProductUpdates: v.optional(v.boolean()), // Product updates and tips
    // Legacy fields from old auth systems
    passwordHash: v.optional(v.string()), // Legacy - kept for backward compat
    emailVerified: v.optional(v.boolean()), // Legacy - Convex Auth uses emailVerificationTime
    emailVerificationToken: v.optional(v.string()), // Legacy
    emailVerificationTokenExpiry: v.optional(v.number()), // Legacy
    emailVerificationSentAt: v.optional(v.number()), // Legacy
    clerkId: v.optional(v.string()), // Legacy Clerk field
    fullName: v.optional(v.string()), // Legacy
    familyId: v.optional(v.string()), // Legacy
    role: v.optional(v.string()), // Legacy
    phoneNumber: v.optional(v.string()), // Legacy
    // Push notifications (Expo)
    expoPushToken: v.optional(v.string()), // Expo push token for mobile app notifications
    // Global artwork setting
    globalHideArtwork: v.optional(v.boolean()), // Master toggle to hide ALL artwork (overrides individual settings)
    // Central accounts sync
    centralAccessCacheExpiry: v.optional(v.number()), // When central access cache expires (for 5-min caching)
  })
    .index("email", ["email"]) // Required by Convex Auth
    .index("phone", ["phone"]) // Required by Convex Auth
    .index("by_family_code", ["familyCode"])
    .index("by_subscription", ["subscriptionId"]),

  // Kid profiles
  kidProfiles: defineTable({
    userId: v.id("users"), // Parent/owner
    name: v.string(),
    avatar: v.optional(v.string()),
    color: v.optional(v.string()),
    pin: v.optional(v.string()), // 4-digit PIN (optional - for sibling protection)
    createdAt: v.number(),
    // Music preferences for future AI recommendations
    favoriteGenres: v.optional(v.array(v.string())),
    favoriteArtists: v.optional(v.array(v.string())),
    ageRange: v.optional(v.string()), // "3-5", "6-8", "9-12", "13+"
    musicPreferences: v.optional(v.string()), // Free-form text about what they like
    // Time controls
    dailyTimeLimitMinutes: v.optional(v.number()), // Daily listening limit in minutes (null = unlimited)
    timeLimitEnabled: v.optional(v.boolean()), // Whether time limit is active
    // Time-of-day restrictions (e.g., only allow 8am-8pm)
    allowedStartTime: v.optional(v.string()), // Start time in HH:MM format (e.g., "08:00")
    allowedEndTime: v.optional(v.string()), // End time in HH:MM format (e.g., "20:00")
    timeOfDayEnabled: v.optional(v.boolean()), // Whether time-of-day restriction is active
    // Music access control (parent can pause music access for school, bedtime, etc.)
    musicPaused: v.optional(v.boolean()), // If true, kid cannot play music
    // Push notifications (Expo)
    expoPushToken: v.optional(v.string()), // Expo push token for mobile app notifications
  }).index("by_user", ["userId"]),

  // Daily listening time tracking
  dailyListeningTime: defineTable({
    kidProfileId: v.id("kidProfiles"),
    date: v.string(), // Format: YYYY-MM-DD
    totalMinutes: v.number(), // Total minutes listened today
    lastUpdatedAt: v.number(), // Timestamp of last update
  })
    .index("by_kid_and_date", ["kidProfileId", "date"])
    .index("by_kid", ["kidProfileId"]),

  // Approved albums
  approvedAlbums: defineTable({
    userId: v.id("users"), // Parent who approved it
    kidProfileId: v.optional(v.id("kidProfiles")), // If null, approved for all kids
    appleAlbumId: v.string(), // Apple Music album ID
    albumName: v.string(),
    artistName: v.string(),
    artworkUrl: v.optional(v.string()),
    releaseYear: v.optional(v.string()),
    trackCount: v.optional(v.number()),
    genres: v.optional(v.array(v.string())),
    isExplicit: v.optional(v.boolean()),
    approvedAt: v.number(),
    hideArtwork: v.optional(v.boolean()), // Hide album artwork if inappropriate
    featured: v.optional(v.boolean()), // Featured for discovery - recommended by parent
    featuredForKids: v.optional(v.array(v.id("kidProfiles"))), // Which kids can see this in Discover (if empty/null, all kids can see)
  })
    .index("by_user", ["userId"])
    .index("by_kid_profile", ["kidProfileId"])
    .index("by_user_and_album", ["userId", "appleAlbumId"])
    .index("by_user_featured", ["userId", "featured"]),

  // Approved songs (individual tracks)
  approvedSongs: defineTable({
    userId: v.id("users"), // Parent who approved it
    kidProfileId: v.optional(v.id("kidProfiles")), // If null, approved for all kids
    appleSongId: v.string(), // Apple Music song ID
    songName: v.string(),
    artistName: v.string(),
    albumName: v.optional(v.string()),
    artworkUrl: v.optional(v.string()),
    durationInMillis: v.optional(v.number()),
    genres: v.optional(v.array(v.string())),
    isExplicit: v.optional(v.boolean()),
    hideArtwork: v.optional(v.boolean()), // Hide album artwork if inappropriate
    approvedAt: v.number(),
    featured: v.optional(v.boolean()), // Featured for discovery - recommended by parent
    featuredForKids: v.optional(v.array(v.id("kidProfiles"))), // Which kids can see this in Discover (if empty/null, all kids can see)
    appleAlbumId: v.optional(v.string()), // Album ID for reference (optional)
    trackNumber: v.optional(v.number()), // Track number in album (optional)
  })
    .index("by_user", ["userId"])
    .index("by_kid_profile", ["kidProfileId"])
    .index("by_user_and_song", ["userId", "appleSongId"])
    .index("by_user_featured", ["userId", "featured"]),

  // Album tracks (songs from approved albums)
  albumTracks: defineTable({
    userId: v.id("users"), // Parent who owns the album
    appleAlbumId: v.string(), // Which album this track belongs to
    appleSongId: v.string(), // Apple Music song ID
    songName: v.string(),
    artistName: v.string(),
    trackNumber: v.optional(v.number()),
    durationInMillis: v.optional(v.number()),
    isExplicit: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_album", ["userId", "appleAlbumId"])
    .index("by_user_and_song", ["userId", "appleSongId"]),

  // Featured playlists (for Discover section)
  featuredPlaylists: defineTable({
    userId: v.id("users"), // Parent who added it
    applePlaylistId: v.string(), // Apple Music playlist ID
    playlistName: v.string(),
    curatorName: v.optional(v.string()), // Playlist curator (e.g., "Apple Music", user name)
    description: v.optional(v.string()),
    artworkUrl: v.optional(v.string()),
    trackCount: v.optional(v.number()),
    featuredForKids: v.optional(v.array(v.id("kidProfiles"))), // Which kids can see (if empty/null, all kids)
    hideArtwork: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_playlist", ["userId", "applePlaylistId"]),

  // Featured playlist tracks (songs in featured playlists)
  featuredPlaylistTracks: defineTable({
    userId: v.id("users"),
    playlistId: v.id("featuredPlaylists"), // Reference to parent playlist
    appleSongId: v.string(),
    songName: v.string(),
    artistName: v.string(),
    albumName: v.optional(v.string()),
    artworkUrl: v.optional(v.string()),
    durationInMillis: v.optional(v.number()),
    trackNumber: v.number(), // Order in playlist
    isExplicit: v.optional(v.boolean()),
    appleAlbumId: v.optional(v.string()),
  })
    .index("by_playlist", ["playlistId"])
    .index("by_user", ["userId"]),

  // Album requests (kids can request, parents approve)
  albumRequests: defineTable({
    kidProfileId: v.id("kidProfiles"),
    userId: v.id("users"), // Parent who will review
    appleAlbumId: v.string(),
    albumName: v.string(),
    artistName: v.string(),
    artworkUrl: v.optional(v.string()),
    status: v.string(), // "pending", "approved", "denied", "partially_approved"
    requestedAt: v.number(),
    reviewedAt: v.optional(v.number()),
    viewedByKid: v.optional(v.boolean()), // Whether kid has seen the review notification
    denialReason: v.optional(v.string()), // Parent's message explaining why it was denied
    partialApprovalNote: v.optional(v.string()), // Parent's message explaining partial approval
    kidNote: v.optional(v.string()), // Kid's note explaining why they want this
  })
    .index("by_user", ["userId"])
    .index("by_kid_profile", ["kidProfileId"])
    .index("by_status", ["status"]),

  // Song requests (kids can request individual songs, parents approve)
  songRequests: defineTable({
    kidProfileId: v.id("kidProfiles"),
    userId: v.id("users"), // Parent who will review
    appleSongId: v.string(),
    songName: v.string(),
    artistName: v.string(),
    albumName: v.optional(v.string()),
    artworkUrl: v.optional(v.string()),
    status: v.string(), // "pending", "approved", "denied"
    requestedAt: v.number(),
    reviewedAt: v.optional(v.number()),
    viewedByKid: v.optional(v.boolean()), // Whether kid has seen the review notification
    denialReason: v.optional(v.string()), // Parent's message explaining why it was denied
    kidNote: v.optional(v.string()), // Kid's note explaining why they want this
  })
    .index("by_user", ["userId"])
    .index("by_kid_profile", ["kidProfileId"])
    .index("by_status", ["status"]),

  // Playlists
  playlists: defineTable({
    kidProfileId: v.id("kidProfiles"), // Owner of the playlist
    userId: v.id("users"), // Parent user (for access control)
    name: v.string(),
    description: v.optional(v.string()),
    // Array of song objects with all the info we need
    songs: v.array(v.object({
      appleSongId: v.string(),
      songName: v.string(),
      artistName: v.string(),
      albumName: v.optional(v.string()),
      artworkUrl: v.optional(v.string()),
      durationInMillis: v.optional(v.number()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_kid_profile", ["kidProfileId"])
    .index("by_user", ["userId"]),

  // Recently played (for cross-device sync)
  recentlyPlayed: defineTable({
    kidProfileId: v.id("kidProfiles"),
    userId: v.id("users"),
    itemType: v.string(), // "album", "song", or "playlist"
    itemId: v.string(), // The _id from the respective table or appleId
    itemName: v.string(),
    artistName: v.optional(v.string()),
    artworkUrl: v.optional(v.string()),
    playedAt: v.number(),
    playCount: v.optional(v.number()), // Track how many times played
    durationInMillis: v.optional(v.number()), // Track song duration for listening time
    totalListenTimeMs: v.optional(v.number()), // Cumulative listen time for this item
  })
    .index("by_kid_profile", ["kidProfileId"])
    .index("by_kid_and_played", ["kidProfileId", "playedAt"])
    .index("by_kid_and_playcount", ["kidProfileId", "playCount"]),

  // Blocked searches (for parental monitoring)
  blockedSearches: defineTable({
    userId: v.id("users"), // Parent user
    kidProfileId: v.id("kidProfiles"), // Which kid searched
    searchQuery: v.string(), // What they searched for
    blockedReason: v.string(), // Why it was blocked (keyword matched)
    searchedAt: v.number(),
    isRead: v.optional(v.boolean()), // Whether parent has viewed this blocked search
  })
    .index("by_user", ["userId"])
    .index("by_kid_profile", ["kidProfileId"])
    .index("by_user_and_date", ["userId", "searchedAt"])
    .index("by_user_and_read", ["userId", "isRead"]),

  // Subscription events (for audit trail and debugging)
  subscriptionEvents: defineTable({
    userId: v.optional(v.id("users")), // User affected (null if user not found)
    email: v.string(), // User email for tracking
    eventType: v.string(), // "checkout.started", "checkout.completed", "subscription.updated", "subscription.cancelled", "payment.failed", "access.denied", "webhook.received"
    eventData: v.optional(v.string()), // JSON stringified event data
    subscriptionStatus: v.optional(v.string()), // Status after this event
    stripeSubscriptionId: v.optional(v.string()), // Stripe subscription ID
    stripeCustomerId: v.optional(v.string()), // Stripe customer ID
    errorMessage: v.optional(v.string()), // Error message if event failed
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_email", ["email"])
    .index("by_type", ["eventType"])
    .index("by_timestamp", ["timestamp"])
    .index("by_email_and_timestamp", ["email", "timestamp"]),

  // Pre-approved content (artists, genres, albums that auto-approve)
  preApprovedContent: defineTable({
    userId: v.id("users"),
    kidProfileId: v.optional(v.id("kidProfiles")), // null = all kids
    contentType: v.string(), // "artist", "genre", "album"
    artistName: v.optional(v.string()),
    genreName: v.optional(v.string()),
    appleAlbumId: v.optional(v.string()),
    albumName: v.optional(v.string()),
    autoAddToLibrary: v.boolean(),
    hideArtwork: v.optional(v.boolean()),
    preApprovedAt: v.number(),
    preApprovedBy: v.string(),
    notes: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_kid_profile", ["kidProfileId"])
    .index("by_artist", ["userId", "artistName"])
    .index("by_genre", ["userId", "genreName"]),

  // Discovery history (tracks what kids auto-added)
  discoveryHistory: defineTable({
    userId: v.id("users"),
    kidProfileId: v.id("kidProfiles"),
    appleAlbumId: v.string(),
    albumName: v.string(),
    artistName: v.string(),
    artworkUrl: v.optional(v.string()),
    genres: v.optional(v.array(v.string())),
    discoveryMethod: v.string(), // "artist-match", "genre-match", "search-auto-approved", "ai-recommended"
    matchedPreApprovalId: v.optional(v.id("preApprovedContent")),
    autoAddedToLibrary: v.boolean(),
    autoAddedAt: v.optional(v.number()),
    discoveredAt: v.number(),
    viewedByParent: v.optional(v.boolean()),
  })
    .index("by_kid", ["kidProfileId"])
    .index("by_user", ["userId"]),

  // AI recommendation cache (to minimize OpenAI API costs)
  aiRecommendationCache: defineTable({
    queryHash: v.string(), // Hash of (kidAge, musicPreferences, genres, restrictions)
    kidAge: v.optional(v.number()),
    musicPreferences: v.string(),
    targetGenres: v.optional(v.array(v.string())),
    restrictions: v.optional(v.string()),
    recommendations: v.array(v.object({
      type: v.string(), // "artist" | "album" | "genre"
      name: v.string(),
      reason: v.string(),
      ageAppropriate: v.boolean(),
      genres: v.optional(v.array(v.string())),
    })),
    createdAt: v.number(),
    openAiModel: v.string(),
    timesReused: v.number(),
    lastUsedAt: v.number(),
  })
    .index("by_query_hash", ["queryHash"])
    .index("by_created_at", ["createdAt"]),

  // Content review cache (NEVER review same song/album twice)
  contentReviewCache: defineTable({
    appleTrackId: v.optional(v.string()),
    appleAlbumId: v.optional(v.string()),
    reviewType: v.string(), // "song" | "album"
    trackName: v.optional(v.string()),
    albumName: v.optional(v.string()),
    artistName: v.string(),
    lyrics: v.optional(v.string()),
    lyricsSource: v.optional(v.string()),
    summary: v.string(),
    positiveAspects: v.optional(v.array(v.string())), // Added for balanced review
    inappropriateContent: v.array(v.object({
      category: v.string(),
      severity: v.string(),
      quote: v.string(),
      context: v.string(),
    })),
    overallRating: v.string(), // "appropriate", "use-caution", "inappropriate"
    ageRecommendation: v.optional(v.string()),
    reviewedAt: v.number(),
    openAiModel: v.string(),
    timesReused: v.number(),
    lastAccessedAt: v.number(),
  })
    .index("by_track_id", ["appleTrackId"])
    .index("by_album_id", ["appleAlbumId"])
    .index("by_artist", ["artistName"]),

  // Album overview cache (quick AI assessment without lyrics)
  albumOverviewCache: defineTable({
    appleAlbumId: v.string(),
    albumName: v.string(),
    artistName: v.string(),
    trackCount: v.number(),
    overallImpression: v.string(),
    artistProfile: v.string(),
    recommendation: v.string(), // "Likely Safe" | "Review Recommended" | "Detailed Review Required"
    suggestedAction: v.string(),
    reviewedAt: v.number(),
  })
    .index("by_album_id", ["appleAlbumId"]),

  // Email notification batching (prevent spam by batching requests)
  emailNotificationBatch: defineTable({
    userId: v.id("users"), // Parent receiving the notifications
    batchType: v.string(), // "new_requests" | "weekly_digest" | "product_updates"
    pendingItems: v.array(v.object({
      itemType: v.string(), // "album_request" | "song_request"
      itemId: v.string(), // Request ID (stored as string to handle both album and song requests)
      kidName: v.string(), // Name of kid who requested
      contentName: v.string(), // Album or song name
      artistName: v.string(),
      requestedAt: v.number(),
    })),
    firstRequestAt: v.number(), // When first item was added to batch
    lastEmailSentAt: v.optional(v.number()), // Last time email was sent (for throttling)
    shouldSendAt: v.number(), // When to send the batched email (15 min from first request)
    emailSent: v.boolean(), // Whether email has been sent
    sentAt: v.optional(v.number()), // When email was actually sent
  })
    .index("by_user", ["userId"])
    .index("by_user_and_type", ["userId", "batchType"])
    .index("by_should_send", ["shouldSendAt"])
    .index("by_email_sent", ["emailSent"]),

  // Rate limiting (prevent abuse and spam)
  rateLimits: defineTable({
    identifier: v.string(), // IP address, email, or userId
    action: v.string(), // "login", "signup", "request", "search"
    attempts: v.number(), // Number of attempts
    firstAttemptAt: v.number(), // When first attempt was made
    lastAttemptAt: v.number(), // When last attempt was made
    expiresAt: v.number(), // When this rate limit record expires
  })
    .index("by_identifier_and_action", ["identifier", "action"])
    .index("by_expires", ["expiresAt"]),

  // Push notification subscriptions
  pushSubscriptions: defineTable({
    userId: v.id("users"), // Parent who subscribed
    endpoint: v.string(), // Push service endpoint URL
    p256dh: v.string(), // Public key for encryption
    auth: v.string(), // Auth secret
    deviceInfo: v.optional(v.string()), // Browser/device info for management
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()), // Track when last notification was sent
  })
    .index("by_user", ["userId"])
    .index("by_endpoint", ["endpoint"]),

  // AI Search cache (natural language music search)
  aiSearchCache: defineTable({
    queryHash: v.string(), // Hash of the original query
    originalQuery: v.string(), // The natural language query
    suggestions: v.array(v.any()), // AI-generated suggestions
    searchTerms: v.array(v.string()), // Recommended Apple Music search terms
    ageRange: v.optional(v.string()), // Inferred age range
    era: v.optional(v.any()), // Time period if specified
    genres: v.optional(v.array(v.string())), // Inferred genres
    createdAt: v.number(),
    timesReused: v.number(),
    lastUsedAt: v.number(),
  })
    .index("by_query_hash", ["queryHash"])
    .index("by_created_at", ["createdAt"]),

  // Archived kid profiles (for restore within 30 days)
  archivedKidProfiles: defineTable({
    userId: v.id("users"), // Parent who owns this
    originalProfileId: v.string(), // Original kidProfile _id (as string since profile is deleted)
    // Profile data
    name: v.string(),
    avatar: v.optional(v.string()),
    color: v.optional(v.string()),
    pin: v.optional(v.string()),
    originalCreatedAt: v.number(),
    favoriteGenres: v.optional(v.array(v.string())),
    favoriteArtists: v.optional(v.array(v.string())),
    ageRange: v.optional(v.string()),
    musicPreferences: v.optional(v.string()),
    dailyTimeLimitMinutes: v.optional(v.number()),
    timeLimitEnabled: v.optional(v.boolean()),
    // Archived data (JSON blobs for simplicity)
    archivedSongs: v.optional(v.string()), // JSON array of approvedSongs
    archivedPlaylists: v.optional(v.string()), // JSON array of playlists
    archivedRecentlyPlayed: v.optional(v.string()), // JSON array of recentlyPlayed
    archivedRequests: v.optional(v.string()), // JSON array of album/song requests
    archivedBlockedSearches: v.optional(v.string()), // JSON array of blocked searches
    // Archive metadata
    archivedAt: v.number(),
    expiresAt: v.number(), // 30 days from archivedAt
    archiveReason: v.string(), // "deleted_by_parent"
  })
    .index("by_user", ["userId"])
    .index("by_expires", ["expiresAt"]),
}, { schemaValidation: false }); // Disable schema validation temporarily to allow legacy data

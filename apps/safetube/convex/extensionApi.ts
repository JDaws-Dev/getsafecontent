import { v } from "convex/values";
import { httpAction, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { resolveTubeIdentity } from "./identity";

// The extension authenticates as the PARENT, with the same Marketing Central
// login token the web app holds (it copies `safetube_jwt` from getsafetube.com).
// It used to authenticate with the family code alone — but the family code is
// what the KIDS type to log in, so any kid who knew it could have approved
// their own videos through this endpoint. The August hardening made the
// underlying queries demand a parent token anyway, which is what broke it.
export const resolveExtensionUser = internalQuery({
  args: { userToken: v.string() },
  handler: async (ctx, args) => {
    const me = await resolveTubeIdentity(ctx, args.userToken);
    if (!me) return null;
    return {
      _id: me._id,
      email: me.email,
      subscriptionStatus: me.subscriptionStatus,
      trialEndsAt: me.trialEndsAt,
    };
  },
});

function bearerToken(request: Request): string | undefined {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || undefined;
}

function signInResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: "Please sign in to SafeTube again.", code: "SIGN_IN" }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Family codes are 6 chars (~1B combinations with the 32-char alphabet, but
// only a few dozen are live) — per-IP rate limiting makes enumeration
// impractical without affecting real extension/kid usage.
function rateLimitResponse(retryAfter: number, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    }
  );
}

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// Extension API: Add video to SafeTube
// Called from Chrome extension when parent clicks "Add to SafeTube"
const extensionAddVideo = httpAction(async (ctx, request) => {
  // Handle CORS
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const rate = await ctx.runMutation(internal.rateLimit.checkAndCount, {
    identifier: `ext-add:${clientIp(request)}`,
    maxRequests: 30,
    windowMs: 60 * 1000,
  });
  if (rate.limited) return rateLimitResponse(rate.retryAfter, corsHeaders);

  try {
    const userToken = bearerToken(request);
    if (!userToken) return signInResponse(corsHeaders);

    const body = await request.json();
    const {
      kidProfileIds,
      videoId,
      title,
      thumbnailUrl,
      channelId,
      channelTitle,
      duration,
      durationSeconds,
    } = body;

    // Validate required fields
    if (!kidProfileIds?.length || !videoId || !title || !channelId || !channelTitle) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Who is the parent? Verified from the token, never from the request body.
    const user = await ctx.runQuery(internal.extensionApi.resolveExtensionUser, { userToken });
    if (!user) return signInResponse(corsHeaders);

    // Check subscription status
    const isTrialExpired = user.subscriptionStatus === "trial" &&
      user.trialEndsAt &&
      Date.now() > user.trialEndsAt;

    if (isTrialExpired) {
      return new Response(
        JSON.stringify({ error: "Trial expired. Please subscribe to continue." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get kid profiles and verify they belong to this user
    const kidProfiles = await ctx.runQuery(api.kidProfiles.getKidProfiles, { userId: user._id, userToken });
    const validKidIds = kidProfiles.map((p: { _id: string }) => p._id);

    // Filter to only valid kid IDs
    const filteredKidIds = kidProfileIds.filter((id: string) => validKidIds.includes(id));

    if (filteredKidIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid kid profiles selected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add video to each selected kid profile
    await ctx.runMutation(api.videos.addVideoToMultipleKids, {
      userId: user._id,
      kidProfileIds: filteredKidIds,
      videoId,
      title,
      thumbnailUrl: thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      channelId,
      channelTitle,
      duration: duration || "0:00",
      durationSeconds: durationSeconds || 0,
      madeForKids: false, // Extension doesn't have this info
      userToken,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Video added for ${filteredKidIds.length} kid(s)`,
        addedFor: filteredKidIds.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Extension API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Extension API: Get kid profiles for a family code
// Called from Chrome extension popup to show kid selection
const extensionGetKids = httpAction(async (ctx, request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Tighter limit here: this endpoint returns kid names — cheap to be strict.
  const rate = await ctx.runMutation(internal.rateLimit.checkAndCount, {
    identifier: `ext-kids:${clientIp(request)}`,
    maxRequests: 10,
    windowMs: 60 * 1000,
  });
  if (rate.limited) return rateLimitResponse(rate.retryAfter, corsHeaders);

  try {
    const userToken = bearerToken(request);
    if (!userToken) return signInResponse(corsHeaders);

    const user = await ctx.runQuery(internal.extensionApi.resolveExtensionUser, { userToken });
    if (!user) return signInResponse(corsHeaders);

    // Get kid profiles
    const kidProfiles = await ctx.runQuery(api.kidProfiles.getKidProfiles, { userId: user._id, userToken });

    return new Response(
      JSON.stringify({
        success: true,
        email: user.email,
        kids: kidProfiles.map((p: { _id: string; name: string; color: string; icon: string }) => ({
          id: p._id,
          name: p.name,
          color: p.color,
          icon: p.icon,
        })),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Extension API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

export { extensionAddVideo, extensionGetKids };

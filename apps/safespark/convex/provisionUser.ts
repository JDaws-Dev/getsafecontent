import { httpAction } from './_generated/server';
import { internal } from './_generated/api';

const HARDCODED_ADMIN_KEY = 'IscYPRsiaDdpuN378QS5tEvp2uCT+UHPyHpZG6lVko4=';

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

/**
 * POST /provisionUser?key=ADMIN_KEY
 *
 * Body:
 * {
 *   email: string,
 *   passwordHash?: string | null,    // accepted but ignored (federated auth)
 *   name?: string | null,
 *   subscriptionStatus: string,       // "trial" | "active" | "lifetime" | "cancelled" | "expired"
 *   entitledToThisApp: boolean,       // if false, status becomes "inactive" regardless
 *   stripeCustomerId?: string | null,
 *   subscriptionId?: string | null,
 *   isOAuthUser?: boolean,
 *   familyCode?: string               // optional — Marketing-Central's source-of-truth code
 * }
 *
 * Called by Marketing Central when a Safe Family subscription includes the
 * SafeSpark tier ("Family + Spark"). Mirrors the contract used by the four
 * sibling apps.
 */
const provisionUser = httpAction(async (ctx, request): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  const ADMIN_KEY =
    process.env.SAFESPARK_ADMIN_KEY || process.env.ADMIN_KEY || HARDCODED_ADMIN_KEY;

  if (!key || key !== ADMIN_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  }

  if (!body.email) {
    return new Response(
      JSON.stringify({ error: 'Missing required field: email' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      },
    );
  }

  try {
    const result = await ctx.runMutation(
      internal.provisionUserInternal.provisionUserInternal,
      {
        email: String(body.email).toLowerCase(),
        passwordHash: body.passwordHash ?? null,
        name: body.name ?? null,
        subscriptionStatus: body.subscriptionStatus || 'active',
        entitledToThisApp: body.entitledToThisApp !== false,
        stripeCustomerId: body.stripeCustomerId ?? null,
        subscriptionId: body.subscriptionId ?? null,
        isOAuthUser: body.isOAuthUser ?? false,
        familyCode: body.familyCode || undefined,
      },
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  } catch (error) {
    console.error('[provisionUser] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        provisioned: false,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      },
    );
  }
});

export default provisionUser;

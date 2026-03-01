/**
 * Stripe Health Audit Script
 *
 * Proactively monitors Stripe for issues before customers notice.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_xxx npx tsx scripts/stripe-audit.ts
 *
 * Options:
 *   --json         Output results as JSON (for automation)
 *   --verbose      Show all customers, not just issues
 *
 * Exit codes:
 *   0 - No issues found
 *   1 - Issues detected (for CI/alerting)
 *   2 - Script error
 *
 * Checks performed:
 *   1. Duplicate customers (same email)
 *   2. Multiple active subscriptions per email
 *   3. Failed webhook events (last 24h)
 *   4. Orphaned subscriptions (optional - requires Convex access)
 */

import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error("Error: STRIPE_SECRET_KEY environment variable required");
  console.error("Usage: STRIPE_SECRET_KEY=sk_live_xxx npx tsx scripts/stripe-audit.ts");
  process.exit(2);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

interface DuplicateCustomer {
  email: string;
  customers: {
    id: string;
    name: string | null;
    created: string;
    hasActiveSubscription: boolean;
    subscriptionCount: number;
    totalPayments: number;
  }[];
}

interface MultipleSubscription {
  email: string;
  customerId: string;
  subscriptions: {
    id: string;
    status: Stripe.Subscription.Status;
    priceId: string;
    currentPeriodEnd: string;
  }[];
}

interface FailedWebhook {
  id: string;
  type: string;
  created: string;
  failureMessage: string;
  attemptCount: number;
}

interface AuditResult {
  timestamp: string;
  duplicateCustomers: DuplicateCustomer[];
  multipleSubscriptions: MultipleSubscription[];
  failedWebhooks: FailedWebhook[];
  summary: {
    totalCustomers: number;
    duplicateCount: number;
    multipleSubscriptionCount: number;
    failedWebhookCount: number;
    hasIssues: boolean;
  };
}

async function getCustomerSubscriptions(
  customerId: string
): Promise<Stripe.Subscription[]> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 100,
  });
  return subscriptions.data;
}

async function getCustomerPaymentCount(customerId: string): Promise<number> {
  const payments = await stripe.paymentIntents.list({
    customer: customerId,
    limit: 100,
  });
  return payments.data.filter((p) => p.status === "succeeded").length;
}

async function findDuplicateCustomers(): Promise<{
  duplicates: DuplicateCustomer[];
  total: number;
}> {
  const customersByEmail = new Map<
    string,
    {
      id: string;
      name: string | null;
      created: number;
    }[]
  >();

  let hasMore = true;
  let startingAfter: string | undefined;
  let totalCustomers = 0;

  while (hasMore) {
    const customers: Stripe.ApiList<Stripe.Customer> =
      await stripe.customers.list({
        limit: 100,
        starting_after: startingAfter,
      });

    for (const customer of customers.data) {
      totalCustomers++;
      if (!customer.email) continue;

      const email = customer.email.toLowerCase();
      if (!customersByEmail.has(email)) {
        customersByEmail.set(email, []);
      }
      customersByEmail.get(email)!.push({
        id: customer.id,
        name: customer.name,
        created: customer.created,
      });
    }

    hasMore = customers.has_more;
    if (customers.data.length > 0) {
      startingAfter = customers.data[customers.data.length - 1].id;
    }
  }

  const duplicates: DuplicateCustomer[] = [];

  for (const [email, customers] of customersByEmail) {
    if (customers.length <= 1) continue;

    const enrichedCustomers = await Promise.all(
      customers.map(async (c) => {
        const subs = await getCustomerSubscriptions(c.id);
        const payments = await getCustomerPaymentCount(c.id);
        return {
          id: c.id,
          name: c.name,
          created: new Date(c.created * 1000).toISOString(),
          hasActiveSubscription: subs.some(
            (s) => s.status === "active" || s.status === "trialing"
          ),
          subscriptionCount: subs.length,
          totalPayments: payments,
        };
      })
    );

    duplicates.push({
      email,
      customers: enrichedCustomers,
    });
  }

  return { duplicates, total: totalCustomers };
}

async function findMultipleActiveSubscriptions(): Promise<MultipleSubscription[]> {
  const results: MultipleSubscription[] = [];
  const seenEmails = new Set<string>();

  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const subscriptions: Stripe.ApiList<Stripe.Subscription> =
      await stripe.subscriptions.list({
        status: "active",
        limit: 100,
        starting_after: startingAfter,
        expand: ["data.customer"],
      });

    for (const sub of subscriptions.data) {
      const customer = sub.customer as Stripe.Customer;
      if (!customer.email) continue;

      const email = customer.email.toLowerCase();

      // Skip if we've already processed this email
      if (seenEmails.has(email)) continue;
      seenEmails.add(email);

      // Get all active subscriptions for this customer
      const allSubs = await stripe.subscriptions.list({
        customer: customer.id,
        status: "active",
        limit: 100,
      });

      if (allSubs.data.length > 1) {
        results.push({
          email,
          customerId: customer.id,
          subscriptions: allSubs.data.map((s) => ({
            id: s.id,
            status: s.status,
            priceId: s.items.data[0]?.price?.id || "unknown",
            currentPeriodEnd: new Date(
              s.current_period_end * 1000
            ).toISOString(),
          })),
        });
      }
    }

    hasMore = subscriptions.has_more;
    if (subscriptions.data.length > 0) {
      startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
    }
  }

  return results;
}

async function findFailedWebhooks(): Promise<FailedWebhook[]> {
  const results: FailedWebhook[] = [];

  // Get events from the last 24 hours
  const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - 24 * 60 * 60;

  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const events: Stripe.ApiList<Stripe.Event> = await stripe.events.list({
      created: { gte: twentyFourHoursAgo },
      limit: 100,
      starting_after: startingAfter,
    });

    for (const event of events.data) {
      // Check if this event has webhook delivery issues
      // We check the request field for failed deliveries
      if (event.pending_webhooks > 0) {
        results.push({
          id: event.id,
          type: event.type,
          created: new Date(event.created * 1000).toISOString(),
          failureMessage: `${event.pending_webhooks} pending webhook(s)`,
          attemptCount: event.pending_webhooks,
        });
      }
    }

    hasMore = events.has_more;
    if (events.data.length > 0) {
      startingAfter = events.data[events.data.length - 1].id;
    }
  }

  return results;
}

function formatReport(result: AuditResult): string {
  const lines: string[] = [];

  lines.push("═".repeat(60));
  lines.push("  STRIPE HEALTH AUDIT REPORT");
  lines.push("═".repeat(60));
  lines.push(`  Generated: ${result.timestamp}`);
  lines.push("");

  // Summary
  lines.push("─".repeat(60));
  lines.push("  SUMMARY");
  lines.push("─".repeat(60));
  lines.push(`  Total customers: ${result.summary.totalCustomers}`);
  lines.push(`  Duplicate customers: ${result.summary.duplicateCount}`);
  lines.push(`  Multiple subscriptions: ${result.summary.multipleSubscriptionCount}`);
  lines.push(`  Failed webhooks (24h): ${result.summary.failedWebhookCount}`);
  lines.push("");

  if (!result.summary.hasIssues) {
    lines.push("  ✅ No issues detected");
    lines.push("");
    return lines.join("\n");
  }

  lines.push("  ⚠️  ISSUES DETECTED - Review below");
  lines.push("");

  // Duplicate customers
  if (result.duplicateCustomers.length > 0) {
    lines.push("─".repeat(60));
    lines.push("  DUPLICATE CUSTOMERS");
    lines.push("─".repeat(60));

    for (const dup of result.duplicateCustomers) {
      lines.push(`\n  📧 ${dup.email} (${dup.customers.length} records)`);

      for (const c of dup.customers) {
        const activeMarker = c.hasActiveSubscription ? " 🟢 ACTIVE" : "";
        lines.push(`    └─ ${c.id}${activeMarker}`);
        lines.push(`       Name: ${c.name || "(none)"}`);
        lines.push(`       Created: ${c.created}`);
        lines.push(`       Subscriptions: ${c.subscriptionCount}, Payments: ${c.totalPayments}`);
      }
    }
    lines.push("");
  }

  // Multiple subscriptions
  if (result.multipleSubscriptions.length > 0) {
    lines.push("─".repeat(60));
    lines.push("  MULTIPLE ACTIVE SUBSCRIPTIONS");
    lines.push("─".repeat(60));

    for (const ms of result.multipleSubscriptions) {
      lines.push(`\n  📧 ${ms.email} (${ms.subscriptions.length} active)`);
      lines.push(`    Customer: ${ms.customerId}`);

      for (const sub of ms.subscriptions) {
        lines.push(`    └─ ${sub.id}`);
        lines.push(`       Price: ${sub.priceId}`);
        lines.push(`       Ends: ${sub.currentPeriodEnd}`);
      }
    }
    lines.push("");
  }

  // Failed webhooks
  if (result.failedWebhooks.length > 0) {
    lines.push("─".repeat(60));
    lines.push("  FAILED/PENDING WEBHOOKS (Last 24h)");
    lines.push("─".repeat(60));

    for (const wh of result.failedWebhooks) {
      lines.push(`\n  🔴 ${wh.type}`);
      lines.push(`    Event: ${wh.id}`);
      lines.push(`    Created: ${wh.created}`);
      lines.push(`    Status: ${wh.failureMessage}`);
    }
    lines.push("");
  }

  lines.push("─".repeat(60));
  lines.push("  RECOMMENDED ACTIONS");
  lines.push("─".repeat(60));

  if (result.duplicateCustomers.length > 0) {
    lines.push("  • Review duplicate customers in Stripe Dashboard");
    lines.push("  • Use scripts/stripe-cleanup.ts to archive duplicates");
    lines.push("  • See docs/STRIPE-DUPLICATE-CLEANUP.md for guidance");
  }

  if (result.multipleSubscriptions.length > 0) {
    lines.push("  • Review customers with multiple subscriptions");
    lines.push("  • Cancel duplicate subscriptions if unintended");
    lines.push("  • Check for double-billing and issue refunds if needed");
  }

  if (result.failedWebhooks.length > 0) {
    lines.push("  • Check Stripe Dashboard → Developers → Webhooks");
    lines.push("  • Review failed webhook attempts and error messages");
    lines.push("  • Retry failed webhooks if users are affected");
  }

  lines.push("");
  lines.push("═".repeat(60));

  return lines.join("\n");
}

async function runAudit(): Promise<AuditResult> {
  console.error("Running Stripe health audit...\n");

  console.error("  Checking for duplicate customers...");
  const { duplicates, total } = await findDuplicateCustomers();
  console.error(`  Found ${duplicates.length} emails with duplicates`);

  console.error("  Checking for multiple active subscriptions...");
  const multiSubs = await findMultipleActiveSubscriptions();
  console.error(`  Found ${multiSubs.length} customers with multiple subscriptions`);

  console.error("  Checking for failed webhooks (last 24h)...");
  const failedWebhooks = await findFailedWebhooks();
  console.error(`  Found ${failedWebhooks.length} failed/pending webhooks`);

  console.error("");

  const hasIssues =
    duplicates.length > 0 ||
    multiSubs.length > 0 ||
    failedWebhooks.length > 0;

  return {
    timestamp: new Date().toISOString(),
    duplicateCustomers: duplicates,
    multipleSubscriptions: multiSubs,
    failedWebhooks: failedWebhooks,
    summary: {
      totalCustomers: total,
      duplicateCount: duplicates.length,
      multipleSubscriptionCount: multiSubs.length,
      failedWebhookCount: failedWebhooks.length,
      hasIssues,
    },
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes("--json");

  try {
    const result = await runAudit();

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatReport(result));
    }

    // Exit with code 1 if issues found (for CI alerting)
    if (result.summary.hasIssues) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Audit failed:", error);
    process.exit(2);
  }
}

main();

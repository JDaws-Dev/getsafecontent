/**
 * Stripe Duplicate Customer Cleanup Script
 *
 * This script identifies and helps clean up duplicate Stripe customers.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_xxx npx tsx scripts/stripe-cleanup.ts
 *
 * Actions:
 *   --dry-run      List duplicates without making changes (default)
 *   --archive      Archive inactive duplicate customers
 *   --list-all     List all customers with their subscription status
 */

import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error("Error: STRIPE_SECRET_KEY environment variable required");
  console.error("Usage: STRIPE_SECRET_KEY=sk_live_xxx npx tsx scripts/stripe-cleanup.ts");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

interface CustomerInfo {
  id: string;
  email: string | null;
  name: string | null;
  created: Date;
  subscriptions: {
    id: string;
    status: Stripe.Subscription.Status;
    currentPeriodEnd: Date;
    priceId: string;
  }[];
  hasActiveSubscription: boolean;
  totalPayments: number;
}

async function getCustomerInfo(customer: Stripe.Customer): Promise<CustomerInfo> {
  // Get subscriptions
  const subscriptions = await stripe.subscriptions.list({
    customer: customer.id,
    limit: 100,
  });

  // Get payment intents to count successful payments
  const payments = await stripe.paymentIntents.list({
    customer: customer.id,
    limit: 100,
  });

  const successfulPayments = payments.data.filter(
    (p) => p.status === "succeeded"
  ).length;

  const hasActiveSubscription = subscriptions.data.some(
    (s) => s.status === "active" || s.status === "trialing"
  );

  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    created: new Date(customer.created * 1000),
    subscriptions: subscriptions.data.map((s) => ({
      id: s.id,
      status: s.status,
      currentPeriodEnd: new Date(s.current_period_end * 1000),
      priceId: s.items.data[0]?.price?.id || "unknown",
    })),
    hasActiveSubscription,
    totalPayments: successfulPayments,
  };
}

async function findDuplicateCustomers(): Promise<Map<string, CustomerInfo[]>> {
  console.log("Fetching all customers...");

  const customersByEmail = new Map<string, CustomerInfo[]>();

  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const customers: Stripe.ApiList<Stripe.Customer> = await stripe.customers.list({
      limit: 100,
      starting_after: startingAfter,
    });

    for (const customer of customers.data) {
      if (!customer.email) continue;

      const email = customer.email.toLowerCase();
      const info = await getCustomerInfo(customer);

      if (!customersByEmail.has(email)) {
        customersByEmail.set(email, []);
      }
      customersByEmail.get(email)!.push(info);
    }

    hasMore = customers.has_more;
    if (customers.data.length > 0) {
      startingAfter = customers.data[customers.data.length - 1].id;
    }

    process.stdout.write(`  Processed ${customersByEmail.size} unique emails...\r`);
  }

  console.log("\n");

  // Filter to only duplicates
  const duplicates = new Map<string, CustomerInfo[]>();
  for (const [email, customers] of customersByEmail) {
    if (customers.length > 1) {
      duplicates.set(email, customers);
    }
  }

  return duplicates;
}

async function archiveCustomer(customerId: string): Promise<void> {
  // Cancel all subscriptions first
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 100,
  });

  for (const sub of subscriptions.data) {
    if (sub.status !== "canceled") {
      console.log(`  Canceling subscription ${sub.id}...`);
      await stripe.subscriptions.cancel(sub.id);
    }
  }

  // Delete the customer (archives in Stripe)
  console.log(`  Deleting customer ${customerId}...`);
  await stripe.customers.del(customerId);
}

function printCustomerInfo(customer: CustomerInfo, indent = ""): void {
  console.log(`${indent}Customer: ${customer.id}`);
  console.log(`${indent}  Name: ${customer.name || "(none)"}`);
  console.log(`${indent}  Created: ${customer.created.toISOString()}`);
  console.log(`${indent}  Payments: ${customer.totalPayments}`);
  console.log(`${indent}  Active subscription: ${customer.hasActiveSubscription ? "YES" : "no"}`);

  if (customer.subscriptions.length > 0) {
    console.log(`${indent}  Subscriptions:`);
    for (const sub of customer.subscriptions) {
      console.log(
        `${indent}    - ${sub.id}: ${sub.status} (ends ${sub.currentPeriodEnd.toISOString()})`
      );
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--archive");
  const listAll = args.includes("--list-all");

  console.log("=== Stripe Duplicate Customer Cleanup ===\n");

  if (listAll) {
    console.log("Listing all customers with subscription status...\n");

    let hasMore = true;
    let startingAfter: string | undefined;
    let count = 0;

    while (hasMore) {
      const customers: Stripe.ApiList<Stripe.Customer> = await stripe.customers.list({
        limit: 100,
        starting_after: startingAfter,
      });

      for (const customer of customers.data) {
        const info = await getCustomerInfo(customer);
        console.log(`${info.email || "(no email)"}`);
        printCustomerInfo(info, "  ");
        console.log("");
        count++;
      }

      hasMore = customers.has_more;
      if (customers.data.length > 0) {
        startingAfter = customers.data[customers.data.length - 1].id;
      }
    }

    console.log(`\nTotal customers: ${count}`);
    return;
  }

  const duplicates = await findDuplicateCustomers();

  if (duplicates.size === 0) {
    console.log("No duplicate customers found!");
    return;
  }

  console.log(`Found ${duplicates.size} emails with duplicate customers:\n`);

  for (const [email, customers] of duplicates) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`EMAIL: ${email} (${customers.length} customers)`);
    console.log("=".repeat(60));

    // Sort by: has active subscription first, then by total payments, then by creation date
    customers.sort((a, b) => {
      if (a.hasActiveSubscription !== b.hasActiveSubscription) {
        return a.hasActiveSubscription ? -1 : 1;
      }
      if (a.totalPayments !== b.totalPayments) {
        return b.totalPayments - a.totalPayments;
      }
      return a.created.getTime() - b.created.getTime();
    });

    const primary = customers[0];
    const duplicatesForEmail = customers.slice(1);

    console.log("\n[KEEP] Primary customer:");
    printCustomerInfo(primary, "  ");

    console.log("\n[ARCHIVE] Duplicate customers:");
    for (const dup of duplicatesForEmail) {
      printCustomerInfo(dup, "  ");
      console.log("");

      if (!dryRun) {
        if (dup.hasActiveSubscription) {
          console.log("  ⚠️  SKIPPING: Has active subscription - manual review needed");
        } else {
          console.log("  🗑️  Archiving...");
          await archiveCustomer(dup.id);
          console.log("  ✅ Archived");
        }
      }
    }
  }

  console.log("\n" + "=".repeat(60));

  if (dryRun) {
    console.log("\n📋 DRY RUN - No changes made");
    console.log("To archive duplicates, run with --archive flag");
    console.log("\n⚠️  IMPORTANT: Review the output above before archiving!");
    console.log("   Customers with active subscriptions will be skipped.");
  } else {
    console.log("\n✅ Cleanup complete");
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

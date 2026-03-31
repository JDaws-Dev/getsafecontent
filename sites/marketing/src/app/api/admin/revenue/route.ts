import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// In-memory cache (5 minutes)
let cache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

// Actual Stripe price ID → product name mapping
const PRICE_NAMES: Record<string, string> = {
  "price_1SxaerKgkIT46sg7NHNy0wk8": "Safe Content Bundle (3 Apps Monthly)",
  "price_1SzLJUKgkIT46sg7xsKo2A71": "SafeFamily Yearly",
  "price_1SzNlSKgkIT46sg7T88Bxq6p": "Safe Family (2 Apps)",
  "price_1SzHuYKgkIT46sg7hUR4Uwn5": "SafeReads",
  "price_1SuTVpKgkIT46sg7oQewxC58": "SafeReads (Legacy)",
  "price_1Spp7oKgkIT46sg7oJIKGfMG": "SafeTube",
  "price_1SUXOjKgkIT46sg7RKwIgAVv": "SafeTunes",
};

function isTestEmail(email: string): boolean {
  return email.includes("@test.getsafefamily.com") || email.includes("@test.com");
}

// Safe Family charge amounts in cents - used to filter out non-SF charges
// (e.g. 3D Jumpstart $40, Level 1 Course $360/$670)
const SAFE_FAMILY_AMOUNTS_CENTS = new Set([299, 499, 799, 999, 9900]);

export async function GET() {
  const session = await auth();

  if (!session?.user?.email || session.user.email !== "jedaws@gmail.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check cache
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

    // Fetch Stripe data in parallel
    const [subscriptions, charges, refunds] = await Promise.all([
      stripe.subscriptions.list({
        status: "active",
        limit: 100,
        expand: ["data.customer", "data.plan"],
      }),
      stripe.charges.list({
        limit: 50,
        created: { gte: thirtyDaysAgo },
      }),
      stripe.refunds.list({ limit: 20 }),
    ]);

    // Calculate Stripe MRR from active subscriptions (exclude test accounts)
    let stripeMrr = 0;
    let testMrr = 0;
    const planBreakdown: Record<string, { count: number; mrr: number; name: string }> = {};

    for (const sub of subscriptions.data) {
      const plan = sub.items.data[0]?.plan;
      if (!plan) continue;

      const amount = (plan.amount || 0) / 100;
      const interval = plan.interval;
      const monthlyAmount = interval === "year" ? amount / 12 : amount;

      // Check if this is a test subscription
      const customer = sub.customer;
      const email = typeof customer === "object" && customer !== null && "email" in customer
        ? (customer as Stripe.Customer).email || ""
        : "";
      if (isTestEmail(email)) {
        testMrr += monthlyAmount;
        continue; // Skip test accounts from MRR and breakdown
      }

      stripeMrr += monthlyAmount;

      const priceId = sub.items.data[0]?.price?.id || plan.id;
      const planName = PRICE_NAMES[priceId] || plan.nickname || `$${amount}/${interval}`;
      if (!planBreakdown[priceId]) {
        planBreakdown[priceId] = { count: 0, mrr: 0, name: planName };
      }
      planBreakdown[priceId].count++;
      planBreakdown[priceId].mrr += monthlyAmount;
    }

    // Map recent charges to payment objects (exclude test accounts)
    const recentPayments = charges.data
      .map((charge) => {
        const customer = charge.customer;
        let email = "";
        if (typeof customer === "object" && customer !== null && "email" in customer) {
          email = (customer as Stripe.Customer).email || "";
        }
        if (!email) {
          email = charge.receipt_email || charge.billing_details?.email || "";
        }
        return {
          id: charge.id,
          amount: charge.amount / 100,
          currency: charge.currency,
          email,
          date: charge.created * 1000,
          status: charge.status,
          description: charge.description || "",
          isTest: isTestEmail(email),
        };
      })
      .filter((p) => !p.isTest && SAFE_FAMILY_AMOUNTS_CENTS.has(Math.round(p.amount * 100)));

    // Map refunds
    const recentRefunds = refunds.data.map((refund) => ({
      id: refund.id,
      amount: (refund.amount || 0) / 100,
      date: refund.created * 1000,
      reason: refund.reason || "not specified",
      chargeId: typeof refund.charge === "string" ? refund.charge : refund.charge?.id || "",
    }));

    // Calculate monthly trend from charges (last 12 months, exclude test accounts)
    const twelveMonthsAgo = Math.floor((Date.now() - 365 * 24 * 60 * 60 * 1000) / 1000);
    const allCharges = await stripe.charges.list({
      limit: 100,
      created: { gte: twelveMonthsAgo },
      expand: ["data.customer"],
    });

    const monthlyMap = new Map<string, number>();
    for (const charge of allCharges.data) {
      if (charge.status !== "succeeded") continue;
      // Only include Safe Family charge amounts (exclude 3D Jumpstart, courses, etc.)
      if (!SAFE_FAMILY_AMOUNTS_CENTS.has(charge.amount)) continue;
      const custObj = charge.customer;
      const custEmail = typeof custObj === "object" && custObj !== null && "email" in custObj
        ? (custObj as Stripe.Customer).email || ""
        : charge.receipt_email || "";
      if (isTestEmail(custEmail)) continue;
      const date = new Date(charge.created * 1000);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + charge.amount / 100);
    }

    // Build sorted monthly trend array for last 12 months
    const monthlyTrend: { month: string; revenue: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyTrend.push({
        month: key,
        revenue: monthlyMap.get(key) || 0,
      });
    }

    const activeSubscriptions = Object.values(planBreakdown).reduce((sum, p) => sum + p.count, 0);

    const responseData = {
      stripeMrr,
      activeSubscriptions,
      recentPayments,
      recentRefunds,
      planBreakdown,
      monthlyTrend,
    };

    // Update cache
    cache = { data: responseData, timestamp: Date.now() };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching revenue data:", error);
    return NextResponse.json(
      { error: "Failed to fetch revenue data" },
      { status: 500 }
    );
  }
}

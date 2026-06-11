import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const ADMIN_KEY = process.env.ADMIN_API_KEY ?? "";

const ENDPOINTS = {
  marketing: "https://adamant-crow-705.convex.site",
  safetunes: "https://formal-chihuahua-623.convex.site",
  safetube: "https://rightful-rabbit-333.convex.site",
  safereads: "https://exuberant-puffin-838.convex.site",
};

async function fetchSafe<T>(
  url: string,
  label: string
): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.error(`${label} fetch failed: ${res.status}`);
      return null;
    }
    const contentType = res.headers.get("content-type");
    if (contentType?.includes("text/html")) {
      console.warn(`${label} returned HTML instead of JSON`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`${label} fetch error:`, err);
    return null;
  }
}

function findUserByEmail<T extends { email: string }>(
  users: T[] | null,
  email: string
): T | null {
  if (!users || !Array.isArray(users)) return null;
  const normalizedEmail = email.toLowerCase();
  return users.find((u) => u.email?.toLowerCase() === normalizedEmail) || null;
}

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.email || session.user.email !== "jedaws@gmail.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { error: "Missing email parameter" },
      { status: 400 }
    );
  }

  const encodedKey = encodeURIComponent(ADMIN_KEY);
  const encodedEmail = encodeURIComponent(email);

  // Fetch all data sources in parallel
  const [marketingAccount, safetunesUsers, safetubeUsers, safereadsUsers] =
    await Promise.all([
      fetchSafe<Record<string, unknown>>(
        `${ENDPOINTS.marketing}/getAccount?email=${encodedEmail}&key=${encodedKey}`,
        "Marketing"
      ),
      fetchSafe<Array<{ email: string }>>(
        `${ENDPOINTS.safetunes}/adminDashboard?key=${encodedKey}&format=json`,
        "SafeTunes"
      ),
      fetchSafe<Array<{ email: string }>>(
        `${ENDPOINTS.safetube}/adminDashboard?key=${encodedKey}&format=json`,
        "SafeTube"
      ),
      fetchSafe<Array<{ email: string }>>(
        `${ENDPOINTS.safereads}/adminDashboard?key=${encodedKey}&format=json`,
        "SafeReads"
      ),
    ]);

  const safetunesUser = findUserByEmail(safetunesUsers, email);
  const safetubeUser = findUserByEmail(safetubeUsers, email);
  const safereadsUser = findUserByEmail(safereadsUsers, email);

  // Stripe data
  let payments: Array<{
    id: string;
    amount: number;
    currency: string;
    date: number;
    status: string;
    description: string | null;
    refunded: boolean;
    amountRefunded: number;
  }> = [];
  let subscriptions: Array<{
    id: string;
    status: string;
    currentPeriodStart: number | null;
    currentPeriodEnd: number | null;
    cancelAtPeriodEnd: boolean;
    plan: { amount: number; interval: string } | null;
  }> = [];
  let stripeCustomer: Stripe.Customer | null = null;

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const customers = await stripe.customers.search({
      query: `email:"${email}"`,
    });

    if (customers.data.length > 0) {
      stripeCustomer = customers.data[0] as Stripe.Customer;
      const customerId = stripeCustomer.id;

      const [chargesResult, subsResult] = await Promise.all([
        stripe.charges.list({ customer: customerId, limit: 50 }),
        stripe.subscriptions.list({
          customer: customerId,
          limit: 10,
          status: "all",
        }),
      ]);

      payments = chargesResult.data.map((c) => ({
        id: c.id,
        amount: c.amount / 100,
        currency: c.currency,
        date: c.created * 1000,
        status: c.status,
        description: c.description,
        refunded: c.refunded,
        amountRefunded: c.amount_refunded / 100,
      }));

      subscriptions = subsResult.data.map((s) => {
        const item = s.items.data[0];
        return {
          id: s.id,
          status: s.status,
          currentPeriodStart: item ? item.current_period_start * 1000 : null,
          currentPeriodEnd: item ? item.current_period_end * 1000 : null,
          cancelAtPeriodEnd: s.cancel_at_period_end,
          plan: item?.plan
            ? {
                amount: (item.plan.amount || 0) / 100,
                interval: item.plan.interval,
              }
            : null,
        };
      });
    }
  } catch (err) {
    console.error("Stripe fetch error:", err);
  }

  return NextResponse.json({
    marketingAccount,
    safetunes: safetunesUser,
    safetube: safetubeUser,
    safereads: safereadsUser,
    payments,
    subscriptions,
    stripeCustomer: stripeCustomer
      ? { id: stripeCustomer.id, name: stripeCustomer.name, email: stripeCustomer.email, created: stripeCustomer.created * 1000 }
      : null,
  });
}

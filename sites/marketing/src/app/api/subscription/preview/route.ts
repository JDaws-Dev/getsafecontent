import { NextResponse } from "next/server";
import { PLAN_APPS_TEXT, PLAN_NAME, PRICE_PER_MONTH } from "@/lib/pricing";

/**
 * Preview a subscription change.
 *
 * There is ONE plan now (owner decision 2026-11-25): Safe Family,
 * $4.99/month, monthly only, covering SafeTunes, SafeTube and SafeStudy.
 * There is nothing to switch between, so there is nothing to preview. Plan
 * changes and cancellation go through the Stripe billing portal on /account.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: `There's one plan now: ${PLAN_NAME} covers ${PLAN_APPS_TEXT} for ${PRICE_PER_MONTH}. There is nothing to change. To change or cancel your plan, use Manage billing on your account page.`,
      manageBillingUrl: "/account",
    },
    { status: 410 },
  );
}

import UnifiedPricingSection from "./UnifiedPricingSection";

/**
 * Landing-page pricing. There is one plan (owner decision 2026-11-25):
 * Safe Family, $4.99/month, SafeTunes + SafeTube + SafeStudy, monthly only.
 * The old multi-tier / yearly section was removed; this wrapper stays so
 * existing imports keep working.
 */
export default function PricingSection() {
  return <UnifiedPricingSection />;
}

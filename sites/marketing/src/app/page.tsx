import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import StickyMobileCTA from "@/components/layout/StickyMobileCTA";
import Hero from "@/components/landing/Hero";
import ProblemSolutionSection from "@/components/landing/ProblemSolutionSection";
import AppCards from "@/components/landing/AppCards";
import Testimonials from "@/components/landing/Testimonials";
import FAQSection from "@/components/landing/FAQSection";
import PricingSection from "@/components/landing/PricingSection";

export default function Home() {
  return (
    <>
      <Header />
      <StickyMobileCTA />
      <main>
        {/* 1. Hero - Clear bundle value proposition */}
        <Hero />

        {/* 2. Problem - Why parents need this */}
        <ProblemSolutionSection />

        {/* 3. The 5 apps — broad strokes only. Deep dives live on each app's own LP. */}
        <AppCards />

        {/* 4. Social Proof - Testimonials */}
        <Testimonials />

        {/* 5. FAQ - Address objections */}
        <FAQSection />

        {/* 6. Pricing - Single $14.99 plan via UnifiedPricingSection (when flag is on) */}
        <PricingSection />
      </main>
      <Footer />
    </>
  );
}

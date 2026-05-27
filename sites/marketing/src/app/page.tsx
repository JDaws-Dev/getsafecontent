import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import StickyMobileCTA from "@/components/layout/StickyMobileCTA";
import Hero from "@/components/landing/Hero";
import ProblemSolutionSection from "@/components/landing/ProblemSolutionSection";
import AppCards from "@/components/landing/AppCards";
import SafeSparkSpotlight from "@/components/landing/SafeSparkSpotlight";
import DemoSection from "@/components/demo/DemoSection";
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

        {/* 3. Solution - The 5 apps (brief cards, not deep dives) */}
        <AppCards />

        {/* 3b. SafeSpark spotlight - the AI training lab is new and needs more room */}
        <SafeSparkSpotlight />

        {/* 4. Try It - Live demos */}
        <DemoSection />

        {/* 5. Social Proof - Testimonials */}
        <Testimonials />

        {/* 7. FAQ - Address objections */}
        <FAQSection />

        {/* 8. Pricing - Bundle comparison + checkout */}
        <PricingSection />
      </main>
      <Footer />
    </>
  );
}

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import StickyMobileCTA from "@/components/layout/StickyMobileCTA";
import Hero from "@/components/landing/Hero";
import ProblemSolutionSection from "@/components/landing/ProblemSolutionSection";
import AppCards from "@/components/landing/AppCards";
import DemoSection from "@/components/demo/DemoSection";
import Testimonials from "@/components/landing/Testimonials";
import BlogTeaser from "@/components/landing/BlogTeaser";
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

        {/* 3. Solution - The 3 apps (brief cards, not deep dives) */}
        <AppCards />

        {/* 4. Try It - Live demos */}
        <DemoSection />

        {/* 5. Social Proof - Testimonials */}
        <Testimonials />

        {/* 6. Blog Teaser - Build trust & SEO */}
        <BlogTeaser />

        {/* 7. FAQ - Address objections */}
        <FAQSection />

        {/* 8. Pricing - Bundle comparison + checkout */}
        <PricingSection />
      </main>
      <Footer />
    </>
  );
}

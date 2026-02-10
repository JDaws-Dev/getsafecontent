"use client";

import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import {
  BookOpen,
  ScanBarcode,
  Shield,
  Users,
  Heart,
  Camera,
  Sparkles,
  Infinity,
  Check,
  Lock,
  ShieldCheck,
  ChevronDown,
  Star,
} from "lucide-react";

// Testimonials data for SafeReads
const testimonials = [
  {
    quote:
      "SafeReads caught themes in a book I never would have noticed. So grateful I checked before my son read it.",
    author: "Emily T.",
    role: "Mom of 2",
    rating: 5,
    avatarGradient: "from-emerald-400 to-green-500",
  },
  {
    quote:
      "I used to be nervous about every book my daughter picked up. Now I check SafeReads first and can say yes with confidence.",
    author: "David P.",
    role: "Dad of 3",
    rating: 5,
    avatarGradient: "from-sky-400 to-blue-500",
  },
  {
    quote:
      "Finally, a tool that tells me what's actually in the book instead of just giving it a vague 'age rating'. Love the detailed breakdowns.",
    author: "Jessica M.",
    role: "Homeschool Mom",
    rating: 5,
    avatarGradient: "from-amber-400 to-orange-500",
  },
];

// FAQ data for SafeReads
const faqs = [
  {
    question: "How accurate are the book analyses?",
    answer:
      "SafeReads uses GPT-4o to analyze book metadata, descriptions, and summaries from multiple sources. While no AI is perfect, we consistently identify content concerns that match what you'd find in the actual book. We err on the side of caution—if there's any indication of mature content, we'll flag it.",
  },
  {
    question: "Can I request analysis for any book?",
    answer:
      "Yes! You can search for any book by title, author, or ISBN. If it's in our database or available through Google Books or Open Library, we can analyze it. For newer or more obscure titles, results may be based on limited metadata.",
  },
  {
    question: "What age ranges do you cover?",
    answer:
      "We analyze books for all ages, from picture books to young adult fiction. Each analysis includes an age recommendation based on content maturity. You can add your kids' ages to get personalized recommendations.",
  },
  {
    question: "How is this different from Common Sense Media?",
    answer:
      "Common Sense Media relies on human reviewers, which means limited coverage and subjective opinions. SafeReads uses AI to analyze any book instantly, giving you objective content breakdowns (violence, language, etc.) rather than someone else's opinion on what's appropriate.",
  },
  {
    question: "Do you analyze the full book text?",
    answer:
      "We analyze book metadata, descriptions, reviews, and summaries—not the full text. This gives us enough information to identify major content concerns while respecting copyright. Think of it as reading the jacket, reviews, and detailed summaries all at once.",
  },
  {
    question: "What if I want to cancel?",
    answer:
      "Cancel anytime with one click—no phone calls or hoops. You'll keep access through the end of your billing period. Plus, we offer a 30-day money-back guarantee, no questions asked.",
  },
];
import { Footer } from "@/components/Footer";

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  // Show nothing while redirecting signed-in users
  if (isLoading) {
    return <div className="min-h-[calc(100vh-4rem)]" />;
  }
  if (isAuthenticated) {
    return <div className="min-h-[calc(100vh-4rem)]" />;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <section className="bg-parchment-50 pt-16 pb-12 sm:pt-24 sm:pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left side - Text content */}
            <div className="flex-1 text-center lg:text-left max-w-xl lg:max-w-none">
              <div className="inline-flex items-center gap-2 bg-emerald-100 px-4 py-2 rounded-full mb-6">
                <BookOpen className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">
                  AI-Powered Book Content Analysis
                </span>
              </div>

              <h1 className="font-serif text-3xl font-bold text-ink-900 sm:text-4xl lg:text-5xl leading-tight mb-6">
                Every parent deserves to know{" "}
                <span className="text-parchment-700">
                  what&apos;s inside the book
                </span>
              </h1>

              <p className="text-lg text-ink-500 mb-8 max-w-lg mx-auto lg:mx-0">
                Scan a barcode at the bookstore, snap a cover at the library, or
                search any title — SafeReads breaks down violence, language,
                sexual content, and 7 more categories so you can decide
                what&apos;s right for your family.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
                <Link
                  href="/signup"
                  className="w-full sm:w-auto rounded-lg bg-parchment-700 px-8 py-4 text-lg font-semibold text-parchment-50 transition-colors hover:bg-parchment-800 text-center shadow-lg hover:shadow-xl"
                >
                  Get Started — It&apos;s Free
                </Link>
                <a
                  href="#how-it-works"
                  className="text-sm font-medium text-ink-500 transition-colors hover:text-ink-700"
                >
                  See how it works ↓
                </a>
              </div>

              {/* Trust line */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-sm text-ink-400 mb-4">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  7-day free trial
                </span>
                <span className="hidden sm:inline">•</span>
                <span>No credit card required</span>
                <span className="hidden sm:inline">•</span>
                <span>Cancel anytime</span>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  COPPA Compliant
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                  <Lock className="h-3.5 w-3.5" />
                  Data Encrypted
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                  <Shield className="h-3.5 w-3.5" />
                  No Data Selling
                </span>
              </div>
            </div>

            {/* Right side - Hero Photo */}
            <div className="flex-1 relative w-full flex items-center justify-center lg:justify-end">
              <div className="relative max-w-md lg:max-w-lg w-full">
                <div
                  className="relative aspect-[4/5] overflow-hidden shadow-2xl"
                  style={{ borderRadius: "0 3rem 3rem 3rem" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.pexels.com/photos/6437505/pexels-photo-6437505.jpeg?auto=compress&cs=tinysrgb&w=600&h=750&fit=crop"
                    alt="Children reading a book together"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Apps Coming Soon Banner */}
      <section className="py-3 bg-gradient-to-r from-parchment-600 to-parchment-700">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-center gap-3 text-center">
            {/* iOS Icon */}
            <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
            </div>
            {/* Android Icon */}
            <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.523 2.592a.5.5 0 0 0-.867-.5l-1.48 2.56a7.502 7.502 0 0 0-6.352 0l-1.48-2.56a.5.5 0 0 0-.867.5l1.432 2.482a7.528 7.528 0 0 0-3.91 6.576H20a7.528 7.528 0 0 0-3.91-6.576l1.433-2.482zM7 9.5a1 1 0 1 1 2 0 1 1 0 0 1-2 0zm8 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM4 12.65V19.5a2 2 0 0 0 2 2h1V12H4.5a.5.5 0 0 0-.5.65zm15 0V19.5a2 2 0 0 1-2 2h-1V12h2.5a.5.5 0 0 1 .5.65zM8 12v10h8V12H8z"/>
              </svg>
            </div>
            <span className="text-white font-semibold text-sm">iOS & Android Apps Coming Soon</span>
          </div>
        </div>
      </section>

      {/* App Demo Video - iPhone Wrapper */}
      <section className="mx-auto max-w-xs sm:max-w-sm px-4 pb-16 sm:pb-20">
        <div className="relative mx-auto rounded-[3rem] bg-ink-900 p-3 shadow-2xl">
          {/* Dynamic Island */}
          <div className="absolute left-1/2 top-5 z-10 h-7 w-24 -translate-x-1/2 rounded-full bg-ink-900" />
          {/* Screen */}
          <div className="overflow-hidden rounded-[2.5rem] bg-black">
            <video
              className="w-full"
              autoPlay
              muted
              loop
              playsInline
              preload="none"
            >
              <source src="/safereads-app-demo.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="border-y border-parchment-200 bg-parchment-100/50 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center font-serif text-2xl font-bold text-ink-900 sm:text-3xl">
            Look up any book in seconds
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
            <Step
              icon={<ScanBarcode className="h-8 w-8" />}
              title="Scan the barcode"
              description="Point your camera at the ISBN barcode on the back cover for an instant lookup."
            />
            <Step
              icon={<Camera className="h-8 w-8" />}
              title="Snap the cover"
              description="Take a photo of the front cover and our AI will identify the book."
            />
            <Step
              icon={<BookOpen className="h-8 w-8" />}
              title="Search by title"
              description="Type a title, author, or ISBN to search our database of millions of books."
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center font-serif text-2xl font-bold text-ink-900 sm:text-3xl">
            Built for parents who read the fine print
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <Feature
              icon={<Shield className="h-6 w-6 text-verdict-safe" />}
              title="AI Content Review"
              description="Get detailed breakdowns of violence, language, sexual content, substance use, and dark themes — powered by GPT-4o."
            />
            <Feature
              icon={<ScanBarcode className="h-6 w-6 text-parchment-600" />}
              title="Instant Book Lookup"
              description="Scan a barcode or snap a photo. SafeReads identifies the book and pulls metadata from Google Books and Open Library."
            />
            <Feature
              icon={<Users className="h-6 w-6 text-parchment-600" />}
              title="Built for Families"
              description="Add your kids, manage wishlists, and keep track of books you've reviewed. One account for the whole family."
            />
            <Feature
              icon={<Heart className="h-6 w-6 text-verdict-caution" />}
              title="Your Values, Your Choice"
              description="SafeReads gives you the facts about what's in a book. You decide what's right for your family."
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQSection />

      {/* Testimonials */}
      <TestimonialsSection />

      {/* Pricing */}
      <section
        id="pricing"
        className="border-y border-parchment-200 bg-parchment-100/50 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center font-serif text-2xl font-bold text-ink-900 sm:text-3xl">
            Simple, honest pricing
          </h2>
          <p className="mt-3 text-center text-ink-500">
            Try before you buy. Upgrade when you&apos;re ready.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 sm:gap-8 mx-auto max-w-3xl">
            {/* Trial tier */}
            <div className="rounded-xl border border-parchment-200 bg-white p-6">
              <h3 className="font-serif text-lg font-bold text-ink-900">Free Trial</h3>
              <p className="mt-1 text-3xl font-bold text-ink-900">
                7 days
                <span className="text-sm font-normal text-ink-500"> free</span>
              </p>
              <ul className="mt-5 space-y-3 text-sm text-ink-600">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-verdict-safe" />
                  Try the full experience
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-verdict-safe" />
                  Full content breakdowns
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-verdict-safe" />
                  Barcode &amp; cover scanning
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-verdict-safe" />
                  Kids &amp; wishlists
                </li>
              </ul>
              <Link
                href="/signup"
                className="mt-6 block w-full rounded-lg border border-parchment-300 bg-white px-4 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-parchment-50 text-center"
              >
                Get Started
              </Link>
            </div>

            {/* Pro tier */}
            <div className="relative rounded-xl border-2 border-parchment-600 bg-white p-6">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 rounded-full bg-parchment-700 px-3 py-0.5 text-xs font-semibold text-parchment-50">
                  <Sparkles className="h-3 w-3" />
                  Most Popular
                </span>
              </div>
              <h3 className="font-serif text-lg font-bold text-ink-900">Pro</h3>
              <p className="mt-1 text-3xl font-bold text-ink-900">
                $4.99
                <span className="text-sm font-normal text-ink-500">/month</span>
              </p>
              <ul className="mt-5 space-y-3 text-sm text-ink-600">
                <li className="flex items-start gap-2">
                  <Infinity className="mt-0.5 h-4 w-4 shrink-0 text-parchment-700" />
                  Unlimited book reviews
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-verdict-safe" />
                  Priority support
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-verdict-safe" />
                  All features unlocked
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-verdict-safe" />
                  Cancel anytime
                </li>
              </ul>
              <Link
                href="/signup"
                className="mt-6 block w-full rounded-lg bg-parchment-700 px-4 py-2.5 text-sm font-medium text-parchment-50 transition-colors hover:bg-parchment-800 text-center"
              >
                Start Free, Upgrade Later
              </Link>
            </div>
          </div>

          {/* Money-back guarantee */}
          <div className="mt-8 mx-auto max-w-md bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center justify-center gap-2">
            <Shield className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">30-day money-back guarantee — no questions asked</span>
          </div>
        </div>
      </section>

      {/* Trust / Social Proof */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-serif text-2xl font-bold text-ink-900 sm:text-3xl">
            We give you facts, not opinions
          </h2>
          <p className="mt-4 text-ink-500">
            Other sites tell you what to think. SafeReads tells you what&apos;s
            in the book — violence, language, sexual content, dark themes, and
            more — and lets you decide what&apos;s right for your family.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-ink-400">
            <span>10 content categories reviewed</span>
            <span className="hidden sm:inline">&middot;</span>
            <span>No agenda, just clarity</span>
            <span className="hidden sm:inline">&middot;</span>
            <span>7-day free trial</span>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 text-center sm:py-20">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="font-serif text-2xl font-bold text-ink-900 sm:text-3xl">
            Stop guessing. Start knowing.
          </h2>
          <p className="mt-3 text-ink-500">
            Sign up in seconds with Google or email. 7-day free trial —
            no credit card needed.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-block rounded-lg bg-parchment-700 px-8 py-3 text-base font-semibold text-parchment-50 transition-colors hover:bg-parchment-800"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Step({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-parchment-200 text-parchment-700">
        {icon}
      </div>
      <h3 className="mt-4 font-serif text-lg font-bold text-ink-900">
        {title}
      </h3>
      <p className="mt-2 text-sm text-ink-500">{description}</p>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-parchment-200 bg-white p-6">
      <div className="flex items-center gap-3">
        {icon}
        <h3 className="font-serif text-lg font-bold text-ink-900">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-ink-500">{description}</p>
    </div>
  );
}

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-parchment-200 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="text-base font-medium text-ink-900 pr-4">
          {question}
        </span>
        <ChevronDown
          className={`h-5 w-5 flex-shrink-0 text-ink-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? "max-h-96 pb-5" : "max-h-0"
        }`}
      >
        <p className="text-sm leading-relaxed text-ink-500">{answer}</p>
      </div>
    </div>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center mb-12">
          <h2 className="font-serif text-2xl font-bold text-ink-900 sm:text-3xl">
            Common questions
          </h2>
          <p className="mt-4 text-ink-500">
            Everything you need to know before getting started.
          </p>
        </div>

        <div className="bg-parchment-50 rounded-2xl p-6 sm:p-8">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() => toggleFAQ(index)}
            />
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-ink-500">
            Still have questions?{" "}
            <a
              href="mailto:jedaws@gmail.com"
              className="font-medium text-parchment-700 underline underline-offset-2 hover:text-parchment-800"
            >
              Reach out to our team
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating ? "fill-amber-400 text-amber-400" : "text-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

function TestimonialCard({
  quote,
  author,
  role,
  rating,
  avatarGradient,
}: {
  quote: string;
  author: string;
  role: string;
  rating: number;
  avatarGradient: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg flex flex-col h-full">
      <StarRating rating={rating} />
      <p className="mt-4 text-ink-700 text-sm leading-relaxed flex-1">
        &ldquo;{quote}&rdquo;
      </p>
      <div className="mt-4 pt-4 border-t border-parchment-100 flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center`}
        >
          <span className="text-sm font-semibold text-white">
            {author
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-ink-900">{author}</p>
          <p className="text-xs text-ink-500">{role}</p>
        </div>
      </div>
    </div>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-16 sm:py-20 bg-parchment-50">
      <div className="mx-auto max-w-5xl px-4">
        <div className="text-center mb-12">
          <h2 className="font-serif text-2xl font-bold text-ink-900 sm:text-3xl">
            What parents are saying
          </h2>
          <p className="mt-4 text-ink-500">
            Real feedback from families who use SafeReads.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard
              key={index}
              quote={testimonial.quote}
              author={testimonial.author}
              role={testimonial.role}
              rating={testimonial.rating}
              avatarGradient={testimonial.avatarGradient}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

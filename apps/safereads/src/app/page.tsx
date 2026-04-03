"use client";

import { useAuth } from "@/contexts/AuthContext";
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
  Check,
  Lock,
  ShieldCheck,
  ChevronDown,
  Star,
  Headphones,
  Library,
  BookMarked,
  GraduationCap,
  Search,
  Fingerprint,
} from "lucide-react";

// Testimonials data for SafeReads
const testimonials = [
  {
    quote:
      "SafeReads flagged some stuff in a book I honestly never would have caught. Really glad I looked it up before handing it to my 9-year-old.",
    author: "Emily T.",
    role: "Mom of 2, Raleigh, NC",
    rating: 5,
    avatarGradient: "from-emerald-400 to-green-500",
  },
  {
    quote:
      "Game changer for library trips. I check SafeReads before we go and the kids can grab whatever's on the approved list. No more standing in the aisle Googling book reviews on my phone.",
    author: "David P.",
    role: "Dad of 3, Tampa, FL",
    rating: 5,
    avatarGradient: "from-sky-400 to-blue-500",
  },
  {
    quote:
      "Way better than Common Sense Media. Actual content breakdowns instead of vague age ratings.",
    author: "Jessica M.",
    role: "Homeschool Mom of 6, Boise, ID",
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
  const { isAuthenticated, isLoading } = useAuth();
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
      {/* Top Nav */}
      <nav className="sticky top-0 z-40 border-b border-parchment-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-parchment-700" />
            <span className="font-serif text-lg font-bold text-ink-900">SafeReads</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/play"
              className="rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-700 transition-colors hover:bg-purple-200"
            >
              Kid Login
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full bg-parchment-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-parchment-800"
            >
              Parent Login
            </Link>
          </div>
        </div>
      </nav>

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
                More than just book reviews — SafeReads is a complete reading platform.
                AI content analysis, a kid-safe reading experience with 70K+ free books,
                Bible reading with study notes, audiobooks, and parental controls
                your family can trust.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
                <Link
                  href="/signup"
                  className="btn-brand w-full sm:w-auto rounded-lg text-lg text-center"
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

      {/* Book Analysis Demo */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center mb-4">
            <h2 className="font-serif text-2xl font-bold text-ink-900 sm:text-3xl">
              See exactly what&apos;s in the book
            </h2>
            <p className="mt-4 text-ink-500 max-w-2xl mx-auto">
              Every analysis breaks down 10 content categories so you know
              exactly what your child will encounter — before they start reading.
            </p>
          </div>

          <div className="mt-10 mx-auto max-w-2xl">
            {/* Mock Analysis Card */}
            <div className="rounded-2xl border border-parchment-200 bg-white shadow-xl overflow-hidden">
              {/* Book Header */}
              <div className="bg-parchment-50 p-5 sm:p-6 border-b border-parchment-200">
                <div className="flex gap-4 sm:gap-5">
                  {/* Book Cover */}
                  <div className="flex-shrink-0 w-20 sm:w-24 rounded-lg overflow-hidden shadow-md bg-[#1a3a5c]">
                    <div className="aspect-[2/3] flex flex-col items-center justify-center p-2 text-center">
                      <div className="w-8 h-8 mb-1 rounded-full border-2 border-amber-400 flex items-center justify-center">
                        <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                      </div>
                      <span className="text-[8px] sm:text-[9px] font-bold text-white leading-tight">
                        PERCY JACKSON
                      </span>
                      <span className="text-[7px] sm:text-[8px] text-amber-400 leading-tight mt-0.5">
                        &amp; The Lightning Thief
                      </span>
                      <span className="text-[6px] sm:text-[7px] text-white/60 mt-1">
                        Rick Riordan
                      </span>
                    </div>
                  </div>
                  {/* Book Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-ink-900 leading-tight">
                      Percy Jackson &amp; The Lightning Thief
                    </h3>
                    <p className="text-sm text-ink-500 mt-1">Rick Riordan</p>
                    <p className="text-xs text-ink-400 mt-0.5">
                      Fantasy / Middle Grade &middot; 377 pages
                    </p>
                    {/* Overall Recommendation */}
                    <div className="mt-3 inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
                      <Shield className="w-4 h-4 text-verdict-safe" />
                      <span className="text-sm font-semibold text-verdict-safe">
                        Recommended for ages 9+
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Categories */}
              <div className="p-5 sm:p-6">
                <h4 className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-4">
                  Content Breakdown
                </h4>
                <div className="space-y-3">
                  <DemoRatingRow
                    label="Violence"
                    level="Mild"
                    color="caution"
                    detail="Fantasy battle scenes, monsters defeated"
                    width="30%"
                  />
                  <DemoRatingRow
                    label="Language"
                    level="Clean"
                    color="safe"
                    detail="No profanity"
                    width="5%"
                  />
                  <DemoRatingRow
                    label="Sexual Content"
                    level="None"
                    color="none"
                    detail="None present"
                    width="0%"
                  />
                  <DemoRatingRow
                    label="Scary / Intense"
                    level="Moderate"
                    color="caution"
                    detail="Monster encounters, life-threatening situations"
                    width="45%"
                  />
                  <DemoRatingRow
                    label="Positive Messages"
                    level="Strong"
                    color="safe"
                    detail="Loyalty, bravery, friendship, self-sacrifice"
                    width="90%"
                  />
                  <DemoRatingRow
                    label="Educational Value"
                    level="High"
                    color="safe"
                    detail="Greek mythology woven throughout"
                    width="85%"
                  />
                  <DemoRatingRow
                    label="Role Models"
                    level="Strong"
                    color="safe"
                    detail="Courageous protagonist, diverse heroes"
                    width="85%"
                  />
                  <DemoRatingRow
                    label="Drinking / Drugs"
                    level="None"
                    color="none"
                    detail="None present"
                    width="0%"
                  />
                  <DemoRatingRow
                    label="Diversity"
                    level="Moderate"
                    color="safe"
                    detail="Characters from various backgrounds"
                    width="55%"
                  />
                  <DemoRatingRow
                    label="Consumerism"
                    level="Low"
                    color="none"
                    detail="Minimal references"
                    width="10%"
                  />
                </div>
              </div>

              {/* AI Summary */}
              <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                <div className="bg-parchment-50 rounded-xl p-4 border border-parchment-200">
                  <div className="flex items-start gap-2">
                    <BookOpen className="w-4 h-4 text-parchment-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-ink-700 mb-1">
                        AI Summary
                      </p>
                      <p className="text-xs text-ink-500 leading-relaxed">
                        A fast-paced adventure rooted in Greek mythology.
                        Contains fantasy violence (sword fights, monster
                        battles) but no gore. Themes of identity,
                        belonging, and standing up for what&apos;s right make it
                        a strong choice for confident readers ages 9 and up.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Caption */}
            <p className="text-center text-sm text-ink-400 mt-6">
              This is a real SafeReads analysis — every book gets this level of detail.
            </p>
          </div>
        </div>
      </section>

      {/* Parent Features */}
      <section className="py-16 sm:py-20 bg-parchment-100/50">
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
              description="Add kid profiles, manage wishlists, approve book requests with AI analysis, and curate a pre-approved library. One account for the whole family."
            />
            <Feature
              icon={<Heart className="h-6 w-6 text-verdict-caution" />}
              title="Your Values, Your Choice"
              description="SafeReads gives you the facts about what's in a book. You decide what's right for your family."
            />
          </div>
        </div>
      </section>

      {/* Kid-Side Features */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center font-serif text-2xl font-bold text-ink-900 sm:text-3xl">
            A reading experience kids actually love
          </h2>
          <p className="mt-4 text-center text-ink-500 max-w-2xl mx-auto">
            Kids log in with a family code and explore a curated world of books, audiobooks, and Bible reading — all parent-approved.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={<BookOpen className="h-6 w-6 text-emerald-600" />}
              title="In-App Book Reader"
              description="Over 70,000 free classic books from Project Gutenberg, Open Library, and Standard Ebooks. Tap any word to see its definition."
            />
            <Feature
              icon={<BookMarked className="h-6 w-6 text-amber-600" />}
              title="Bible Reading"
              description="6 translations (ESV, NIV, NLT, NKJV, NASB, KJV) with AI study notes, verse highlighting, saved verses, and full-text search."
            />
            <Feature
              icon={<Headphones className="h-6 w-6 text-purple-600" />}
              title="Free Audiobooks"
              description="Thousands of free audiobooks via LibriVox integration. Listen to classics while following along."
            />
            <Feature
              icon={<Library className="h-6 w-6 text-blue-600" />}
              title="Genre Browsing"
              description="Browse 15 genres from Adventure to Science Fiction. Pre-approved Library Classics ready to read instantly."
            />
            <Feature
              icon={<GraduationCap className="h-6 w-6 text-teal-600" />}
              title="Book Requests"
              description="Kids discover and request books. Parents review each request with AI content analysis before approving."
            />
            <Feature
              icon={<Fingerprint className="h-6 w-6 text-rose-600" />}
              title="Family Code Login"
              description="Kids log in with a simple family code — no email or password needed. Safe, simple, and parent-controlled."
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
        className="bg-parchment-100/50 py-16 sm:py-20 scroll-mt-20"
      >
        <div className="mx-auto max-w-lg px-4">
          <div className="text-center mb-8">
            <h2 className="font-serif text-2xl font-bold text-ink-900 sm:text-3xl md:text-4xl">
              Simple Pricing
            </h2>
            <p className="mt-3 text-base sm:text-lg text-ink-500">
              One plan. Everything included. Cancel anytime.
            </p>
          </div>

          {/* Single pricing card */}
          <div className="rounded-2xl shadow-xl border-2 border-parchment-600 bg-white overflow-hidden">
            <div className="p-6 sm:p-8">
              <div className="text-center mb-6">
                <p className="text-sm font-medium text-ink-500 mb-2">
                  7-day free trial, then
                </p>
                <div className="flex items-center justify-center mb-2">
                  <span className="text-4xl sm:text-5xl font-bold text-ink-900">$4.99</span>
                  <span className="text-ink-500 ml-2 text-lg sm:text-xl">/month</span>
                </div>
              </div>

              <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                {[
                  'Unlimited book reviews',
                  'Full AI content breakdowns',
                  'Barcode & cover scanning',
                  'Kid-side reading experience',
                  '70K+ free books & audiobooks',
                  'Bible reading with 6 translations',
                  'AI study notes & saved verses',
                  'Kids profiles & wishlists',
                  'No credit card to start',
                  'Cancel anytime'
                ].map((item, i) => (
                  <li key={i} className="flex items-center">
                    <Check className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    <span className="text-sm sm:text-base text-ink-600">{item}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className="btn-brand block w-full rounded-lg text-center text-base sm:text-lg"
              >
                Start 7-Day Free Trial
              </Link>
            </div>
          </div>

          {/* Money-back guarantee */}
          <div className="mt-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center justify-center gap-2">
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
            className="btn-brand mt-6 inline-block rounded-lg text-base"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Safe Family Bundle Cross-Promotion */}
      <section className="py-10 bg-gradient-to-r from-[#F5A962] via-[#F5A962] to-[#E88B6A]">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="text-sm font-medium text-white/90 mb-2">
            Save with the Safe Family Bundle
          </p>
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">
            Get all 4 apps for $9.99/month
          </h3>
          <p className="text-white/80 text-sm mb-6 max-w-xl mx-auto">
            Protect your family across music, videos, books, and search — all in one
            subscription.
          </p>

          {/* Other apps */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            {/* SafeTunes */}
            <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 88.994 96.651"
                >
                  <path d="M44.516,0v47.835c-.628.592-1.894-.232-2.774-.408-10.205-2.043-21.424,7.753-16.888,18.082,5.228,11.906,24.562,7.626,26.602-4.966.158-12.344.543-24.817.231-37.18-.01-.404-.181-.761-.194-1.16.138-.314.351-.336.66-.321.458.023,2.31.729,2.842.955,4.05,1.723,9.412,6.762,9.412,11.473v4.972c0,.135-.441.687-.1.894,1.809-2.076,3.087-4.729,3.459-7.48,1.916-14.144-14.809-18.642-16.24-30.063-.068-.546-.203-1.066.494-.894,11.509,2.848,22.868,6.412,34.333,9.432,1.504.879,2.371,2.06,2.527,3.837-.747,15.337,2.184,31.696-3.436,46.306-5.899,15.337-19.374,26.415-34.03,33-1.43.642-4.278,1.969-5.692,2.264-2.548.531-7.594-1.962-10.028-3.123C16.659,84.376,1.212,67.91.153,45.855c-.49-10.206.391-20.798,0-31.045.116-1.814,1.557-3.391,3.234-3.926L43.071.047l1.445-.047Z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">SafeTunes</p>
                <p className="text-xs text-white/70">Kid-safe Apple Music</p>
              </div>
            </div>

            {/* SafeTube */}
            <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">SafeTube</p>
                <p className="text-xs text-white/70">Kid-safe YouTube</p>
              </div>
            </div>

            {/* SafeStudy */}
            <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">SafeStudy</p>
                <p className="text-xs text-white/70">Kid-safe AI search</p>
              </div>
            </div>
          </div>

          <a
            href="https://getsafefamily.com/signup"
            className="inline-flex items-center gap-2 bg-white text-[#1a1a2e] hover:bg-gray-100 px-6 py-3 rounded-xl font-bold text-sm transition shadow-lg"
          >
            <span>Get the Bundle</span>
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </a>
          <p className="text-xs text-white/70 mt-3">
            <span className="line-through">$19.96/mo</span> → $9.99/mo · Save
            50%
          </p>
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

function DemoRatingRow({
  label,
  level,
  color,
  detail,
  width,
}: {
  label: string;
  level: string;
  color: "safe" | "caution" | "warning" | "none";
  detail: string;
  width: string;
}) {
  const colorMap = {
    safe: {
      badge: "bg-emerald-50 text-verdict-safe border-emerald-200",
      bar: "bg-emerald-400",
    },
    caution: {
      badge: "bg-amber-50 text-verdict-caution border-amber-200",
      bar: "bg-amber-400",
    },
    warning: {
      badge: "bg-red-50 text-verdict-warning border-red-200",
      bar: "bg-red-400",
    },
    none: {
      badge: "bg-slate-50 text-verdict-none border-slate-200",
      bar: "bg-slate-300",
    },
  };
  const styles = colorMap[color];

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-ink-700">{label}</span>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${styles.badge}`}
        >
          {level}
        </span>
      </div>
      <div className="h-1.5 w-full bg-parchment-100 rounded-full overflow-hidden mb-1">
        <div
          className={`h-full rounded-full ${styles.bar}`}
          style={{ width: width === "0%" ? "2%" : width }}
        />
      </div>
      <p className="text-xs text-ink-400">{detail}</p>
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

  // Add FAQ Schema markup for Google featured snippets (SEO)
  useEffect(() => {
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map((faq) => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer,
        },
      })),
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(faqSchema);
    script.id = 'faq-schema';
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById('faq-schema');
      if (el) el.remove();
    };
  }, []);

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
              href="mailto:jeremiah@getsafefamily.com"
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

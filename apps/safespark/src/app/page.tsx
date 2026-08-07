'use client';

import { useAuth as useMarketingAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  BookOpen,
  Boxes,
  Brain,
  Briefcase,
  Camera,
  Check,
  CheckCircle2,
  CircleCheck,
  CircleX,
  Eye,
  Gamepad2,
  Globe,
  GraduationCap,
  History,
  Image as ImageIcon,
  KeyRound,
  Menu,
  MessageSquareWarning,
  Mic,
  Palette,
  Play,
  ShieldCheck,
  Share2,
  Smartphone,
  Sparkles,
  Target,
  TrendingUp,
  TriangleAlert,
  Users,
  Wand2,
  X,
  type LucideIcon,
} from 'lucide-react';

// Landing imagery — Pexels CDN, free-license, no API key required.
// All three subjects manually verified as 10-13 year olds (the audience's
// kids) on a computer / phone / tablet.
//   HERO         4144096  tween boy focused on a tablet at home
//   FUTURE-CAREER 4145355  tween boy at a desktop, parent looking over shoulder
//   COLLAB        8500342  three tweens sharing a phone in a school hallway
const PEXELS_KID_HERO =
  'https://images.pexels.com/photos/4144096/pexels-photo-4144096.jpeg?auto=compress&cs=tinysrgb&w=900';
const PEXELS_KID_BUILDING =
  'https://images.pexels.com/photos/4145355/pexels-photo-4145355.jpeg?auto=compress&cs=tinysrgb&w=900';
const PEXELS_KIDS_COLLAB =
  'https://images.pexels.com/photos/8500342/pexels-photo-8500342.jpeg?auto=compress&cs=tinysrgb&w=900';

const ORGANIZATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'SafeSpark',
  url: 'https://getsafespark.com',
  logo: 'https://getsafespark.com/opengraph-image',
  description:
    'A safe AI maker for kids ages 10-13. Build games, flashcards, posters, and tools by talking to Spark.',
  sameAs: ['https://getsafefamily.com'],
};

const WEBSITE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'SafeSpark',
  url: 'https://getsafespark.com',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://getsafespark.com/blog?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

const NAV_LINKS = [
  { href: '#what-kids-make', label: 'What it does' },
  { href: '#safety', label: 'Safety' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
];

// Sibling SafeFamily apps. Shown as a chip strip in the header so visitors
// see SafeSpark is part of the family lineup, not a standalone product.
// Swatches are the LOCKED glow-up accents (see packages/ui/SafeFamilySwitcher.jsx)
// — each sibling keeps its own signature colour so the lineup reads as a family
// of distinct products, not a rainbow.
const SIBLING_APPS: Array<{ name: string; href: string; dot: string }> = [
  { name: 'SafeFamily', href: 'https://getsafefamily.com', dot: '#F5A962' },
  { name: 'SafeTunes', href: 'https://getsafetunes.com', dot: '#7C4DE0' },
  { name: 'SafeTube', href: 'https://getsafetube.com', dot: '#F0603A' },
  { name: 'SafeReads', href: 'https://getsafereads.com', dot: '#3AA06B' },
  { name: 'SafeStudy', href: 'https://getsafestudy.com', dot: '#2F6BF0' },
];

// Comparison table. `tone` drives the SEMANTIC status icon (green = yes,
// amber = caveat, red = no) — deliberately NOT the SafeSpark brand accent, so
// a "caution" row never reads as a branded highlight.
type VerdictTone = 'yes' | 'caveat' | 'no' | 'neutral';
type Verdict = { tone: VerdictTone; text: string };

const COMPARISON_ROWS: Array<{
  feature: string;
  chatgpt: Verdict;
  chatbot: Verdict;
  safespark: Verdict;
}> = [
  {
    feature: 'Account holder',
    chatgpt: { tone: 'neutral', text: 'Kid signs up' },
    chatbot: { tone: 'neutral', text: 'Kid signs up' },
    safespark: { tone: 'neutral', text: 'Parent — kid uses family code' },
  },
  {
    feature: 'Live playable result',
    chatgpt: { tone: 'no', text: 'Text only' },
    chatbot: { tone: 'no', text: 'Text only' },
    safespark: { tone: 'yes', text: 'Real running app/game' },
  },
  {
    feature: 'Hard-topic redirect',
    chatgpt: { tone: 'no', text: 'Will engage' },
    chatbot: { tone: 'no', text: 'Often unsafe' },
    safespark: { tone: 'yes', text: 'Routes to parent' },
  },
  {
    feature: 'Image restyle',
    chatgpt: { tone: 'caveat', text: 'No kid filter' },
    chatbot: { tone: 'caveat', text: 'Sometimes blocked' },
    safespark: { tone: 'yes', text: 'Kid-safe + moderated' },
  },
  {
    feature: 'Parent visibility',
    chatgpt: { tone: 'no', text: 'None' },
    chatbot: { tone: 'no', text: 'None' },
    safespark: { tone: 'yes', text: 'Full dashboard' },
  },
  {
    feature: 'Share with friends',
    chatgpt: { tone: 'caveat', text: 'Whole chat' },
    chatbot: { tone: 'caveat', text: 'Awkward' },
    safespark: { tone: 'yes', text: 'One-tap share link' },
  },
  {
    feature: 'Made for ages 10–13',
    chatgpt: { tone: 'no', text: 'Adult tool' },
    chatbot: { tone: 'no', text: 'All ages' },
    safespark: { tone: 'yes', text: 'Designed for tweens' },
  },
];

const FAQS = [
  {
    q: 'Does my kid need their own account?',
    a: 'No. You sign up with your email and get a 6-character family code. Your kid types that code on their device, picks their profile, and goes. No password, no email for kids.',
  },
  {
    q: 'What ages is it for?',
    a: 'Designed for 10–13. Younger kids can use it with a parent sitting next to them; older kids will probably enjoy it too but the language is calibrated for tweens.',
  },
  {
    q: 'What does it cost?',
    a: 'Free during early access. When paid plans launch, we will tell you the price clearly and ask before charging — no auto-renew surprises.',
  },
  {
    q: 'Is it COPPA compliant?',
    a: 'The parent is the account holder; kids interact under the parent\'s account using a family code. We collect the minimum needed to run the product and never share data with advertisers. Full details in our Privacy Policy.',
  },
  {
    q: 'What if my kid asks about something unsafe?',
    a: 'Spark redirects style requests to safe alternatives and routes hard topics (sex ed, identity, drugs, violence) back to parents with one short line. Image restyles strip unsafe modifiers before they hit the AI.',
  },
  {
    q: 'Can teachers or schools use it?',
    a: 'Yes — email us at jeremiah@getsafefamily.com for school/co-op licensing.',
  },
  {
    q: 'What devices does it work on?',
    a: 'Any modern browser. Chromebook, iPad, iPhone, Android, Mac, Windows. Mobile has a bottom-nav layout designed for one-handed use.',
  },
  {
    q: 'Can my kid share what they made?',
    a: 'Yes, with a short link only — no public gallery, no comments, no follower counts. They send the link to a friend or grandparent; that\'s it. For shared chat-style builds we ask the parent to approve the share link first.',
  },
  {
    q: 'Can it really make 3D games?',
    a: 'Yes — real Three.js scenes, not flat canvas pretending. Driving games with chase cameras, first-person worlds with mouse-look, Minecraft-style block-building sandboxes. Ask in plain English ("make a 3D driving game with monster trucks") and Spark wires up the camera, lighting, and controls.',
  },
  {
    q: 'Does it use real images for things like Pokémon and country flags?',
    a: 'Yes — real high-res Pokémon trading-card art from the official Pokémon TCG API, real dog photos from Dog CEO, country flags from REST Countries, recipe photos from MealDB, book covers from Open Library. For characters where no real-image API exists (a Jedi, a knight, a dragon), Spark generates matching painted art so the build still looks right.',
  },
];

export default function HomePage() {
  const marketing = useMarketingAuth();
  const isLoaded = !marketing.isLoading;
  const isSignedIn = marketing.isAuthenticated;
  const user = marketing.user;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <main className="flex-1 flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSON_LD) }}
      />
      <nav className="px-4 sm:px-8 py-4 flex items-center justify-between gap-6 border-b border-brand-cream-2 bg-brand-cream/90 backdrop-blur sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-9 h-9 rounded-xl bg-accent-500 shadow-md flex items-center justify-center text-brand-navy group-hover:scale-105 transition">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-brand-navy">
            SafeSpark
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm font-bold text-brand-ink-soft">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-accent-700 transition">
              {link.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {isLoaded && isSignedIn ? (
            <>
              <Link
                href="/parent"
                className="px-5 py-2 rounded-2xl bg-accent-500 text-brand-navy font-bold shadow-md hover:bg-accent-600 transition text-sm"
              >
                Parent dashboard →
              </Link>
              <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-brand-ink-soft">
                <span>Hi, {user?.name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'parent'}</span>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-bold text-accent-700 hover:text-accent-800"
              >
                Sign in
              </Link>
              <Link
                href="https://getsafefamily.com/signup?plan=unified"
                className="px-5 py-2 rounded-2xl bg-accent-500 text-brand-navy font-bold shadow-md hover:bg-accent-600 transition text-sm"
              >
                Get started — free
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden rounded-lg p-2 text-brand-navy hover:bg-brand-cream-2"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="absolute left-0 right-0 top-full bg-brand-cream border-b border-brand-cream-2 px-4 py-3 md:hidden">
            <div className="flex flex-col gap-3 text-sm font-bold text-brand-navy">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} className="hover:text-accent-700">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="px-4 sm:px-8 pt-10 pb-12 sm:pt-16">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_460px] gap-10 items-center">
          <div className="space-y-7">
            <div className="space-y-3">
              {/* Pill eyebrow — matches the SafeFamily sibling pattern */}
              <span className="inline-flex items-center gap-2 rounded-full bg-accent-50 px-3 py-1 text-xs font-bold text-accent-700">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-accent-500 text-brand-navy">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                </span>
                AI Maker for Kids · Ages 10–13
              </span>
              <h1 className="font-display text-5xl sm:text-7xl font-bold tracking-tight leading-none text-brand-navy">
                The AI skill kids will use their whole life.
              </h1>
              <p className="text-lg sm:text-xl text-brand-ink-soft max-w-2xl leading-relaxed">
                Your kid talks to Spark and <strong className="text-brand-navy">builds real things with AI</strong> —
                games, flashcards, study tools, posters, image projects, trackers. They
                learn to <strong className="text-brand-navy underline decoration-accent-400 decoration-2 underline-offset-4">direct AI</strong> — ask clearly, check the output,
                iterate, ship. The most important skill they&apos;ll learn this decade.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-3">
                {isLoaded && isSignedIn ? (
                  <Link
                    href="/make"
                    className="px-8 py-4 rounded-2xl bg-accent-500 text-brand-navy font-bold shadow-xl shadow-accent-100 hover:bg-accent-600 transition text-lg text-center"
                  >
                    Open SafeSpark →
                  </Link>
                ) : (
                  <Link
                    href="https://getsafefamily.com/signup?plan=unified"
                    className="px-8 py-4 rounded-2xl bg-accent-500 text-brand-navy font-bold shadow-xl shadow-accent-100 hover:bg-accent-600 transition text-lg"
                  >
                    Start free → it takes 30 seconds
                  </Link>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-brand-ink-soft">
                {['Free during early access', 'No credit card', 'Cancel any time', 'COPPA-aware'].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 max-w-2xl">
              <FeaturePill icon={Mic} label="Talk to it" />
              <FeaturePill icon={Boxes} label="Real 3D games" />
              <FeaturePill icon={Palette} label="AI character art" />
              <FeaturePill icon={Camera} label="Upload photos" />
              <FeaturePill icon={Globe} label="Real facts & images" />
              <FeaturePill icon={ShieldCheck} label="Safe by default" />
              <FeaturePill icon={Share2} label="Share & print" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-brand-cream-2 shadow-xl">
            <Image
              src={PEXELS_KID_HERO}
              alt="An 11-year-old building with SafeSpark on a tablet"
              width={900}
              height={1100}
              className="h-[480px] w-full object-cover"
              unoptimized
              priority
            />
          </div>
        </div>
      </section>

      {/* TRUST STRIP — just below the hero */}
      <section className="px-4 sm:px-8 py-6 border-y border-brand-cream-2 bg-white">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {([
            [Users, 'Parent is the account holder'],
            [ShieldCheck, 'No data sold, ever'],
            [Target, 'Designed for ages 10–13'],
            [Smartphone, 'Works on any device'],
          ] as Array<[LucideIcon, string]>).map(([Icon, label]) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <Icon className="h-7 w-7 text-accent-700" aria-hidden="true" />
              <p className="text-xs font-bold text-brand-navy leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHY NOW — AI LITERACY FOR FUTURE CAREERS */}
      <section id="why-now" className="px-4 sm:px-8 py-16 bg-brand-navy text-white">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_460px] gap-10 items-center">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent-300">
              Why this matters now
            </p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold leading-tight">
              Kids who learn AI early get a real career head start.
            </h2>
            <p className="text-lg text-white/80 leading-relaxed">
              In five years, directing AI well will be a baseline skill &mdash; like writing a
              coherent email today. SafeSpark gives kids a safe place to practice <em>now</em>,
              before bad habits form on random chatbots and TikTok filters. They&apos;re not
              just consuming AI. They&apos;re directing it.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 pt-3">
              <div className="rounded-2xl bg-white/10 backdrop-blur p-4 border border-white/15">
                <Briefcase className="h-6 w-6 text-accent-300 mb-2" />
                <p className="font-display text-sm font-bold">Future-proof careers</p>
                <p className="mt-1 text-xs text-white/70 leading-relaxed">
                  Every white-collar job in 5 years will require AI fluency. They&apos;ll have a 7-year head
                  start.
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 backdrop-blur p-4 border border-white/15">
                <GraduationCap className="h-6 w-6 text-accent-300 mb-2" />
                <p className="font-display text-sm font-bold">Real AI habits</p>
                <p className="mt-1 text-xs text-white/70 leading-relaxed">
                  Clarify, iterate, own the output. The skills schools haven&apos;t figured out how to teach
                  yet.
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 backdrop-blur p-4 border border-white/15">
                <TrendingUp className="h-6 w-6 text-accent-300 mb-2" />
                <p className="font-display text-sm font-bold">Confidence to make</p>
                <p className="mt-1 text-xs text-white/70 leading-relaxed">
                  Going from idea → working thing in minutes turns kids into authors, not consumers.
                </p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl shadow-2xl">
            <Image
              src={PEXELS_KID_BUILDING}
              alt="A kid working on a creative project with a laptop"
              width={900}
              height={1100}
              className="h-[480px] w-full object-cover"
              unoptimized
            />
          </div>
        </div>
      </section>

      {/* WHAT KIDS MAKE */}
      <section id="what-kids-make" className="px-4 sm:px-8 py-14 bg-white scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 space-y-2">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent-700">
              What kids make
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-navy">
              Real projects, in seconds.
            </h2>
            <p className="text-brand-ink-soft max-w-xl mx-auto">
              Six one-tap templates get them started. After that they ask for
              anything in plain words.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ExampleCard icon={Gamepad2} title="Games" desc='"Make a Pokemon battle game" → playable in seconds. Add a boss, sounds, score — it just iterates.' />
            <ExampleCard icon={BookOpen} title="Flashcards & Quizzes" desc='"Flashcards for state capitals" → ready to study with. Real facts pulled from Wikipedia, not made up.' />
            <ExampleCard icon={ImageIcon} title="Posters" desc='"Poster for my lemonade stand" → print it on real paper from the browser, ready for the table.' />
            <ExampleCard icon={Brain} title="Trackers & Apps" desc='"Habit tracker I can use today" → saves data so it remembers tomorrow. Real tiny app, not just a chat.' />
            <ExampleCard icon={Wand2} title="Photo restyles" desc='Upload a photo → "make me a Pixar character" → AI repaints the face. Cartoon, anime, Lego, comic-book.' />
            <ExampleCard icon={Wand2} title="Anything else" desc='Story tools, sound boards, name generators, drawing apps, outfit pickers, calculators, recipe finders…' />
          </div>
        </div>
      </section>

      {/* MAKE & SHARE */}
      <section className="px-4 sm:px-8 py-16 bg-brand-cream-2">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent-700">
              Make it. Share it.
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-navy">
              Real projects kids can send to anyone.
            </h2>
            <p className="text-brand-ink-soft leading-relaxed text-lg">
              Every project &mdash; a study tool, a lemonade-stand poster, a flashcard set, a game for a
              friend &mdash; gets a short, kid-readable share link the kid can hand to grandma. Friends
              and family open it on any browser. No login. No download.
            </p>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-700 font-display font-bold text-xs">1</div>
                <span className="text-brand-navy"><strong>Vibe code it</strong> in plain words &mdash; &ldquo;make flashcards for state capitals&rdquo; or &ldquo;a poster for my lemonade stand.&rdquo;</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-700 font-display font-bold text-xs">2</div>
                <span className="text-brand-navy"><strong>Iterate</strong> &mdash; &ldquo;add multiple choice,&rdquo; &ldquo;make the headline bigger.&rdquo; That&apos;s the real AI skill.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-700 font-display font-bold text-xs">3</div>
                <span className="text-brand-navy"><strong>Share or print</strong>. Send the link to a teacher, a grandparent, a friend &mdash; or hit Print for the fridge.</span>
              </li>
            </ul>
            <p className="text-sm text-brand-ink-soft italic pt-2">
              Private by default. No public gallery, no comments, no follower counts &mdash; only the
              people your kid sends the link to can see it.
            </p>
          </div>
          <div className="relative rounded-3xl bg-white border border-brand-cream-2 shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-brand-cream-2 bg-brand-cream">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-rose-300" />
                <span className="h-3 w-3 rounded-full bg-amber-300" />
                <span className="h-3 w-3 rounded-full bg-emerald-300" />
              </div>
              <span className="ml-2 text-[10px] font-bold text-brand-ink-soft font-mono truncate">
                getsafespark.com/s/...
              </span>
            </div>
            <Image
              src="/landing/share-pokemon.png"
              alt="Knox's Pokemon Quest game running on a SafeSpark share link"
              width={900}
              height={700}
              className="w-full h-auto"
              unoptimized
            />
            <p className="px-4 py-3 text-xs text-brand-ink-soft text-center font-semibold bg-white border-t border-brand-cream-2">
              What grandma sees when Knox sends her the link
            </p>
          </div>
        </div>
      </section>

      {/* WHAT KIDS BUILT — real shipping social proof */}
      <section className="px-4 sm:px-8 py-14 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 space-y-2">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent-700">
              Real kids, real projects
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-navy">
              Here&apos;s what kids are building.
            </h2>
            <p className="text-brand-ink-soft max-w-xl mx-auto">
              Tap to play the shareable ones. Every one was built by typing or talking to Spark — no code editor, no copy-paste.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <KidBuildCard
              builder="Sara, age 6"
              title="Neighborhood Drive"
              desc="A real 3D driving game built with Three.js — blue car, chase camera, houses with red roofs, a giraffe walking around, and a HUD showing the driver. Tap to play."
              href="/s/neighborhood-drive-p3pf"
              tag="3D game"
              image="/landing/build-neighborhood.png"
            />
            <KidBuildCard
              builder="Knox, age 11"
              title="Pokémon Region Adventure"
              desc="A walk-around region game with travel between Kanto, Johto, Hoenn, and Sinnoh — wild encounters, companions, badges to earn, particles, sound. Real characters and tile maps, not text."
              href="/s/pok-mon-region-adventure-4k8k"
              tag="Adventure"
              image="/landing/build-region-adventure.png"
            />
            <KidBuildCard
              builder="Bella, age 12"
              title="BlockCraft Builder"
              desc="A Minecraft-style 3D sandbox — walk around with WASD, jump, mouse-look, place blocks, knock them out, build houses or towers. Bounce blocks, teleporters, a rocket launcher, and a mobile control layer. Real Three.js."
              href="/s/blockcraft-builder-cw2w"
              tag="3D sandbox"
              image="/landing/build-blockcraft.png"
            />
          </div>
        </div>
      </section>

      {/* JUST SHIPPED — recent investment + active product velocity. Kept
          fresh as new capability lands; surfaces what changed for both
          parents (we are actively building) and kids (new things to try). */}
      <section className="px-4 sm:px-8 py-14 bg-brand-cream-2 border-y border-brand-cream-2">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-accent-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Shipped this week
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-navy">
              Spark gets stronger every week.
            </h2>
            <p className="text-brand-ink-soft max-w-2xl mx-auto">
              Real builds from real kids drive what we ship next. Here&apos;s what landed in the last few days.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ShippedCard
              icon={Boxes}
              tag="New capability"
              title="Real 3D games"
              desc="First-person mouse-look, chase-cam racers, Minecraft-style block sandboxes. Real Three.js geometry — not a flat canvas pretending. Ask for a driving game, get a driving game."
            />
            <ShippedCard
              icon={ImageIcon}
              tag="New data source"
              title="Real Pokémon trading cards"
              desc="Pulls actual high-res card art straight from the official Pokémon TCG API. Build a card matching game, a deck-builder, a Pokédex — with the real images, not stand-ins."
            />
            <ShippedCard
              icon={Palette}
              tag="Better art"
              title="Character art that looks right"
              desc='Ask for "a young Jedi with a blue lightsaber" or "a sneaky pirate captain" and Spark generates real painted-movie-poster art that fits — no awkward "I can&apos;t draw that" refusals on style asks.'
            />
            <ShippedCard
              icon={MessageSquareWarning}
              tag="Honesty mode"
              title="Spark tells the truth when stuck"
              desc='When something breaks, the build itself reports the actual error ("the network blocked api.pokemontcg.io") and Spark addresses it directly — instead of saying "fixed it!" three turns in a row while nothing changes.'
            />
            <ShippedCard
              icon={CheckCircle2}
              tag="One-tap recovery"
              title='"Ask Spark to fix it" button'
              desc="When a build hits a real error, a single tap sends the full error context to Spark and it tries a different approach. The kid doesn&apos;t need to know any of the technical details."
            />
            <ShippedCard
              icon={GraduationCap}
              tag="Learning"
              title="15 bite-sized AI lessons"
              desc="60–90 second reads. Three tracks: talking to AI well, how AI thinks, and being a smart AI user. Real AI literacy in plain English — the lessons transfer to ChatGPT, Claude, anything they&apos;ll use next."
            />
          </div>

          <p className="text-center text-xs text-brand-ink-soft mt-8">
            Most of these landed in the last 72 hours. We ship daily.
          </p>
        </div>
      </section>

      {/* VS — how it's different from ChatGPT */}
      <section className="px-4 sm:px-8 py-14">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 space-y-2">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent-700">
              vs. the alternatives
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-navy">
              Why not just ChatGPT?
            </h2>
            <p className="text-brand-ink-soft max-w-xl mx-auto">
              ChatGPT is for adults doing adult work. SafeSpark is the version where a kid can actually build, share, and be safe.
            </p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-brand-cream-2 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-cream-2 bg-brand-cream">
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-widest text-[10px] text-brand-ink-soft">Feature</th>
                  <th className="px-4 py-3 text-left font-bold text-brand-ink-soft">ChatGPT</th>
                  <th className="px-4 py-3 text-left font-bold text-brand-ink-soft">Random AI chatbot</th>
                  <th className="px-4 py-3 text-left font-display font-bold text-accent-700">SafeSpark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-cream-2">
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.feature} className="hover:bg-brand-cream/60">
                    <td className="px-4 py-3 font-bold text-brand-navy">{row.feature}</td>
                    <VerdictCell verdict={row.chatgpt} />
                    <VerdictCell verdict={row.chatbot} />
                    <VerdictCell verdict={row.safespark} highlight />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* POWERS — six tiles grouped by theme */}
      <section className="px-4 sm:px-8 py-14 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 space-y-2">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent-700">
              How it&apos;s different
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-navy">
              Built for making, not chatting.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <PowerCard
              icon={Mic}
              title="Talk to it"
              desc="Tap the mic, say what you want. Spark types so kids who hate typing still build."
            />
            <PowerCard
              icon={Wand2}
              title="Real AI images"
              desc="Upload a photo, ask for a Pixar / Lego / anime restyle. Spark generates real character sprites for game art too."
            />
            <PowerCard
              icon={History}
              title="Nothing is lost"
              desc="Every build saves a version. One-tap undo, 30-day recycle bin, projects roam across devices."
            />
            <PowerCard
              icon={Globe}
              title="Real-world facts"
              desc="Flashcards for state capitals get real capitals. Pulls Wikipedia automatically. No hallucinated homework answers."
            />
            <PowerCard
              icon={Share2}
              title="Share, don't post"
              desc="One-tap private share links to send a project to grandma. No public gallery, no follower counts."
            />
            <PowerCard
              icon={ShieldCheck}
              title="The AI is on a leash"
              desc="Style requests redirect. Hard topics route to parents. Image restyles strip unsafe modifiers."
            />
          </div>
        </div>
      </section>

      {/* MADE FOR FAMILIES */}
      <section className="px-4 sm:px-8 py-14 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-[1fr_360px] gap-10 items-center mb-10">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-widest text-accent-700">
                Made for families
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-navy">
                One parent account. Every kid gets their own profile.
              </h2>
              <p className="text-brand-ink-soft">
                Same pattern as the other Safe Family apps. Parent signs up with email,
                gets a 6-character family code, and kids log in on their device with that
                code &mdash; no separate accounts to manage.
              </p>
            </div>
            <div className="relative overflow-hidden rounded-3xl shadow-xl">
              <Image
                src={PEXELS_KIDS_COLLAB}
                alt="Two kids exploring together on a tablet"
                width={720}
                height={540}
                className="h-[260px] w-full object-cover"
                unoptimized
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-brand-cream-2 space-y-3">
              <div className="inline-flex w-12 h-12 rounded-2xl bg-accent-50 text-accent-700 items-center justify-center">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-brand-navy text-lg">Family code login</h3>
              <p className="text-sm text-brand-ink-soft leading-relaxed">
                Kid types a 6-character code at <span className="font-mono font-bold text-accent-700">/start</span>,
                picks their profile, optional PIN. No password. No email.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-brand-cream-2 space-y-3">
              <div className="inline-flex w-12 h-12 rounded-2xl bg-accent-50 text-accent-700 items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-brand-navy text-lg">Multiple kids per family</h3>
              <p className="text-sm text-brand-ink-soft leading-relaxed">
                Add each kid as a profile under your account. Every project they make
                attributes to them — siblings stay separate.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-brand-cream-2 space-y-3">
              <div className="inline-flex w-12 h-12 rounded-2xl bg-accent-50 text-accent-700 items-center justify-center">
                <Eye className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-brand-navy text-lg">Parent dashboard</h3>
              <p className="text-sm text-brand-ink-soft leading-relaxed">
                See every kid&apos;s projects, every prompt, monthly usage, and what
                they&apos;ve been making. At{' '}
                <span className="font-mono font-bold text-accent-700">/parent</span>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SAFETY */}
      <section id="safety" className="px-4 sm:px-8 py-14 scroll-mt-20">
        <div className="max-w-4xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent-700">
              Safe by default
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-navy">
              The AI is on a leash.
            </h2>
            <p className="text-brand-ink-soft leading-relaxed">
              No social-media patterns. No gambling. No violence or gore. No collecting
              private information. SafeSpark redirects to safe alternatives instead of
              refusing — so kids can keep building.
            </p>
            <p className="text-brand-ink-soft leading-relaxed">
              Hard topics like sex ed and identity get routed back to parents — that&apos;s
              your job, not the AI&apos;s.
            </p>
          </div>
          <div className="space-y-2">
            <SafetyRow text="Image restyles strip unsafe modifiers before they hit the AI." />
            <SafetyRow text="OpenAI moderation runs as a second layer on every image." />
            <SafetyRow text="No browsing — Spark only reads from safe public sources like Wikipedia." />
            <SafetyRow text="Projects save under the parent's email account, not a random kid login." />
            <SafetyRow text="Stop button cancels any generation mid-stream." />
          </div>
        </div>
      </section>

      {/* FOUNDER STORY — same pattern as the other Safe Family landing pages */}
      <section className="px-4 sm:px-8 py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl text-center mb-12">
            Why I Built This
          </h2>
          <div
            className="bg-brand-cream rounded-3xl p-8 sm:p-10 lg:p-12"
            style={{ boxShadow: '0 4px 20px rgba(26, 26, 46, 0.08)' }}
          >
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 pb-8 border-b border-brand-cream-2">
              <Image
                src="/landing/jeremiah-headshot.jpg"
                alt="Jeremiah Daws"
                width={400}
                height={400}
                className="h-32 w-32 sm:h-40 sm:w-40 rounded-2xl object-cover flex-shrink-0 shadow-lg"
                style={{ objectPosition: 'center 15%' }}
              />
              <div className="text-center sm:text-left">
                <p className="font-display font-bold text-brand-navy text-xl sm:text-2xl">Jeremiah Daws</p>
                <p className="text-base text-brand-ink-soft mt-1">Teacher, Software Developer, Parent</p>
              </div>
            </div>

            <div className="space-y-6 text-brand-navy">
              <p className="text-lg leading-relaxed">
                Every kid I know is going to use AI. The only question is whether they
                pick up good habits or bad ones along the way.
              </p>
              <p className="text-lg leading-relaxed">
                ChatGPT will engage with anything. Random chatbots have no guardrails.
                School &ldquo;coding class&rdquo; can&apos;t move fast enough to keep
                up. So kids are learning AI from whatever ad pops up &mdash; and they&apos;re
                learning to <em>consume</em> AI instead of <em>direct</em> it.
              </p>
              <p className="text-lg leading-relaxed font-medium">
                So I built something better &mdash; <strong>real making, with real
                protection</strong>.
              </p>
              <p className="text-lg leading-relaxed">
                SafeSpark isn&apos;t a kid chatbot. It&apos;s a sandbox where a 10-13
                year old asks for a game, a poster, a flashcard set &mdash; and the AI
                builds it. They learn the skill of directing AI clearly, checking what
                came back, iterating until it&apos;s right, and owning the final result.
              </p>
              <p className="text-lg leading-relaxed text-brand-ink-soft">
                I hope it helps your kid the way I wish it had existed for me.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="px-4 sm:px-8 py-16 bg-brand-cream-2">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 space-y-2">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent-700">
              Early-access feedback
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-navy">
              What parents are seeing.
            </h2>
            <p className="text-brand-ink-soft max-w-xl mx-auto">
              We&apos;re early-access. Real quotes from the first families using SafeSpark.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <TestimonialCard
              quote="The first kid I handed SafeSpark to went from 'make a game' to a 129-message-deep Mando combat sim that his friends are still playing a week later. The iteration loop is the lesson."
              attribution="Jeremiah Daws"
              context="Founder · Safe Family"
            />
            <TestimonialCard
              quote="[Coming soon — early-access parents are testing now]"
              attribution="—"
              context="Reserve this spot · email jeremiah@getsafefamily.com to share yours"
              placeholder
            />
            <TestimonialCard
              quote="[Coming soon — early-access parents are testing now]"
              attribution="—"
              context="Reserve this spot · email jeremiah@getsafefamily.com to share yours"
              placeholder
            />
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-4 sm:px-8 py-14 bg-white scroll-mt-20">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent-700">Pricing</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-navy">
            Free during early access.
          </h2>
          <p className="text-brand-ink-soft leading-relaxed max-w-xl mx-auto">
            We&apos;re not charging yet. When paid plans launch we&apos;ll show the price clearly
            and ask before charging &mdash; no auto-renew surprises, no credit card on file.
          </p>
          <div className="grid sm:grid-cols-3 gap-3 pt-4 text-left">
            <PricingCard
              tag="Free"
              title="Early access"
              price="$0"
              tagline="What you get right now"
              bullets={['Unlimited kids in your family', 'Reasonable monthly usage', 'Full feature access', 'Parent dashboard']}
              cta="Sign up free"
              highlight
            />
            <PricingCard
              tag="Coming soon"
              title="Family"
              price="TBD"
              tagline="We'll email you the price before launch"
              bullets={['Everything in Free', 'Higher monthly usage cap', 'Priority support', 'No ads, ever']}
              cta="Notify me"
              email
              emailAddress="jeremiah@getsafefamily.com?subject=SafeSpark%20Family%20pricing%20notify%20list&body=Please%20add%20me%20to%20the%20Family%20pricing%20launch%20list."
            />
            <PricingCard
              tag="Schools"
              title="Class / Co-op"
              price="Email us"
              tagline="Hands-on AI for classrooms"
              bullets={['Bulk family codes', 'Teacher dashboard', 'Curriculum support', 'Volume discount']}
              cta="jeremiah@getsafefamily.com"
              email
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-4 sm:px-8 py-14 scroll-mt-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 space-y-2">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent-700">FAQ</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-navy">
              The parent questions we hear most.
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <details
                key={faq.q}
                open={i < 2}
                className="group rounded-2xl border border-brand-cream-2 bg-white shadow-sm"
              >
                <summary className="cursor-pointer list-none px-5 py-4 flex items-start justify-between gap-4 font-display font-bold text-brand-navy hover:text-accent-700">
                  <span>{faq.q}</span>
                  <span className="text-accent-700 text-xl transition group-open:rotate-45 shrink-0">+</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-brand-ink-soft leading-relaxed">{faq.a}</div>
              </details>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-brand-ink-soft">
            More questions?{' '}
            <a href="mailto:jeremiah@getsafefamily.com" className="font-bold text-accent-700 underline">
              jeremiah@getsafefamily.com
            </a>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-8 py-20 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-brand-navy">
            Let your kid build something today.
          </h2>
          <p className="text-lg text-brand-ink-soft">
            One parent email. Multiple kid profiles. Every project saved under your account
            and reachable from any device.
          </p>
          {isLoaded && isSignedIn ? (
            <Link
              href="/make"
              className="inline-block px-8 py-4 rounded-2xl bg-accent-500 text-brand-navy font-bold shadow-xl shadow-accent-100 hover:bg-accent-600 transition text-lg"
            >
              Open SafeSpark →
            </Link>
          ) : (
            <Link
              href="https://getsafefamily.com/signup?plan=unified"
              className="px-8 py-4 rounded-2xl bg-accent-500 text-brand-navy font-bold shadow-xl shadow-accent-100 hover:bg-accent-600 transition text-lg"
            >
              Sign up free
            </Link>
          )}
          <p className="text-xs font-bold text-brand-ink-soft">
            Free during early access · No credit card · Cancel any time
          </p>
        </div>
      </section>

      <StickyMobileCTA isSignedIn={!!(isLoaded && isSignedIn)} />

      <footer className="px-4 sm:px-8 py-10 border-t border-brand-cream-2 bg-white">
        <div className="max-w-5xl mx-auto space-y-5">
          {/* Sibling apps strip */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Part of the Safe Family lineup
            </p>
            <div className="flex flex-wrap gap-2">
              {SIBLING_APPS.map((app) => (
                <a
                  key={app.name}
                  href={app.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-brand-cream-2 bg-white hover:bg-brand-cream transition px-3 py-1.5 text-xs font-bold text-brand-navy"
                >
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: app.dot }} />
                  {app.name}
                </a>
              ))}
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-accent-200 bg-accent-50 px-3 py-1.5 text-xs font-bold text-accent-700">
                <span className="h-2.5 w-2.5 rounded-sm bg-accent-500" />
                SafeSpark · you are here
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-brand-ink-soft pt-2 border-t border-brand-cream-2">
            <div>
              SafeSpark · A safe way for kids to build with AI · getsafespark.com
            </div>
            <nav className="flex flex-wrap items-center gap-5 font-bold">
              <Link href="/privacy" className="hover:text-accent-700">Privacy</Link>
              <Link href="/terms" className="hover:text-accent-700">Terms</Link>
              <a href="mailto:jeremiah@getsafefamily.com" className="hover:text-accent-700">Contact</a>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
}

// Status icons are SEMANTIC (green pass / amber caveat / red fail), not brand.
// Keeping them off the accent ramp is what stops an amber "caveat" cell from
// looking like a SafeSpark highlight.
function VerdictCell({ verdict, highlight }: { verdict: Verdict; highlight?: boolean }) {
  const { tone, text } = verdict;
  const Icon =
    tone === 'yes' ? CircleCheck : tone === 'caveat' ? TriangleAlert : tone === 'no' ? CircleX : null;
  const iconTone =
    tone === 'yes' ? 'text-emerald-600' : tone === 'caveat' ? 'text-amber-500' : 'text-rose-500';
  return (
    <td className={`px-4 py-3 ${highlight ? 'font-bold text-brand-navy' : 'text-brand-ink-soft'}`}>
      <span className="inline-flex items-start gap-1.5">
        {Icon && <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconTone}`} aria-hidden="true" />}
        <span>{text}</span>
      </span>
    </td>
  );
}

function FeaturePill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-brand-cream-2 text-xs font-bold text-brand-navy shadow-sm">
      <Icon className="h-3.5 w-3.5 text-accent-700" />
      {label}
    </span>
  );
}

function ExampleCard({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
  return (
    <div className="p-5 rounded-2xl bg-white shadow-sm border border-brand-cream-2 space-y-3">
      <div className="inline-flex w-12 h-12 rounded-2xl bg-accent-50 text-accent-700 items-center justify-center">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-display font-bold text-brand-navy text-lg">{title}</h3>
      <p className="text-sm text-brand-ink-soft leading-relaxed">{desc}</p>
    </div>
  );
}

function ShippedCard({
  icon: Icon,
  tag,
  title,
  desc,
}: {
  icon: LucideIcon;
  tag: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="p-5 rounded-2xl bg-white shadow-sm border border-white space-y-3 hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-accent-50 text-accent-700 items-center justify-center">
          <Icon className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-ink-soft">
          {tag}
        </span>
      </div>
      <h3 className="font-display font-bold text-brand-navy text-lg leading-tight">{title}</h3>
      <p className="text-sm text-brand-ink-soft leading-relaxed">{desc}</p>
    </div>
  );
}

function TestimonialCard({
  quote,
  attribution,
  context,
  placeholder,
}: {
  quote: string;
  attribution: string;
  context: string;
  placeholder?: boolean;
}) {
  return (
    <figure
      className={
        placeholder
          ? 'rounded-2xl border-2 border-dashed border-accent-200 bg-white/60 p-5'
          : 'rounded-2xl border border-brand-cream-2 bg-white p-5 shadow-sm'
      }
    >
      <blockquote className={placeholder ? 'text-sm italic text-slate-400 leading-relaxed' : 'text-sm text-brand-navy leading-relaxed'}>
        &ldquo;{quote}&rdquo;
      </blockquote>
      <figcaption className="mt-4">
        <p className={placeholder ? 'text-sm font-bold text-slate-400' : 'text-sm font-bold text-brand-navy'}>
          {attribution}
        </p>
        <p className="text-xs text-brand-ink-soft">{context}</p>
      </figcaption>
    </figure>
  );
}

function KidBuildCard({
  builder,
  title,
  desc,
  href,
  tag,
  image,
}: {
  builder: string;
  title: string;
  desc: string;
  href: string;
  tag: string;
  image: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group block overflow-hidden rounded-2xl border border-brand-cream-2 bg-white shadow-sm hover:border-accent-300 hover:shadow-md transition"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-cream-2">
        <Image
          src={image}
          alt={`${title} — built by ${builder} on SafeSpark`}
          width={900}
          height={700}
          className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-[1.03]"
        />
        <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-accent-700">
          {tag}
        </div>
        <div className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-accent-500 px-3 py-1 text-[11px] font-bold text-brand-navy shadow-lg opacity-0 transition group-hover:opacity-100">
          <Play className="h-3 w-3 fill-current" aria-hidden="true" />
          Play
        </div>
      </div>
      <div className="p-4 space-y-1">
        <h3 className="font-display font-bold text-brand-navy">{title}</h3>
        <p className="text-xs font-bold text-accent-700">{builder}</p>
        <p className="text-sm text-brand-ink-soft leading-relaxed">{desc}</p>
      </div>
    </a>
  );
}

function PricingCard({
  tag,
  title,
  price,
  tagline,
  bullets,
  cta,
  highlight,
  disabled,
  email,
  emailAddress,
}: {
  tag: string;
  title: string;
  price: string;
  tagline: string;
  bullets: string[];
  cta: string;
  highlight?: boolean;
  disabled?: boolean;
  email?: boolean;
  emailAddress?: string;
}) {
  return (
    <div
      className={`rounded-2xl p-5 ${
        highlight
          ? 'border-2 border-accent-400 bg-white shadow-xl shadow-accent-100 relative'
          : 'border border-brand-cream-2 bg-white shadow-sm'
      }`}
    >
      {highlight && (
        <span className="absolute -top-2.5 right-3 rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-navy">
          Now
        </span>
      )}
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{tag}</p>
      <h3 className="mt-1 font-display text-xl font-bold text-brand-navy">{title}</h3>
      <p className="mt-1 text-2xl font-black text-accent-700">{price}</p>
      <p className="mt-0.5 text-xs text-brand-ink-soft">{tagline}</p>
      <ul className="mt-3 space-y-1.5 text-sm text-brand-navy">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-700" aria-hidden="true" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      {email ? (
        <a
          href={`mailto:${emailAddress ?? 'jeremiah@getsafefamily.com'}`}
          className="mt-4 block rounded-xl border border-accent-200 bg-white px-4 py-2 text-center text-xs font-black text-accent-700 hover:bg-accent-50"
        >
          {cta}
        </a>
      ) : (
        <button
          disabled={disabled}
          type="button"
          className={`mt-4 block w-full rounded-xl px-4 py-2 text-center text-xs font-black ${
            disabled
              ? 'cursor-not-allowed bg-brand-cream-2 text-slate-400'
              : 'bg-accent-500 text-brand-navy hover:bg-accent-600'
          }`}
        >
          {cta}
        </button>
      )}
    </div>
  );
}

function PowerCard({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
  return (
    <div className="rounded-2xl bg-white border border-brand-cream-2 shadow-sm p-4 hover:border-accent-300 hover:shadow-md transition">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display font-bold text-brand-navy text-sm">{title}</h3>
          <p className="mt-1 text-xs text-brand-ink-soft leading-relaxed">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function SafetyRow({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-brand-cream-2 bg-white px-4 py-3 shadow-sm">
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent-700" />
      <p className="text-sm font-semibold text-brand-navy">{text}</p>
    </div>
  );
}

// Mobile-only sticky CTA. Lives inside the landing component so it only ever
// renders on `/`. Fades in once the hero is scrolled past (~600px), so it
// doesn't compete with the hero CTA for first-impression real estate.
function StickyMobileCTA({ isSignedIn }: { isSignedIn: boolean }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const HERO_THRESHOLD = 600;
    const handleScroll = () => {
      setIsVisible(window.scrollY > HERO_THRESHOLD);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      aria-hidden={!isVisible}
      className={`md:hidden fixed inset-x-0 bottom-0 z-40 transition-opacity duration-300 ${
        isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        className="bg-brand-cream border-t border-brand-cream-2 px-4 pt-3 pb-3"
        style={{ boxShadow: '0 -8px 24px -8px rgba(26, 26, 46, 0.18)' }}
      >
        <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-brand-ink-soft mb-2">
          <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
          No credit card
        </p>
        {isSignedIn ? (
          <Link
            href="/make"
            className="block w-full text-center px-5 py-3 rounded-2xl bg-accent-500 text-brand-navy font-bold shadow-lg shadow-accent-100 hover:bg-accent-600 transition text-base"
          >
            Open SafeSpark →
          </Link>
        ) : (
          <Link
            href="https://getsafefamily.com/signup?plan=unified"
            className="block w-full text-center px-5 py-3 rounded-2xl bg-accent-500 text-brand-navy font-bold shadow-lg shadow-accent-100 hover:bg-accent-600 transition text-base"
          >
            Start free → it takes 30 seconds
          </Link>
        )}
      </div>
    </div>
  );
}

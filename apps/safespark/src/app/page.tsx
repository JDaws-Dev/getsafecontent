'use client';

import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  BookOpen,
  Brain,
  Briefcase,
  Camera,
  Eye,
  Gamepad2,
  Globe,
  GraduationCap,
  History,
  Image as ImageIcon,
  KeyRound,
  Mic,
  ShieldCheck,
  Share2,
  TrendingUp,
  Users,
  Wand2,
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
const SIBLING_APPS: Array<{ name: string; href: string; bg: string }> = [
  { name: 'SafeFamily', href: 'https://getsafefamily.com', bg: 'bg-rose-500' },
  { name: 'SafeTube', href: 'https://getsafetube.com', bg: 'bg-orange-500' },
  { name: 'SafeTunes', href: 'https://getsafetunes.com', bg: 'bg-indigo-500' },
  { name: 'SafeReads', href: 'https://getsafereads.com', bg: 'bg-emerald-500' },
  { name: 'SafeStudy', href: 'https://getsafestudy.com', bg: 'bg-cyan-500' },
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
    a: 'Yes, with a short link only — no public gallery, no comments, no follower counts. They send the link to a friend or grandparent; that\'s it.',
  },
];

export default function HomePage() {
  const { isSignedIn, isLoaded, user } = useUser();
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
      <nav className="px-4 sm:px-8 py-4 flex items-center justify-between gap-6 border-b border-violet-100/40 bg-white/80 backdrop-blur sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 via-pink-500 to-amber-500 shadow-md flex items-center justify-center text-white font-black text-lg group-hover:scale-105 transition">
            ⚡
          </div>
          <span className="text-xl font-black tracking-tight text-violet-700">
            SafeSpark
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm font-bold text-slate-600">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-violet-700 transition">
              {link.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {isLoaded && isSignedIn ? (
            <>
              <Link
                href="/make"
                className="px-5 py-2 rounded-2xl bg-violet-600 text-white font-bold shadow-md hover:bg-violet-700 transition text-sm"
              >
                Open SafeSpark →
              </Link>
              <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-600">
                <span>Hi, {user?.firstName ?? 'parent'}</span>
                <UserButton />
              </div>
              <div className="sm:hidden">
                <UserButton />
              </div>
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <button className="px-4 py-2 text-sm font-bold text-violet-700 hover:text-violet-900">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-5 py-2 rounded-2xl bg-violet-600 text-white font-bold shadow-md hover:bg-violet-700 transition text-sm">
                  Get started — free
                </button>
              </SignUpButton>
            </>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Open menu"
          >
            ☰
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="absolute left-0 right-0 top-full bg-white border-b border-violet-100 px-4 py-3 md:hidden">
            <div className="flex flex-col gap-3 text-sm font-bold text-slate-700">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} className="hover:text-violet-700">
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
              <span className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 via-pink-500 to-amber-500 text-white text-[11px]">
                  ⚡
                </span>
                AI Maker for Kids · Ages 10–13
              </span>
              <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-none">
                <span className="bg-gradient-to-br from-violet-600 via-pink-500 to-amber-500 bg-clip-text text-transparent">
                  The AI skill
                </span>{' '}
                kids will use their whole life.
              </h1>
              <p className="text-lg sm:text-xl text-slate-600 max-w-2xl leading-relaxed">
                Your kid talks to Spark and <strong>builds real things with AI</strong> —
                games, flashcards, study tools, posters, image projects, trackers. They
                learn to <strong className="underline decoration-violet-400 decoration-2 underline-offset-4">direct AI</strong> — ask clearly, check the output,
                iterate, ship. The most important skill they&apos;ll learn this decade.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-3">
                {isLoaded && isSignedIn ? (
                  <Link
                    href="/make"
                    className="px-8 py-4 rounded-2xl bg-violet-600 text-white font-bold shadow-xl shadow-violet-200 hover:bg-violet-700 transition text-lg text-center"
                  >
                    Open SafeSpark →
                  </Link>
                ) : (
                  <SignUpButton mode="modal">
                    <button className="px-8 py-4 rounded-2xl bg-violet-600 text-white font-bold shadow-xl shadow-violet-200 hover:bg-violet-700 transition text-lg">
                      Start free → it takes 30 seconds
                    </button>
                  </SignUpButton>
                )}
              </div>
              <p className="text-xs font-bold text-slate-600">
                <span className="text-emerald-600">✓</span> Free during early access
                <span className="mx-2 text-slate-300">·</span>
                <span className="text-emerald-600">✓</span> No credit card
                <span className="mx-2 text-slate-300">·</span>
                <span className="text-emerald-600">✓</span> Cancel any time
                <span className="mx-2 text-slate-300">·</span>
                <span className="text-emerald-600">✓</span> COPPA-aware
              </p>
            </div>

            <div className="flex flex-wrap gap-2 max-w-2xl">
              <FeaturePill icon={Mic} label="Talk to it" />
              <FeaturePill icon={Camera} label="Upload photos" />
              <FeaturePill icon={Wand2} label="AI image restyle" />
              <FeaturePill icon={Globe} label="Real facts" />
              <FeaturePill icon={ShieldCheck} label="Safe by default" />
              <FeaturePill icon={Share2} label="Share & print" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-violet-100 shadow-xl">
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
      <section className="px-4 sm:px-8 py-6 border-y border-violet-100 bg-white">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            ['👨‍👩‍👧', 'Parent is the account holder'],
            ['🛡️', 'No data sold, ever'],
            ['🎯', 'Designed for ages 10–13'],
            ['📱', 'Works on any device'],
          ].map(([icon, label]) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <div className="text-2xl">{icon}</div>
              <p className="text-xs font-bold text-slate-700 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHY NOW — AI LITERACY FOR FUTURE CAREERS */}
      <section id="why-now" className="px-4 sm:px-8 py-16 bg-gradient-to-br from-slate-900 via-violet-900 to-pink-900 text-white">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_460px] gap-10 items-center">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-300">
              Why this matters now
            </p>
            <h2 className="text-4xl sm:text-5xl font-black leading-tight">
              Kids who learn AI early get a real career head start.
            </h2>
            <p className="text-lg text-violet-100 leading-relaxed">
              In five years, directing AI well will be a baseline skill &mdash; like writing a
              coherent email today. SafeSpark gives kids a safe place to practice <em>now</em>,
              before bad habits form on random chatbots and TikTok filters. They&apos;re not
              just consuming AI. They&apos;re directing it.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 pt-3">
              <div className="rounded-2xl bg-white/10 backdrop-blur p-4 border border-white/15">
                <Briefcase className="h-6 w-6 text-amber-300 mb-2" />
                <p className="text-sm font-black">Future-proof careers</p>
                <p className="mt-1 text-xs text-violet-200 leading-relaxed">
                  Every white-collar job in 5 years will require AI fluency. They&apos;ll have a 7-year head
                  start.
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 backdrop-blur p-4 border border-white/15">
                <GraduationCap className="h-6 w-6 text-amber-300 mb-2" />
                <p className="text-sm font-black">Real AI habits</p>
                <p className="mt-1 text-xs text-violet-200 leading-relaxed">
                  Clarify, iterate, own the output. The skills schools haven&apos;t figured out how to teach
                  yet.
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 backdrop-blur p-4 border border-white/15">
                <TrendingUp className="h-6 w-6 text-amber-300 mb-2" />
                <p className="text-sm font-black">Confidence to make</p>
                <p className="mt-1 text-xs text-violet-200 leading-relaxed">
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
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-500">
              What kids make
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-800">
              Real projects, in seconds.
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Six one-tap templates get them started. After that they ask for
              anything in plain words.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ExampleCard icon={Gamepad2} title="Games" desc='"Make a Pokemon battle game" → playable in seconds. Add a boss, sounds, score — it just iterates.' accent="from-fuchsia-500 to-purple-500" />
            <ExampleCard icon={BookOpen} title="Flashcards & Quizzes" desc='"Flashcards for state capitals" → ready to study with. Real facts pulled from Wikipedia, not made up.' accent="from-emerald-500 to-teal-400" />
            <ExampleCard icon={ImageIcon} title="Posters" desc='"Poster for my lemonade stand" → print it on real paper from the browser, ready for the table.' accent="from-pink-500 to-rose-400" />
            <ExampleCard icon={Brain} title="Trackers & Apps" desc='"Habit tracker I can use today" → saves data so it remembers tomorrow. Real tiny app, not just a chat.' accent="from-amber-500 to-orange-400" />
            <ExampleCard icon={Wand2} title="Photo restyles" desc='Upload a photo → "make me a Pixar character" → AI repaints the face. Cartoon, anime, Lego, comic-book.' accent="from-violet-500 to-pink-500" />
            <ExampleCard icon={Wand2} title="Anything else" desc='Story tools, sound boards, name generators, drawing apps, outfit pickers, calculators, recipe finders…' accent="from-cyan-500 to-sky-500" />
          </div>
        </div>
      </section>

      {/* MAKE & SHARE */}
      <section className="px-4 sm:px-8 py-16 bg-[var(--safefamily-cream-dark)]">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-500">
              Make it. Share it.
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-800">
              Real projects kids can send to anyone.
            </h2>
            <p className="text-slate-600 leading-relaxed text-lg">
              Every project &mdash; a study tool, a lemonade-stand poster, a flashcard set, a game for a
              friend &mdash; gets a short, kid-readable share link the kid can hand to grandma. Friends
              and family open it on any browser. No login. No download.
            </p>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-black text-xs">1</div>
                <span className="text-slate-700"><strong>Vibe code it</strong> in plain words &mdash; &ldquo;make flashcards for state capitals&rdquo; or &ldquo;a poster for my lemonade stand.&rdquo;</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-700 font-black text-xs">2</div>
                <span className="text-slate-700"><strong>Iterate</strong> &mdash; &ldquo;add multiple choice,&rdquo; &ldquo;make the headline bigger.&rdquo; That&apos;s the real AI skill.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-black text-xs">3</div>
                <span className="text-slate-700"><strong>Share or print</strong>. Send the link to a teacher, a grandparent, a friend &mdash; or hit Print for the fridge.</span>
              </li>
            </ul>
            <p className="text-sm text-slate-500 italic pt-2">
              Private by default. No public gallery, no comments, no follower counts &mdash; only the
              people your kid sends the link to can see it.
            </p>
          </div>
          <div className="relative rounded-3xl bg-white border border-violet-100 shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-rose-300" />
                <span className="h-3 w-3 rounded-full bg-amber-300" />
                <span className="h-3 w-3 rounded-full bg-emerald-300" />
              </div>
              <span className="ml-2 text-[10px] font-bold text-slate-500 font-mono truncate">
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
            <p className="px-4 py-3 text-xs text-slate-500 text-center font-semibold bg-white border-t border-slate-100">
              ↑ What grandma sees when Knox sends her the link
            </p>
          </div>
        </div>
      </section>

      {/* WHAT KIDS BUILT — real shipping social proof */}
      <section className="px-4 sm:px-8 py-14 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 space-y-2">
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-500">
              Real kids, real projects
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-800">
              Here&apos;s what kids actually built this week.
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Tap to play. Every one of these was built by typing or talking to Spark — no code editor, no copy-paste.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <KidBuildCard
              builder="Knox, age 11"
              title="Mando Partner Rescue"
              desc="129 messages of iteration. Real game. Shareable link. Pick Boba or IG-11 as your partner. Beat the boss."
              href="/s/mando-partner-rescue-2bs9"
              tag="Game"
              image="/landing/build-mando.png"
            />
            <KidBuildCard
              builder="Myles, age 8"
              title="Pokémon Flashcards"
              desc="Multiple-choice flashcards using PokeAPI sprites — no typing needed. Real study tool, built in plain words."
              href="/s/pok-mon-multiple-choice-flashcar-suyr"
              tag="Flashcards"
              image="/landing/build-flashcards.png"
            />
            <KidBuildCard
              builder="Knox, age 11"
              title="Garbage Can Cleaning Flyer"
              desc="A printable flyer for a neighborhood cleaning business. Vibe coded, then printed for the front door."
              href="/s/knox-garbage-can-cleaning-flyer-mkt3"
              tag="Poster"
              image="/landing/build-flyer.png"
            />
          </div>
        </div>
      </section>

      {/* VS — how it's different from ChatGPT */}
      <section className="px-4 sm:px-8 py-14">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 space-y-2">
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-500">
              vs. the alternatives
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-800">
              Why not just ChatGPT?
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              ChatGPT is for adults doing adult work. SafeSpark is the version where a kid can actually build, share, and be safe.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-violet-100 bg-slate-50">
                  <th className="px-4 py-3 text-left font-black uppercase tracking-widest text-[10px] text-slate-500">Feature</th>
                  <th className="px-4 py-3 text-left font-black text-slate-500">ChatGPT</th>
                  <th className="px-4 py-3 text-left font-black text-slate-500">Random AI chatbot</th>
                  <th className="px-4 py-3 text-left font-black text-violet-700">SafeSpark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-50">
                {[
                  ['Account holder', 'Kid signs up', 'Kid signs up', 'Parent — kid uses family code'],
                  ['Live playable result', '❌ Text only', '❌ Text only', '✅ Real running app/game'],
                  ['Hard-topic redirect', '❌ Will engage', '❌ Often unsafe', '✅ Routes to parent'],
                  ['Image restyle', '⚠️ No kid filter', '⚠️ Sometimes blocked', '✅ Kid-safe + moderated'],
                  ['Parent visibility', '❌ None', '❌ None', '✅ Full dashboard'],
                  ['Share with friends', '⚠️ Whole chat', '⚠️ Awkward', '✅ One-tap share link'],
                  ['Made for ages 10–13', '❌ Adult tool', '❌ All ages', '✅ Designed for tweens'],
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-bold text-slate-700">{row[0]}</td>
                    <td className="px-4 py-3 text-slate-600">{row[1]}</td>
                    <td className="px-4 py-3 text-slate-600">{row[2]}</td>
                    <td className="px-4 py-3 font-bold text-violet-700">{row[3]}</td>
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
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-500">
              How it&apos;s different
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-800">
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
              <p className="text-sm font-semibold uppercase tracking-widest text-violet-500">
                Made for families
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-800">
                One parent account. Every kid gets their own profile.
              </h2>
              <p className="text-slate-500">
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
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-violet-100 space-y-3">
              <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 text-white items-center justify-center shadow-md">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Family code login</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Kid types a 6-character code at <span className="font-mono font-bold text-violet-600">/start</span>,
                picks their profile, optional PIN. No password. No email.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-violet-100 space-y-3">
              <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 text-white items-center justify-center shadow-md">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Multiple kids per family</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Add each kid as a profile under your account. Every project they make
                attributes to them — siblings stay separate.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-violet-100 space-y-3">
              <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-400 text-white items-center justify-center shadow-md">
                <Eye className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Parent dashboard</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                See every kid&apos;s projects, every prompt, monthly usage, and what
                they&apos;ve been making. At{' '}
                <span className="font-mono font-bold text-violet-600">/parent</span>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SAFETY */}
      <section id="safety" className="px-4 sm:px-8 py-14 scroll-mt-20">
        <div className="max-w-4xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-500">
              Safe by default
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-800">
              The AI is on a leash.
            </h2>
            <p className="text-slate-600 leading-relaxed">
              No social-media patterns. No gambling. No violence or gore. No collecting
              private information. SafeSpark redirects to safe alternatives instead of
              refusing — so kids can keep building.
            </p>
            <p className="text-slate-600 leading-relaxed">
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
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl text-center mb-12">
            Why I Built This
          </h2>
          <div
            className="bg-[var(--safefamily-cream)] rounded-3xl p-8 sm:p-10 lg:p-12"
            style={{ boxShadow: '0 4px 20px rgba(26, 26, 46, 0.08)' }}
          >
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 pb-8 border-b border-slate-200">
              <Image
                src="/landing/jeremiah-headshot.jpg"
                alt="Jeremiah Daws"
                width={400}
                height={400}
                className="h-32 w-32 sm:h-40 sm:w-40 rounded-2xl object-cover flex-shrink-0 shadow-lg"
                style={{ objectPosition: 'center 15%' }}
              />
              <div className="text-center sm:text-left">
                <p className="font-bold text-slate-900 text-xl sm:text-2xl">Jeremiah Daws</p>
                <p className="text-base text-slate-600 mt-1">Teacher, Software Developer, Parent</p>
              </div>
            </div>

            <div className="space-y-6 text-slate-800">
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
              <p className="text-lg leading-relaxed text-slate-600">
                I hope it helps your kid the way I wish it had existed for me.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="px-4 sm:px-8 py-16 bg-[var(--safefamily-cream-dark)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 space-y-2">
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-500">
              Early-access feedback
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-800">
              What parents are seeing.
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
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
          <p className="text-sm font-semibold uppercase tracking-widest text-violet-500">Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800">
            Free during early access.
          </h2>
          <p className="text-slate-600 leading-relaxed max-w-xl mx-auto">
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
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-500">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-800">
              The parent questions we hear most.
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <details
                key={faq.q}
                open={i < 2}
                className="group rounded-2xl border border-violet-100 bg-white shadow-sm"
              >
                <summary className="cursor-pointer list-none px-5 py-4 flex items-start justify-between gap-4 font-bold text-slate-800 hover:text-violet-700">
                  <span>{faq.q}</span>
                  <span className="text-violet-500 text-xl transition group-open:rotate-45 shrink-0">+</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{faq.a}</div>
              </details>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">
            More questions?{' '}
            <a href="mailto:jeremiah@getsafefamily.com" className="font-bold text-violet-700 underline">
              jeremiah@getsafefamily.com
            </a>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-8 py-20 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-5xl font-bold bg-gradient-to-br from-violet-600 via-pink-500 to-amber-500 bg-clip-text text-transparent">
            Let your kid build something today.
          </h2>
          <p className="text-lg text-slate-600">
            One parent email. Multiple kid profiles. Every project saved under your account
            and reachable from any device.
          </p>
          {isLoaded && isSignedIn ? (
            <Link
              href="/make"
              className="inline-block px-8 py-4 rounded-2xl bg-violet-600 text-white font-bold shadow-xl shadow-violet-200 hover:bg-violet-700 transition text-lg"
            >
              Open SafeSpark →
            </Link>
          ) : (
            <SignUpButton mode="modal">
              <button className="px-8 py-4 rounded-2xl bg-violet-600 text-white font-bold shadow-xl shadow-violet-200 hover:bg-violet-700 transition text-lg">
                Sign up free
              </button>
            </SignUpButton>
          )}
          <p className="text-xs font-bold text-slate-500">
            Free during early access · No credit card · Cancel any time
          </p>
        </div>
      </section>

      <StickyMobileCTA isSignedIn={!!(isLoaded && isSignedIn)} />

      <footer className="px-4 sm:px-8 py-10 border-t border-violet-100/60 bg-white">
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
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition px-3 py-1.5 text-xs font-bold text-slate-700"
                >
                  <span className={`h-2.5 w-2.5 rounded-sm ${app.bg}`} />
                  {app.name}
                </a>
              ))}
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700">
                <span className="h-2.5 w-2.5 rounded-sm bg-violet-500" />
                SafeSpark · you are here
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
            <div>
              SafeSpark · A safe way for kids to build with AI · getsafespark.com
            </div>
            <nav className="flex flex-wrap items-center gap-5 font-bold">
              <Link href="/privacy" className="hover:text-violet-700">Privacy</Link>
              <Link href="/terms" className="hover:text-violet-700">Terms</Link>
              <a href="mailto:jeremiah@getsafefamily.com" className="hover:text-violet-700">Contact</a>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeaturePill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-violet-100 text-xs font-bold text-slate-700 shadow-sm">
      <Icon className="h-3.5 w-3.5 text-violet-600" />
      {label}
    </span>
  );
}

function ExampleCard({ icon: Icon, title, desc, accent }: { icon: LucideIcon; title: string; desc: string; accent: string }) {
  return (
    <div className="p-5 rounded-2xl bg-white shadow-sm border border-violet-100 space-y-3">
      <div className={`inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br ${accent} text-white items-center justify-center shadow-md`}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
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
          ? 'rounded-2xl border-2 border-dashed border-violet-200 bg-white/60 p-5'
          : 'rounded-2xl border border-violet-100 bg-white p-5 shadow-sm'
      }
    >
      <blockquote className={placeholder ? 'text-sm italic text-slate-400 leading-relaxed' : 'text-sm text-slate-700 leading-relaxed'}>
        &ldquo;{quote}&rdquo;
      </blockquote>
      <figcaption className="mt-4">
        <p className={placeholder ? 'text-sm font-bold text-slate-400' : 'text-sm font-black text-slate-900'}>
          {attribution}
        </p>
        <p className="text-xs text-slate-500">{context}</p>
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
      className="group block overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm hover:border-violet-300 hover:shadow-md transition"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <Image
          src={image}
          alt={`${title} — built by ${builder} on SafeSpark`}
          width={900}
          height={700}
          className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-[1.03]"
        />
        <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-violet-700">
          {tag}
        </div>
        <div className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1 text-[11px] font-black text-white shadow-lg opacity-0 transition group-hover:opacity-100">
          ▶ Play
        </div>
      </div>
      <div className="p-4 space-y-1">
        <h3 className="font-black text-slate-900">{title}</h3>
        <p className="text-xs font-bold text-violet-600">{builder}</p>
        <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
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
          ? 'border-2 border-violet-400 bg-white shadow-xl shadow-violet-100 relative'
          : 'border border-slate-200 bg-white shadow-sm'
      }`}
    >
      {highlight && (
        <span className="absolute -top-2.5 right-3 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
          Now
        </span>
      )}
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{tag}</p>
      <h3 className="mt-1 text-xl font-black text-slate-900">{title}</h3>
      <p className="mt-1 text-2xl font-black text-violet-600">{price}</p>
      <p className="mt-0.5 text-xs text-slate-500">{tagline}</p>
      <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <span className="text-violet-500 mt-0.5">✓</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      {email ? (
        <a
          href={`mailto:${emailAddress ?? 'jeremiah@getsafefamily.com'}`}
          className="mt-4 block rounded-xl border border-violet-200 bg-white px-4 py-2 text-center text-xs font-black text-violet-700 hover:bg-violet-50"
        >
          {cta}
        </a>
      ) : (
        <button
          disabled={disabled}
          type="button"
          className={`mt-4 block w-full rounded-xl px-4 py-2 text-center text-xs font-black ${
            disabled
              ? 'cursor-not-allowed bg-slate-100 text-slate-400'
              : 'bg-violet-600 text-white hover:bg-violet-700'
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
    <div className="rounded-2xl bg-white border border-violet-100 shadow-sm p-4 hover:border-violet-300 hover:shadow-md transition">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-black text-slate-800 text-sm">{title}</h3>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function SafetyRow({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-sm">
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
      <p className="text-sm font-semibold text-slate-700">{text}</p>
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
        className="bg-[var(--safefamily-cream)] border-t border-violet-100 px-4 pt-3 pb-3"
        style={{ boxShadow: '0 -8px 24px -8px rgba(26, 26, 46, 0.18)' }}
      >
        <p className="text-[11px] font-bold text-slate-600 text-center mb-2">
          <span className="text-emerald-600">✓</span> No credit card
        </p>
        {isSignedIn ? (
          <Link
            href="/make"
            className="block w-full text-center px-5 py-3 rounded-2xl bg-violet-600 text-white font-bold shadow-lg shadow-violet-200 hover:bg-violet-700 transition text-base"
          >
            Open SafeSpark →
          </Link>
        ) : (
          <SignUpButton mode="modal">
            <button
              type="button"
              className="block w-full text-center px-5 py-3 rounded-2xl bg-violet-600 text-white font-bold shadow-lg shadow-violet-200 hover:bg-violet-700 transition text-base"
            >
              Start free → it takes 30 seconds
            </button>
          </SignUpButton>
        )}
      </div>
    </div>
  );
}

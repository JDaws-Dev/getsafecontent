import { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  UserPlus,
  KeyRound,
  Sparkles,
  Check,
  ArrowRight,
  Music,
  PlaySquare,
  Book,
  Search,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Setup Guide — Get your family started in 15 minutes",
  description:
    "New to Safe Family? Follow this 4-step guide to get the whole family up and running: create kid profiles, connect each app, share your family code, and approve your first content.",
  openGraph: {
    title: "Safe Family Setup Guide",
    description:
      "New to Safe Family? Here's the step-by-step guide to getting everything running.",
    type: "article",
  },
};

const steps = [
  {
    n: 1,
    icon: UserPlus,
    title: "Create kid profiles",
    minutes: "~3 min",
    body: "Each kid gets their own profile with a name, color, and (optional) 4-digit PIN. Profiles are what kids pick from when they open the app. You can add as many as you need — there's no per-kid charge.",
    tip: "Tip: pick distinct colors per kid. The icon on their profile tile comes from the color you choose.",
  },
  {
    n: 2,
    icon: Music,
    title: "Connect each app to what your kids already use",
    minutes: "~4 min",
    body: "SafeTunes connects to your Apple Music account (family plan works). SafeTube uses your approved YouTube channel list. SafeReads and SafeStudy work out of the box — no external account needed. You only need to set up the apps you're actually going to use today.",
    tip: "Tip: start with one app. You can add the others later — nothing's gated.",
  },
  {
    n: 3,
    icon: KeyRound,
    title: "Share your family code with your kids",
    minutes: "~1 min",
    body: "Your family code is the 6-character code kids type in on their device to access their profile. One code works for all 5 apps. You'll find it in the parent dashboard of each app — it's the same code everywhere.",
    tip: "Tip: write it on a sticky note on the fridge. Our most-successful families literally do this.",
  },
  {
    n: 4,
    icon: Sparkles,
    title: "Approve your first content",
    minutes: "~5–10 min",
    body: "Once kids have the family code and can pick their profile, they start seeing only what you've approved. Approve a handful of albums, a few YouTube channels, or a couple of books to start. Kids can request more — you review each request with a one-tap approve/deny.",
    tip: "Tip: don't try to build the perfect library on day one. Start with 5–10 items and let kids request the rest — that's where the magic is.",
  },
];

const apps = [
  {
    name: "SafeTunes",
    href: "https://getsafetunes.com",
    icon: Music,
    color: "from-purple-500 to-pink-500",
    description: "Connect to Apple Music",
  },
  {
    name: "SafeTube",
    href: "https://getsafetube.com",
    icon: PlaySquare,
    color: "from-red-500 to-orange-500",
    description: "Approve YouTube channels",
  },
  {
    name: "SafeReads",
    href: "https://getsafereads.com",
    icon: Book,
    color: "from-emerald-500 to-teal-500",
    description: "Analyze books for content",
  },
  {
    name: "SafeStudy",
    href: "https://getsafestudy.com",
    icon: Search,
    color: "from-blue-500 to-cyan-500",
    description: "Safe search + AI tutor",
  },
  {
    name: "SafeSpark",
    href: "https://getsafespark.com",
    icon: Sparkles,
    color: "from-amber-500 to-orange-500",
    description: "AI training lab for kids",
    isNew: true,
  },
];

export default function SetupPage() {
  return (
    <>
      <Header />
      <main className="bg-cream min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 rounded-full bg-peach-start/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-peach-end mb-4">
              Setup guide
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-navy mb-4">
              Get your family started in about 15 minutes
            </h1>
            <p className="text-lg text-navy/70 max-w-2xl mx-auto">
              Welcome to Safe Family! Here&rsquo;s the fastest path from &ldquo;I just paid&rdquo;
              to &ldquo;my kids are actually using this.&rdquo; Four steps. You don&rsquo;t need
              to do them all today.
            </p>
          </div>

          {/* Steps */}
          <ol className="space-y-6">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.n}
                  className="card-soft p-6 sm:p-8 flex flex-col sm:flex-row gap-6"
                >
                  {/* Step number + icon */}
                  <div className="flex sm:flex-col items-center sm:items-start gap-4 sm:gap-3 flex-shrink-0">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-purple-200">
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-indigo-500 text-xs font-bold text-indigo-700 flex items-center justify-center">
                        {step.n}
                      </div>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-navy/40 whitespace-nowrap">
                      {step.minutes}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold text-navy mb-2">
                      Step {step.n}: {step.title}
                    </h2>
                    <p className="text-navy/70 leading-relaxed">{step.body}</p>
                    <p className="mt-3 text-sm text-navy/60 bg-cream-dark/60 rounded-lg p-3">
                      {step.tip}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Jump to apps */}
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-navy text-center mb-6">
              Jump into the parent dashboard
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {apps.map((app) => {
                const Icon = app.icon;
                return (
                  <a
                    key={app.name}
                    href={app.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group card-soft p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-transform"
                  >
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center flex-shrink-0 shadow-sm`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-navy group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                        Open {app.name} &rarr;
                        {app.isNew && (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                            NEW
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-navy/60">{app.description}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>

          {/* Common questions */}
          <section className="mt-12 card-soft p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-navy mb-5">
              Common questions during setup
            </h2>
            <dl className="space-y-5">
              <div>
                <dt className="font-semibold text-navy flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  Do I need to set up all five apps?
                </dt>
                <dd className="mt-1 ml-7 text-navy/70 text-sm">
                  No &mdash; your Safe Family bundle gives you access to all five, but you can
                  start with one (whichever matches your biggest worry today) and add the rest
                  whenever you&rsquo;re ready.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-navy flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  Does my family code change per app?
                </dt>
                <dd className="mt-1 ml-7 text-navy/70 text-sm">
                  Nope. One 6-character code works for SafeTunes, SafeTube, SafeReads, and
                  SafeStudy. Share it once and you&rsquo;re done.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-navy flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  What if I don&rsquo;t have Apple Music?
                </dt>
                <dd className="mt-1 ml-7 text-navy/70 text-sm">
                  Skip SafeTunes for now &mdash; the other three apps don&rsquo;t need Apple Music.
                  SafeTunes works with individual or family Apple Music plans if you add one
                  later.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-navy flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  I set up one app. How do I tell my kids?
                </dt>
                <dd className="mt-1 ml-7 text-navy/70 text-sm">
                  Give them the family code and the URL (e.g. <code>getsafetunes.com/play</code>).
                  They type the code, pick their profile, and that&rsquo;s it. They&rsquo;ll only
                  see what you&rsquo;ve approved.
                </dd>
              </div>
            </dl>
          </section>

          {/* Bottom CTA */}
          <div className="mt-10 text-center">
            <p className="text-navy/60 mb-4">Still stuck? We respond fast.</p>
            <Link
              href="mailto:jeremiah@getsafefamily.com"
              className="inline-flex items-center gap-2 bg-navy text-white px-6 py-3 rounded-full font-semibold hover:bg-navy/90 transition-colors"
            >
              Email Jeremiah directly
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

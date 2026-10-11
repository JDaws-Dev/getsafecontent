import { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  ShieldCheck,
  ShieldAlert,
  UserX,
  Laptop,
  Smartphone,
  Tablet,
  Monitor,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ListChecks,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Lock down your kid's device | Safe Family Guide",
  description:
    "Plain-English steps for Chromebook, Android, iPhone/iPad, Mac and Windows: allow only the sites your kids need, block YouTube, close the Chromebook Guest loophole, and test it in 5 minutes.",
  openGraph: {
    title: "Lock down your kid's device",
    description:
      "Allow only the sites your kids need, block YouTube, close the Chromebook Guest loophole, and test it in 5 minutes.",
    type: "article",
  },
};

// The only sites Safe Family needs. youtube-nocookie.com is the video player
// that SafeTube embeds: it plays one approved video and has no search, no
// home page and no browsing. googlevideo.com / ytimg.com / googleapis.com are
// NOT needed — Family Link filters page and frame loads only, not the video
// stream or thumbnails.
const ALLOW_SITES = [
  { site: "getsafefamily.com", why: "Safe Family (all five apps)" },
  { site: "getsafetube.com", why: "SafeTube" },
  { site: "youtube-nocookie.com", why: "SafeTube's video player only (no search, no browsing)" },
];

const BLOCK_SITES = ["youtube.com", "m.youtube.com"];

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[0.95em] text-navy break-all">
      {children}
    </code>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-navy/80 leading-relaxed">
          <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            {i + 1}
          </span>
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function SiteLists() {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-900">
          <CheckCircle2 className="h-4 w-4" /> Approved sites
        </p>
        <ul className="space-y-1.5 text-sm text-emerald-900">
          {ALLOW_SITES.map((s) => (
            <li key={s.site}>
              <Code>{s.site}</Code>
              <span className="block text-xs text-emerald-800/80 mt-0.5">{s.why}</span>
            </li>
          ))}
          <li className="text-xs text-emerald-800/80">
            Plus your child&rsquo;s real school sites, if they need them.
          </li>
        </ul>
      </div>
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold text-red-900">
          <XCircle className="h-4 w-4" /> Blocked sites
        </p>
        <ul className="space-y-1.5 text-sm text-red-900">
          {BLOCK_SITES.map((s) => (
            <li key={s}>
              <Code>{s}</Code>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-red-800/80">
          A second lock, in case an approval ever slips through.
        </p>
      </div>
    </div>
  );
}

function YouTubeWarning() {
  return (
    <div
      role="note"
      className="rounded-2xl border-2 border-red-400 bg-red-50 p-5 sm:p-6"
    >
      <div className="flex gap-3">
        <ShieldAlert className="h-7 w-7 flex-shrink-0 text-red-600" />
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-red-900 sm:text-xl">
            Never approve youtube.com or m.youtube.com
          </h2>
          <p className="mt-2 text-red-900/90 leading-relaxed">
            Not even when a video won&rsquo;t play. <strong>One approval unlocks all of YouTube</strong>,
            search, recommendations and everything else, and your child keeps it until you notice.
          </p>
          <p className="mt-2 text-red-900/90 leading-relaxed">
            SafeTube only needs <Code>youtube-nocookie.com</Code>. That is just the video player:
            no search, no home page, no browsing. You do <strong>not</strong> need{" "}
            <Code>googlevideo.com</Code>, <Code>ytimg.com</Code> or <Code>googleapis.com</Code>.
          </p>
          <p className="mt-2 text-sm text-red-900/80">
            If SafeTube videos won&rsquo;t play, check that <Code>youtube-nocookie.com</Code> is on
            the approved list, or email us. That is always the fix.
          </p>
        </div>
      </div>
    </div>
  );
}

function GuestWarning() {
  return (
    <div
      role="note"
      className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 sm:p-6"
    >
      <div className="flex gap-3">
        <UserX className="h-7 w-7 flex-shrink-0 text-amber-700" />
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-amber-900 sm:text-xl">
            Chromebook: turn off Guest mode
          </h3>
          <p className="mt-2 text-amber-900/90 leading-relaxed">
            Anyone can tap <strong>Browse as Guest</strong> on the Chromebook sign-in screen. A guest
            gets Chrome with <strong>no Family Link at all</strong>: no filter, no time limits, and no
            history left behind when they sign out.
          </p>
          <p className="mt-3 font-semibold text-amber-900">
            Only the device owner can fix this. The owner is the first account ever signed in to
            this Chromebook.
          </p>
          <div className="mt-3">
            <Steps
              items={[
                <>Sign in to the Chromebook as the owner.</>,
                <>
                  Open <strong>Settings</strong> &gt; <strong>Security and privacy</strong> (on older
                  Chromebooks: <strong>Privacy and security</strong>) &gt;{" "}
                  <strong>Manage other people</strong>.
                </>,
                <>
                  Turn <strong>off</strong> &ldquo;Enable Guest browsing.&rdquo;
                </>,
                <>
                  Turn <strong>on</strong> &ldquo;Restrict sign-in to the following users&rdquo; and
                  list only your child and the parents. Remove anyone else.
                </>,
              ]}
            />
          </div>
          <p className="mt-3 text-sm text-amber-900/80">
            Switches greyed out? You aren&rsquo;t signed in as the owner. Changing the owner means
            resetting the Chromebook (Powerwash).
          </p>
          <p className="mt-2 text-sm text-amber-900/80">
            <strong>Check:</strong> sign out. The sign-in screen should show no &ldquo;Browse as
            Guest&rdquo; and no &ldquo;Add person.&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}

function DeviceSection({
  id,
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="card-soft scroll-mt-24 p-5 sm:p-8">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-100">
          <Icon className="h-6 w-6 text-indigo-600" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-navy sm:text-2xl">{title}</h2>
          {subtitle && <p className="text-sm text-navy/60">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function SubHead({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 text-base font-bold text-navy sm:text-lg">{children}</h3>;
}

const familyLinkSiteSteps = [
  <>
    Open the <strong>Family Link</strong> app on your phone and pick your child.
  </>,
  <>
    Tap <strong>Controls</strong> &gt; <strong>Content restrictions</strong> &gt;{" "}
    <strong>Google Chrome</strong>.
  </>,
  <>
    Choose <strong>Only allow approved sites</strong>.
  </>,
  <>
    Tap <strong>Manage sites</strong> &gt; <strong>Approved</strong> and add each approved site
    below.
  </>,
  <>
    Go back to <strong>Manage sites</strong> &gt; <strong>Blocked</strong> and add{" "}
    <Code>youtube.com</Code> and <Code>m.youtube.com</Code>.
  </>,
];

const familyLinkPlaySteps = [
  <>
    In Family Link: <strong>Controls</strong> &gt; <strong>Content restrictions</strong> &gt;{" "}
    <strong>Google Play</strong>. Set <strong>Require approval for</strong> to{" "}
    <strong>All content</strong>.
  </>,
  <>
    In <strong>Controls</strong> &gt; <strong>Apps</strong> (or <strong>App limits</strong>), set
    these to <strong>Block</strong>: YouTube, YouTube Kids, Google TV, and any other browser
    (Firefox, Edge, Opera and so on).
  </>,
];

const familyLinkExtraSteps = [
  <>
    <strong>Gemini:</strong> in Family Link, <strong>Controls</strong> &gt;{" "}
    <strong>Gemini Apps</strong>, turn it off unless you want your child using it.
  </>,
  <>
    <strong>Extensions and site permissions:</strong> <strong>Controls</strong> &gt;{" "}
    <strong>Content restrictions</strong> &gt; <strong>Google Chrome</strong>, turn off
    permissions for sites, apps and extensions so your child can&rsquo;t add extensions on their
    own.
  </>,
];

export default function LockDownGuidePage() {
  return (
    <>
      <Header />
      <main className="bg-cream min-h-screen overflow-x-hidden pt-24 pb-16">
        <article className="mx-auto max-w-3xl space-y-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <header className="text-center">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-peach-start/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-peach-end">
              Setup guide
            </span>
            <div className="mb-5 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600">
                <ShieldCheck className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="mb-4 text-3xl font-bold text-navy sm:text-4xl lg:text-5xl">
              Lock down your kid&rsquo;s device
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-navy/70">
              Safe Family only controls what&rsquo;s inside our apps. To stop your child going around
              them, the device itself needs to allow only a few sites. About 15 minutes, once.
            </p>
          </header>

          {/* Jump links */}
          <nav aria-label="Pick a device" className="card-soft p-4 sm:p-5">
            <p className="mb-3 text-sm font-semibold text-navy/70">Jump to your child&rsquo;s device:</p>
            <div className="flex flex-wrap gap-2">
              {[
                ["#chromebook", "Chromebook"],
                ["#android", "Android"],
                ["#ios", "iPhone / iPad"],
                ["#computer", "Mac / Windows"],
                ["#check", "5-minute check"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                >
                  {label}
                </a>
              ))}
            </div>
          </nav>

          <YouTubeWarning />

          {/* Chromebook */}
          <DeviceSection
            id="chromebook"
            icon={Laptop}
            title="Chromebook (Family Link)"
            subtitle="Your child signs in with their own supervised Google account."
          >
            <div>
              <SubHead>1. Allow only approved sites</SubHead>
              <Steps items={familyLinkSiteSteps} />
              <SiteLists />
            </div>
            <GuestWarning />
            <div>
              <SubHead>2. Lock down Google Play</SubHead>
              <Steps items={familyLinkPlaySteps} />
            </div>
            <div>
              <SubHead>3. A few more switches</SubHead>
              <Steps items={familyLinkExtraSteps} />
            </div>
          </DeviceSection>

          {/* Android */}
          <DeviceSection
            id="android"
            icon={Smartphone}
            title="Android phone or tablet (Family Link)"
            subtitle="Same Family Link settings as a Chromebook."
          >
            <div>
              <SubHead>1. Allow only approved sites</SubHead>
              <Steps items={familyLinkSiteSteps} />
              <SiteLists />
            </div>
            <div>
              <SubHead>2. Lock down Google Play</SubHead>
              <Steps items={familyLinkPlaySteps} />
              <p className="mt-3 text-sm text-navy/60">
                Blocking the other browsers matters most on Android: Family Link&rsquo;s site list
                only applies to Chrome.
              </p>
            </div>
            <div>
              <SubHead>3. A few more switches</SubHead>
              <Steps items={familyLinkExtraSteps} />
            </div>
          </DeviceSection>

          {/* iOS */}
          <DeviceSection
            id="ios"
            icon={Tablet}
            title="iPhone or iPad (Screen Time)"
            subtitle="Do this on the child's device, or from your iPhone under Family."
          >
            <div>
              <SubHead>1. Allow only approved sites</SubHead>
              <Steps
                items={[
                  <>
                    Open <strong>Settings</strong> &gt; <strong>Screen Time</strong>. Turn it on and set a
                    Screen Time passcode your child doesn&rsquo;t know.
                  </>,
                  <>
                    Tap <strong>Content &amp; Privacy Restrictions</strong> and turn it on.
                  </>,
                  <>
                    Tap <strong>App Store, Media, Web &amp; Games</strong> (older iOS:{" "}
                    <strong>Content Restrictions</strong>) &gt; <strong>Web Content</strong>.
                  </>,
                  <>
                    Choose <strong>Allowed Websites Only</strong>. Delete the sites Apple pre-fills
                    (swipe left).
                  </>,
                  <>
                    Tap <strong>Add Website</strong> for each approved site below.
                  </>,
                ]}
              />
              <SiteLists />
              <p className="mt-3 text-sm text-navy/60">
                With &ldquo;Allowed Websites Only&rdquo; on, everything not on the list is already
                blocked, so there is no separate blocked list to fill in.
              </p>
            </div>
            <div>
              <SubHead>2. Remove YouTube and other browsers</SubHead>
              <Steps
                items={[
                  <>Delete the YouTube and YouTube Kids apps if they&rsquo;re installed.</>,
                  <>
                    In <strong>Content &amp; Privacy Restrictions</strong> &gt;{" "}
                    <strong>iTunes &amp; App Store Purchases</strong>, set{" "}
                    <strong>Installing Apps</strong> to <strong>Don&rsquo;t Allow</strong> (or turn on Ask
                    to Buy under Family Sharing), so they can&rsquo;t be put back.
                  </>,
                  <>
                    Remove other browser apps (Chrome, Firefox and so on). Screen Time&rsquo;s site list
                    covers Safari and most browsers, but fewer apps means fewer gaps.
                  </>,
                ]}
              />
            </div>
          </DeviceSection>

          {/* Computers */}
          <DeviceSection
            id="computer"
            icon={Monitor}
            title="Mac or Windows computer"
            subtitle="Possible, but honestly weaker than a Chromebook or tablet."
          >
            <div>
              <SubHead>Mac</SubHead>
              <Steps
                items={[
                  <>Give your child their own standard (not administrator) user account.</>,
                  <>
                    <strong>System Settings</strong> &gt; <strong>Screen Time</strong> &gt; pick your
                    child &gt; <strong>Content &amp; Privacy</strong> &gt; <strong>Store, Web, Siri
                    &amp; Game Center Content</strong> &gt; <strong>Access to Web Content</strong>: choose{" "}
                    <strong>Allowed Websites Only</strong> and add the approved sites.
                  </>,
                ]}
              />
            </div>
            <div>
              <SubHead>Windows</SubHead>
              <Steps
                items={[
                  <>Give your child their own Microsoft child account in Microsoft Family Safety.</>,
                  <>
                    In Family Safety, pick your child &gt; <strong>Content filters</strong> &gt; turn
                    on <strong>Only use allowed websites</strong> and add the approved sites. Add{" "}
                    <Code>youtube.com</Code> to blocked sites.
                  </>,
                  <>
                    This only works in Microsoft Edge. Family Safety blocks other browsers, but check
                    that Chrome and Firefox are actually blocked.
                  </>,
                ]}
              />
            </div>
            <p className="rounded-xl bg-cream-dark/60 p-4 text-sm text-navy/70">
              A computer where your child has an administrator account can always undo these
              settings. If a computer is the main device, keep it in a shared room.
            </p>
          </DeviceSection>

          {/* Requests */}
          <section className="card-soft p-5 sm:p-8">
            <h2 className="mb-3 text-xl font-bold text-navy sm:text-2xl">When your child asks for a site</h2>
            <p className="mb-3 text-navy/80 leading-relaxed">
              On a blocked page, Family Link lets your child ask you, either in a message to your
              phone or in person by typing your Google password on their device.
            </p>
            <ul className="space-y-2 text-navy/80">
              <li className="flex gap-2">
                <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                <span>
                  <strong>Never approve a YouTube request.</strong> If a SafeTube video won&rsquo;t
                  play, the fix is <Code>youtube-nocookie.com</Code>, never youtube.com.
                </span>
              </li>
              <li className="flex gap-2">
                <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                <span>
                  <strong>Never type your parent password on your child&rsquo;s device.</strong>{" "}
                  Approve from your own phone instead.
                </span>
              </li>
            </ul>
          </section>

          {/* 5-minute check */}
          <section id="check" className="card-soft scroll-mt-24 border-2 border-emerald-300 p-5 sm:p-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                <ListChecks className="h-6 w-6 text-emerald-700" />
              </div>
              <h2 className="text-xl font-bold text-navy sm:text-2xl">5-minute check: did it work?</h2>
            </div>
            <p className="mb-4 text-navy/80">On your child&rsquo;s device, signed in as your child:</p>
            <ul className="space-y-2.5 text-navy/80">
              {[
                <>
                  Open <Code>youtube.com</Code>. You should see <strong>Site blocked</strong>.
                </>,
                <>
                  Open <Code>m.youtube.com</Code>. You should see <strong>Site blocked</strong>.
                </>,
                <>
                  Open <Code>getsafefamily.com/play</Code>, sign in as your child, and play a SafeTube
                  video. It should play.
                </>,
                <>
                  Chromebook: sign out. The sign-in screen shows <strong>no Guest option</strong>.
                </>,
                <>
                  There is <strong>no YouTube app</strong> in the app list or launcher.
                </>,
              ].map((item, i) => (
                <li key={i} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                  <span className="min-w-0">{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
              <strong>Easier way:</strong> in your{" "}
              <a href="/dashboard" className="font-semibold underline underline-offset-2">
                parent dashboard
              </a>
              , open the <strong>Family</strong> tab and use <strong>Check a kid&rsquo;s device</strong>.
              It walks you through these checks on your child&rsquo;s device.
            </p>
          </section>

          {/* Bottom CTA */}
          <div className="text-center">
            <p className="mb-4 text-navy/60">Stuck on a step? We answer every email.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/setup"
                className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white px-6 py-3 font-semibold text-navy transition-colors hover:bg-cream-dark/60"
              >
                Back to setup guide
              </Link>
              <a
                href="mailto:jeremiah@getsafefamily.com?subject=Help%20locking%20down%20a%20device"
                className="inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3 font-semibold text-white transition-colors hover:bg-navy/90"
              >
                Email Jeremiah
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}

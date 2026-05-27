import Link from "next/link";
import { Shield, Music, PlaySquare, Book, Search, Sparkles } from "lucide-react";

const apps = [
  { name: "SafeTunes", href: "https://getsafetunes.com", icon: Music, isNew: false },
  { name: "SafeTube", href: "https://getsafetube.com", icon: PlaySquare, isNew: false },
  { name: "SafeReads", href: "https://getsafereads.com", icon: Book, isNew: false },
  { name: "SafeStudy", href: "https://getsafestudy.com", icon: Search, isNew: false },
  { name: "SafeSpark", href: "https://getsafespark.com", icon: Sparkles, isNew: true },
];

const companyLinks = [
  { name: "Blog", href: "/blog" },
  { name: "Guides", href: "/guides/keeping-kids-safe-online" },
];

const legalLinks = [
  { name: "Privacy", href: "/privacy" },
  { name: "Terms", href: "/terms" },
  { name: "Refund Policy", href: "/refund" },
];

export default function Footer() {
  return (
    <footer className="bg-[#1a1a2e] text-white">
      {/* Extra padding at top to allow for overlapping pricing section */}
      <div className="pt-32 sm:pt-40">
        <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          {/* Top area: brand + columns */}
          <div className="grid gap-10 md:grid-cols-12">
            {/* Brand blurb */}
            <div className="md:col-span-5">
              <Link
                href="/"
                className="inline-flex items-center gap-2 group"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-semibold">Safe Family</span>
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
                Five apps that let kids use real music, video, books, search, and AI &mdash; with only
                the content you&rsquo;ve approved. Built by a homeschool parent, for parents who
                want a real answer, not another blocklist.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/50">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1">
                  COPPA Compliant
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1">
                  Data Encrypted
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1">
                  No Ads
                </span>
              </div>
            </div>

            {/* Apps column */}
            <div className="md:col-span-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Apps
              </h3>
              <ul className="mt-4 space-y-3">
                {apps.map((app) => (
                  <li key={app.name}>
                    <a
                      href={app.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
                    >
                      <app.icon className="h-4 w-4" />
                      {app.name}
                      {app.isNew && (
                        <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                          NEW
                        </span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company column */}
            <div className="md:col-span-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Company
              </h3>
              <ul className="mt-4 space-y-3">
                {companyLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/70 hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <a
                    href="mailto:jeremiah@getsafefamily.com"
                    className="text-sm text-white/70 hover:text-white transition-colors"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal column */}
            <div className="md:col-span-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Legal
              </h3>
              <ul className="mt-4 space-y-3">
                {legalLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/70 hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom rule */}
          <div className="mt-10 flex flex-col-reverse items-center gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-between">
            <p className="text-xs text-white/40">
              © {new Date().getFullYear()} Safe Family. Made with care for homeschool families.
            </p>
            <a
              href="mailto:jeremiah@getsafefamily.com"
              className="text-xs text-white/50 hover:text-white/70 transition-colors"
            >
              jeremiah@getsafefamily.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

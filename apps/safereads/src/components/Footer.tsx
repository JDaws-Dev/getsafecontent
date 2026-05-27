import Link from "next/link";

const apps = [
  { name: "SafeTunes", href: "https://getsafetunes.com", isNew: false },
  { name: "SafeTube", href: "https://getsafetube.com", isNew: false },
  { name: "SafeReads", href: "https://getsafereads.com", isNew: false },
  { name: "SafeStudy", href: "https://getsafestudy.com", isNew: false },
  { name: "SafeSpark", href: "https://getsafespark.com", isNew: true },
];

const legalLinks = [
  { name: "Privacy", href: "/privacy" },
  { name: "Terms", href: "/terms" },
  { name: "Contact", href: "/contact" },
];

export function Footer() {
  return (
    <footer className="bg-[#1a1a2e] text-white">
      <div className="mx-auto max-w-5xl px-4 py-10">
        {/* App Links */}
        <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
          {apps.map((app) => (
            <a
              key={app.name}
              href={app.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              {app.name}
              {app.isNew && (
                <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#1a1a2e]">
                  New
                </span>
              )}
            </a>
          ))}
        </div>

        {/* Legal Links */}
        <div className="mt-6 flex flex-wrap justify-center gap-4 sm:gap-6">
          {legalLinks.map((link, index) => (
            <span key={link.name} className="flex items-center gap-4 sm:gap-6">
              <Link
                href={link.href}
                className="text-sm text-white/50 hover:text-white/70 transition-colors"
              >
                {link.name}
              </Link>
              {index < legalLinks.length - 1 && (
                <span className="text-white/30 hidden sm:inline">|</span>
              )}
            </span>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-6 text-center">
          <a
            href="mailto:jeremiah@getsafefamily.com"
            className="text-sm text-white/50 hover:text-white/70 transition-colors"
          >
            jeremiah@getsafefamily.com
          </a>
        </div>

        {/* Tagline + Copyright */}
        <div className="mt-6 text-center">
          <a
            href="https://getsafefamily.com"
            className="inline-block text-xs text-white/50 hover:text-white/70 transition-colors mb-2"
          >
            A Safe Family App
          </a>
          <p className="text-sm text-white/40">
            © {new Date().getFullYear()} Safe Family
          </p>
          {process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG && (
            <p className="mt-2 text-xs text-white/30">
              As an Amazon Associate, we earn from qualifying purchases.
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}

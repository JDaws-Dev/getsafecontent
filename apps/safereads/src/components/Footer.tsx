import Link from "next/link";

const apps = [
  { name: "SafeTunes", href: "https://getsafetunes.com" },
  { name: "SafeTube", href: "https://getsafetube.com" },
  { name: "SafeReads", href: "https://getsafereads.com" },
];

const legalLinks = [
  { name: "Privacy", href: "/privacy" },
  { name: "Terms", href: "/terms" },
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
              className="text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              {app.name}
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

        {/* Copyright */}
        <div className="mt-6 text-center">
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

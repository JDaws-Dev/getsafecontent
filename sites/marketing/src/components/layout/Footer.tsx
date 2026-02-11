import Link from "next/link";

const apps = [
  { name: "SafeTunes", href: "https://getsafetunes.com" },
  { name: "SafeTube", href: "https://getsafetube.com" },
  { name: "SafeReads", href: "https://getsafereads.com" },
];

const legalLinks = [
  { name: "Blog", href: "/blog" },
  { name: "Privacy", href: "/privacy" },
  { name: "Terms", href: "/terms" },
  { name: "Refund Policy", href: "/refund" },
];

export default function Footer() {
  return (
    <footer className="bg-navy text-white">
      {/* Extra padding at top to allow for overlapping pricing section */}
      <div className="pt-32 sm:pt-40">
        <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
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
          </div>
        </div>
      </div>
    </footer>
  );
}

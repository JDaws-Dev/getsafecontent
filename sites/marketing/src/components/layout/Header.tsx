"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Music, PlaySquare, Search, Menu, X } from "lucide-react";
import { ThemeToggle } from "../ThemeToggle";
import { UmbrellaMark } from "../brand/Brand";

const apps = [
  // App accents from the glow-up system (Tunes grape, Tube coral, Study cobalt).
  { name: "SafeTunes", href: "/tunes", icon: Music, color: "text-[#7C4DE0]", comingSoon: false },
  { name: "SafeTube", href: "/tube", icon: PlaySquare, color: "text-[#F0603A]", comingSoon: false },
  { name: "SafeStudy", href: "/study", icon: Search, color: "text-[#2F6BF0]", comingSoon: false },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-cream/90 backdrop-blur-md shadow-sm border-b border-transparent dark:border-white/5"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Wordmark + App Links */}
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            {/* Safe Family Logo/Wordmark */}
            <Link
              href="/"
              className="flex items-center gap-2 shrink-0 whitespace-nowrap"
            >
              <UmbrellaMark size="sm" />
              <span className="text-base sm:text-lg font-bold text-navy">Safe Family</span>
            </Link>

            {/* Divider */}
            <div className="hidden md:block h-6 w-px bg-navy/20" />

            {/* App Links */}
            <div className="hidden md:flex items-center gap-3">
              {apps.map((app, index) => (
                <span key={app.name} className="flex items-center">
                  <a
                    href={app.href}
                    className={`text-sm font-medium ${app.color} hover:opacity-80 transition-opacity flex items-center gap-1`}
                  >
                    <app.icon className="h-4 w-4" />
                    <span>{app.name}</span>
                    {app.comingSoon && (
                      <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                        SOON
                      </span>
                    )}
                  </a>
                  {index < apps.length - 1 && (
                    <span className="text-navy/30 mx-2">|</span>
                  )}
                </span>
              ))}
              <span className="text-navy/30 mx-2">|</span>
              <Link
                href="/blog"
                className="text-sm font-medium text-navy/70 hover:text-navy transition-colors"
              >
                Blog
              </Link>
            </div>
          </div>

          {/* Theme Toggle + Sign In + CTA Button + Hamburger (mobile) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Theme toggle is desktop-only: on a phone it pushed the wordmark onto two lines */}
            <span className="hidden sm:inline-flex">
              <ThemeToggle />
            </span>
            <Link
              href="/login"
              className="hidden sm:inline-flex text-sm font-medium text-navy/70 hover:text-navy transition-colors px-2 py-2 whitespace-nowrap"
            >
              Sign in
            </Link>
            <a
              href="#pricing"
              className="btn-peach inline-flex items-center justify-center px-3.5 sm:px-5 py-2 text-sm font-medium whitespace-nowrap"
            >
              <span className="sm:hidden">Free trial</span>
              <span className="hidden sm:inline">Start Free Trial</span>
            </a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-navy hover:bg-navy/5 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-navy/10 bg-cream/95 backdrop-blur-md">
            <div className="py-3 space-y-1">
              {apps.map((app) => (
                <a
                  key={app.name}
                  href={app.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium ${app.color} hover:bg-navy/5 transition-colors`}
                >
                  <app.icon className="h-5 w-5" />
                  <span>{app.name}</span>
                  {app.comingSoon && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                      SOON
                    </span>
                  )}
                </a>
              ))}
              <Link
                href="/blog"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-navy/80 hover:bg-navy/5 transition-colors"
              >
                <span>Blog</span>
              </Link>
              <div className="my-2 border-t border-navy/10" />
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-navy hover:bg-navy/5 transition-colors"
              >
                <span>Sign in to your account</span>
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

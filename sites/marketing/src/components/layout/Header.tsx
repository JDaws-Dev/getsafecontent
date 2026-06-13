"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, Music, PlaySquare, Book, Search, Sparkles, Menu, X } from "lucide-react";
import { ThemeToggle } from "../ThemeToggle";

const apps = [
  { name: "SafeTunes", href: "https://getsafetunes.com", icon: Music, color: "text-purple-600", isNew: false },
  { name: "SafeTube", href: "https://getsafetube.com", icon: PlaySquare, color: "text-red-500", isNew: false },
  { name: "SafeReads", href: "https://getsafereads.com", icon: Book, color: "text-amber-600", isNew: false },
  { name: "SafeStudy", href: "https://getsafestudy.com", icon: Search, color: "text-blue-600", isNew: false },
  { name: "SafeSpark", href: "https://getsafespark.com", icon: Sparkles, color: "text-violet-600", isNew: true },
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
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Safe Family Logo/Wordmark */}
            <Link
              href="/"
              className="flex items-center gap-2 group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-navy">
                Safe <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">Family</span>
              </span>
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
                    {app.isNew && (
                      <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                        NEW
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
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden sm:inline-flex text-sm font-medium text-navy/70 hover:text-navy transition-colors px-2 py-2 whitespace-nowrap"
            >
              Sign in
            </Link>
            <a
              href="#pricing"
              className="btn-peach inline-flex items-center justify-center px-4 sm:px-5 py-2 text-sm font-medium whitespace-nowrap"
            >
              Start Free Trial
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
                  {app.isNew && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                      NEW
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

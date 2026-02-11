"use client";

import { useState, useEffect } from "react";
import { Shield, Music, PlaySquare, Book } from "lucide-react";

const apps = [
  { name: "SafeTunes", href: "https://getsafetunes.com", icon: Music, color: "text-purple-600" },
  { name: "SafeTube", href: "https://getsafetube.com", icon: PlaySquare, color: "text-red-500" },
  { name: "SafeReads", href: "https://getsafereads.com", icon: Book, color: "text-emerald-600" },
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
          ? "bg-cream/90 backdrop-blur-md shadow-sm"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Wordmark + App Links */}
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Safe Family Logo/Wordmark */}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center gap-2 group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-navy">
                Safe <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">Family</span>
              </span>
            </a>

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
                  </a>
                  {index < apps.length - 1 && (
                    <span className="text-navy/30 mx-2">|</span>
                  )}
                </span>
              ))}
              <span className="text-navy/30 mx-2">|</span>
              <a
                href="/blog"
                className="text-sm font-medium text-navy/70 hover:text-navy transition-colors"
              >
                Blog
              </a>
            </div>
          </div>

          {/* CTA Button */}
          <a
            href="#pricing"
            className="btn-peach inline-flex items-center justify-center px-4 sm:px-5 py-2 text-sm font-medium"
          >
            <span className="hidden sm:inline">Start Free Trial</span>
            <span className="sm:hidden">Try Free</span>
          </a>
        </div>
      </nav>
    </header>
  );
}

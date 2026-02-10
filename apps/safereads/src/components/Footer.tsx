import Link from "next/link";
import { BookOpen } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#1a1a2e] text-white">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-4">
          {/* Product */}
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-400" />
              <span className="font-serif font-bold text-white">
                SafeReads
              </span>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-white/60">
              <li>
                <Link
                  href="/about"
                  className="transition-colors hover:text-white"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="transition-colors hover:text-white"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-serif font-bold text-white">Legal</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/60">
              <li>
                <Link
                  href="/privacy"
                  className="transition-colors hover:text-white"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="transition-colors hover:text-white"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Safe Family */}
          <div>
            <h4 className="font-serif font-bold text-white">Safe Family</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/60">
              <li>
                <a
                  href="https://getsafetunes.com"
                  className="transition-colors hover:text-white"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  SafeTunes · Music
                </a>
              </li>
              <li>
                <a
                  href="https://getsafetube.com"
                  className="transition-colors hover:text-white"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  SafeTube · YouTube
                </a>
              </li>
              <li>
                <a
                  href="https://getsafecontent.vercel.app"
                  className="transition-colors hover:text-white"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get All 3 Apps
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-serif font-bold text-white">Get in Touch</h4>
            <p className="mt-3 text-sm text-white/60">
              Questions, feedback, or suggestions?
            </p>
            <a
              href="mailto:jedaws@gmail.com"
              className="mt-1 inline-block text-sm text-emerald-400 transition-colors hover:text-emerald-300"
            >
              jedaws@gmail.com
            </a>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6 text-center text-sm text-white/40">
          <p>
            &copy; {new Date().getFullYear()} SafeReads. All rights reserved.
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

import { BookOpen } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <BookOpen className="h-12 w-12 text-accent-300" />
      <h2 className="mt-4 font-display text-xl font-bold text-brand-navy">
        Page not found
      </h2>
      <p className="mt-2 text-sm text-ink-500">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-accent-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-700"
      >
        Go home
      </Link>
    </div>
  );
}

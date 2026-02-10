import { BookOpen } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <BookOpen className="h-12 w-12 text-parchment-300" />
      <h2 className="mt-4 font-serif text-xl font-bold text-ink-900">
        Page not found
      </h2>
      <p className="mt-2 text-sm text-ink-500">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-parchment-700 px-6 py-2.5 text-sm font-medium text-parchment-50 transition-colors hover:bg-parchment-800"
      >
        Go home
      </Link>
    </div>
  );
}

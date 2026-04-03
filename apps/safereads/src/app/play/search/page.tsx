"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookSearch } from "@/components/kid/BookSearch";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Id } from "../../../../convex/_generated/dataModel";

export default function KidSearchPage() {
  const router = useRouter();
  const [kidId, setKidId] = useState<Id<"kids"> | null>(null);

  useEffect(() => {
    const profileData = localStorage.getItem("safereads_kid_profile");
    if (!profileData) {
      router.replace("/play");
      return;
    }
    try {
      const profile = JSON.parse(profileData);
      setKidId(profile._id as Id<"kids">);
    } catch {
      router.replace("/play");
    }
  }, [router]);

  if (!kidId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  return (
    <div className="py-6">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/play/home"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-bold text-gray-800">Find Books</h1>
      </div>

      <BookSearch kidId={kidId} />
    </div>
  );
}

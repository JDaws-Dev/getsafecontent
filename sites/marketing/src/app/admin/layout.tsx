import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AdminNav } from "@/components/admin/AdminNav";

const MARKETING_CENTRAL_URL = "https://adamant-crow-705.convex.site";
const ADMIN_EMAIL = "jedaws@gmail.com";
const ADMIN_COOKIE = "safefamily_admin_jwt";

/**
 * Dual-auth admin gate. Either:
 *   (a) NextAuth Google OAuth session (legacy path) — gated on email match
 *   (b) Marketing Central JWT cookie (set by /api/admin-auth/marketing-login)
 *       — verified server-side via /verifyToken, gated on email match
 *
 * The Marketing fallback eliminates the dependency on the Google Cloud
 * Console redirect-URI whitelist, which was the recurring failure mode
 * keeping the admin out of /admin/roadmap.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  let adminEmail: string | null = null;
  let displayName: string | null = null;

  if (session?.user?.email === ADMIN_EMAIL) {
    adminEmail = session.user.email;
    displayName = session.user.name ?? null;
  } else {
    // Fallback: check the Marketing Central admin cookie.
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE)?.value;
    if (token) {
      try {
        const verifyRes = await fetch(
          `${MARKETING_CENTRAL_URL}/verifyToken?token=${encodeURIComponent(token)}`,
          { cache: "no-store" },
        );
        if (verifyRes.ok) {
          const data = (await verifyRes.json()) as {
            valid?: boolean;
            user?: { email?: string; name?: string | null };
          };
          const verifiedEmail = (data.user?.email ?? "").toLowerCase();
          if (data.valid && verifiedEmail === ADMIN_EMAIL && data.user) {
            adminEmail = data.user.email ?? ADMIN_EMAIL;
            displayName = data.user.name ?? null;
          }
        }
      } catch {
        // Treat unreachable verify as not-authenticated. Falls through to redirect.
      }
    }
  }

  if (!adminEmail) {
    redirect("/admin-login");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminNav user={{ email: adminEmail, name: displayName }} />
      <main className="lg:pl-64">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

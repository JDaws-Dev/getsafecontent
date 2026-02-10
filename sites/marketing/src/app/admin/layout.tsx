import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Check if user is authenticated
  if (!session?.user?.email) {
    redirect("/admin-login");
  }

  // Verify it's the admin (double-check beyond NextAuth callback)
  if (session.user.email !== "jedaws@gmail.com") {
    redirect("/admin-login?error=AccessDenied");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav user={session.user} />
      <main className="lg:pl-64">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const ADMIN_EMAIL = "jedaws@gmail.com";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    signIn({ user }) {
      // Only allow the admin email
      return user.email === ADMIN_EMAIL;
    },
    session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: "/admin-login",
    error: "/admin-login",
  },
});

export function isAdmin(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL;
}

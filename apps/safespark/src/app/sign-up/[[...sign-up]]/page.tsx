import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';

export const metadata = {
  title: 'Sign up',
  description: 'Create your SafeSpark account.',
};

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-[var(--safefamily-cream)]">
      <Link href="/" className="mb-6 text-xs font-bold uppercase tracking-widest text-violet-600 hover:text-violet-800">
        ← Back to SafeSpark
      </Link>
      <SignUp
        signInUrl="/sign-in"
        forceRedirectUrl="/parent"
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-xl border border-violet-100',
          },
          variables: {
            colorPrimary: '#7c3aed',
          },
        }}
      />
    </main>
  );
}

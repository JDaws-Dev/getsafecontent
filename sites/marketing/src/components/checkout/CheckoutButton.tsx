"use client";

import Link from "next/link";

interface CheckoutButtonProps {
  className?: string;
  children: React.ReactNode;
  priceId?: string;
}

export default function CheckoutButton({
  className,
  children,
}: CheckoutButtonProps) {
  return (
    <Link href="/signup" className={className}>
      {children}
    </Link>
  );
}

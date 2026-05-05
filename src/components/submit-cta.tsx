"use client";

import Link from "next/link";

import { SignInButton, useAuth } from "@clerk/nextjs";

type SubmitCTAProps = {
  className?: string;
  children?: React.ReactNode;
  href?: string;
};

const DEFAULT_CLASS =
  "inline-flex h-10 items-center justify-center rounded-full bg-inverse px-4 text-sm font-medium text-on-inverse transition hover:bg-inverse-hover";

export function SubmitCTA({
  className = DEFAULT_CLASS,
  children = "Submit a pet",
  href = "/submit",
}: SubmitCTAProps) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded || !isSignedIn) {
    return (
      <SignInButton
        mode="modal"
        forceRedirectUrl={href}
        signUpForceRedirectUrl={href}
      >
        <button type="button" className={className}>
          {children}
        </button>
      </SignInButton>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

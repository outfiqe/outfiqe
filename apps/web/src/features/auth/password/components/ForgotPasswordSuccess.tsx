import Link from "next/link";

import { useFocusOnMount } from "@/shared/hooks/useFocusOnMount";

export const ForgotPasswordSuccess = () => {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <div>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-[28px] font-bold text-foreground outline-none"
      >
        Check your email
      </h1>
      <p className="mt-2.5 text-sm text-muted-foreground">
        If that email is registered, you&apos;ll receive a reset link shortly.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">Check your spam folder too.</p>
      <Link
        href="/login"
        className="mt-5 inline-block text-sm font-medium text-primary-strong hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  );
};

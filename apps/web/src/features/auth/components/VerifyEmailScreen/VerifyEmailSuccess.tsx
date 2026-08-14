import { Button } from "@outfiqe/design-system";
import Link from "next/link";

import { useFocusOnMount } from "@/shared/hooks/useFocusOnMount";

export const VerifyEmailSuccess = () => {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <div>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-[28px] font-bold text-foreground outline-none"
      >
        Email verified
      </h1>
      <p className="mt-2.5 text-sm text-muted-foreground">
        Your email is verified. You can now sign in.
      </p>
      <Link href="/login" className="mt-5 inline-block">
        <Button>Continue to sign in</Button>
      </Link>
    </div>
  );
};

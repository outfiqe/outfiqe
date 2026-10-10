import { Button } from "@outfiqe/design-system";
import Link from "next/link";

import { useFocusOnMount } from "@/shared/hooks/useFocusOnMount";

export const BrandApplicationSuccess = () => {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <div className="rounded-2xl bg-muted p-6 text-center sm:p-10">
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-xl font-bold text-foreground outline-none"
      >
        Application sent
      </h3>
      <p className="mx-auto mt-2.5 max-w-md text-sm text-muted-foreground">
        We&apos;ll look at your Instagram and get back to you within a week. If it&apos;s a fit,
        we&apos;ll send an invite link to set up your brand account.
      </p>
      <Link href="/" className="mt-5 inline-block">
        <Button variant="outline">Back to home</Button>
      </Link>
    </div>
  );
};

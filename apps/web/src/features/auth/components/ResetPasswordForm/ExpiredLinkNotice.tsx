import { Button } from "@outfiqe/design-system";
import Link from "next/link";

import { useFocusOnMount } from "@/shared/hooks/useFocusOnMount";

export const ExpiredLinkNotice = () => {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <div>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-[28px] font-bold text-foreground outline-none"
      >
        Link no longer valid
      </h1>
      <p className="mt-2.5 text-sm text-muted-foreground">
        This reset link is invalid or has expired.
      </p>
      <Link href="/forgot-password" className="mt-5 inline-block">
        <Button variant="outline">Request a new link</Button>
      </Link>
    </div>
  );
};

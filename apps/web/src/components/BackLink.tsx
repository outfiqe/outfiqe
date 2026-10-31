import { BACK_LINK_CLASS_NAME, BackLinkLabel } from "@outfiqe/design-system";
import Link from "next/link";
import type { ReactNode } from "react";

export const BackLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className={BACK_LINK_CLASS_NAME}>
    <BackLinkLabel>{children}</BackLinkLabel>
  </Link>
);

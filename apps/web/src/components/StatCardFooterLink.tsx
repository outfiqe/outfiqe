import { STAT_CARD_LINK_CLASS_NAME } from "@outfiqe/design-system";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export const StatCardFooterLink = ({ href, label }: { href: string; label: string }) => (
  <Link href={href} className={STAT_CARD_LINK_CLASS_NAME}>
    <span>{label}</span>
    <ChevronRight className="size-4 shrink-0" aria-hidden />
  </Link>
);

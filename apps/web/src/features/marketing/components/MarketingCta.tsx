import { Button } from "@outfiqe/design-system";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Reveal } from "@/components/motion/Reveal";

interface MarketingCtaProps {
  title: string;
  body: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}

export const MarketingCta = ({ title, body, primary, secondary }: MarketingCtaProps) => (
  <Reveal as="div" className="mt-24">
    <section className="border-t-2 border-foreground pt-8 sm:pt-10">
      <h2 className="text-balance font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">{body}</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Button asChild>
          <Link href={primary.href}>
            {primary.label}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
        {secondary ? (
          <Button asChild variant="outline">
            <Link href={secondary.href}>{secondary.label}</Link>
          </Button>
        ) : null}
      </div>
    </section>
  </Reveal>
);

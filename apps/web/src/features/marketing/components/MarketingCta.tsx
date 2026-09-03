import { Button } from "@outfiqe/design-system";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface MarketingCtaProps {
  title: string;
  body: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}

export const MarketingCta = ({ title, body, primary, secondary }: MarketingCtaProps) => (
  <section className="mt-20 rounded-2xl border border-border p-8 sm:p-10">
    <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{title}</h2>
    <p className="mt-2 max-w-xl text-sm text-muted-foreground">{body}</p>
    <div className="mt-6 flex flex-wrap gap-3">
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
);

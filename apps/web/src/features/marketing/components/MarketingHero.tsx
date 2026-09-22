import { Reveal } from "@/components/motion/Reveal";

const EYEBROW_DELAY_SECONDS = 0;
const TITLE_DELAY_SECONDS = 0.08;
const LEDE_DELAY_SECONDS = 0.2;

interface MarketingHeroProps {
  eyebrow: string;
  title: React.ReactNode;
  lede?: string;
  children?: React.ReactNode;
}

export const MarketingHero = ({ eyebrow, title, lede, children }: MarketingHeroProps) => (
  <header className="border-b border-border pb-10 sm:pb-14">
    <Reveal delaySeconds={EYEBROW_DELAY_SECONDS}>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-strong">{eyebrow}</p>
    </Reveal>
    <Reveal
      as="h1"
      delaySeconds={TITLE_DELAY_SECONDS}
      className="mt-4 text-balance font-display text-4xl font-bold leading-[0.98] tracking-tight text-foreground sm:text-6xl lg:text-7xl"
    >
      {title}
    </Reveal>
    {lede ? (
      <Reveal delaySeconds={LEDE_DELAY_SECONDS}>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {lede}
        </p>
      </Reveal>
    ) : null}
    {children}
  </header>
);

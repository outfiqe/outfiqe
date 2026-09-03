interface MarketingHeroProps {
  eyebrow: string;
  title: React.ReactNode;
  lede?: string;
  children?: React.ReactNode;
}

export const MarketingHero = ({ eyebrow, title, lede, children }: MarketingHeroProps) => (
  <header>
    <p className="text-xs font-bold uppercase tracking-widest text-primary-strong">{eyebrow}</p>
    <h1 className="mt-3 font-display text-3xl font-bold leading-[1.05] text-foreground sm:text-5xl lg:text-6xl">
      {title}
    </h1>
    {lede ? (
      <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">{lede}</p>
    ) : null}
    {children}
  </header>
);

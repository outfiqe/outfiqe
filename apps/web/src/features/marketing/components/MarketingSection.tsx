interface MarketingSectionProps {
  heading: string;
  id?: string;
  children: React.ReactNode;
}

export const MarketingSection = ({ heading, id, children }: MarketingSectionProps) => (
  <section id={id} className="mt-16 scroll-mt-24">
    <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{heading}</h2>
    <div className="mt-4">{children}</div>
  </section>
);

import { Reveal } from "@/components/motion/Reveal";

interface MarketingSectionProps {
  heading: string;
  id?: string;
  children: React.ReactNode;
}

export const MarketingSection = ({ heading, id, children }: MarketingSectionProps) => (
  <section id={id} className="mt-20 scroll-mt-24 sm:mt-24">
    <Reveal as="h2" className="font-display text-2xl font-bold text-foreground sm:text-3xl">
      {heading}
    </Reveal>
    <div className="mt-5">{children}</div>
  </section>
);

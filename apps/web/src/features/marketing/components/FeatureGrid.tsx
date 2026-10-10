import { Stagger, StaggerItem } from "@/components/motion/Stagger";

export interface FeatureItem {
  title: string;
  body: string;
}

interface FeatureGridProps {
  items: FeatureItem[];
  columns?: 2 | 3;
}

export const FeatureGrid = ({ items, columns = 3 }: FeatureGridProps) => (
  <Stagger as="ul" className={`grid gap-6 ${columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
    {items.map((feature) => (
      <StaggerItem as="li" key={feature.title} className="border-t-2 border-foreground pt-3.5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
          {feature.title}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
      </StaggerItem>
    ))}
  </Stagger>
);

export interface FeatureItem {
  title: string;
  body: string;
}

interface FeatureGridProps {
  items: FeatureItem[];
  columns?: 2 | 3;
}

export const FeatureGrid = ({ items, columns = 3 }: FeatureGridProps) => (
  <ul className={`grid gap-6 ${columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
    {items.map((item) => (
      <li key={item.title} className="border-t-2 border-foreground pt-3.5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">{item.title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{item.body}</p>
      </li>
    ))}
  </ul>
);

import { ANALYTICS_SECTIONS } from "../constants/analyticsCopy.constants";

export const AnalyticsSectionNav = () => (
  <nav aria-label="Jump to a section" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
    {ANALYTICS_SECTIONS.map(({ id, label }) => (
      <a
        key={id}
        href={`#${id}`}
        className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        {label}
      </a>
    ))}
  </nav>
);

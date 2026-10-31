import { STAT_CARD_LINK_CLASS_NAME } from "@outfiqe/design-system";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

type LinkSearch = Record<string, string | undefined>;

const METRIC_ROW_CLASS_NAME =
  "flex items-center justify-between gap-3 border-b border-border/60 py-2.5 text-sm last:border-0";

export const MetricSection = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) => (
  <section className="rounded-xl border border-border bg-card p-5">
    <h2 className="text-base font-semibold text-foreground">{title}</h2>
    {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    <div className="mt-3">{children}</div>
  </section>
);

const MetricRowContent = ({
  label,
  detail,
  value,
}: {
  label: ReactNode;
  detail?: string;
  value: ReactNode;
}) => (
  <>
    <span className="min-w-0">
      <span className="block font-medium text-foreground">{label}</span>
      {detail && <span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span>}
    </span>
    <span className="flex shrink-0 items-center gap-1 font-semibold text-foreground">{value}</span>
  </>
);

type MetricRowProps = {
  label: ReactNode;
  detail?: string;
  value: ReactNode;
};

export const MetricRow = ({ label, detail, value }: MetricRowProps) => (
  <div className={METRIC_ROW_CLASS_NAME}>
    <MetricRowContent label={label} detail={detail} value={value} />
  </div>
);

export const MetricLinkRow = ({
  to,
  search,
  label,
  detail,
  value,
}: MetricRowProps & { to: string; search?: LinkSearch }) => (
  <Link
    to={to}
    search={search}
    className={`${METRIC_ROW_CLASS_NAME} -mx-2 cursor-pointer rounded-lg px-2 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
  >
    <MetricRowContent
      label={label}
      detail={detail}
      value={
        <>
          {value}
          <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
        </>
      }
    />
  </Link>
);

export const StatCardFooterLink = ({
  to,
  search,
  period,
}: {
  to: string;
  search?: LinkSearch;
  period: string;
}) => (
  <Link to={to} search={search} className={STAT_CARD_LINK_CLASS_NAME}>
    <span>{period}</span>
    <ChevronRight className="size-4 shrink-0" aria-hidden />
  </Link>
);

export const MetricEmptyState = ({ children }: { children: ReactNode }) => (
  <p className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">{children}</p>
);

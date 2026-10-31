import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { MetricLinkRow as SharedMetricLinkRow } from "@/components/MetricParts";

import type { MetricTagsSearch } from "../constants/metricTagViews.constants";

export {
  MetricSection as Card,
  MetricEmptyState as EmptyState,
  MetricRow,
} from "@/components/MetricParts";

const TAG_LIST_PATH = "/tag-reviews/tags";

export const MetricTagsLink = ({
  search,
  className,
  children,
}: {
  search: MetricTagsSearch;
  className?: string;
  children: ReactNode;
}) => (
  <Link to={TAG_LIST_PATH} search={search} className={className}>
    {children}
  </Link>
);

export const MetricLinkRow = ({
  search,
  label,
  detail,
  value,
}: {
  search: MetricTagsSearch;
  label: ReactNode;
  detail?: string;
  value: ReactNode;
}) => (
  <SharedMetricLinkRow
    to={TAG_LIST_PATH}
    search={search}
    label={label}
    detail={detail}
    value={value}
  />
);

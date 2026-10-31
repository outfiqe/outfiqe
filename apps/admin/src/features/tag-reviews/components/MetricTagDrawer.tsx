import { Badge, Drawer } from "@outfiqe/design-system";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { MetricTag } from "../api/tagReviewsSchemas";
import {
  POLICY_EXPLANATION,
  POLICY_LABEL,
  SOURCE_EXPLANATION,
} from "../constants/tagReviewMetrics.constants";
import { describeTagOutcome, toStatusDisplay } from "../utils/metricTagOutcome.utils";
import { formatDateTime, formatDuration, pluralize } from "../utils/tagReviewMetrics.utils";

const WEB_URL = import.meta.env.VITE_WEB_URL ?? "http://localhost:3000";
const NO_REPORTS = 0;
const NEVER_RE_REQUESTED = 0;
const OUTSIDE_LINK_CLASS_NAME =
  "font-medium text-foreground underline underline-offset-2 hover:text-primary-strong";

const DetailRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex justify-between gap-4 border-b border-border/60 py-2 text-sm last:border-0">
    <dt className="shrink-0 text-muted-foreground">{label}</dt>
    <dd className="min-w-0 text-right font-medium text-foreground">{children}</dd>
  </div>
);

const SiteLink = ({ path, children }: { path: string; children: ReactNode }) => (
  <a
    href={`${WEB_URL}${path}`}
    target="_blank"
    rel="noreferrer"
    className={OUTSIDE_LINK_CLASS_NAME}
  >
    {children}
  </a>
);

const TagTimeline = ({ tag }: { tag: MetricTag }) => {
  const { look, submittedAt, decidedAt, reviewerName, waitHours, hoursToGoLive } = tag;
  const { reviewStatus, reRequestCount } = tag;

  return (
    <dl>
      <DetailRow label="Look posted">{formatDateTime(look.postedAt)}</DetailRow>
      <DetailRow label="Sent for review">{formatDateTime(submittedAt)}</DetailRow>
      {decidedAt && <DetailRow label="Decided">{formatDateTime(decidedAt)}</DetailRow>}
      {reviewerName && <DetailRow label="Decided by">{reviewerName}</DetailRow>}
      <DetailRow label={reviewStatus === "PENDING" ? "Waiting for" : "Time to decide"}>
        {formatDuration(waitHours)}
      </DetailRow>
      {hoursToGoLive !== null && (
        <DetailRow label="Post to live">{formatDuration(hoursToGoLive)}</DetailRow>
      )}
      {reRequestCount > NEVER_RE_REQUESTED && (
        <DetailRow label="Sent again">{pluralize(reRequestCount, "time")}</DetailRow>
      )}
    </dl>
  );
};

const TagPeople = ({ tag }: { tag: MetricTag }) => {
  const { product, brand, creator, sizeWorn, reportCount } = tag;

  return (
    <dl>
      <DetailRow label="Product">
        <SiteLink path={`/product/${product.id}`}>{product.name}</SiteLink>
      </DetailRow>
      <DetailRow label="Brand">
        <SiteLink path={`/brand/${brand.id}`}>{brand.name}</SiteLink>
      </DetailRow>
      <DetailRow label="Brand setting">
        <span title={POLICY_EXPLANATION[brand.policy]}>{POLICY_LABEL[brand.policy]}</span>
      </DetailRow>
      <DetailRow label="Muse">
        <SiteLink path={`/creator/${creator.handle}`}>{creator.name}</SiteLink>
      </DetailRow>
      {sizeWorn && <DetailRow label="Size worn">{sizeWorn}</DetailRow>}
      <DetailRow label="Reports">
        {reportCount === NO_REPORTS ? (
          "None"
        ) : (
          <Link to="/tag-reports" className={OUTSIDE_LINK_CLASS_NAME}>
            {pluralize(reportCount, "report")}
          </Link>
        )}
      </DetailRow>
    </dl>
  );
};

const describeWhy = ({ reviewStatus, approvalSource, brand }: MetricTag): string => {
  if (reviewStatus === "APPROVED" && approvalSource) return SOURCE_EXPLANATION[approvalSource];
  return POLICY_EXPLANATION[brand.policy];
};

export const MetricTagDrawer = ({ tag, onClose }: { tag: MetricTag; onClose: () => void }) => {
  const { label: statusLabel, tone: statusTone } = toStatusDisplay(tag);
  const { look, creator, rejectionNote } = tag;

  return (
    <Drawer open onClose={onClose} title={tag.product.name}>
      <div className="space-y-5 p-5">
        <img
          src={look.imageUrl}
          alt={`Look by @${creator.handle} wearing ${tag.product.name}`}
          className="max-h-80 w-full rounded-xl bg-muted object-contain"
        />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge showDot={false} tone={statusTone}>
              {statusLabel}
            </Badge>
            <span className="text-sm font-medium text-foreground">{describeTagOutcome(tag)}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{describeWhy(tag)}</p>
          {rejectionNote && (
            <p className="mt-2 text-sm text-foreground">&ldquo;{rejectionNote}&rdquo;</p>
          )}
          {look.caption && (
            <p className="mt-2 text-sm text-muted-foreground">Caption: {look.caption}</p>
          )}
        </div>

        <section aria-label="What happened">
          <h3 className="text-sm font-semibold text-foreground">What happened</h3>
          <TagTimeline tag={tag} />
        </section>

        <section aria-label="Who is involved">
          <h3 className="text-sm font-semibold text-foreground">Who is involved</h3>
          <TagPeople tag={tag} />
        </section>

        <SiteLink path={`/creator/${creator.handle}?look=${look.id}`}>
          Open this look on the site
        </SiteLink>
      </div>
    </Drawer>
  );
};

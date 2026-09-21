import { KanbanBoardSkeleton } from "@outfiqe/components";
import { Input, Select, Skeleton, StatCardSkeleton } from "@outfiqe/design-system";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { CardRowSkeleton } from "@/components/CardRowSkeleton";
import { SkeletonBadge, SkeletonButton } from "@/components/SkeletonControls";
import { TableSkeleton } from "@/components/TableSkeleton";

import { CompactRowSkeleton } from "./CompactRowSkeleton";
import {
  AUDIT_TABLE_HEADERS,
  CONTACT_TABLE_HEADERS,
  CRM_PAGE_TEXT,
  CUSTOMER_TABLE_HEADERS,
  INVOICE_TABLE_HEADERS,
  PARTNER_TABLE_HEADERS,
  PRODUCT_BREAKDOWN_HEADERS,
} from "./crmPageContent";

const INVOICE_SKELETON_ROW_COUNT = 3;
const RECENT_ORDER_SKELETON_COUNT = 3;
const PRODUCT_BREAKDOWN_SKELETON_ROW_COUNT = 4;
const ROLE_SKELETON_COUNT = 3;
const REPORT_TILE_COUNT = 3;
const REPORT_BAR_ROW_COUNT = 4;

const HEADING_CLASS = "font-display text-2xl font-bold text-foreground";
const DESCRIPTION_CLASS = "mt-1 text-sm text-muted-foreground";
const SPLIT_HEADER_CLASS = "flex flex-wrap items-center justify-between gap-3";

export const BillingSkeleton = () => (
  <div className="space-y-6">
    <div className="rounded-xl border border-border bg-card p-4" aria-hidden>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-1 h-5 w-72 max-w-full" />
        </div>
        <SkeletonBadge />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <SkeletonButton size="sm" variant="default" label="Change plan or seats" />
        <SkeletonButton size="sm" label="Cancel renewal" />
      </div>
    </div>
    <TableSkeleton headers={INVOICE_TABLE_HEADERS} rowCount={INVOICE_SKELETON_ROW_COUNT} />
  </div>
);

export const CustomerDetailSkeleton = () => (
  <div className="mt-4 space-y-6" role="status" aria-label="Loading">
    <div>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-1 h-5 w-96 max-w-full" />
    </div>
    <section>
      <h2 className="font-display text-base font-bold text-foreground">Recent orders</h2>
      <ul className="mt-2 space-y-2 text-sm">
        {Array.from({ length: RECENT_ORDER_SKELETON_COUNT }, (_unused, orderIndex) => (
          <li key={orderIndex} className="rounded-lg border border-border p-3">
            <Skeleton className="h-5 w-full max-w-xl" />
          </li>
        ))}
      </ul>
    </section>
  </div>
);

export const PartnerDetailSkeleton = () => (
  <div className="mt-4 space-y-6">
    <div>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-1 h-5 w-96 max-w-full" />
    </div>
    <section>
      <h2 className="font-display text-base font-bold text-foreground">Per product</h2>
      <div className="mt-2">
        <TableSkeleton
          headers={PRODUCT_BREAKDOWN_HEADERS}
          rowCount={PRODUCT_BREAKDOWN_SKELETON_ROW_COUNT}
        />
      </div>
    </section>
  </div>
);

export const ReportSkeleton = () => (
  <div className="space-y-4" role="status" aria-label="Loading">
    <div className="grid gap-3 sm:grid-cols-3">
      {Array.from({ length: REPORT_TILE_COUNT }, (_unused, tileIndex) => (
        <StatCardSkeleton key={tileIndex} />
      ))}
    </div>
    <ul className="space-y-2">
      {Array.from({ length: REPORT_BAR_ROW_COUNT }, (_unused, rowIndex) => (
        <li key={rowIndex} className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 text-sm">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-6 w-full rounded" />
          <Skeleton className="h-5 w-16" />
        </li>
      ))}
    </ul>
  </div>
);

export const RoleListSkeleton = () => (
  <div className="space-y-3" role="status" aria-label="Loading">
    {Array.from({ length: ROLE_SKELETON_COUNT }, (_unused, roleIndex) => (
      <CardRowSkeleton
        key={roleIndex}
        textLineCount={1}
        actions={[
          { label: "Edit", size: "sm" },
          { label: "Delete", size: "sm" },
        ]}
      />
    ))}
  </div>
);

type PageTextProps = { title: string; description: string };

const StackedHeading = ({ title, description }: PageTextProps) => (
  <>
    <h1 className={HEADING_CLASS}>{title}</h1>
    <p className={DESCRIPTION_CLASS}>{description}</p>
  </>
);

const SplitHeading = ({
  title,
  description,
  controls,
}: PageTextProps & { controls: ReactNode }) => (
  <div className={SPLIT_HEADER_CLASS}>
    <div>
      <h1 className={HEADING_CLASS}>{title}</h1>
      <p className={DESCRIPTION_CLASS}>{description}</p>
    </div>
    {controls}
  </div>
);

const SearchHeading = ({
  title,
  description,
  controls,
}: PageTextProps & { controls: ReactNode }) => (
  <>
    <div className={SPLIT_HEADER_CLASS}>
      <h1 className={HEADING_CLASS}>{title}</h1>
      {controls}
    </div>
    <p className={DESCRIPTION_CLASS}>{description}</p>
  </>
);

const DisabledSearchInput = ({
  placeholder,
  widthClass,
}: {
  placeholder: string;
  widthClass: string;
}) => (
  <Input
    type="search"
    placeholder={placeholder}
    disabled
    aria-hidden
    tabIndex={-1}
    className={widthClass}
  />
);

const DisabledFilter = ({ allLabel }: { allLabel: string }) => (
  <Select disabled aria-hidden tabIndex={-1} className="w-40">
    <option>{allLabel}</option>
  </Select>
);

export const ContactsRouteSkeleton = () => (
  <div>
    <SearchHeading
      {...CRM_PAGE_TEXT.contacts}
      controls={
        <div className="flex flex-wrap items-center gap-2">
          <DisabledFilter allLabel="All stages" />
          <DisabledSearchInput placeholder="Search contacts" widthClass="w-56" />
          <SkeletonButton size="sm" variant="default" label="New contact" />
        </div>
      }
    />
    <div className="mt-6">
      <TableSkeleton headers={CONTACT_TABLE_HEADERS} />
    </div>
  </div>
);

export const CustomersRouteSkeleton = () => (
  <div>
    <SearchHeading
      {...CRM_PAGE_TEXT.customers}
      controls={<DisabledSearchInput placeholder="Search shoppers" widthClass="w-64" />}
    />
    <div className="mt-6">
      <TableSkeleton headers={CUSTOMER_TABLE_HEADERS} />
    </div>
  </div>
);

export const PartnersRouteSkeleton = () => (
  <div>
    <SearchHeading
      {...CRM_PAGE_TEXT.partners}
      controls={<DisabledSearchInput placeholder="Search creators" widthClass="w-64" />}
    />
    <div className="mt-6">
      <TableSkeleton headers={PARTNER_TABLE_HEADERS} />
    </div>
  </div>
);

export const AuditRouteSkeleton = () => (
  <div>
    <StackedHeading {...CRM_PAGE_TEXT.audit} />
    <div className="mt-6">
      <TableSkeleton headers={AUDIT_TABLE_HEADERS} />
    </div>
  </div>
);

export const RolesRouteSkeleton = () => (
  <div>
    <StackedHeading {...CRM_PAGE_TEXT.roles} />
    <div className="mt-6">
      <RoleListSkeleton />
    </div>
  </div>
);

export const ReportsRouteSkeleton = () => (
  <div>
    <StackedHeading {...CRM_PAGE_TEXT.reports} />
    <div className="mt-6 space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-bold text-foreground">Pipeline value by stage</h2>
        <div className="mt-4">
          <ReportSkeleton />
        </div>
      </section>
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-bold text-foreground">Support tickets</h2>
        <div className="mt-4">
          <ReportSkeleton />
        </div>
      </section>
    </div>
  </div>
);

export const BillingRouteSkeleton = () => (
  <div>
    <StackedHeading {...CRM_PAGE_TEXT.billing} />
    <div className="mt-6">
      <BillingSkeleton />
    </div>
  </div>
);

export const PipelineRouteSkeleton = () => (
  <div>
    <SplitHeading
      {...CRM_PAGE_TEXT.pipeline}
      controls={
        <div className="flex gap-2">
          <SkeletonButton size="sm" label="Configure stages" />
          <SkeletonButton size="sm" variant="default" label="New deal" />
        </div>
      }
    />
    <div className="mt-6">
      <KanbanBoardSkeleton />
    </div>
  </div>
);

export const TasksRouteSkeleton = () => (
  <div>
    <SplitHeading
      {...CRM_PAGE_TEXT.tasks}
      controls={<SkeletonButton size="sm" variant="default" label="New task" />}
    />
    <div className="mt-6">
      <CompactRowSkeleton hasCheckbox />
    </div>
  </div>
);

export const TicketsRouteSkeleton = () => (
  <div>
    <SplitHeading
      {...CRM_PAGE_TEXT.tickets}
      controls={
        <div className="flex items-center gap-2">
          <DisabledFilter allLabel="All statuses" />
          <SkeletonButton size="sm" variant="default" label="New ticket" />
        </div>
      }
    />
    <div className="mt-6 space-y-4">
      <CompactRowSkeleton hasTrailingBadge />
    </div>
  </div>
);

export const CustomerDetailRouteSkeleton = () => (
  <div className="mx-auto max-w-3xl">
    <Link to="/crm/customers" className="text-sm font-semibold text-primary-strong underline">
      ← Back to customers
    </Link>
    <CustomerDetailSkeleton />
  </div>
);

export const PartnerDetailRouteSkeleton = () => (
  <div className="mx-auto max-w-3xl">
    <Link to="/crm/partners" className="text-sm font-semibold text-primary-strong underline">
      ← Back to partners
    </Link>
    <PartnerDetailSkeleton />
  </div>
);

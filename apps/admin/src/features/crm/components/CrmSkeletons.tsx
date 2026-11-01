import { KanbanBoardSkeleton } from "@outfiqe/components";
import { Input, Select, Skeleton, StatCardSkeleton } from "@outfiqe/design-system";
import type { ReactNode } from "react";

import { BackLink } from "@/components/BackLink";
import { CardRowSkeleton } from "@/components/CardRowSkeleton";
import { MetricSection } from "@/components/MetricParts";
import { SkeletonBadge, SkeletonButton } from "@/components/SkeletonControls";
import { TableSkeleton } from "@/components/TableSkeleton";

import {
  AUDIT_TABLE_HEADERS,
  CONTACT_TABLE_HEADERS,
  CRM_PAGE_TEXT,
  CUSTOMER_TABLE_HEADERS,
  INVOICE_TABLE_HEADERS,
  PARTNER_TABLE_HEADERS,
  RECORD_SECTIONS_GRID_CLASS_NAME,
} from "../constants/crmPageContent";
import { CompactRowSkeleton } from "./CompactRowSkeleton";
import { CrmPageHeader } from "./CrmPageHeader";

const INVOICE_SKELETON_ROW_COUNT = 3;
const RECORD_ROW_SKELETON_COUNT = 3;
const RECORD_SECTION_SKELETON_COUNT = 2;
const PARTNER_STAT_SKELETON_COUNT = 3;
const CUSTOMER_STAT_SKELETON_COUNT = 4;
const ROLE_SKELETON_COUNT = 3;
const REPORT_TILE_COUNT = 3;
const REPORT_BAR_ROW_COUNT = 4;

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

const RecordHeadingSkeleton = () => (
  <div>
    <Skeleton className="h-8 w-56" />
    <Skeleton className="mt-1 h-5 w-96 max-w-full" />
  </div>
);

const RecordRowsSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: RECORD_ROW_SKELETON_COUNT }, (_unused, rowIndex) => (
      <Skeleton key={rowIndex} className="h-10 w-full" />
    ))}
  </div>
);

export const RecordDetailSkeleton = () => (
  <div className="mt-4 space-y-6" role="status" aria-label="Loading">
    <RecordHeadingSkeleton />
    <div className={RECORD_SECTIONS_GRID_CLASS_NAME}>
      {Array.from({ length: RECORD_SECTION_SKELETON_COUNT }, (_unused, sectionIndex) => (
        <div key={sectionIndex} className="rounded-xl border border-border bg-card p-5">
          <Skeleton className="mb-4 h-5 w-40" />
          <RecordRowsSkeleton />
        </div>
      ))}
    </div>
  </div>
);

export const CustomerDetailSkeleton = () => (
  <div className="mt-4 space-y-6" role="status" aria-label="Loading">
    <RecordHeadingSkeleton />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: CUSTOMER_STAT_SKELETON_COUNT }, (_unused, statIndex) => (
        <StatCardSkeleton key={statIndex} />
      ))}
    </div>
    <MetricSection title="Recent orders">
      <RecordRowsSkeleton />
    </MetricSection>
  </div>
);

export const PartnerDetailSkeleton = () => (
  <div className="mt-4 space-y-6" role="status" aria-label="Loading">
    <RecordHeadingSkeleton />
    <div className="grid gap-4 sm:grid-cols-3">
      {Array.from({ length: PARTNER_STAT_SKELETON_COUNT }, (_unused, statIndex) => (
        <StatCardSkeleton key={statIndex} />
      ))}
    </div>
    <div className={RECORD_SECTIONS_GRID_CLASS_NAME}>
      <MetricSection title="Per product">
        <RecordRowsSkeleton />
      </MetricSection>
      <MetricSection title="Recent orders they brought">
        <RecordRowsSkeleton />
      </MetricSection>
    </div>
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

const StackedHeading = (pageText: PageTextProps) => <CrmPageHeader {...pageText} />;

const SplitHeading = ({ controls, ...pageText }: PageTextProps & { controls: ReactNode }) => (
  <CrmPageHeader {...pageText} actions={controls} />
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
    <SplitHeading
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
    <SplitHeading
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
    <SplitHeading
      {...CRM_PAGE_TEXT.partners}
      controls={<DisabledSearchInput placeholder="Search muses" widthClass="w-64" />}
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
        <h2 className="font-display text-lg font-bold text-foreground">Sales value by stage</h2>
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
          <SkeletonButton size="sm" label="Edit stages" />
          <SkeletonButton size="sm" variant="default" label="New opportunity" />
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
  <div>
    <BackLink to="/crm/customers">All customers</BackLink>
    <CustomerDetailSkeleton />
  </div>
);

export const PartnerDetailRouteSkeleton = () => (
  <div>
    <BackLink to="/crm/partners">All partners</BackLink>
    <PartnerDetailSkeleton />
  </div>
);

export const DealDetailRouteSkeleton = () => (
  <div>
    <BackLink to="/crm/pipeline">Sales board</BackLink>
    <RecordDetailSkeleton />
  </div>
);

export const ContactDetailRouteSkeleton = () => (
  <div>
    <BackLink to="/crm/contacts">All contacts</BackLink>
    <RecordDetailSkeleton />
  </div>
);

export const TicketDetailRouteSkeleton = () => (
  <div>
    <BackLink to="/crm/support">All tickets</BackLink>
    <RecordDetailSkeleton />
  </div>
);

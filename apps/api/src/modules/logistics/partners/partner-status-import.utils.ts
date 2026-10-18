import { TZDate } from "@date-fns/tz";
import { addMinutes } from "date-fns/addMinutes";
import { isAfter } from "date-fns/isAfter";
import { z } from "zod";

import type { PartnerTrackingEvent } from "./adapters/partner-adapter.types.js";

const MAX_REFERENCE_LENGTH = 80;
const MAX_RAW_STATUS_LENGTH = 120;
const MAX_REASON_LENGTH = 300;
const ALLOWED_CLOCK_SKEW_MINUTES = 10;
const MONTH_INDEX_OFFSET = 1;
const NO_SECONDS = 0;
const HEADER_SEPARATOR_PATTERN = /[\s_-]/g;
const ZONED_ISO_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/i;
const LOCAL_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;

export const STATUS_SHEET_COLUMN = {
  PARTNER_REFERENCE: "partnerReference",
  MERCHANT_REFERENCE: "merchantReference",
  RAW_STATUS: "rawStatus",
  OCCURRED_AT: "occurredAt",
  RAW_REASON: "rawReason",
  COD_COLLECTED_AMOUNT: "codCollectedAmount",
} as const;

type StatusSheetColumn = (typeof STATUS_SHEET_COLUMN)[keyof typeof STATUS_SHEET_COLUMN];

const HEADER_ALIASES: Readonly<Record<string, StatusSheetColumn>> = {
  partnerreference: STATUS_SHEET_COLUMN.PARTNER_REFERENCE,
  partnerid: STATUS_SHEET_COLUMN.PARTNER_REFERENCE,
  merchantreference: STATUS_SHEET_COLUMN.MERCHANT_REFERENCE,
  ourreference: STATUS_SHEET_COLUMN.MERCHANT_REFERENCE,
  trackingcode: STATUS_SHEET_COLUMN.MERCHANT_REFERENCE,
  rawstatus: STATUS_SHEET_COLUMN.RAW_STATUS,
  status: STATUS_SHEET_COLUMN.RAW_STATUS,
  occurredat: STATUS_SHEET_COLUMN.OCCURRED_AT,
  time: STATUS_SHEET_COLUMN.OCCURRED_AT,
  date: STATUS_SHEET_COLUMN.OCCURRED_AT,
  rawreason: STATUS_SHEET_COLUMN.RAW_REASON,
  reason: STATUS_SHEET_COLUMN.RAW_REASON,
  remarks: STATUS_SHEET_COLUMN.RAW_REASON,
  codcollectedamount: STATUS_SHEET_COLUMN.COD_COLLECTED_AMOUNT,
  codcollected: STATUS_SHEET_COLUMN.COD_COLLECTED_AMOUNT,
  cod: STATUS_SHEET_COLUMN.COD_COLLECTED_AMOUNT,
};

export type StatusSheetColumns = Partial<Record<StatusSheetColumn, number>>;

export const mapStatusSheetHeader = (headerRow: readonly string[]): StatusSheetColumns =>
  headerRow.reduce<StatusSheetColumns>((columns, header, columnIndex) => {
    const column = HEADER_ALIASES[header.toLowerCase().replace(HEADER_SEPARATOR_PATTERN, "")];
    return column && columns[column] === undefined
      ? { ...columns, [column]: columnIndex }
      : columns;
  }, {});

export const hasRequiredStatusSheetColumns = (columns: StatusSheetColumns): boolean =>
  columns.rawStatus !== undefined &&
  columns.occurredAt !== undefined &&
  (columns.partnerReference !== undefined || columns.merchantReference !== undefined);

export const parsePartnerSheetTime = (text: string, timeZone: string): Date | null => {
  const trimmed = text.trim();
  if (ZONED_ISO_TIME_PATTERN.test(trimmed)) {
    const zonedTime = new Date(trimmed);
    return Number.isNaN(zonedTime.getTime()) ? null : zonedTime;
  }
  const localParts = LOCAL_TIME_PATTERN.exec(trimmed);
  if (!localParts) return null;
  const [, year, month, day, hours, minutes, seconds] = localParts;
  if (!year || !month || !day || !hours || !minutes) return null;
  const monthIndex = Number(month) - MONTH_INDEX_OFFSET;
  const localTime = new TZDate(
    Number(year),
    monthIndex,
    Number(day),
    Number(hours),
    Number(minutes),
    seconds ? Number(seconds) : NO_SECONDS,
    timeZone,
  );
  const isRealCalendarTime =
    localTime.getMonth() === monthIndex &&
    localTime.getDate() === Number(day) &&
    localTime.getHours() === Number(hours);
  return isRealCalendarTime ? new Date(localTime.getTime()) : null;
};

const optionalCellSchema = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => (value === "" ? null : value));

const statusSheetRowSchema = z
  .object({
    partnerReference: optionalCellSchema(MAX_REFERENCE_LENGTH),
    merchantReference: optionalCellSchema(MAX_REFERENCE_LENGTH),
    rawStatus: z.string().trim().min(1, "The status is empty.").max(MAX_RAW_STATUS_LENGTH),
    occurredAt: z.string(),
    rawReason: optionalCellSchema(MAX_REASON_LENGTH),
    codCollectedAmount: z
      .string()
      .trim()
      .transform((value, context) => {
        if (value === "") return null;
        const amount = Number(value);
        if (!Number.isInteger(amount) || amount < 0) {
          context.addIssue({
            code: "custom",
            message: "The cash collected must be a whole amount.",
          });
          return z.NEVER;
        }
        return amount;
      }),
  })
  .refine((row) => row.partnerReference !== null || row.merchantReference !== null, {
    message: "The row needs the partner's ID or our parcel code.",
  });

export type StatusSheetRowResult =
  { isValid: true; event: PartnerTrackingEvent } | { isValid: false; message: string };

const cellAt = (row: readonly string[], columnIndex: number | undefined): string =>
  columnIndex === undefined ? "" : (row[columnIndex] ?? "");

export const parseStatusSheetRow = (
  row: readonly string[],
  columns: StatusSheetColumns,
  { timeZone, now }: { timeZone: string; now: Date },
): StatusSheetRowResult => {
  const parsedRow = statusSheetRowSchema.safeParse({
    partnerReference: cellAt(row, columns.partnerReference),
    merchantReference: cellAt(row, columns.merchantReference),
    rawStatus: cellAt(row, columns.rawStatus),
    occurredAt: cellAt(row, columns.occurredAt),
    rawReason: cellAt(row, columns.rawReason),
    codCollectedAmount: cellAt(row, columns.codCollectedAmount),
  });
  if (!parsedRow.success) {
    return { isValid: false, message: parsedRow.error.issues[0]?.message ?? "The row is invalid." };
  }
  const { occurredAt: occurredAtText, ...cells } = parsedRow.data;
  const occurredAt = parsePartnerSheetTime(occurredAtText, timeZone);
  if (!occurredAt) {
    return { isValid: false, message: "The time isn't readable. Use 2026-10-16 14:30." };
  }
  if (isAfter(occurredAt, addMinutes(now, ALLOWED_CLOCK_SKEW_MINUTES))) {
    return { isValid: false, message: "The time is in the future." };
  }
  return {
    isValid: true,
    event: {
      ...cells,
      partnerEventId: null,
      occurredAt,
      location: null,
      rawPayload: { ...cells, occurredAt: occurredAtText },
    },
  };
};

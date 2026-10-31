import { z } from "zod";

import { isUuid } from "#lib/uuid.utils.js";

import type { FunnelStep, SpeedReading } from "./insights.types.js";

const NO_PEOPLE = 0;
const NOTHING_COUNTED = 0;
const PRODUCT_PATH_PATTERN = /^\/product\/([^/]+)\/?$/;
const BRAND_PATH_PATTERN = /^\/brand\/([^/]+)\/?$/;

const measurementsRowSchema = z.array(z.coerce.number().nullable());

const countsRowSchema = z.array(z.coerce.number());

const labelledCountRowSchema = z.tuple([z.string().nullable(), z.coerce.number()]);

const slowPageRowSchema = z.tuple([
  z.string().nullable(),
  z.coerce.number().nullable(),
  z.coerce.number(),
]);

const SPEED_READING_COLUMNS = 5;

export type LabelledCount = { label: string; count: number };
export type SlowPageRow = { path: string; typicalLoadMs: number; sampleCount: number };

export const readFirstRowCounts = (rows: unknown[][]): number[] => {
  const [firstRow] = rows;
  return firstRow ? countsRowSchema.parse(firstRow) : [];
};

export const readCountAt = (counts: number[], columnIndex: number): number =>
  counts[columnIndex] ?? NOTHING_COUNTED;

export const readLabelledCounts = (rows: unknown[][]): LabelledCount[] =>
  rows.flatMap((row) => {
    const [label, count] = labelledCountRowSchema.parse(row);
    return label === null ? [] : [{ label, count }];
  });

export const toFunnelSteps = (stepEvents: readonly string[], rows: unknown[][]): FunnelStep[] => {
  const personsByEvent = new Map(
    readLabelledCounts(rows).map(({ label, count }) => [label, count]),
  );
  return stepEvents.map((event) => ({ event, persons: personsByEvent.get(event) ?? NO_PEOPLE }));
};

export const readFirstRowMeasurements = (rows: unknown[][]): (number | null)[] => {
  const [firstRow] = rows;
  return firstRow ? measurementsRowSchema.parse(firstRow) : [];
};

export const toProductIdFromPath = (path: string): string | null => {
  const productId = PRODUCT_PATH_PATTERN.exec(path)?.[1];
  return productId && isUuid(productId) ? productId : null;
};

export const toBrandIdFromPath = (path: string): string | null => {
  const brandId = BRAND_PATH_PATTERN.exec(path)?.[1];
  return brandId && isUuid(brandId) ? brandId : null;
};

export const readSlowPageRows = (rows: unknown[][]): SlowPageRow[] =>
  rows.flatMap((row) => {
    const [path, typicalLoadMs, sampleCount] = slowPageRowSchema.parse(row);
    return path === null || typicalLoadMs === null ? [] : [{ path, typicalLoadMs, sampleCount }];
  });

export const toSpeedReading = (columns: (number | null)[], firstColumn: number): SpeedReading => {
  const [sampleCount, p75, p90, p95, p99] = columns.slice(
    firstColumn,
    firstColumn + SPEED_READING_COLUMNS,
  );
  return {
    sampleCount: sampleCount ?? NOTHING_COUNTED,
    p75: p75 ?? null,
    p90: p90 ?? null,
    p95: p95 ?? null,
    p99: p99 ?? null,
  };
};

export const toShare = (part: number, whole: number): number =>
  whole === NOTHING_COUNTED ? NOTHING_COUNTED : part / whole;

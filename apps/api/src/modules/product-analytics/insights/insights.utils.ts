import { z } from "zod";

import type { FunnelStep } from "./insights.types.js";

const NO_PEOPLE = 0;
const NOTHING_COUNTED = 0;

const countsRowSchema = z.array(z.coerce.number());

const labelledCountRowSchema = z.tuple([z.string().nullable(), z.coerce.number()]);

export type LabelledCount = { label: string; count: number };

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

export const toShare = (part: number, whole: number): number =>
  whole === NOTHING_COUNTED ? NOTHING_COUNTED : part / whole;

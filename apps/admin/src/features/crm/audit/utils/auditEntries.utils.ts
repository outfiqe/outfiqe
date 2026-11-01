import type { CrmAuditEntry } from "../api/auditSchemas";
import { AUDIT_ACTION_LABELS } from "../constants/auditLabels";

const SINGLE_OCCURRENCE = 1;
const LAST_ITEM_STEP = 1;
const SINGLE_SEAT_TYPO = "(1 seats)";
const SINGLE_SEAT_WORDING = "(1 seat)";

export type AuditLogRow = CrmAuditEntry & { occurrenceCount: number };

export const toAuditActionLabel = (action: string): string =>
  AUDIT_ACTION_LABELS[action] ?? action.replace(/_/g, " ");

export const toAuditSummary = (summary: string): string =>
  summary.replace(SINGLE_SEAT_TYPO, SINGLE_SEAT_WORDING);

const isRepeatOf = (entry: CrmAuditEntry, previousRow: AuditLogRow): boolean =>
  entry.action === previousRow.action &&
  entry.actorUserId === previousRow.actorUserId &&
  entry.summary === previousRow.summary &&
  entry.outcome === previousRow.outcome;

export const groupRepeatedEntries = (entries: CrmAuditEntry[]): AuditLogRow[] =>
  entries.reduce<AuditLogRow[]>((rows, entry) => {
    const previousRow = rows[rows.length - LAST_ITEM_STEP];
    if (previousRow && isRepeatOf(entry, previousRow)) {
      previousRow.occurrenceCount += SINGLE_OCCURRENCE;
      return rows;
    }
    rows.push({ ...entry, occurrenceCount: SINGLE_OCCURRENCE });
    return rows;
  }, []);

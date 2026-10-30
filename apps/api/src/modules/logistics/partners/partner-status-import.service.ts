import { HTTP_STATUS } from "#constants/http.constants.js";
import { PartnerStatusImportRowOutcome, TrackingEventSource } from "#generated/prisma/enums.js";
import { CsvParseError, parseCsv } from "#lib/csv.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { logisticsErrors } from "../logistics.errors.js";
import { logisticsPartnerEvents } from "../logistics.partner-events.js";
import type { CreatePartnerStatusImportBody } from "./partner.schemas.js";
import type { PartnerStatusImportView } from "./partner.types.js";
import {
  logisticsPartnerStatusImportRepository,
  type PartnerStatusImportRecord,
  type PartnerStatusImportRowFields,
} from "./partner-status-import.repository.js";
import {
  hasRequiredStatusSheetColumns,
  mapStatusSheetHeader,
  parseStatusSheetRow,
  type StatusSheetColumns,
} from "./partner-status-import.utils.js";

const MAX_STATUS_ROWS = 500;
const FIRST_DATA_ROW_NUMBER = 2;
const FALLBACK_TIME_ZONE = "UTC";

const invalidSheetError = (message: string) =>
  new AppError("INVALID_STATUS_SHEET", message, HTTP_STATUS.UNPROCESSABLE_ENTITY);

const readSheetRows = (csv: string): string[][] => {
  try {
    return parseCsv(csv);
  } catch (error) {
    if (error instanceof CsvParseError)
      throw invalidSheetError(`The sheet can't be read: ${error.message}`);
    throw error;
  }
};

const splitHeader = (sheetRows: string[][]) => {
  const [headerRow, ...dataRows] = sheetRows;
  if (!headerRow) throw invalidSheetError("The sheet is empty.");
  const columns = mapStatusSheetHeader(headerRow);
  if (!hasRequiredStatusSheetColumns(columns)) {
    throw invalidSheetError(
      "The first row must name the columns: the partner's ID or our parcel code, status and time.",
    );
  }
  if (dataRows.length > MAX_STATUS_ROWS) {
    throw invalidSheetError(
      `A sheet can have up to ${MAX_STATUS_ROWS} rows. Split it into smaller files.`,
    );
  }
  return { columns, dataRows };
};

const importRow = async (
  partnerId: string,
  row: readonly string[],
  rowNumber: number,
  context: { columns: StatusSheetColumns; timeZone: string; now: Date },
): Promise<PartnerStatusImportRowFields> => {
  const parsedRow = parseStatusSheetRow(row, context.columns, context);
  if (!parsedRow.isValid) {
    return {
      rowNumber,
      partnerReference: null,
      merchantReference: null,
      rawStatus: null,
      outcome: PartnerStatusImportRowOutcome.INVALID_ROW,
      message: parsedRow.message,
      trackingEventId: null,
    };
  }
  const { event } = parsedRow;
  const { outcome, message, trackingEventId } =
    await logisticsPartnerEvents.applyPartnerTrackingEvent(
      partnerId,
      TrackingEventSource.PARTNER_IMPORT,
      event,
    );
  return {
    rowNumber,
    partnerReference: event.partnerReference,
    merchantReference: event.merchantReference,
    rawStatus: event.rawStatus,
    outcome,
    message,
    trackingEventId,
  };
};

const toStatusImportView = ({
  id,
  partnerId,
  fileName,
  rowCount,
  appliedCount,
  createdAt,
  rows,
}: PartnerStatusImportRecord): PartnerStatusImportView => ({
  id,
  partnerId,
  fileName,
  rowCount,
  appliedCount,
  createdAt: createdAt.toISOString(),
  rows: rows.map(
    ({ rowNumber, partnerReference, merchantReference, rawStatus, outcome, message }) => ({
      rowNumber,
      partnerReference,
      merchantReference,
      rawStatus,
      outcome,
      message,
    }),
  ),
});

export const logisticsPartnerStatusImportService = {
  async importPartnerStatuses(
    uploadedById: string,
    partnerId: string,
    { fileName, csv }: CreatePartnerStatusImportBody,
  ): Promise<PartnerStatusImportView> {
    const partner = await logisticsPartnerStatusImportRepository.findPartnerForImport(partnerId);
    if (!partner) {
      throw logisticsErrors.partnerNotFound();
    }
    const { columns, dataRows } = splitHeader(readSheetRows(csv));
    const [firstActiveAccount] = partner.accounts;
    const context = {
      columns,
      timeZone: firstActiveAccount?.hub.timeZone ?? FALLBACK_TIME_ZONE,
      now: new Date(),
    };

    const importedRows: PartnerStatusImportRowFields[] = [];
    for (const [rowIndex, row] of dataRows.entries()) {
      importedRows.push(await importRow(partnerId, row, rowIndex + FIRST_DATA_ROW_NUMBER, context));
    }

    const statusImport = await logisticsPartnerStatusImportRepository.createStatusImport({
      partnerId,
      uploadedById,
      fileName,
      appliedCount: importedRows.filter(
        ({ outcome }) => outcome === PartnerStatusImportRowOutcome.APPLIED,
      ).length,
      rows: importedRows,
    });
    return toStatusImportView(statusImport);
  },

  async getStatusImport(partnerId: string, importId: string): Promise<PartnerStatusImportView> {
    const statusImport = await logisticsPartnerStatusImportRepository.findStatusImport(
      partnerId,
      importId,
    );
    if (!statusImport) {
      throw new AppError("STATUS_IMPORT_NOT_FOUND", "Import not found.", HTTP_STATUS.NOT_FOUND);
    }
    return toStatusImportView(statusImport);
  },
};

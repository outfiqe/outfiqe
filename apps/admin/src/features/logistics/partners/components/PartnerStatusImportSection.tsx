import { Button, FormBanner, HiddenFileInput } from "@outfiqe/design-system";
import { useRef, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import type { StatusImport } from "../api/partnersSchemas";
import { IMPORT_ROW_OUTCOME_LABELS, MAX_STATUS_SHEET_CHARACTERS } from "../constants/partnerLabels";
import { useImportPartnerStatuses } from "../hooks/useImportPartnerStatuses";
import { readTextFile } from "../utils/readTextFile";

const CSV_FILE_TYPES = ".csv,text/csv";

type PartnerStatusImportSectionProps = { partnerId: string; canManage: boolean };

export const PartnerStatusImportSection = ({
  partnerId,
  canManage,
}: PartnerStatusImportSectionProps) => {
  const importStatuses = useImportPartnerStatuses(partnerId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lastImport, setLastImport] = useState<StatusImport | null>(null);
  const [fileProblem, setFileProblem] = useState<string | null>(null);

  const uploadSheet = async (files: FileList | null) => {
    const [file] = files ?? [];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;
    const csv = await readTextFile(file);
    if (csv.length > MAX_STATUS_SHEET_CHARACTERS) {
      setFileProblem("That sheet is too big. Split it into smaller files and upload each one.");
      return;
    }
    setFileProblem(null);
    importStatuses.mutate({ fileName: file.name, csv }, { onSuccess: setLastImport });
  };

  return (
    <section aria-labelledby="partner-import-heading" className="space-y-3">
      <h2 id="partner-import-heading" className="text-lg font-semibold text-foreground">
        Upload their status sheet
      </h2>
      <p className="text-sm text-muted-foreground">
        A CSV with the partner&apos;s parcel number or our parcel code, the status and the time.
        Each row is matched to a parcel; rows that can&apos;t be used are listed with the reason.
      </p>
      {fileProblem && <FormBanner>{fileProblem}</FormBanner>}
      {importStatuses.isError && <FormBanner>{getErrorMessage(importStatuses.error)}</FormBanner>}
      {canManage && (
        <>
          <HiddenFileInput
            inputRef={fileInputRef}
            accept={CSV_FILE_TYPES}
            onFilesSelected={(files) => void uploadSheet(files)}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            isLoading={importStatuses.isPending}
          >
            Choose a CSV file
          </Button>
        </>
      )}

      {lastImport && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm">
          <p className="font-medium text-foreground">
            {lastImport.fileName}: {lastImport.appliedCount} of {lastImport.rowCount} rows applied
          </p>
          <table className="mt-3 w-full text-left">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-1 pr-3 font-medium">Row</th>
                <th className="py-1 pr-3 font-medium">Parcel</th>
                <th className="py-1 pr-3 font-medium">Status</th>
                <th className="py-1 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {lastImport.rows.map(
                ({
                  rowNumber,
                  partnerReference,
                  merchantReference,
                  rawStatus,
                  outcome,
                  message,
                }) => (
                  <tr key={rowNumber} className="border-t border-border align-top">
                    <td className="py-1 pr-3">{rowNumber}</td>
                    <td className="py-1 pr-3">{partnerReference ?? merchantReference ?? "—"}</td>
                    <td className="py-1 pr-3">{rawStatus ?? "—"}</td>
                    <td className="py-1">
                      {IMPORT_ROW_OUTCOME_LABELS[outcome]}
                      {message ? (
                        <span className="block text-xs text-muted-foreground">{message}</span>
                      ) : null}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

"use client";

import { Button, FormBanner, Label, Modal, Textarea, toast } from "@outfiqe/design-system";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { MAX_REPORT_DETAILS_LENGTH, MIN_REPORT_DETAILS_LENGTH } from "../constants/trackingStages";
import { useReportNotReceived } from "../hooks/useReportNotReceived";

type ReportNotReceivedModalProps = {
  orderId: string;
  shipmentId: string;
  onClose: () => void;
};

export const ReportNotReceivedModal = ({
  orderId,
  shipmentId,
  onClose,
}: ReportNotReceivedModalProps) => {
  const t = useTranslations("orders.tracking.report");
  const reportNotReceived = useReportNotReceived(orderId);
  const [details, setDetails] = useState("");
  const detailsInputId = useId();
  const detailsHintId = useId();
  const trimmedDetails = details.trim();
  const canSend = trimmedDetails.length >= MIN_REPORT_DETAILS_LENGTH;

  const sendReport = () => {
    reportNotReceived.mutate(
      { shipmentId, details: trimmedDetails },
      {
        onSuccess: () => {
          toast.success(t("sent"));
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("title")}
      description={t("description")}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button onClick={sendReport} disabled={!canSend} isLoading={reportNotReceived.isPending}>
            {t("submit")}
          </Button>
        </div>
      }
    >
      {reportNotReceived.isError && (
        <FormBanner>{getErrorMessage(reportNotReceived.error)}</FormBanner>
      )}
      <Label htmlFor={detailsInputId}>{t("detailsLabel")}</Label>
      <Textarea
        id={detailsInputId}
        value={details}
        maxLength={MAX_REPORT_DETAILS_LENGTH}
        aria-describedby={detailsHintId}
        onChange={(event) => setDetails(event.target.value)}
      />
      <p id={detailsHintId} className="mt-1 text-xs text-muted-foreground">
        {t("detailsHint")}
      </p>
    </Modal>
  );
};

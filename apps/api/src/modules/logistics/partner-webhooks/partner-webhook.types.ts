export type WebhookReceiveOutcome = { accepted: true };

export type PartnerWebhookReceiptView = {
  id: string;
  signatureValid: boolean;
  receivedAt: string;
  processedAt: string | null;
  processingError: string | null;
  eventCount: number;
  appliedCount: number;
  unknownCount: number;
};

import { BankQrCheckReason, BankQrCheckStatus } from "#generated/prisma/enums.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { describeError } from "#redis/redis.utils.js";
import { storage } from "#storage/storage.js";

import {
  BANK_QR_IMAGE_NOT_UPLOADED_ERROR,
  BANK_QR_REJECTED_STATUS,
  BANK_QR_REJECTION,
  BANK_QR_REJECTION_ERRORS,
} from "./bank-qr-verification.constants.js";
import { decodeQrTextFromImage } from "./bank-qr-verification.decoder.js";
import { parseEmvPayload } from "./bank-qr-verification.emv-parser.js";
import {
  findConfirmedAccountNumber,
  matchQrPayloadAgainstTypedDetails,
} from "./bank-qr-verification.matcher.js";
import type {
  BankQrCheckForSave,
  BankQrPreview,
  BankQrRejection,
  BankQrTypedDetails,
} from "./bank-qr-verification.types.js";

type StoredQrDecodeOutcome =
  { wasImageRead: true; qrText: string | null } | { wasImageRead: false };

const MISSING_FILE_ERROR_CODE = "ENOENT";

const qrImageNotUploadedError = () =>
  new AppError(
    BANK_QR_IMAGE_NOT_UPLOADED_ERROR.code,
    BANK_QR_IMAGE_NOT_UPLOADED_ERROR.message,
    BANK_QR_REJECTED_STATUS,
  );

const qrRejectionError = (rejection: BankQrRejection) => {
  const { code, message } = BANK_QR_REJECTION_ERRORS[rejection];
  return new AppError(code, message, BANK_QR_REJECTED_STATUS);
};

const isMissingFileError = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === MISSING_FILE_ERROR_CODE;

const requireStoredQrImageKey = (qrCodeImageUrl: string): string => {
  const storageKey = storage.keyFromPublicUrl(qrCodeImageUrl);
  if (!storageKey) throw qrImageNotUploadedError();
  return storageKey;
};

const decodeStoredQrImage = async (qrCodeImageUrl: string): Promise<StoredQrDecodeOutcome> => {
  const storageKey = requireStoredQrImageKey(qrCodeImageUrl);

  try {
    const imageBuffer = await storage.read(storageKey);
    return { wasImageRead: true, qrText: await decodeQrTextFromImage(imageBuffer) };
  } catch (error) {
    if (isMissingFileError(error)) throw qrImageNotUploadedError();
    logger.warn(`Bank QR image "${storageKey}" could not be read: ${describeError(error)}`);
    return { wasImageRead: false };
  }
};

export const bankQrVerificationService = {
  async checkQrForNewBankAccount(
    qrCodeImageUrl: string,
    typedDetails: BankQrTypedDetails,
  ): Promise<BankQrCheckForSave> {
    const decodeOutcome = await decodeStoredQrImage(qrCodeImageUrl);
    if (!decodeOutcome.wasImageRead) {
      return {
        qrCheckStatus: BankQrCheckStatus.NEEDS_REVIEW,
        qrCheckReason: BankQrCheckReason.READ_FAILED,
      };
    }

    const { qrText } = decodeOutcome;
    if (qrText === null) throw qrRejectionError(BANK_QR_REJECTION.NO_QR_FOUND);

    const matchResult = matchQrPayloadAgainstTypedDetails(parseEmvPayload(qrText), typedDetails);
    if (matchResult.isRejected) throw qrRejectionError(matchResult.rejection);

    const { qrCheckStatus, qrCheckReason } = matchResult;
    return { qrCheckStatus, qrCheckReason };
  },

  async previewQr(qrCodeImageUrl: string): Promise<BankQrPreview> {
    const decodeOutcome = await decodeStoredQrImage(qrCodeImageUrl);
    const qrText = decodeOutcome.wasImageRead ? decodeOutcome.qrText : null;
    const payload = qrText === null ? null : parseEmvPayload(qrText);
    const trustedPayload = payload?.hasValidChecksum ? payload : null;

    return {
      isQrDetected: qrText !== null,
      accountName: trustedPayload?.merchantName ?? null,
      accountNumber: trustedPayload ? findConfirmedAccountNumber(trustedPayload) : null,
    };
  },
};

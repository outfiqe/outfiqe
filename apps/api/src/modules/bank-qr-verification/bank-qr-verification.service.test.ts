import { beforeEach, describe, expect, it, vi } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { BankQrCheckReason, BankQrCheckStatus } from "#generated/prisma/enums.js";
import {
  breakChecksum,
  buildAccountJsonQrPayload,
  buildBankQrPayload,
  renderBlankPng,
  renderQrPng,
} from "#test/bank-qr-test-codes.js";

const { readStoredFile, keyFromPublicUrl, warnLog, listKnownSwiftCodes } = vi.hoisted(() => ({
  listKnownSwiftCodes: vi.fn<() => Promise<ReadonlySet<string>>>(),
  readStoredFile: vi.fn<(key: string) => Promise<Buffer>>(),
  keyFromPublicUrl: vi.fn<(url: string) => string | null>(),
  warnLog: vi.fn(),
}));

vi.mock("#storage/storage.js", () => ({
  storage: { read: readStoredFile, keyFromPublicUrl },
}));
vi.mock("#lib/winston.utils.js", () => ({ default: { warn: warnLog } }));
vi.mock("#modules/nepal-banks/nepal-bank.service.js", () => ({
  nepalBankService: { listKnownSwiftCodes },
}));

const { bankQrVerificationService } = await import("./bank-qr-verification.service.js");

const STORED_QR_URL = "http://api.outfiqe.test/uploads/qr.png";
const STORED_QR_KEY = "qr.png";

const typedDetails = {
  accountName: "Sabin Shrestha",
  accountNumber: "1234567890",
  bankCode: "A03",
  bankSwiftCode: "NARBNPKA",
};

const missingFileError = () => Object.assign(new Error("no such file"), { code: "ENOENT" });

beforeEach(() => {
  vi.clearAllMocks();
  keyFromPublicUrl.mockReturnValue(STORED_QR_KEY);
  listKnownSwiftCodes.mockResolvedValue(new Set(["NARBNPKA", "GLBBNPKA"]));
});

describe("bankQrVerificationService.checkQrForNewBankAccount", () => {
  it("returns a match for a QR that carries the typed name and number", async () => {
    readStoredFile.mockResolvedValue(await renderQrPng(buildBankQrPayload()));

    await expect(
      bankQrVerificationService.checkQrForNewBankAccount(STORED_QR_URL, typedDetails),
    ).resolves.toEqual({ qrCheckStatus: BankQrCheckStatus.MATCHED, qrCheckReason: null });
    expect(readStoredFile).toHaveBeenCalledWith(STORED_QR_KEY);
  });

  it("returns the review reason for a QR that does not fully match", async () => {
    readStoredFile.mockResolvedValue(
      await renderQrPng(buildBankQrPayload({ accountName: "Someone Else" })),
    );

    await expect(
      bankQrVerificationService.checkQrForNewBankAccount(STORED_QR_URL, typedDetails),
    ).resolves.toEqual({
      qrCheckStatus: BankQrCheckStatus.NEEDS_REVIEW,
      qrCheckReason: BankQrCheckReason.NAME_DIFFERS,
    });
  });

  it("rejects a photo with no QR code in it", async () => {
    readStoredFile.mockResolvedValue(await renderBlankPng());

    await expect(
      bankQrVerificationService.checkQrForNewBankAccount(STORED_QR_URL, typedDetails),
    ).rejects.toMatchObject({
      code: "BANK_QR_NOT_FOUND",
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    });
  });

  it("rejects a url that is not one of our uploads without reading anything", async () => {
    keyFromPublicUrl.mockReturnValue(null);

    await expect(
      bankQrVerificationService.checkQrForNewBankAccount(
        "https://evil.example/qr.png",
        typedDetails,
      ),
    ).rejects.toMatchObject({ code: "BANK_QR_IMAGE_NOT_UPLOADED" });
    expect(readStoredFile).not.toHaveBeenCalled();
  });

  it("rejects an upload url whose file no longer exists", async () => {
    readStoredFile.mockRejectedValue(missingFileError());

    await expect(
      bankQrVerificationService.checkQrForNewBankAccount(STORED_QR_URL, typedDetails),
    ).rejects.toMatchObject({ code: "BANK_QR_IMAGE_NOT_UPLOADED" });
  });

  it("sends the account to review and logs when the image can't be read", async () => {
    readStoredFile.mockRejectedValue(new Error("disk unavailable"));

    await expect(
      bankQrVerificationService.checkQrForNewBankAccount(STORED_QR_URL, typedDetails),
    ).resolves.toEqual({
      qrCheckStatus: BankQrCheckStatus.NEEDS_REVIEW,
      qrCheckReason: BankQrCheckReason.READ_FAILED,
    });
    expect(warnLog).toHaveBeenCalledWith(expect.stringContaining("disk unavailable"));
  });
});

describe("bankQrVerificationService.previewQr", () => {
  it("returns the name from a valid payment QR", async () => {
    readStoredFile.mockResolvedValue(await renderQrPng(buildBankQrPayload()));

    await expect(bankQrVerificationService.previewQr(STORED_QR_URL)).resolves.toEqual({
      isQrDetected: true,
      accountName: "Sabin Shrestha",
      accountNumber: null,
    });
  });

  it("returns nothing to fill in from a QR with a broken checksum", async () => {
    readStoredFile.mockResolvedValue(await renderQrPng(breakChecksum(buildBankQrPayload())));

    await expect(bankQrVerificationService.previewQr(STORED_QR_URL)).resolves.toEqual({
      isQrDetected: true,
      accountName: null,
      accountNumber: null,
    });
  });

  it("reports a QR that is not a payment QR as detected with nothing to fill in", async () => {
    readStoredFile.mockResolvedValue(await renderQrPng("https://example.com"));

    await expect(bankQrVerificationService.previewQr(STORED_QR_URL)).resolves.toEqual({
      isQrDetected: true,
      accountName: null,
      accountNumber: null,
    });
  });

  it("reports no QR when the image can't be read", async () => {
    readStoredFile.mockRejectedValue(new Error("disk unavailable"));

    await expect(bankQrVerificationService.previewQr(STORED_QR_URL)).resolves.toEqual({
      isQrDetected: false,
      accountName: null,
      accountNumber: null,
    });
  });
});

describe("bankQrVerificationService with a bank account JSON QR", () => {
  it("returns a match when the QR shows the typed name, number and picked bank", async () => {
    readStoredFile.mockResolvedValue(await renderQrPng(buildAccountJsonQrPayload()));

    await expect(
      bankQrVerificationService.checkQrForNewBankAccount(STORED_QR_URL, typedDetails),
    ).resolves.toEqual({ qrCheckStatus: BankQrCheckStatus.MATCHED, qrCheckReason: null });
  });

  it("rejects a QR that shows a different account number", async () => {
    readStoredFile.mockResolvedValue(
      await renderQrPng(buildAccountJsonQrPayload({ accountNumber: "9999999999" })),
    );

    await expect(
      bankQrVerificationService.checkQrForNewBankAccount(STORED_QR_URL, typedDetails),
    ).rejects.toMatchObject({ code: "BANK_QR_ACCOUNT_NUMBER_MISMATCH" });
  });

  it("rejects a QR for a different bank we know", async () => {
    readStoredFile.mockResolvedValue(
      await renderQrPng(buildAccountJsonQrPayload({ bankCode: "GLBBNPKA" })),
    );

    await expect(
      bankQrVerificationService.checkQrForNewBankAccount(STORED_QR_URL, typedDetails),
    ).rejects.toMatchObject({ code: "BANK_QR_BANK_MISMATCH" });
  });

  it("does not look up bank codes for an EMV QR", async () => {
    readStoredFile.mockResolvedValue(await renderQrPng(buildBankQrPayload()));

    await bankQrVerificationService.checkQrForNewBankAccount(STORED_QR_URL, typedDetails);

    expect(listKnownSwiftCodes).not.toHaveBeenCalled();
  });

  it("previews both the name and the account number", async () => {
    readStoredFile.mockResolvedValue(
      await renderQrPng(buildAccountJsonQrPayload({ accountNumber: "1234-567-890" })),
    );

    await expect(bankQrVerificationService.previewQr(STORED_QR_URL)).resolves.toEqual({
      isQrDetected: true,
      accountName: "SABIN SHRESTHA",
      accountNumber: "1234567890",
    });
  });
});

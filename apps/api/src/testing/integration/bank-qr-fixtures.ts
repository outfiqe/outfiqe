import { storage } from "#storage/storage.js";
import { buildBankQrPayload, renderBlankPng, renderQrPng } from "#test/bank-qr-test-codes.js";

type UploadedBankQrFields = Parameters<typeof buildBankQrPayload>[0];

const uploadPng = async (pngBuffer: Buffer): Promise<string> => {
  const { url } = await storage.upload({
    buffer: pngBuffer,
    originalName: "bank-qr.png",
    mimeType: "image/png",
  });
  return url;
};

export const uploadQrImageWithText = async (qrText: string): Promise<string> =>
  uploadPng(await renderQrPng(qrText));

export const uploadBankQrImage = (fields?: UploadedBankQrFields): Promise<string> =>
  uploadQrImageWithText(buildBankQrPayload(fields));

export const uploadImageWithoutQr = async (): Promise<string> => uploadPng(await renderBlankPng());

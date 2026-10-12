import { describe, expect, it } from "vitest";

import { QR_CHECK_REASON_NOTE, QR_NOT_CHECKED_NOTE } from "../constants/bankQrCheckLabels";
import { describeQrCheckNote, describeVerificationBadge } from "./bankQrCheck.utils";

describe("describeVerificationBadge", () => {
  it("labels an account verified by its QR", () => {
    expect(describeVerificationBadge({ isVerified: true, verificationMethod: "QR_MATCH" })).toBe(
      "Verified by QR",
    );
  });

  it("labels an account an admin verified", () => {
    expect(describeVerificationBadge({ isVerified: true, verificationMethod: "MANUAL" })).toBe(
      "Verified",
    );
  });

  it("labels a verified account with no recorded method as verified", () => {
    expect(describeVerificationBadge({ isVerified: true, verificationMethod: null })).toBe(
      "Verified",
    );
  });

  it("labels an unverified account as pending", () => {
    expect(describeVerificationBadge({ isVerified: false, verificationMethod: null })).toBe(
      "Pending verification",
    );
  });
});

describe("describeQrCheckNote", () => {
  it("explains why a pending account wasn't matched", () => {
    expect(
      describeQrCheckNote({
        isVerified: false,
        qrCheckStatus: "NEEDS_REVIEW",
        qrCheckReason: "NAME_DIFFERS",
      }),
    ).toBe(QR_CHECK_REASON_NOTE.NAME_DIFFERS);
  });

  it("says a pending account was added before QR checks", () => {
    expect(
      describeQrCheckNote({ isVerified: false, qrCheckStatus: "NOT_CHECKED", qrCheckReason: null }),
    ).toBe(QR_NOT_CHECKED_NOTE);
  });

  it("shows nothing once the account is verified", () => {
    expect(
      describeQrCheckNote({
        isVerified: true,
        qrCheckStatus: "NEEDS_REVIEW",
        qrCheckReason: "NAME_DIFFERS",
      }),
    ).toBeNull();
  });

  it("shows nothing for a pending account with no reason", () => {
    expect(
      describeQrCheckNote({
        isVerified: false,
        qrCheckStatus: "NEEDS_REVIEW",
        qrCheckReason: null,
      }),
    ).toBeNull();
  });
});

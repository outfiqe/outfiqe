# Bank QR Verification

## Purpose

Reads the bank QR photo that comes with every new bank account and compares it with the details
the person typed. If the QR carries the same holder name and account number, the account is
verified straight away. If the QR plainly shows a different account, the account is refused. In
every other case the account is saved and waits for an admin, the same as before. Used by both
`bank-accounts` (creators) and `brand-bank-accounts` (brands).

## Structure

- `bank-qr-verification.routes.ts`: `POST /preview` (signed in, rate limited per user). The form
  calls it right after the QR photo is uploaded so it can fill in the holder name.
- `bank-qr-verification.controller.ts`: reads the validated body and calls the service.
- `bank-qr-verification.service.ts`: the entry point for other modules.
  `checkQrForNewBankAccount` runs storage read → decode → parse → match and either returns the
  check fields to save or throws a 422 `AppError`. `previewQr` returns what the form may fill in.
- `bank-qr-verification.decoder.ts`: turns image bytes into QR text with `sharp` (EXIF rotation,
  shrinking, RGBA pixels) and `jsqr`. It tries a few passes (full size, higher contrast, smaller)
  and stops at the first one that finds a code.
- `bank-qr-verification.emv-parser.ts`: parses NepalQR / EMVCo text (two-digit tag, two-digit
  length, value), including the nested account templates in tags 26–51, and checks the CRC-16
  in tag 63.
- `bank-qr-verification.matcher.ts`: the match rules below.
- `bank-qr-verification.constants.ts`: EMV tags, CRC values, decode passes, the confirmed field
  map, and the rejection error codes and messages.
- `bank-qr-verification.types.ts` / `bank-qr-verification.schemas.ts`: shapes and the preview body.
- Tests sit beside each file. Shared test helpers: `src/testing/bank-qr-test-codes.ts` builds
  valid NepalQR text and QR images, and `src/testing/integration/bank-qr-fixtures.ts` uploads them
  to storage.

## Funnel

**User-facing:** the person uploads a photo or screenshot of their bank QR in the add bank account
form. The form reads it at once and fills in the holder name if that field is still empty. On
submit, one of three things happens:

- The name and number match, so the account shows as **Verified**.
- The QR shows a different account number or bank, so the form shows an error and nothing is saved.
- Anything else, so the account is saved and waits for an admin, who sees why it wasn't matched.

**Technical:**

- Preview: `bank-qr-verification.routes.ts` → controller → `previewQr`.
- On create: `bank-account.service.ts` / `brand-bank-account.service.ts` call
  `checkQrForNewBankAccount` before their create transaction, then save its result with the new row.
- In both cases: `storage.keyFromPublicUrl` → `storage.read` → `decodeQrTextFromImage` →
  `parseEmvPayload` → `matchQrPayloadAgainstTypedDetails`.

| Outcome       | When                                                                                                                                               | Result                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Refused (422) | No QR code found in the photo                                                                                                                      | `BANK_QR_NOT_FOUND`                                         |
| Refused (422) | A confirmed account number or bank code field differs from what was typed                                                                          | `BANK_QR_ACCOUNT_NUMBER_MISMATCH` / `BANK_QR_BANK_MISMATCH` |
| Refused (422) | The image url isn't one of our uploads, or the file is gone                                                                                        | `BANK_QR_IMAGE_NOT_UPLOADED`                                |
| Matched       | Valid checksum, same holder name (word order, case, dots and commas ignored), and the typed number equals one whole field in the account templates | `MATCHED`, `isVerified`, `verificationMethod: QR_MATCH`     |
| Needs review  | Not a payment QR, bad checksum, no name, different name, number not found, or the image couldn't be read                                           | `NEEDS_REVIEW` with a `qrCheckReason`                       |

## Non-obvious rationale

- **Only our own uploads are read.** The server never fetches the submitted url. It maps the url
  back to a storage key (`storage.keyFromPublicUrl`, which accepts only a single safe path segment
  under `${API_PUBLIC_URL}/uploads/`), so there is no SSRF path.
- **Matching is exact, never a guess.** Banks place the account number in different sub-tags, and
  the layouts are not published. So the typed number only counts as found if it equals a whole
  field value, and the operator id field (sub-tag `00`) is skipped. This can't produce a false
  match. The cost is that some genuine accounts go to review instead.
- **Only confirmed fields can refuse an account.** `CONFIRMED_QR_ACCOUNT_FIELD_LOCATIONS` maps an
  operator id to the sub-tag that is known to hold the account number (and bank code). It ships
  empty, so today the engine never refuses on a contradiction, only matches or sends to review.
  Add an entry only after decoding real QRs from that bank or operator. A different holder name
  is never grounds to refuse, because merchant QRs often show a shop name rather than the legal
  account name.
- **A QR match is not proof of ownership.** EMV QR codes carry a checksum, not a signature, so
  anyone can make one with any name and number. A match replaces the admin's manual Verify click
  only. The `withdraw` module still makes an admin cross-check the first payout to every account,
  however it was verified.
- **Failures fail open to the admin, not to the user.** A storage or image-library error is logged
  and the account is saved as `NEEDS_REVIEW` / `READ_FAILED`, so a broken dependency never blocks
  someone from adding a bank account. A photo with no QR code at all is refused instead, because an
  admin couldn't verify it either and the person can fix it at once.
- **Decoded QR contents are never stored**, since they include the full account number in plain
  text. Only the check status, reason and time are saved.

## Follow-ups

- Decode three to five real QRs (different banks, Fonepay, NepalPay) and add their operator ids and
  account-number/bank-code sub-tags to `CONFIRMED_QR_ACCOUNT_FIELD_LOCATIONS`, with the samples
  (account numbers swapped for fake ones) as test fixtures. Until then, preview can fill in the
  name but not the account number, and no account is refused for a contradiction.

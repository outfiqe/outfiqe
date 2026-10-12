# Bank QR Verification

## Purpose

Reads the bank QR photo that comes with every new bank account and compares it with the details
the person typed:

- If the QR carries the same holder name, account number and bank, the account is verified
  straight away.
- If the QR plainly shows a different account or bank, the account is refused.
- In every other case the account is saved and waits for an admin, the same as before.

Used by both `bank-accounts` (creators) and `brand-bank-accounts` (brands).

## Structure

- `bank-qr-verification.routes.ts`: `POST /preview` (signed in, rate limited per user). The form
  calls it right after the QR photo is uploaded so it can fill in the holder name and account
  number.
- `bank-qr-verification.controller.ts`: reads the validated body and calls the service.
- `bank-qr-verification.service.ts`: the entry point for other modules.
  - `checkQrForNewBankAccount` runs storage read → decode → read the format → match. It either
    returns the check fields to save or throws a 422 `AppError`.
  - `previewQr` returns what the form may fill in.
- `bank-qr-verification.decoder.ts`: turns image bytes into QR text with `sharp` (EXIF rotation,
  shrinking, RGBA pixels) and `jsqr`. It tries a few passes (full size, higher contrast, smaller)
  and stops at the first one that finds a code.
- `bank-qr-verification.reader.ts`: `readBankQr` works out which of the two formats below the QR
  text is in, and parses it.
- `bank-qr-verification.account-json-parser.ts`: parses the bank account QR that Nepali mobile
  banking apps show, plain JSON such as
  `{"bankCode":"GLBBNPKA","accountName":"RAM SHARMA","accountNumber":"00107010000001"}`.
  `bankCode` is the bank's SWIFT code.
- `bank-qr-verification.emv-parser.ts`: parses NepalQR / EMVCo payment QR text (two-digit tag,
  two-digit length, value), including the nested account templates in tags 26–51, and checks the
  CRC-16 in tag 63.
- `bank-qr-verification.matcher.ts`: the match rules below, one set per format.
  `matchBankQrAgainstTypedDetails` picks the right set.
- `bank-qr-verification.utils.ts`: `toBankAccountQrCheckFields` turns a check result into the
  columns both bank modules save (a match also sets `isVerified`, `verifiedAt` and
  `verificationMethod: QR_MATCH`).
- `bank-qr-verification.constants.ts`: the formats, EMV tags, CRC values, decode passes, the
  confirmed EMV field map, and the rejection error codes and messages.
- `bank-qr-verification.types.ts` / `bank-qr-verification.schemas.ts`: shapes and the preview body.
- Tests sit beside each file. Shared test helpers:
  - `src/testing/bank-qr-test-codes.ts` builds valid QR text in both formats, and QR images.
  - `src/testing/integration/bank-qr-fixtures.ts` uploads them to storage.

## Funnel

**User-facing:** the person uploads a photo or screenshot of their bank QR in the add bank account
form. The form reads it at once and fills in the holder name and account number if those fields
are still empty. On submit, one of three things happens:

- The name, number and bank match, so the account shows as **Verified**.
- The QR shows a different account number or bank, so the form shows an error and nothing is saved.
- Anything else, so the account is saved and waits for an admin, who sees why it wasn't matched.

**Technical:**

- Preview: `bank-qr-verification.routes.ts` → controller → `previewQr`.
- On create: `bank-account.service.ts` / `brand-bank-account.service.ts` call
  `checkQrForNewBankAccount` with the typed details and the picked bank's `code` and `swiftCode`,
  before their create transaction. They then save its result with the new row.
- In both cases: `storage.keyFromPublicUrl` → `storage.read` → `decodeQrTextFromImage` →
  `readBankQr` → `matchBankQrAgainstTypedDetails`. For a JSON QR,
  `nepalBankService.listKnownSwiftCodes` is loaded too.

**Bank account JSON QR** (what bank apps show, for example Global IME's "My QR"):

| Outcome       | When                                                                                                               | Result                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Refused (422) | The QR's account number differs from the typed one                                                                 | `BANK_QR_ACCOUNT_NUMBER_MISMATCH`                       |
| Refused (422) | The QR's `bankCode` is another bank's known SWIFT code                                                             | `BANK_QR_BANK_MISMATCH`                                 |
| Needs review  | The holder name differs                                                                                            | `NAME_DIFFERS`                                          |
| Needs review  | The QR has no `bankCode`, an unknown one, or the picked bank has no SWIFT code                                     | `BANK_NOT_CONFIRMED`                                    |
| Matched       | Same number, same name (word order, case, dots and commas ignored), and `bankCode` is the picked bank's SWIFT code | `MATCHED`, `isVerified`, `verificationMethod: QR_MATCH` |

**EMV payment QR** (Fonepay / NepalPay merchant style):

| Outcome       | When                                                                                                   | Result                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| Refused (422) | A confirmed account number or bank code field differs from what was typed                              | `BANK_QR_ACCOUNT_NUMBER_MISMATCH` / `BANK_QR_BANK_MISMATCH` |
| Matched       | Valid checksum, same holder name, and the typed number equals one whole field in the account templates | `MATCHED`, `isVerified`, `verificationMethod: QR_MATCH`     |
| Needs review  | Bad checksum, no name, different name, or number not found                                             | `NEEDS_REVIEW` with a `qrCheckReason`                       |

**Any QR:**

| Outcome       | When                                                        | Result                       |
| ------------- | ----------------------------------------------------------- | ---------------------------- |
| Refused (422) | No QR code found in the photo                               | `BANK_QR_NOT_FOUND`          |
| Refused (422) | The image url isn't one of our uploads, or the file is gone | `BANK_QR_IMAGE_NOT_UPLOADED` |
| Needs review  | The QR is in neither format                                 | `NOT_PAYMENT_QR`             |
| Needs review  | The image couldn't be read                                  | `READ_FAILED`                |

## Non-obvious rationale

- **Only our own uploads are read.** The server never fetches the submitted url. It maps the url
  back to a storage key (`storage.keyFromPublicUrl`, which accepts only a single safe path segment
  under `${API_PUBLIC_URL}/uploads/`), so there is no SSRF path.
- **The JSON QR is the one people actually have.** A real Global IME "My QR" turned out to be
  plain JSON with labelled fields, not an EMV payment QR. Because every field is named, a
  different account number is a real contradiction and is refused. The bank is confirmed by
  comparing its SWIFT code with the picked bank's `NepalBank.swiftCode`.
- **The bank must be confirmed before a JSON QR can match.** Admins key payouts in by bank and
  account number, so a right number at the wrong bank would send money astray. A QR that names
  another bank we know is refused. A bank we can't confirm (no code, an unknown code, or a picked
  bank without a SWIFT code) goes to review rather than being refused. That way a gap in our
  SWIFT list never blocks a real account. Codes are compared on their first 8 characters, so
  `GLBBNPKAXXX` and `GLBBNPKA` are the same bank.
- **EMV matching is exact, never a guess.** Banks place the account number in different EMV
  sub-tags, and the layouts are not published. So the typed number only counts as found if it
  equals a whole field value, and the operator id field (sub-tag `00`) is skipped. This can't
  produce a false match. The cost is that some genuine accounts go to review instead.
- **Only confirmed EMV fields can refuse an account.** `CONFIRMED_QR_ACCOUNT_FIELD_LOCATIONS` maps
  an operator id to the sub-tag known to hold the account number (and bank code). It ships empty,
  because no real EMV bank QR sample has been seen yet. A different holder name is never grounds
  to refuse in either format, because merchant QRs often show a shop name rather than the legal
  account name.
- **A QR match is not proof of ownership.** Neither format is signed (EMV has only a checksum,
  JSON has nothing), so anyone can make a QR with any name and number. A match replaces the
  admin's manual Verify click only. The `withdraw` module still makes an admin cross-check the
  first payout to every account, however it was verified.
- **Failures fail open to the admin, not to the user.** A storage or image-library error is logged
  and the account is saved as `NEEDS_REVIEW` / `READ_FAILED`, so a broken dependency never blocks
  someone from adding a bank account. A photo with no QR code at all is refused instead, because an
  admin couldn't verify it either and the person can fix it at once.
- **Decoded QR contents are never stored**, since they include the full account number in plain
  text. Only the check status, reason and time are saved.

## Follow-ups

- When a real EMV bank QR (Fonepay / NepalPay) turns up, add its operator id and
  account-number/bank-code sub-tags to `CONFIRMED_QR_ACCOUNT_FIELD_LOCATIONS`, with the sample
  (account number swapped for a fake one) as a test fixture.
- Development banks and finance companies have no `swiftCode` yet (see `nepal-banks/README.md`),
  so JSON QRs for those banks go to review as `BANK_NOT_CONFIRMED`. Add their codes once confirmed.

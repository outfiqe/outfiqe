# uploads

## Purpose

The simple, synchronous image-upload endpoint used across the web app for post photos, product
images, brand logos/banners, creator avatars, review photos, and chat attachments. It stores the
file as-is through the configured `storage` driver and returns its URL — no resizing, no
background pipeline. Heavy processing lives in `image-processing` (async, `packages/image-pipeline`).

## Structure

- `upload.routes.ts` — `POST /` (auth-required). Configures the multer instance: memory storage,
  **5 MB per file**, up to **6 files**, JPEG/PNG/WebP only. `handleUpload` runs multer and
  translates its failures into a client-facing `AppError` (`INVALID_FILE`, `422`) —
  `messageForMulterError` maps each `MulterError.code` to a message that names the actual limit
  instead of passing multer's raw `"File too large"` string through.
- `upload.controller.ts` — guards against an empty `req.files`, then calls the service.
- `upload.service.ts` — maps each `Express.Multer.File` to a `storage.upload` call.

## Funnel

**User-facing:** a person picks image(s) in any upload control (post composer, product form,
avatar/banner uploader, review form, message composer); on submit the files POST here and the
returned URLs are saved with whatever record is being created. A file that's too large or the
wrong type comes back as an inline error naming the requirement.

**Technical:** `upload.routes.ts` (`handleUpload` → multer) → `upload.controller.ts` →
`upload.service.ts` → `#storage/storage.js` → the configured driver (local disk / object store).

## Non-obvious rationale

- **multer's own error strings never reach the client.** `LIMIT_FILE_SIZE` → `"File too large"`,
  `LIMIT_FILE_COUNT` → `"Too many files"` — neither says what the limit is. `messageForMulterError`
  restates them ("Each image must be 5 MB or smaller.", "You can upload at most 6 images at
  once.") so the web layer, which surfaces `AppError.message` verbatim via `getErrorMessage`, has
  something actionable to show.

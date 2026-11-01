# uploads

## Purpose

The image-upload endpoints used across the web app for post photos, product images, brand
logos/banners, creator avatars, review photos, and chat attachments. `POST /` stores the file
as-is through the configured `storage` driver and returns its URL — no resizing, no background
pipeline. `POST /pipeline` does the same _and_ also runs each file through `image-processing`
(async, `packages/image-pipeline`), returning an `assetId` per file so the caller can persist a
link to the eventual multi-format variants.

## Structure

- `upload.routes.ts` — `POST /` and `POST /pipeline` (both auth-required). Shares one multer
  instance: memory storage, **5 MB per file**, up to **6 files**, JPEG/PNG/WebP only. `handleUpload`
  runs multer and translates its failures into a client-facing `AppError` (`INVALID_FILE`, `422`) —
  `messageForMulterError` maps each `MulterError.code` to a message that names the actual limit
  instead of passing multer's raw `"File too large"` string through. `/pipeline` adds a per-user
  rate limit and an ingest-queue back-pressure check (both reused from `image-processing`) ahead of
  the upload.
- `upload.controller.ts` — guards against an empty `req.files`, then calls the matching service
  method (`upload` → `uploadFiles`, `uploadThroughPipeline` → `uploadFilesThroughPipeline`).
- `upload.service.ts` — both methods first re-check each buffer's real type with
  `detectImageMimeType` (`#lib/image-type.utils.js`) and reject anything that is not a genuine
  JPEG/PNG/WebP (`INVALID_FILE`, `422`). `uploadFiles` then maps each `Express.Multer.File` to a
  `storage.upload` call, passing the **detected** mime type; `uploadFilesThroughPipeline`
  additionally writes the buffer to the pipeline's temp store (its key extension also comes from the
  detected type) and calls `imageProcessingService.submitUploadForOwner`, returning
  `{ url, key, assetId }` per file.

## Funnel

**User-facing:** a person picks image(s) in any upload control (post composer, product form,
avatar/banner uploader, review form, message composer); on submit the files POST here and the
returned URLs are saved with whatever record is being created. A file that's too large or the
wrong type comes back as an inline error naming the requirement.

**Technical:** `upload.routes.ts` (`handleUpload` → multer) → `upload.controller.ts` →
`upload.service.ts` → `#storage/storage.js` → the configured driver (local disk / object store).
For `/pipeline`, the service also hands the buffer to `image-processing` (temp store +
`submitUploadForOwner` → BullMQ), and the domain create/update endpoint the caller hits next
persists the returned `assetId` on its `ProductImage` / `CreatorLookImage` row.

## Non-obvious rationale

- **multer's own error strings never reach the client.** `LIMIT_FILE_SIZE` → `"File too large"`,
  `LIMIT_FILE_COUNT` → `"Too many files"` — neither says what the limit is. `messageForMulterError`
  restates them ("Each image must be 5 MB or smaller.", "You can upload at most 6 images at
  once.") so the web layer, which surfaces `AppError.message` verbatim via `getErrorMessage`, has
  something actionable to show.
- **The client-supplied content type and filename are never trusted for what the file _is_.** The
  multer `fileFilter` checks the declared mime type (`ALLOWED_IMAGE_MIME_TYPES`) only as a cheap
  early gate; the real decision is made in `upload.service.ts` from the file's magic bytes, and both
  the stored key's extension and the served `Content-Type` are derived from that detected type (via
  `imageExtensionForMimeType`), not from the original filename. Without this, a request could send
  `content-type: image/png` with a `.html` filename and HTML bytes and have it stored as `*.html`
  and served inline as `text/html` from the API origin — stored XSS on a trusted domain (QA-014).
  Deriving the extension from the detected type also defuses image/HTML polyglots: a real-PNG-plus-
  HTML file is stored and served as a `.png` image, not as a page.
- **HEIC never reaches this endpoint.** `ALLOWED_IMAGE_MIME_TYPES` is JPEG/PNG/WebP only — `sharp`'s
  prebuilt libvips can't decode HEIC (no HEVC codec). iPhone photos are converted to JPEG in the
  browser before upload (`apps/web/src/shared/lib/heicImage.ts`), so the server only ever sees a
  format it can serve.
- **`/pipeline` stores the original twice, on purpose.** `storage.upload` writes the permanent
  original that becomes the domain row's `imageUrl` (a stable, immediately-usable URL while
  variants are still processing); the pipeline separately keeps its own content-addressed copy of
  the original as an input to resize/optimize. One extra original on disk per processed image is
  the cost of not blocking the create flow on the pipeline and not depending on pipeline internals
  for the fallback URL.
- **`/pipeline` fails the whole request if the ingest queue is saturated**, rather than silently
  falling back to a plain upload — a caller that asked for pipeline processing and got a plain
  upload would store no `assetId` and never get variants, with no signal that anything was lost.

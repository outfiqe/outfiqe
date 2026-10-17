# rider

## Purpose

The phone app for Outfiqe riders. A rider sees the pickup visits hub staff gave them, goes to the
brand, scans each bag's pickup slip and the sticker they put on it, and finishes or marks the visit
wasted. Scans made without signal are kept on the phone and sent later.

## Structure

- `api/riderApi.ts` — the rider endpoints under `/api/logistics/rider/tasks`: list open visits,
  get one, collect a bag (sends the scan's id as the `Idempotency-Key`), mark wasted, finish.
- `api/riderSchemas.ts` — Zod schemas for a visit and its bags.
- `context/PendingScansContext.tsx` — `PendingScansProvider` / `usePendingScans`: the scan queue
  (see the funnel). Mounted once by `app/(rider)/rider/layout.tsx`.
- `utils/pendingScanQueue.ts` — reads and writes the queued scans in IndexedDB (`idb-keyval`),
  under a key per rider: `outfiqe-rider-pending-scans:<userId>`.
- `utils/riderTask.utils.ts` — short order ids, collected counts, the map link, wording.
- `constants/` — query keys, visit status labels, the queue's storage key, retry interval and the
  error codes that mean "try again later" (`RETRYABLE_SCAN_ERROR_CODES`).
- `hooks/` — `useRiderTasks`, `useRiderTask`, `useMarkVisitWasted`, `useFinishVisit`,
  `useDropOffReturn` (`POST /api/logistics/rider/tasks/:id/return-drop-offs`).
- `components/`:
  - `RiderShell` — the slim mobile header with the rider's name and `RiderLogoutButton`.
  - `RiderLogoutButton` — warns before signing out while scans are still waiting.
  - `RiderTasksPage` — today's open visits (`RiderTaskCard`), with loading, error and empty states.
  - `RiderVisitPage` — one visit: address, call and directions buttons, the returns to hand back
    (`ReturnStopsSection`), the bags to collect, the scan flow, and the "nothing to collect" /
    "leave without the rest" actions. Each stop says whether it is a collection or a return
    (`direction`); returns not handed over go back to the hub when the visit ends.
  - `ReturnStopsSection` — each return's order, unit count and why it came back, with
    **Handed to the brand** (no scan: the brand checks and confirms the items themselves).
  - `CollectScanFlow` — step 1 scans the pickup slip, step 2 the bag sticker, using the shared
    `QrScanner` from `@outfiqe/components` (camera, or typing the code).
  - `PendingScansList` — scans not sent yet, with "Try again" and "Remove" for refused ones.
  - `WastedVisitModal` — the reason for a wasted visit.
  - `RiderInviteUnavailable` — the sign-up page's message for a bad invite link.
- Routes: `app/(rider)/rider/page.tsx` (visits), `app/(rider)/rider/visits/[taskId]/page.tsx`
  (one visit), `app/(rider)/rider/layout.tsx`, and `app/(rider)/requireRiderSession.ts` (signed-in
  `RIDER` only; anyone else goes to their own home).

## Funnel

**User-facing:**

1. The rider signs in and lands on `/rider` (see `getDefaultRouteForUser`).
2. They open a visit, call the shop or get directions, and go there.
3. For each bag: scan the brand's pickup slip, stick a new bag sticker on, scan the sticker. A toast
   says "Bag collected", or "No signal. Scan saved" when offline, or the hub's reason when refused.
4. They finish the visit, or mark it wasted if nothing was ready.

**Technical, for a scan:** `CollectScanFlow` → `usePendingScans().queueCollectScan` →
`addPendingScan` (IndexedDB) → `riderApi.collectBag` → `POST /logistics/rider/tasks/:id/collect-scans`.

- Sent → the scan is removed from the queue and the visit queries refetch.
- Network failure, rate limit or "already processing" → it stays `waiting` and is resent on the
  `online` event, every 30 seconds, and when the app next opens.
- Any other API error → it is marked `failed` with the server's message, shown in
  `PendingScansList` for the rider to retry or remove.

## Non-obvious rationale

- **The scan queue is separate from the PWA's offline action queue** (`features/pwa/offline`).
  That queue is shared by everyone on the device, drops actions that fail, and is cleared on
  logout. A rider's scan is proof a bag changed hands, so it must survive logout, never vanish on
  an error, and never be sent under another rider's account. Hence one storage key per rider, a
  visible failed state, and the logout warning.
- **Each scan gets its id once, when it is first stored**, and every resend uses that id as the
  `Idempotency-Key`. A scan that reached the server but whose answer was lost is therefore never
  recorded twice. The API also treats a repeat of the same pickup code and sticker as success.
- **The phone's scan time is sent, not the send time,** so a bag collected offline at 11:05 and
  sent at 13:00 is recorded at 11:05. The API caps it (no future times, nothing older than 24
  hours).
- **The camera is only allowed under `/rider` and `/admin`.** `next.config.ts` sets
  `Permissions-Policy: camera=(self)` for those paths and `camera=()` everywhere else.
- **The pickup code check on the phone is format-only.** The rider never sees which codes belong
  to the visit; the API decides, so a wrong bag is refused even offline-then-synced.

# content-browser

## Purpose

Direct moderation for creator posts and comments: search or browse posts newest-first, expand a
post's comments (and their replies) inline, and delete a post or an individual comment/reply on
the spot. Unlike `content-reports`, nothing here waits on a viewer report first — a moderator can
act on anything they happen to spot.

## Structure

- `schemas.ts` — zod shapes for the admin post list, comment list, and reply list responses.
- `api.ts` — `contentBrowserApi`: `listLooks` (`GET /creator-looks/admin`, admin-only),
  `listComments`/`listReplies` (the same public, already-existing
  `GET /creator-looks/:lookId/comments[/​:commentId/replies]` endpoints the storefront's own post
  detail view uses), and `deleteLook`/`deleteComment` (the existing
  `DELETE /creator-looks/:lookId[/​comments/:commentId]` endpoints).
- `hooks/useInfiniteAdminLooks.ts`, `hooks/useInfiniteLookComments.ts`,
  `hooks/useInfiniteLookReplies.ts` — cursor pagination via the shared `useInfiniteCursorPage`
  (`@outfiqe/hooks`), one per list.
- `ContentBrowserPage.tsx` — debounced search box, the post list, and the two `ConfirmModal`
  instances (delete post / delete comment) shared with the rest of the admin app.
- `PostCommentsPanel.tsx` — the comment list for one expanded post: each root comment shows its
  `previewReplies` (the same small preview the storefront shows) with a "View N more replies"
  expander that switches to the fully paginated `useInfiniteLookReplies` once clicked, so opening a
  post never fetches more than a handful of replies unless a moderator actually asks for the rest.

## Funnel

**User-facing:** an admin opens Browse posts, optionally types a caption or `@handle` to narrow
the list, and sees posts newest-first with the creator's handle, a prior-removal count if they have
one, and engagement counts. "Comments (N)" expands that post's comments inline; "Delete" on a
post/comment/reply opens a confirmation modal before anything is removed.

**Technical:** the post list hits a new admin-only endpoint
(`GET /api/creator-looks/admin`, gated by `platform:content:moderate` via `requirePlatformRole`)
since no existing endpoint returns posts newest-first without a search term or lets an admin filter
by creator handle. Comments and replies reuse the storefront's own public list endpoints — no new
backend surface needed there. Deleting anything calls the same `creatorLookService.remove`/
`removeComment` code path the storefront's own owner-initiated delete and the `content-reports`
queue's "Remove content" resolution both use, so audit logging
(`PLATFORM_AUDIT_ACTION.CREATOR_LOOK_REMOVED_BY_ADMIN`/`_COMMENT_REMOVED_BY_ADMIN`) and the
author's `contentFlagCount` bump happen the same way regardless of which surface a moderator used.

## Non-obvious rationale

**Search matches caption, creator handle, or creator name — all in the query itself
(`creatorLook.repository.ts`'s `adminListLooks`), via the caption's existing trigram index.** This
is deliberately not the same `search_creator_looks` Postgres function the public search box uses:
that function ranks by relevance for a viewer looking for looks to browse, while a moderator
usually already knows who or what they're looking for and wants a plain newest-first list they can
still narrow — a simpler `ILIKE`-backed filter fits that better than reusing the relevance ranker.

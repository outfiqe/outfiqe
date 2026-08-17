# creator-profile

## Purpose

Renders a creator's public profile — avatar, stats, follow/edit-profile, and their post grid. Used both for the public `/creator/[handle]` page and the dashboard's `/dashboard/profile/[handle]` route (same `CreatorProfile` component, gated by `isOwnProfile`).

## Structure

- `components/CreatorProfile.tsx` — the page: header/stats, follow or edit-profile action, post grid, and (when `isOwnProfile`) the add/edit/delete post affordances.
- `components/CreatorPostThumbnail.tsx` — one grid tile; shows a bottom gradient + truncated caption over the image when the post has one, and renders `PostActionsMenu` on top when viewing your own profile. Clicking anywhere on the tile opens `explore`'s `PostDetailModal` for the full post.
- `components/PostActionsMenu.tsx` — the 3-dot menu (Edit / Delete) overlaid on a post thumbnail.
- `components/CreatorPostGridSkeleton.tsx`, `CreatorProfilePageSkeleton.tsx` — loading states.
- `api/creatorProfileApi.ts`, `creatorProfileSchemas.ts` — profile + paginated posts fetch.
- `hooks/useInfiniteCreatorLooks.ts` — infinite-scroll post grid data.

## Funnel

**User-facing:** anyone can view a creator's profile and browse their posts. If it's your own profile, a floating "Post" button (bottom-right, reused from `explore`) opens the create-post modal, and each of your post tiles has a 3-dot menu to edit its caption/tags or delete it (with a confirm step).

**Technical:** `CreatorProfile` fetches posts via `useInfiniteCreatorLooks` → `creatorProfileApi.listLooks` → `GET /creators/by-handle/:handle/looks` (feed-shaped posts, no auth required). Posting/editing/deleting are handled by `creator-dashboard`'s `AddPostButton`/`PostModal`/`EditPostModal`/`useDeleteLook` (cross-feature import — this feature owns display, `creator-dashboard` owns mutation). A successful edit/delete invalidates the `creator-looks` query family, so the grid refetches; delete also decrements the local `postsCount` immediately since that stat isn't part of the paginated post list.

## Non-obvious rationale

Post management used to live in a separate `/dashboard/posts` page with no edit/delete. It was folded into the profile grid because the profile already displays the same posts — see `creator-dashboard`'s README for the full reasoning.

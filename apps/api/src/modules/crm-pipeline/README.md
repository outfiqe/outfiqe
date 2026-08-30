# CRM Pipeline

## Purpose

Configurable sales pipeline for a CRM tenant: an ordered set of `PipelineStage`s and `Deal`s that
move between them. A deal's subject is a **Partner** creator (from `crm-relationships`), so a deal
can only ever be opened against a creator who actually has a relationship with the tenant's brand.

## Structure

- `crm-pipeline.constants.ts` — `DEFAULT_PIPELINE_STAGES` (the Lead → Contacted → Negotiating →
  Won → Lost preset, reused by both the migration backfill, `crm-access`'s `createOrganization`,
  and `seed-crm.ts`), and the stage/deal count + page-size bounds.
- `crm-pipeline.types.ts` — `PipelineStageRecord`, `DealRecord`, `DealWithRelations` (deal + stage
  name + partner name/handle + owner name), and the create/update input shapes.
- `crm-pipeline.repository.ts` — Prisma queries scoped by `organizationId`; `reorderStages` runs
  every `sortOrder` update in one `prisma.$transaction`.
- `crm-pipeline.service.ts` — the rules: stage name uniqueness (→ 409), a stage can't be both won
  and lost, a pipeline keeps at least `MIN_PIPELINE_STAGES`, a stage with deals can't be deleted,
  a reorder must be a full permutation of the current stage ids, and a deal's `partnerCreatorId`
  is validated against `crmRelationshipsService.isPartner`. Moving a deal into a won/lost stage
  sets `status` + `closedAt`; moving it back out clears them.
- `crm-pipeline.controller.ts` / `crm-pipeline.routes.ts` — routes under `/api/crm/pipeline/stages`
  and `/api/crm/deals`, mounted at `/api/crm` before `crm-access`. Each runs
  `resolveTenant` → `requireAuth` → `requireAdvancedCrmFeatures` → `requirePermission`
  (`pipeline:read` / `pipeline:configure` / `deals:read|write|delete`).
- `crm-pipeline.schemas.ts` — Zod validation.
- `crm-pipeline.integration.test.ts` — default-stage exposure, name collisions, atomic reorder,
  partial-reorder rejection, delete-guard, the deal won-stage lifecycle, the non-partner
  rejection, and tenant isolation.

## Funnel

**User-facing:** a member with `pipeline:read` opens the Pipeline tab and sees a Kanban board of
stages. `deals:write` adds a deal (picking a partner and a stage) and drags/selects it between
columns; `pipeline:configure` renames, reorders, adds, and removes stages.

**Technical:** `crm-pipeline.routes.ts` → tenant/auth/advanced-features/permission chain →
`crm-pipeline.controller.ts` → `crm-pipeline.service.ts` → `crm-pipeline.repository.ts` → Postgres.

## Non-obvious rationale

- **Won/Lost is a property of the stage, not the deal.** A deal's `status`/`closedAt` are derived:
  the service reads the target stage's `isWon`/`isLost` on every create and stage-move and stamps
  the deal accordingly, so there's no separate "close this deal" action to keep in sync with the
  board position. Moving a closed deal back to an open stage reopens it.
- **`partnerCreatorId` is validated live against `crm-relationships`, never trusted from the
  client.** `crmRelationshipsService.isPartner(organization, creatorId)` runs the same
  link/look-tag/attributed-sale check the Partners list uses; a deal against anyone else is a
  `400 NOT_A_PARTNER`. This is why `crm-pipeline` depends on `crm-relationships` (one direction —
  `crm-relationships` never imports `crm-pipeline`).
- **Reorder is a full-permutation replace, done in one transaction.** The client sends the entire
  ordered list of stage ids; the service rejects anything that isn't exactly the current set with
  no duplicates, then `prisma.$transaction`s one `sortOrder` update per stage. A partial list or a
  stray id can't half-apply.
- **Default stages are seeded three ways for one preset.** `DEFAULT_PIPELINE_STAGES` is the single
  source: a migration backfills it for every organization that already existed,
  `crm-access`'s `createOrganization` transaction creates it for every new tenant, and
  `seed-crm.ts` creates it for the demo orgs (which bypass `createOrganization`).

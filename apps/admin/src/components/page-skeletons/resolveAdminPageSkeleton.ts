import type { AdminPageSkeletonSpec } from "./adminPageSkeleton.types";
import { ADMIN_PAGE_SKELETON_SPECS } from "./adminPageSkeletonSpecs";
import { normalizePathname } from "./resolvePageSkeletonKind";

const SPEC_BY_PATH = new Map(Object.entries(ADMIN_PAGE_SKELETON_SPECS));

export const resolveAdminPageSkeletonSpec = (pathname: string): AdminPageSkeletonSpec | null =>
  SPEC_BY_PATH.get(normalizePathname(pathname)) ?? null;

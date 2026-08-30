export const CRM_SUBJECT_TYPES = ["partner", "customer", "deal"] as const;

export type CrmSubjectType = (typeof CRM_SUBJECT_TYPES)[number];

export const DEFAULT_TIMELINE_LIMIT = 30;

export const MAX_TIMELINE_LIMIT = 100;

export const DEFAULT_TASK_PAGE_SIZE = 50;

export const MAX_TASK_PAGE_SIZE = 200;

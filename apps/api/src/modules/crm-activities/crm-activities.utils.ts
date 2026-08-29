import type { SubjectRef } from "./crm-activities.types.js";

export type SubjectColumns = {
  partnerCreatorId: string | null;
  customerUserId: string | null;
  dealId: string | null;
};

export const subjectToColumns = (subject: SubjectRef): SubjectColumns => ({
  partnerCreatorId: subject.subjectType === "partner" ? subject.subjectId : null,
  customerUserId: subject.subjectType === "customer" ? subject.subjectId : null,
  dealId: subject.subjectType === "deal" ? subject.subjectId : null,
});

export const subjectWhere = (subject: SubjectRef): SubjectColumns => subjectToColumns(subject);

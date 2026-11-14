export const RIDER_EMPLOYMENT_TYPES = ["EMPLOYEE", "CONTRACTOR"] as const;

export type RiderEmploymentType = (typeof RIDER_EMPLOYMENT_TYPES)[number];

export const EMPLOYEE_RIDER: RiderEmploymentType = "EMPLOYEE";

export const CONTRACTOR_RIDER: RiderEmploymentType = "CONTRACTOR";

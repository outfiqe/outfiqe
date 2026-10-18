import {
  type Rider,
  RIDER_EMPLOYMENT_TYPE,
  RIDER_STATUS,
  type RiderStatus,
} from "../api/ridersSchemas";

export type RiderStatusAction = { label: string; nextStatus: RiderStatus };

const ACTIVATE_ACTION: RiderStatusAction = { label: "Activate", nextStatus: RIDER_STATUS.ACTIVE };
const SUSPEND_ACTION: RiderStatusAction = { label: "Suspend", nextStatus: RIDER_STATUS.SUSPENDED };
const OFFBOARD_ACTION: RiderStatusAction = {
  label: "Offboard",
  nextStatus: RIDER_STATUS.OFFBOARDED,
};

export const needsIdentityCheck = (rider: Pick<Rider, "employmentType" | "identityVerifiedAt">) =>
  rider.employmentType === RIDER_EMPLOYMENT_TYPE.CONTRACTOR && rider.identityVerifiedAt === null;

export const listRiderStatusActions = (
  rider: Pick<Rider, "status" | "employmentType" | "identityVerifiedAt">,
): RiderStatusAction[] => {
  switch (rider.status) {
    case RIDER_STATUS.PENDING_VERIFICATION:
      return needsIdentityCheck(rider) ? [OFFBOARD_ACTION] : [ACTIVATE_ACTION, OFFBOARD_ACTION];
    case RIDER_STATUS.ACTIVE:
      return [SUSPEND_ACTION, OFFBOARD_ACTION];
    case RIDER_STATUS.SUSPENDED:
      return [ACTIVATE_ACTION, OFFBOARD_ACTION];
    case RIDER_STATUS.OFFBOARDED:
      return [];
  }
};

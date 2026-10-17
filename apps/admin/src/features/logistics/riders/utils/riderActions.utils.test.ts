import { describe, expect, it } from "vitest";

import { RIDER_EMPLOYMENT_TYPE, RIDER_STATUS } from "../api/ridersSchemas";
import { listRiderStatusActions, needsIdentityCheck } from "./riderActions.utils";

const contractorWithoutCheck = {
  employmentType: RIDER_EMPLOYMENT_TYPE.CONTRACTOR,
  identityVerifiedAt: null,
};

describe("rider actions", () => {
  it("asks for an ID check only from unchecked contractors", () => {
    expect(needsIdentityCheck(contractorWithoutCheck)).toBe(true);
    expect(
      needsIdentityCheck({
        employmentType: RIDER_EMPLOYMENT_TYPE.EMPLOYEE,
        identityVerifiedAt: null,
      }),
    ).toBe(false);
  });

  it("hides activation until a contractor's ID is checked", () => {
    expect(
      listRiderStatusActions({
        ...contractorWithoutCheck,
        status: RIDER_STATUS.PENDING_VERIFICATION,
      }),
    ).toEqual([{ label: "Offboard", nextStatus: RIDER_STATUS.OFFBOARDED }]);
    expect(
      listRiderStatusActions({
        employmentType: RIDER_EMPLOYMENT_TYPE.CONTRACTOR,
        identityVerifiedAt: "2026-10-15T08:00:00.000Z",
        status: RIDER_STATUS.PENDING_VERIFICATION,
      }).map(({ label }) => label),
    ).toEqual(["Activate", "Offboard"]);
  });

  it("offers suspend for active riders and nothing once offboarded", () => {
    const checkedEmployee = {
      employmentType: RIDER_EMPLOYMENT_TYPE.EMPLOYEE,
      identityVerifiedAt: null,
    };
    expect(
      listRiderStatusActions({ ...checkedEmployee, status: RIDER_STATUS.ACTIVE }).map(
        ({ label }) => label,
      ),
    ).toEqual(["Suspend", "Offboard"]);
    expect(
      listRiderStatusActions({ ...checkedEmployee, status: RIDER_STATUS.SUSPENDED }).map(
        ({ label }) => label,
      ),
    ).toEqual(["Activate", "Offboard"]);
    expect(listRiderStatusActions({ ...checkedEmployee, status: RIDER_STATUS.OFFBOARDED })).toEqual(
      [],
    );
  });
});

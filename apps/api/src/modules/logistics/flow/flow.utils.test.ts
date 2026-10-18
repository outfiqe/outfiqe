import { describe, expect, it } from "vitest";

import { FulfilmentMode } from "#generated/prisma/enums.js";

import { buildFulfilmentAssignments } from "./flow.utils.js";

const valleyBrandId = "brand-valley";
const pokharaBrandId = "brand-pokhara";
const noLocationBrandId = "brand-without-location";

const valleyLocation = {
  id: "location-valley",
  brandId: valleyBrandId,
  countryCode: "NP",
  cityNormalized: "lalitpur",
};
const pokharaLocation = {
  id: "location-pokhara",
  brandId: pokharaBrandId,
  countryCode: "NP",
  cityNormalized: "pokhara",
};
const hubIdByCoverageKey = new Map([["NP:lalitpur", "hub-kathmandu"]]);
const partnerCoverage = { hubIdsWithDeliveryPartner: new Set(["hub-kathmandu"]) };
const noPartnerCoverage = { hubIdsWithDeliveryPartner: new Set<string>() };

describe("buildFulfilmentAssignments", () => {
  it("sends a brand whose pickup location a hub covers through Outfiqe delivery", () => {
    expect(
      buildFulfilmentAssignments(
        [valleyBrandId],
        [valleyLocation],
        hubIdByCoverageKey,
        partnerCoverage,
      ),
    ).toEqual([
      {
        brandId: valleyBrandId,
        fulfilmentMode: FulfilmentMode.OUTFIQE_LOGISTICS,
        hubId: "hub-kathmandu",
        pickupLocationId: "location-valley",
      },
    ]);
  });

  it("keeps a brand outside every hub's pickup area shipping its own orders", () => {
    expect(
      buildFulfilmentAssignments(
        [pokharaBrandId],
        [pokharaLocation],
        hubIdByCoverageKey,
        partnerCoverage,
      ),
    ).toEqual([
      {
        brandId: pokharaBrandId,
        fulfilmentMode: FulfilmentMode.BRAND_SHIPS,
        hubId: null,
        pickupLocationId: null,
      },
    ]);
  });

  it("keeps a brand with no pickup location shipping its own orders", () => {
    const [assignment] = buildFulfilmentAssignments(
      [noLocationBrandId],
      [],
      hubIdByCoverageKey,
      partnerCoverage,
    );

    expect(assignment?.fulfilmentMode).toBe(FulfilmentMode.BRAND_SHIPS);
  });

  it("decides each brand of a mixed order separately, in the order given", () => {
    const assignments = buildFulfilmentAssignments(
      [pokharaBrandId, valleyBrandId],
      [valleyLocation, pokharaLocation],
      hubIdByCoverageKey,
      partnerCoverage,
    );

    expect(assignments.map(({ brandId, fulfilmentMode }) => [brandId, fulfilmentMode])).toEqual([
      [pokharaBrandId, FulfilmentMode.BRAND_SHIPS],
      [valleyBrandId, FulfilmentMode.OUTFIQE_LOGISTICS],
    ]);
  });

  it("keeps a covered brand shipping its own orders when no delivery partner covers the customer", () => {
    const [assignment] = buildFulfilmentAssignments(
      [valleyBrandId],
      [valleyLocation],
      hubIdByCoverageKey,
      noPartnerCoverage,
    );

    expect(assignment).toMatchObject({
      fulfilmentMode: FulfilmentMode.BRAND_SHIPS,
      hubId: null,
      pickupLocationId: null,
    });
  });
});

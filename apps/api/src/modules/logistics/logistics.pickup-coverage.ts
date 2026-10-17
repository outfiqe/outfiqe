import { prisma } from "#db/prisma.js";

const NO_HUBS = 0;

export type PickupCityKey = {
  countryCode: string;
  cityNormalized: string;
};

export type DefaultPickupLocation = PickupCityKey & {
  id: string;
  brandId: string;
};

const toCoverageKey = ({ countryCode, cityNormalized }: PickupCityKey): string =>
  `${countryCode}:${cityNormalized}`;

const groupCityNamesByCountry = (locations: readonly PickupCityKey[]): Map<string, string[]> =>
  locations.reduce((citiesByCountry, { countryCode, cityNormalized }) => {
    const countryCities = citiesByCountry.get(countryCode) ?? [];
    return citiesByCountry.set(countryCode, [...countryCities, cityNormalized]);
  }, new Map<string, string[]>());

const findHubIdsCoveringCities = async (
  countryCode: string,
  cityNormalizedNames: readonly string[],
): Promise<[string, string][]> => {
  const coveringCities = await prisma.deliveryZoneCity.findMany({
    where: {
      countryCode,
      cityNormalized: { in: [...cityNormalizedNames] },
      zone: { hubPickupZones: { some: { hub: { isActive: true } } } },
    },
    select: {
      cityNormalized: true,
      zone: {
        select: {
          hubPickupZones: {
            where: { hub: { isActive: true } },
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { hubId: true },
          },
        },
      },
    },
  });

  return coveringCities.flatMap(({ cityNormalized, zone }) =>
    zone.hubPickupZones.map(({ hubId }): [string, string] => [
      toCoverageKey({ countryCode, cityNormalized }),
      hubId,
    ]),
  );
};

export const logisticsPickupCoverage = {
  toCoverageKey,

  async findHubIdsByCoverageKey(locations: readonly PickupCityKey[]): Promise<Map<string, string>> {
    const coverageByCountry = await Promise.all(
      [...groupCityNamesByCountry(locations)].map(([countryCode, cityNames]) =>
        findHubIdsCoveringCities(countryCode, cityNames),
      ),
    );
    return new Map(coverageByCountry.flat());
  },

  async findHubIdsWithDeliveryPartner(params: {
    hubIds: readonly string[];
    deliveryZoneId: string;
    requiresCashOnDelivery: boolean;
  }): Promise<Set<string>> {
    if (params.hubIds.length === NO_HUBS) return new Set();
    const partnerZones = await prisma.deliveryPartnerZone.findMany({
      where: {
        hubId: { in: [...params.hubIds] },
        deliveryZoneId: params.deliveryZoneId,
        isActive: true,
        partner: {
          isActive: true,
          ...(params.requiresCashOnDelivery ? { supportsCod: true } : {}),
        },
        hub: { partnerAccounts: { some: { isActive: true } } },
      },
      distinct: ["hubId"],
      select: { hubId: true },
    });
    return new Set(partnerZones.map(({ hubId }) => hubId));
  },

  async listDefaultLocationsForBrands(
    brandIds: readonly string[],
  ): Promise<DefaultPickupLocation[]> {
    if (brandIds.length === 0) return [];
    return prisma.brandPickupLocation.findMany({
      where: { brandId: { in: [...brandIds] }, isDefault: true, isActive: true },
      select: { id: true, brandId: true, countryCode: true, cityNormalized: true },
    });
  },
};

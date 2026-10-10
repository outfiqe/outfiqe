import { BrandSearchField } from "@/components/BrandSearchField";
import type { BrandSearchResult } from "@/lib/brandsApi";

type BusinessOwnerFieldProps = {
  selectedBrandId: string | null;
  selectedBrandName: string;
  onSelect: (brand: BrandSearchResult | null) => void;
};

export const BusinessOwnerField = ({
  selectedBrandId,
  selectedBrandName,
  onSelect,
}: BusinessOwnerFieldProps) => (
  <BrandSearchField
    id="organization-owner-brand"
    label="Business"
    placeholder="Search businesses already on Outfiqe…"
    value={selectedBrandId ? { id: selectedBrandId, name: selectedBrandName } : null}
    onChange={onSelect}
    resultNoun="businesses"
    clearLabel="Clear selected business"
    inputClassName="w-64"
  />
);

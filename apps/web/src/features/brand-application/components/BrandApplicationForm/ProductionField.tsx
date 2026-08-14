import { type Control, Controller } from "react-hook-form";

import type { BrandApplicationInput } from "../../schemas/brandApplication.schema";
import { PRODUCTION_OPTIONS } from "./brandApplicationForm.constants";
import { ChipGroup } from "./ChildGroup";

type ProductionFieldProps = {
  control: Control<BrandApplicationInput>;
};

export const ProductionField = ({ control }: ProductionFieldProps) => (
  <div className="rounded-lg border-[1.5px] border-primary bg-background p-4">
    <p className="mb-2.5 text-sm font-semibold text-primary-strong">
      Do you design or make your own pieces?
    </p>
    <Controller
      control={control}
      name="makesOwnPieces"
      render={({ field }) => (
        <ChipGroup
          label="Production"
          options={PRODUCTION_OPTIONS}
          value={field.value}
          onChange={field.onChange}
        />
      )}
    />
  </div>
);

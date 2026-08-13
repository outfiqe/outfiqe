import { Controller, type Control } from "react-hook-form";

import { FormFieldError } from "@/components/FormFieldError";
import type { BrandApplicationInput } from "../../schemas/brandApplication.schema";
import { MultiChipGroup } from "./ChildGroup";
import { CATEGORY_OPTIONS } from "./brandApplicationForm.constants";

type CategoryFieldProps = {
  control: Control<BrandApplicationInput>;
  error?: string;
};

export const CategoryField = ({ control, error }: CategoryFieldProps) => (
  <div>
    <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
      Category
    </span>
    <p className="mb-2 text-xs text-muted-foreground">Select all that apply.</p>
    <Controller
      control={control}
      name="categories"
      render={({ field }) => (
        <MultiChipGroup
          label="Category"
          options={CATEGORY_OPTIONS}
          value={field.value}
          onChange={field.onChange}
        />
      )}
    />
    {error && <FormFieldError>{error}</FormFieldError>}
  </div>
);

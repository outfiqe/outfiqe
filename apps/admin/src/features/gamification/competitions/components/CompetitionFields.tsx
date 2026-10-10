import {
  Checkbox,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
} from "@outfiqe/design-system";
import { type UseFormReturn } from "react-hook-form";

import {
  ANIMATION_OPTION_LABEL,
  ANIMATION_OPTIONS,
  AUTO_ANIMATION_OPTION,
  CATEGORY_OPTIONS,
  LEADERBOARD_CATEGORY_LABEL,
  LEADERBOARD_CATEGORY_OPTIONS,
  RARITY_OPTIONS,
  SHAPE_OPTIONS,
} from "../../constants/badgeOptions.constants";
import { type CompetitionFormValues } from "../schemas/competitionForm.schema";

type CompetitionCheckboxName = "isPermanent" | "isPublic" | "isTitleEligible";

const CompetitionCheckbox = ({
  form,
  name,
  label,
}: {
  form: UseFormReturn<CompetitionFormValues>;
  name: CompetitionCheckboxName;
  label: string;
}) => (
  <label className="flex items-center gap-2 text-sm text-foreground">
    <Checkbox {...form.register(name)} />
    {label}
  </label>
);

export const CompetitionFields = ({ form }: { form: UseFormReturn<CompetitionFormValues> }) => (
  <div className="space-y-4">
    <div className="flex flex-wrap items-start gap-3">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem className="mt-0 min-w-48 flex-1 space-y-1.5">
            <FormLabel className="text-xs font-normal text-muted-foreground">
              Competition name
            </FormLabel>
            <FormControl>
              <Input placeholder="Weekly Style Sprint" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="icon"
        render={({ field }) => (
          <FormItem className="mt-0 w-24 space-y-1.5">
            <FormLabel className="text-xs font-normal text-muted-foreground">
              Icon (emoji)
            </FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>

    <div className="flex flex-wrap items-start gap-3">
      <FormField
        control={form.control}
        name="leaderboardCategory"
        render={({ field }) => (
          <FormItem className="mt-0 w-40 space-y-1.5">
            <FormLabel className="text-xs font-normal text-muted-foreground">Ranks by</FormLabel>
            <FormControl>
              <Select {...field}>
                {LEADERBOARD_CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {LEADERBOARD_CATEGORY_LABEL[category]}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="topN"
        render={({ field }) => (
          <FormItem className="mt-0 w-28 space-y-1.5">
            <FormLabel className="text-xs font-normal text-muted-foreground">
              Winners each week
            </FormLabel>
            <FormControl>
              <Input inputMode="numeric" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="xpReward"
        render={({ field }) => (
          <FormItem className="mt-0 w-28 space-y-1.5">
            <FormLabel className="text-xs font-normal text-muted-foreground">XP reward</FormLabel>
            <FormControl>
              <Input inputMode="numeric" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>

    <div className="rounded-xl border border-border p-4">
      <p className="mb-3 text-sm font-medium text-foreground">Trophy badge</p>
      <div className="flex flex-wrap items-start gap-3">
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem className="mt-0 w-36 space-y-1.5">
              <FormLabel className="text-xs font-normal text-muted-foreground">Category</FormLabel>
              <FormControl>
                <Select {...field}>
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rarity"
          render={({ field }) => (
            <FormItem className="mt-0 w-36 space-y-1.5">
              <FormLabel className="text-xs font-normal text-muted-foreground">Rarity</FormLabel>
              <FormControl>
                <Select {...field}>
                  {RARITY_OPTIONS.map((rarity) => (
                    <option key={rarity} value={rarity}>
                      {rarity}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="shape"
          render={({ field }) => (
            <FormItem className="mt-0 w-32 space-y-1.5">
              <FormLabel className="text-xs font-normal text-muted-foreground">Shape</FormLabel>
              <FormControl>
                <Select {...field}>
                  {SHAPE_OPTIONS.map((shape) => (
                    <option key={shape} value={shape}>
                      {shape}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="primaryColor"
          render={({ field }) => (
            <FormItem className="mt-0 space-y-1.5">
              <FormLabel className="text-xs font-normal text-muted-foreground">Color</FormLabel>
              <FormControl>
                <Input type="color" className="h-11 w-16 p-1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="animation"
          render={({ field }) => (
            <FormItem className="mt-0 w-36 space-y-1.5">
              <FormLabel className="text-xs font-normal text-muted-foreground">Animation</FormLabel>
              <FormControl>
                <Select {...field}>
                  <option value={AUTO_ANIMATION_OPTION}>Auto (by rarity)</option>
                  {ANIMATION_OPTIONS.map((animation) => (
                    <option key={animation} value={animation}>
                      {ANIMATION_OPTION_LABEL[animation]}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-4">
        <CompetitionCheckbox form={form} name="isPermanent" label="Permanent" />
        <CompetitionCheckbox form={form} name="isPublic" label="Visible while locked" />
        <CompetitionCheckbox form={form} name="isTitleEligible" label="Title-eligible" />
      </div>
    </div>
  </div>
);

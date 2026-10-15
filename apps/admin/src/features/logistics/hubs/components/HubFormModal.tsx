import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Checkbox,
  Form,
  FormBanner,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Modal,
} from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useForm } from "react-hook-form";

import { getErrorMessage } from "@/lib/errorMessages";

import { hubsApi } from "../api/hubsApi";
import type { Hub } from "../api/hubsSchemas";
import { HUBS_QUERY_KEY } from "../constants/hubQueryKeys";
import { WEEKDAYS } from "../constants/weekdays";
import { hubFormSchema, type HubFormValues } from "../schemas/hubForm.schema";
import { EMPTY_HUB_FORM, toHubFormValues, toHubRequestBody } from "../utils/hubForm.utils";

type HubFormModalProps = {
  hub?: Hub;
  onClose: () => void;
};

type TextFieldName =
  | "name"
  | "address"
  | "city"
  | "phone"
  | "timeZone"
  | "openTime"
  | "closeTime"
  | "pickupRoundTimes"
  | "readyCutoffMinutes"
  | "partnerCollectionTime";

const FIELD_LABEL_CLASS = "text-xs font-normal text-muted-foreground";

export const HubFormModal = ({ hub, onClose }: HubFormModalProps) => {
  const title = hub ? "Edit hub" : "Add hub";
  const form = useForm<HubFormValues>({
    resolver: zodResolver(hubFormSchema),
    defaultValues: hub ? toHubFormValues(hub) : EMPTY_HUB_FORM,
    mode: "onTouched",
  });

  const saveHub = useApiMutation({
    mutationFn: (values: HubFormValues) => {
      const body = toHubRequestBody(values, hub?.countryCode);
      return hub ? hubsApi.update(hub.id, body) : hubsApi.create(body);
    },
    invalidateKeys: [HUBS_QUERY_KEY],
    successMessage: hub ? "Hub saved." : "Hub added.",
    onSuccess: onClose,
  });

  const textField = (name: TextFieldName, label: string, hint?: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="mt-0 space-y-1.5">
          <FormLabel className={FIELD_LABEL_CLASS}>{label}</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Modal open onClose={onClose} title={title} ariaLabel={title}>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => saveHub.mutate(values))}
          noValidate
          className="space-y-3"
        >
          {saveHub.isError && <FormBanner>{getErrorMessage(saveHub.error)}</FormBanner>}

          {textField("name", "Hub name")}
          {textField("address", "Address")}
          <div className="grid gap-3 sm:grid-cols-2">
            {textField("city", "City")}
            {textField("phone", "Phone")}
          </div>
          {textField("timeZone", "Time zone", "For example Asia/Kathmandu.")}

          <FormField
            control={form.control}
            name="workingDays"
            render={({ field }) => (
              <FormItem className="mt-0 space-y-1.5">
                <FormLabel className={FIELD_LABEL_CLASS}>Working days</FormLabel>
                <div className="flex flex-wrap gap-3">
                  {WEEKDAYS.map(({ value, shortLabel }) => (
                    <label
                      key={value}
                      className="flex items-center gap-1.5 text-sm text-foreground"
                    >
                      <Checkbox
                        checked={field.value.includes(value)}
                        onChange={(event) =>
                          field.onChange(
                            event.target.checked
                              ? [...field.value, value]
                              : field.value.filter((day) => day !== value),
                          )
                        }
                      />
                      {shortLabel}
                    </label>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            {textField("openTime", "Opens at (HH:mm)")}
            {textField("closeTime", "Closes at (HH:mm)")}
          </div>
          {textField(
            "pickupRoundTimes",
            "Pickup rounds",
            "Times riders set off, for example 11:00, 15:00.",
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {textField(
              "readyCutoffMinutes",
              "Ready-by cutoff (minutes)",
              "Pickups marked ready this long before a round join it.",
            )}
            {textField("partnerCollectionTime", "Partner collects at (HH:mm)")}
          </div>

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="mt-0">
                <label className="flex items-center gap-2.5 text-sm text-foreground">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                    />
                  </FormControl>
                  Hub is open for pickups
                </label>
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2.5 pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={saveHub.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveHub.isPending}>
              {saveHub.isPending ? "Saving…" : "Save hub"}
            </Button>
          </div>
        </form>
      </Form>
    </Modal>
  );
};

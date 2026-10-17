import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Modal,
  Select,
} from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useForm } from "react-hook-form";

import type { Hub } from "../../hubs/api/hubsSchemas";
import { ridersApi } from "../api/ridersApi";
import { RIDER_EMPLOYMENT_TYPE } from "../api/ridersSchemas";
import { RIDER_EMPLOYMENT_TYPE_LABELS } from "../constants/riderLabels";
import { RIDER_INVITES_QUERY_KEY } from "../constants/riderQueryKeys";
import { inviteRiderFormSchema, type InviteRiderFormValues } from "../schemas/riderForms.schema";

type InviteRiderModalProps = {
  hub: Hub;
  onClose: () => void;
};

export const InviteRiderModal = ({ hub, onClose }: InviteRiderModalProps) => {
  const form = useForm<InviteRiderFormValues>({
    resolver: zodResolver(inviteRiderFormSchema),
    defaultValues: { name: "", email: "", employmentType: RIDER_EMPLOYMENT_TYPE.CONTRACTOR },
    mode: "onTouched",
  });

  const inviteRider = useApiMutation({
    mutationFn: (values: InviteRiderFormValues) => ridersApi.invite({ ...values, hubId: hub.id }),
    invalidateKeys: [RIDER_INVITES_QUERY_KEY],
    successMessage: "Invite sent.",
    onSuccess: onClose,
  });

  const submitInvite = form.handleSubmit((values) => inviteRider.mutate(values));

  return (
    <Modal
      open
      onClose={onClose}
      title="Invite a rider"
      description={`They'll get an email to set up a rider login for ${hub.name}.`}
    >
      <Form {...form}>
        <form onSubmit={submitInvite} noValidate className="space-y-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="mt-0 space-y-1.5">
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="mt-0 space-y-1.5">
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="employmentType"
            render={({ field }) => (
              <FormItem className="mt-0 space-y-1.5">
                <FormLabel>Works as</FormLabel>
                <FormControl>
                  <Select {...field}>
                    {Object.values(RIDER_EMPLOYMENT_TYPE).map((employmentType) => (
                      <option key={employmentType} value={employmentType}>
                        {RIDER_EMPLOYMENT_TYPE_LABELS[employmentType]}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Contractors can&apos;t ride until you check their ID in person.
                </p>
              </FormItem>
            )}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={inviteRider.isPending}>
              Send invite
            </Button>
          </div>
        </form>
      </Form>
    </Modal>
  );
};

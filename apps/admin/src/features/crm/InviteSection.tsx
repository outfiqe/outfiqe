import { zodResolver } from "@hookform/resolvers/zod";
import {
  Badge,
  Button,
  Form,
  FormBanner,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  toast,
} from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { CardRowSkeleton } from "@/components/CardRowSkeleton";
import { getErrorMessage } from "@/lib/errorMessages";

import { crmApi } from "./api";
import {
  crmInviteFormSchema,
  type CrmInviteFormValues,
  EMPTY_CRM_INVITE_FORM,
} from "./crmInviteForm.schema";
import type { OrganizationInviteStatusValue } from "./schemas";

const STATUS_TONE: Record<OrganizationInviteStatusValue, "neutral" | "positive" | "negative"> = {
  PENDING: "neutral",
  ACCEPTED: "positive",
  REVOKED: "negative",
  EXPIRED: "negative",
};

type InviteSectionProps = {
  viewerIsSuperAdmin: boolean;
  viewerPermissionKeys: string[];
};

export const InviteSection = ({ viewerIsSuperAdmin, viewerPermissionKeys }: InviteSectionProps) => {
  const {
    data: invites,
    isLoading,
    error,
  } = useQuery({ queryKey: ["crm-invites"], queryFn: crmApi.listInvites });
  const { data: roles } = useQuery({ queryKey: ["crm-roles"], queryFn: crmApi.listRoles });

  const assignableRoles =
    roles?.filter(
      (role) =>
        viewerIsSuperAdmin ||
        role.permissionKeys.every((key) => viewerPermissionKeys.includes(key)),
    ) ?? [];

  const form = useForm<CrmInviteFormValues>({
    resolver: zodResolver(crmInviteFormSchema),
    defaultValues: EMPTY_CRM_INVITE_FORM,
    mode: "onTouched",
  });

  const invite = useApiMutation({
    mutationFn: (values: CrmInviteFormValues) => crmApi.createInvite(values.email, values.roleId),
    invalidateKeys: [["crm-invites"]],
    successMessage: (_result, values) => `Invite sent to ${values.email}.`,
    onSuccess: () => form.resetField("email"),
  });

  const revoke = useApiMutation({
    mutationFn: (inviteId: string) => crmApi.revokeInvite(inviteId),
    invalidateKeys: [["crm-invites"]],
    successMessage: "Invite revoked.",
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const submitInvite = form.handleSubmit((values) => invite.mutate(values));

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">Invite a staff member</h2>

      <Form {...form}>
        <form
          onSubmit={submitInvite}
          noValidate
          className="mt-3 flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-4"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="w-64 space-y-1.5">
                <FormLabel className="text-xs font-normal text-muted-foreground">Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="roleId"
            render={({ field }) => (
              <FormItem className="w-40 space-y-1.5">
                <FormLabel className="text-xs font-normal text-muted-foreground">Role</FormLabel>
                <FormControl>
                  <Select {...field}>
                    <option value="">Select a role</option>
                    {assignableRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" isLoading={invite.isPending} className="mt-[22px]">
            Send invite
          </Button>
        </form>
      </Form>

      <p className="mt-2 text-xs text-muted-foreground">
        If they don&rsquo;t have an Outfiqe account yet, they&rsquo;ll set a name and password from
        the invite email before joining.
      </p>

      {invite.isError && <FormBanner className="mt-3">{getErrorMessage(invite.error)}</FormBanner>}

      <h3 className="mt-6 font-display text-base font-bold text-foreground">Pending invites</h3>
      <div className="mt-3 space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => (
            <CardRowSkeleton
              key={index}
              hasSmallTitle
              textLineCount={1}
              actions={[{ label: "Revoke", size: "sm" }]}
            />
          ))}
        {error && <p className="text-sm text-destructive">{getErrorMessage(error)}</p>}
        {!isLoading && !error && invites?.length === 0 && (
          <p className="text-sm text-muted-foreground">No invites yet.</p>
        )}

        {invites?.map((pendingInvite) => (
          <div
            key={pendingInvite.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-display text-sm font-bold text-foreground">
                  {pendingInvite.email}
                </h4>
                <Badge tone={STATUS_TONE[pendingInvite.status]} showDot={false}>
                  {pendingInvite.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{pendingInvite.roleName}</p>
            </div>

            {pendingInvite.status === "PENDING" && (
              <Button
                variant="outline"
                size="sm"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(pendingInvite.id)}
              >
                Revoke
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

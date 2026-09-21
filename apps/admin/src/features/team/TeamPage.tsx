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
} from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { CardRowSkeleton } from "@/components/CardRowSkeleton";
import { useAuth } from "@/features/auth/AuthContext";
import { platformRolesApi } from "@/features/platform-roles/api";
import { PlatformRolesSection } from "@/features/platform-roles/PlatformRolesSection";
import { PlatformTeamSection } from "@/features/platform-roles/PlatformTeamSection";
import { getErrorMessage } from "@/lib/errorMessages";

import { teamApi } from "./api";
import { EMPTY_INVITE_FORM, inviteFormSchema, type InviteFormValues } from "./inviteForm.schema";
import type { AdminInviteSummary } from "./schemas";

const STATUS_TONE: Record<AdminInviteSummary["status"], "neutral" | "positive" | "negative"> = {
  PENDING: "neutral",
  ACCEPTED: "positive",
  EXPIRED: "negative",
};

export const TeamPage = () => {
  const { state: authState } = useAuth();
  const isCoFounder = authState.status === "signed-in" && authState.user.isCoFounder;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-invites"],
    queryFn: teamApi.list,
  });
  const invites = data?.invites;

  const { data: roles } = useQuery({
    queryKey: ["platform-roles"],
    queryFn: platformRolesApi.listRoles,
    enabled: isCoFounder,
  });

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: EMPTY_INVITE_FORM,
    mode: "onTouched",
  });

  const invite = useApiMutation({
    mutationFn: (values: InviteFormValues) =>
      teamApi.invite(values.email, values.name, values.roleId),
    invalidateKeys: [["admin-invites"]],
    successMessage: (_result, values) => `Invite sent to ${values.email}.`,
    onSuccess: () => form.reset(EMPTY_INVITE_FORM),
  });

  const submitInvite = form.handleSubmit((values) => invite.mutate(values));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Team</h1>

        {isCoFounder ? (
          <Form {...form}>
            <form
              onSubmit={submitInvite}
              noValidate
              className="mt-5 flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="mt-0 w-48 space-y-1.5">
                    <FormLabel className="text-xs font-normal text-muted-foreground">
                      Name
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="mt-0 w-64 space-y-1.5">
                    <FormLabel className="text-xs font-normal text-muted-foreground">
                      Email
                    </FormLabel>
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
                  <FormItem className="mt-0 w-40 space-y-1.5">
                    <FormLabel className="text-xs font-normal text-muted-foreground">
                      Role
                    </FormLabel>
                    <FormControl>
                      <Select {...field}>
                        <option value="">Select a role</option>
                        {roles?.map((role) => (
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
                Invite admin
              </Button>
            </form>
          </Form>
        ) : (
          !isLoading && (
            <p className="mt-5 text-sm text-muted-foreground">
              You don&rsquo;t have permission to invite new admins.
            </p>
          )
        )}
        {invite.isError && (
          <FormBanner className="mt-3">{getErrorMessage(invite.error)}</FormBanner>
        )}

        <div className="mt-6 space-y-3">
          {isLoading &&
            Array.from({ length: 3 }).map((_, index) => (
              <CardRowSkeleton
                key={index}
                hasBadge={false}
                textLineCount={1}
                hasMetaLine
                hasTrailingBadge
              />
            ))}
          {invites?.length === 0 && (
            <p className="text-sm text-muted-foreground">No invites yet.</p>
          )}

          {invites?.map((invite) => (
            <div
              key={invite.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div>
                <h2 className="flex flex-wrap items-center gap-2 font-display text-base font-bold text-foreground">
                  {invite.name}
                  {invite.isCoFounder && (
                    <Badge tone="positive" showDot={false} className="text-[10px]">
                      Co-founder
                    </Badge>
                  )}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{invite.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">{invite.roleName}</p>
              </div>
              <Badge tone={STATUS_TONE[invite.status]} showDot={false}>
                {invite.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {isCoFounder && (
        <>
          <PlatformRolesSection />
          <PlatformTeamSection />
        </>
      )}
    </div>
  );
};

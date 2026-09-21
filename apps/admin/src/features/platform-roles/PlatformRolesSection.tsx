import { zodResolver } from "@hookform/resolvers/zod";
import {
  Badge,
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
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { CardRowSkeleton } from "@/components/CardRowSkeleton";
import { SkeletonButton } from "@/components/SkeletonControls";
import { getErrorMessage } from "@/lib/errorMessages";

import { platformRolesApi } from "./api";
import { platformRoleFormSchema, type PlatformRoleFormValues } from "./platformRoleForm.schema";
import type { PlatformPermission, PlatformRole } from "./schemas";

const ROLES_QUERY_KEY = ["platform-roles"];
const PERMISSIONS_QUERY_KEY = ["platform-permissions"];

type PermissionGroup = { group: string; permissions: PlatformPermission[] };

const groupPermissions = (permissions: PlatformPermission[]): PermissionGroup[] => {
  const byGroup = new Map<string, PlatformPermission[]>();
  for (const permission of permissions) {
    const existing = byGroup.get(permission.group) ?? [];
    existing.push(permission);
    byGroup.set(permission.group, existing);
  }
  return [...byGroup.entries()].map(([group, groupPermissions]) => ({
    group,
    permissions: groupPermissions,
  }));
};

type PlatformRoleFormModalProps = {
  permissionGroups: PermissionGroup[];
  editingRole: PlatformRole | null;
  onClose: () => void;
};

const PlatformRoleFormModal = ({
  permissionGroups,
  editingRole,
  onClose,
}: PlatformRoleFormModalProps) => {
  const form = useForm<PlatformRoleFormValues>({
    resolver: zodResolver(platformRoleFormSchema),
    defaultValues: {
      name: editingRole?.name ?? "",
      permissionKeys: editingRole?.permissionKeys ?? [],
    },
    mode: "onTouched",
  });

  const save = useApiMutation({
    mutationFn: (values: PlatformRoleFormValues) =>
      editingRole
        ? platformRolesApi.updateRole(editingRole.id, values)
        : platformRolesApi.createRole(values),
    invalidateKeys: [ROLES_QUERY_KEY],
    successMessage: editingRole ? "Platform role updated." : "Platform role created.",
    onSuccess: () => onClose(),
  });

  const submitRole = form.handleSubmit((values) => save.mutate(values));

  return (
    <Modal open onClose={onClose} title={editingRole ? "Edit platform role" : "New platform role"}>
      <Form {...form}>
        <form onSubmit={submitRole} noValidate className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="mt-0 space-y-1.5">
                <FormLabel className="text-xs font-normal text-muted-foreground">
                  Role name
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
            name="permissionKeys"
            render={({ field }) => {
              const toggleKey = (key: string) =>
                field.onChange(
                  field.value.includes(key)
                    ? field.value.filter((selectedKey) => selectedKey !== key)
                    : [...field.value, key],
                );

              return (
                <FormItem className="mt-0">
                  <fieldset className="space-y-4">
                    <legend className="text-xs text-muted-foreground">Permissions</legend>
                    {permissionGroups.map((permissionGroup) => (
                      <div key={permissionGroup.group} className="space-y-2">
                        <p className="text-sm font-semibold text-foreground">
                          {permissionGroup.group}
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {permissionGroup.permissions.map((permission) => (
                            <label
                              key={permission.key}
                              className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                            >
                              <Checkbox
                                checked={field.value.includes(permission.key)}
                                onChange={() => toggleKey(permission.key)}
                              />
                              {permission.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </fieldset>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          {save.isError && <FormBanner>{getErrorMessage(save.error)}</FormBanner>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={save.isPending}>
              {editingRole ? "Save role" : "Create role"}
            </Button>
          </div>
        </form>
      </Form>
    </Modal>
  );
};

const DeletePlatformRoleModal = ({
  role,
  onClose,
}: {
  role: PlatformRole;
  onClose: () => void;
}) => {
  const remove = useApiMutation({
    mutationFn: () => platformRolesApi.deleteRole(role.id),
    invalidateKeys: [ROLES_QUERY_KEY],
    successMessage: "Platform role deleted.",
    onSuccess: () => onClose(),
  });

  return (
    <Modal open onClose={onClose} title="Delete platform role">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Delete <strong>{role.name}</strong>? This can&apos;t be undone.
        </p>
        {remove.isError && <FormBanner>{getErrorMessage(remove.error)}</FormBanner>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            isLoading={remove.isPending}
            onClick={() => remove.mutate()}
          >
            Delete role
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export const PlatformRolesSection = () => {
  const {
    data: roles,
    isLoading: rolesLoading,
    error: rolesError,
  } = useQuery({ queryKey: ROLES_QUERY_KEY, queryFn: platformRolesApi.listRoles });

  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: PERMISSIONS_QUERY_KEY,
    queryFn: platformRolesApi.listPermissions,
  });

  const permissionGroups = useMemo(() => groupPermissions(permissions ?? []), [permissions]);

  const [creating, setCreating] = useState(false);
  const [editingRole, setEditingRole] = useState<PlatformRole | null>(null);
  const [deletingRole, setDeletingRole] = useState<PlatformRole | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Platform roles</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Define what a platform staff member can access.
          </p>
        </div>
        {permissionsLoading && <SkeletonButton size="sm" label="New role" />}
        {permissionGroups.length > 0 && (
          <Button size="sm" onClick={() => setCreating(true)}>
            New role
          </Button>
        )}
      </div>

      <div className="mt-3 space-y-3">
        {rolesLoading && (
          <CardRowSkeleton
            textLineCount={1}
            actions={[
              { label: "Edit", size: "sm" },
              { label: "Delete", size: "sm" },
            ]}
          />
        )}
        {rolesError && <FormBanner>{getErrorMessage(rolesError)}</FormBanner>}

        {roles?.map((role) => (
          <div
            key={role.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-foreground">{role.name}</h3>
                {role.isBuiltIn && (
                  <Badge tone="neutral" showDot={false}>
                    Built-in
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {role.permissionKeys.length} permission
                {role.permissionKeys.length === 1 ? "" : "s"}
              </p>
            </div>

            {!role.isBuiltIn && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingRole(role)}>
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeletingRole(role)}>
                  Delete
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {(creating || editingRole) && (
        <PlatformRoleFormModal
          permissionGroups={permissionGroups}
          editingRole={editingRole}
          onClose={() => {
            setCreating(false);
            setEditingRole(null);
          }}
        />
      )}

      {deletingRole && (
        <DeletePlatformRoleModal role={deletingRole} onClose={() => setDeletingRole(null)} />
      )}
    </div>
  );
};

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
  toast,
} from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { CardRowSkeleton } from "@/components/CardRowSkeleton";
import { getErrorMessage } from "@/lib/errorMessages";

import { crmApi } from "./api";
import {
  organizationNameFormSchema,
  type OrganizationNameFormValues,
  roleFormSchema,
  type RoleFormValues,
} from "./roleForm.schema";
import type { Permission, Role } from "./schemas";

const ROLES_QUERY_KEY = ["crm-roles"];
const PERMISSIONS_QUERY_KEY = ["crm-permissions"];
const ORGANIZATION_QUERY_KEY = ["crm-organization"];
const ROLES_MANAGE_PERMISSION_KEY = "roles:manage";
const ORGANIZATION_UPDATE_PERMISSION_KEY = "org:update";

const NON_SELECTABLE_PERMISSION_KEYS = new Set(["platform:access", "org:transfer_ownership"]);

type PermissionGroup = { group: string; permissions: Permission[] };

const groupSelectablePermissions = (permissions: Permission[]): PermissionGroup[] => {
  const byGroup = new Map<string, Permission[]>();
  for (const permission of permissions) {
    if (NON_SELECTABLE_PERMISSION_KEYS.has(permission.key)) continue;
    const existing = byGroup.get(permission.group) ?? [];
    existing.push(permission);
    byGroup.set(permission.group, existing);
  }
  return [...byGroup.entries()].map(([group, groupPermissions]) => ({
    group,
    permissions: groupPermissions,
  }));
};

type RoleFormModalProps = {
  permissionGroups: PermissionGroup[];
  editingRole: Role | null;
  viewerIsSuperAdmin: boolean;
  viewerPermissionKeys: string[];
  onClose: () => void;
};

const RoleFormModal = ({
  permissionGroups,
  editingRole,
  viewerIsSuperAdmin,
  viewerPermissionKeys,
  onClose,
}: RoleFormModalProps) => {
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: editingRole?.name ?? "",
      permissionKeys: editingRole?.permissionKeys ?? [],
    },
    mode: "onTouched",
  });
  const rolesOwnOriginalPermissionKeys = useMemo(
    () => new Set(editingRole?.permissionKeys ?? []),
    [editingRole],
  );
  const isPermissionBeyondViewersOwnGrant = (permissionKey: string) =>
    !viewerIsSuperAdmin &&
    !viewerPermissionKeys.includes(permissionKey) &&
    !rolesOwnOriginalPermissionKeys.has(permissionKey);

  const toggleKey = (key: string) => {
    const current = form.getValues("permissionKeys");
    const next = current.includes(key)
      ? current.filter((existingKey) => existingKey !== key)
      : [...current, key];
    form.setValue("permissionKeys", next, { shouldValidate: true, shouldTouch: true });
  };

  const save = useApiMutation({
    mutationFn: (values: RoleFormValues) => {
      const body = { name: values.name.trim(), permissionKeys: values.permissionKeys };
      return editingRole ? crmApi.updateRole(editingRole.id, body) : crmApi.createRole(body);
    },
    invalidateKeys: [ROLES_QUERY_KEY],
    successMessage: editingRole ? "Role updated." : "Role created.",
    onSuccess: () => onClose(),
  });

  const submitRole = form.handleSubmit((values) => save.mutate(values));
  const selectedKeys = form.watch("permissionKeys");

  return (
    <Modal open onClose={onClose} title={editingRole ? "Edit role" : "New role"}>
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

          <fieldset className="space-y-4">
            <legend className="text-xs text-muted-foreground">Permissions</legend>
            {permissionGroups.map((permissionGroup) => (
              <div key={permissionGroup.group} className="space-y-2">
                <p className="text-sm font-semibold text-foreground">{permissionGroup.group}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {permissionGroup.permissions.map((permission) => {
                    const disabled = isPermissionBeyondViewersOwnGrant(permission.key);
                    return (
                      <label
                        key={permission.key}
                        className="flex cursor-pointer items-center gap-2 text-sm text-foreground aria-disabled:cursor-not-allowed aria-disabled:text-muted-foreground"
                        aria-disabled={disabled}
                        title={disabled ? "You don't have this permission yourself" : undefined}
                      >
                        <Checkbox
                          checked={selectedKeys.includes(permission.key)}
                          disabled={disabled}
                          onChange={() => toggleKey(permission.key)}
                        />
                        {permission.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            <p className="text-sm text-destructive" role="alert">
              {form.formState.errors.permissionKeys?.message}
            </p>
          </fieldset>

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

const DeleteRoleModal = ({ role, onClose }: { role: Role; onClose: () => void }) => {
  const remove = useApiMutation({
    mutationFn: () => crmApi.deleteRole(role.id),
    invalidateKeys: [ROLES_QUERY_KEY],
    successMessage: "Role deleted.",
    onSuccess: () => onClose(),
  });

  return (
    <Modal open onClose={onClose} title="Delete role">
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

const OrganizationNameCard = ({ currentName }: { currentName: string }) => {
  const form = useForm<OrganizationNameFormValues>({
    resolver: zodResolver(organizationNameFormSchema),
    defaultValues: { name: currentName },
    mode: "onTouched",
  });

  const rename = useApiMutation({
    mutationFn: (values: OrganizationNameFormValues) =>
      crmApi.updateOrganization({ name: values.name.trim() }),
    invalidateKeys: [ORGANIZATION_QUERY_KEY],
    successMessage: "Organization name updated.",
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const submitName = form.handleSubmit((values) => rename.mutate(values));
  const isUnchanged = form.watch("name").trim() === currentName;

  return (
    <Form {...form}>
      <form
        onSubmit={submitName}
        noValidate
        className="flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="mt-0 min-w-56 flex-1 space-y-1.5">
              <FormLabel className="text-xs font-normal text-muted-foreground">
                Organization name
              </FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={isUnchanged}
          isLoading={rename.isPending}
          className="mt-[22px]"
        >
          Save
        </Button>
      </form>
    </Form>
  );
};

type RolesSectionProps = {
  organizationName: string;
  viewerIsSuperAdmin: boolean;
  viewerPermissionKeys: string[];
};

export const RolesSection = ({
  organizationName,
  viewerIsSuperAdmin,
  viewerPermissionKeys,
}: RolesSectionProps) => {
  const canManageRoles =
    viewerIsSuperAdmin || viewerPermissionKeys.includes(ROLES_MANAGE_PERMISSION_KEY);
  const canRenameOrganization =
    viewerIsSuperAdmin || viewerPermissionKeys.includes(ORGANIZATION_UPDATE_PERMISSION_KEY);

  const {
    data: roles,
    isLoading: rolesLoading,
    error: rolesError,
  } = useQuery({ queryKey: ROLES_QUERY_KEY, queryFn: crmApi.listRoles });

  const { data: permissions } = useQuery({
    queryKey: PERMISSIONS_QUERY_KEY,
    queryFn: crmApi.listPermissions,
  });

  const permissionGroups = useMemo(
    () => groupSelectablePermissions(permissions ?? []),
    [permissions],
  );

  const [creating, setCreating] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  return (
    <div className="space-y-8">
      {canRenameOrganization && <OrganizationNameCard currentName={organizationName} />}

      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">Roles</h2>
          {canManageRoles && permissionGroups.length > 0 && (
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

              {canManageRoles && !role.isBuiltIn && (
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
      </div>

      {(creating || editingRole) && (
        <RoleFormModal
          permissionGroups={permissionGroups}
          editingRole={editingRole}
          viewerIsSuperAdmin={viewerIsSuperAdmin}
          viewerPermissionKeys={viewerPermissionKeys}
          onClose={() => {
            setCreating(false);
            setEditingRole(null);
          }}
        />
      )}

      {deletingRole && (
        <DeleteRoleModal role={deletingRole} onClose={() => setDeletingRole(null)} />
      )}
    </div>
  );
};

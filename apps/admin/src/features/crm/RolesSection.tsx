import {
  Badge,
  Button,
  Checkbox,
  FormBanner,
  Input,
  Modal,
  Skeleton,
  toast,
} from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useMemo, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { crmApi } from "./api";
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
  onClose: () => void;
};

const RoleFormModal = ({ permissionGroups, editingRole, onClose }: RoleFormModalProps) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState(editingRole?.name ?? "");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    new Set(editingRole?.permissionKeys ?? []),
  );

  const toggleKey = (key: string) => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), permissionKeys: [...selectedKeys] };
      return editingRole ? crmApi.updateRole(editingRole.id, body) : crmApi.createRole(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      toast.success(editingRole ? "Role updated." : "Role created.");
      onClose();
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  const canSubmit = name.trim().length >= 2 && selectedKeys.size > 0 && !save.isPending;

  return (
    <Modal open onClose={onClose} title={editingRole ? "Edit role" : "New role"}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="role-name" className="text-xs text-muted-foreground">
            Role name
          </label>
          <Input
            id="role-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>

        <fieldset className="space-y-4">
          <legend className="text-xs text-muted-foreground">Permissions</legend>
          {permissionGroups.map((permissionGroup) => (
            <div key={permissionGroup.group} className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{permissionGroup.group}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {permissionGroup.permissions.map((permission) => (
                  <label
                    key={permission.key}
                    className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                  >
                    <Checkbox
                      checked={selectedKeys.has(permission.key)}
                      onChange={() => toggleKey(permission.key)}
                    />
                    {permission.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </fieldset>

        {save.isError && <FormBanner>{getErrorMessage(save.error)}</FormBanner>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {save.isPending ? "Saving…" : editingRole ? "Save role" : "Create role"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const DeleteRoleModal = ({ role, onClose }: { role: Role; onClose: () => void }) => {
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: () => crmApi.deleteRole(role.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      toast.success("Role deleted.");
      onClose();
    },
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
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
          >
            {remove.isPending ? "Deleting…" : "Delete role"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const OrganizationNameCard = ({ currentName }: { currentName: string }) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState(currentName);

  const rename = useMutation({
    mutationFn: () => crmApi.updateOrganization({ name: name.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORGANIZATION_QUERY_KEY });
      toast.success("Organization name updated.");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    rename.mutate();
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
    >
      <div className="min-w-56 flex-1 space-y-1.5">
        <label htmlFor="org-name" className="text-xs text-muted-foreground">
          Organization name
        </label>
        <Input
          id="org-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>
      <Button
        type="submit"
        disabled={name.trim().length < 2 || name.trim() === currentName || rename.isPending}
      >
        {rename.isPending ? "Saving…" : "Save"}
      </Button>
    </form>
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
          {rolesLoading && <Skeleton className="h-32 w-full" />}
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

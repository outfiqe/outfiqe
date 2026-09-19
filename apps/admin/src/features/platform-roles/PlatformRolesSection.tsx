import { Badge, Button, Checkbox, FormBanner, Input, Modal, toast } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useMemo, useState } from "react";

import { CardRowSkeleton } from "@/components/CardRowSkeleton";
import { getErrorMessage } from "@/lib/errorMessages";

import { platformRolesApi } from "./api";
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

  const save = useApiMutation({
    mutationFn: () => {
      const body = { name: name.trim(), permissionKeys: [...selectedKeys] };
      return editingRole
        ? platformRolesApi.updateRole(editingRole.id, body)
        : platformRolesApi.createRole(body);
    },
    invalidateKeys: [ROLES_QUERY_KEY],
    onSuccess: () => {
      toast.success(editingRole ? "Platform role updated." : "Platform role created.");
      onClose();
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  const canSubmit = name.trim().length >= 2 && selectedKeys.size > 0 && !save.isPending;

  return (
    <Modal open onClose={onClose} title={editingRole ? "Edit platform role" : "New platform role"}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="platform-role-name" className="text-xs text-muted-foreground">
            Role name
          </label>
          <Input
            id="platform-role-name"
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
          <Button type="submit" disabled={!canSubmit} isLoading={save.isPending}>
            {editingRole ? "Save role" : "Create role"}
          </Button>
        </div>
      </form>
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
    onSuccess: () => {
      toast.success("Platform role deleted.");
      onClose();
    },
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

  const { data: permissions } = useQuery({
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

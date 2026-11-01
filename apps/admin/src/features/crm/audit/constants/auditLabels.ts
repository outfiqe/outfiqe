export const AUDIT_ACTION_LABELS: Record<string, string> = {
  INVITE_SENT: "Invite sent",
  INVITE_REVOKED: "Invite revoked",
  INVITE_ACCEPTED: "Invite accepted",
  MEMBER_ROLE_CHANGED: "Member role changed",
  MEMBER_STATUS_CHANGED: "Member status changed",
  ROLE_CREATED: "Role created",
  ROLE_UPDATED: "Role updated",
  ROLE_DELETED: "Role deleted",
  ORGANIZATION_RENAMED: "Organization renamed",
  OWNERSHIP_TRANSFER_REQUESTED: "Ownership transfer requested",
  OWNERSHIP_TRANSFER_ACCEPTED: "Ownership transfer accepted",
  OWNERSHIP_TRANSFER_DECLINED: "Ownership transfer declined",
  OWNERSHIP_TRANSFER_REVOKED: "Ownership transfer revoked",
  SUBSCRIPTION_CHECKOUT_STARTED: "Checkout started",
  SUBSCRIPTION_ACTIVATED: "Subscription activated",
  SUBSCRIPTION_CANCELED: "Subscription cancelled",
};

export const AUDIT_GROUPS = [
  { value: "", label: "Everything" },
  { value: "team", label: "Team" },
  { value: "roles", label: "Roles" },
  { value: "billing", label: "Billing" },
  { value: "organization", label: "Organization" },
] as const;

export const AUDIT_TARGET_LINKS: Record<string, { to: string; label: string }> = {
  invite: { to: "/crm", label: "See your team" },
  membership: { to: "/crm", label: "See your team" },
  ownership_transfer: { to: "/crm", label: "See your team" },
  organization: { to: "/crm", label: "See your organization" },
  role: { to: "/crm/roles", label: "See roles" },
  subscription: { to: "/crm/billing", label: "See billing" },
};

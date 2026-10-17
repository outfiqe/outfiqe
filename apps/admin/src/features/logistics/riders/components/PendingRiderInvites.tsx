import { RIDER_EMPLOYMENT_TYPE_LABELS } from "../constants/riderLabels";
import { useRiderInvites } from "../hooks/useRiderInvites";

const NO_INVITES = 0;

const formatInviteExpiry = (expiresAt: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(expiresAt));

export const PendingRiderInvites = () => {
  const { data: invites } = useRiderInvites();
  if (!invites || invites.length === NO_INVITES) return null;

  return (
    <section aria-labelledby="pending-rider-invites-heading" className="space-y-2">
      <h2 id="pending-rider-invites-heading" className="text-sm font-semibold text-foreground">
        Invites waiting to be accepted
      </h2>
      <ul className="space-y-2">
        {invites.map((invite) => (
          <li
            key={invite.id}
            className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
          >
            <span className="font-medium text-foreground">{invite.name}</span> · {invite.email} ·{" "}
            {RIDER_EMPLOYMENT_TYPE_LABELS[invite.employmentType]} · {invite.hubName} · expires{" "}
            {formatInviteExpiry(invite.expiresAt)}
          </li>
        ))}
      </ul>
    </section>
  );
};

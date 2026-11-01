import { Select } from "@outfiqe/design-system";

import { useCrmMembers } from "../hooks/useCrmMembers";

export const UNASSIGNED_FILTER = "none";

export const CrmMemberFilter = ({
  label,
  allLabel,
  unassignedLabel,
  value,
  onChange,
}: {
  label: string;
  allLabel: string;
  unassignedLabel?: string;
  value: string;
  onChange: (membershipId: string) => void;
}) => {
  const members = useCrmMembers();
  if (!members) return null;

  return (
    <Select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-44"
    >
      <option value="">{allLabel}</option>
      {unassignedLabel && <option value={UNASSIGNED_FILTER}>{unassignedLabel}</option>}
      {members.map((member) => (
        <option key={member.id} value={member.id}>
          {member.userName}
        </option>
      ))}
    </Select>
  );
};

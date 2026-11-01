import { Select } from "@outfiqe/design-system";

import { useCrmMembers } from "../hooks/useCrmMembers";

export const CrmMemberFilter = ({
  label,
  allLabel,
  value,
  onChange,
}: {
  label: string;
  allLabel: string;
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
      {members.map((member) => (
        <option key={member.id} value={member.id}>
          {member.userName}
        </option>
      ))}
    </Select>
  );
};

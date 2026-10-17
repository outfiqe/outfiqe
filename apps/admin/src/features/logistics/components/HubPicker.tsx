import { Label, Select } from "@outfiqe/design-system";
import { useId } from "react";

import type { Hub } from "../hubs/api/hubsSchemas";

type HubPickerProps = {
  openHubs: Hub[];
  selectedHubId: string | null;
  onSelectHub: (hubId: string) => void;
};

export const HubPicker = ({ openHubs, selectedHubId, onSelectHub }: HubPickerProps) => {
  const hubSelectId = useId();

  return (
    <div className="w-full max-w-xs">
      <Label htmlFor={hubSelectId}>Hub</Label>
      <Select
        id={hubSelectId}
        value={selectedHubId ?? ""}
        onChange={(event) => onSelectHub(event.target.value)}
      >
        {openHubs.map((hub) => (
          <option key={hub.id} value={hub.id}>
            {hub.name}
          </option>
        ))}
      </Select>
    </div>
  );
};

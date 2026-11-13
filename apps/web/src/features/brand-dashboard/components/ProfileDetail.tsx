import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type ProfileDetailProps = {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
};

export const ProfileDetail = ({ icon: Icon, label, value }: ProfileDetailProps) => (
  <div>
    <dt className="flex items-center gap-2.5 text-muted-foreground">
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {label}
    </dt>
    <dd className="ml-[1.625rem] mt-0.5 text-foreground">{value}</dd>
  </div>
);

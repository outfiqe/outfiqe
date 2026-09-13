import { AnnouncementsListSection } from "./AnnouncementsListSection";

export const AnnouncementsPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Announcements</h1>
      <AnnouncementsListSection />
    </div>
  );
};

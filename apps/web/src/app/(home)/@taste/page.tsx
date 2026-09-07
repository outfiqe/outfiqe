import { TasteResultsSlot } from "./TasteResultsSlot";

interface TasteSlotPageProps {
  searchParams: Promise<{ category?: string; type?: string }>;
}

const TasteSlotPage = async ({ searchParams }: TasteSlotPageProps) => {
  const { category, type } = await searchParams;

  return <TasteResultsSlot categorySlug={category} typeId={type} />;
};

export default TasteSlotPage;

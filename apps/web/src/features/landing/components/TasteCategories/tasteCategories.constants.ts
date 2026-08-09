export interface TasteCategory {
  id: string;
  name: string;
  slug: string;
  color: string;
  image?: string;
}

export const TASTE_CATEGORIES: TasteCategory[] = [
  { id: "formal", name: "Formal", slug: "formal", color: "#3b4a5a" },
  { id: "traditional", name: "Traditional", slug: "traditional", color: "#8a3a1e" },
  { id: "streetwear", name: "Streetwear", slug: "streetwear", color: "#1c1f24" },
  { id: "casual", name: "Casual", slug: "casual", color: "#5c4632" },
  { id: "minimal", name: "Minimal", slug: "minimal", color: "#6b6b6b" },
  { id: "y2k", name: "Y2K", slug: "y2k", color: "#7a2a6b" },
  { id: "old-money", name: "Old Money", slug: "old-money", color: "#2f4030" },
];

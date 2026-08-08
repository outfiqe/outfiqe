import { BrandCategory, MakesOwnPieces } from "../../schemas/brandApplication.schema";

export const CATEGORY_OPTIONS: { value: BrandCategory; label: string }[] = [
  { value: "STREETWEAR", label: "Streetwear" },
  { value: "TRADITIONAL", label: "Traditional" },
  { value: "THRIFT", label: "Thrift" },
  { value: "KIDS", label: "Kids" },
  { value: "FORMAL", label: "Formal" },
];

export const PRODUCTION_OPTIONS: { value: MakesOwnPieces; label: string }[] = [
  { value: "MAKES", label: "Yes, we make them" },
  { value: "RESELLS", label: "We resell" },
  { value: "BOTH", label: "Both" },
];

import { MakesOwnPieces } from "../../schemas/brandApplication.schema";

export const PRODUCTION_OPTIONS: { value: MakesOwnPieces; label: string }[] = [
  { value: "MAKES", label: "Yes, we make them" },
  { value: "RESELLS", label: "We resell" },
  { value: "BOTH", label: "Both" },
];

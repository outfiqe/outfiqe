import { useQuery } from "@tanstack/react-query";

import { bagTagsApi } from "../api/bagTagsApi";
import { bagTagSheetQueryKey } from "../constants/bagTagQueryKeys";

export const useBagTagSheet = (batchId: string) =>
  useQuery({ queryKey: bagTagSheetQueryKey(batchId), queryFn: () => bagTagsApi.getSheet(batchId) });

import { useQuery } from "@tanstack/react-query";

import { codApi } from "../api/codApi";
import { COD_SUMMARY_QUERY_KEY } from "../constants/codQueryKeys";

export const useCodSummary = () =>
  useQuery({ queryKey: COD_SUMMARY_QUERY_KEY, queryFn: codApi.getSummary });

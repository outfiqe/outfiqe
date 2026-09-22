import { useApiMutation } from "@outfiqe/hooks";
import { useQueryClient } from "@tanstack/react-query";

import { toursApi } from "../api/toursApi";
import type { RecordTourOutcomeInput, TourProgressList } from "../api/toursSchemas";
import { TOUR_PROGRESS_QUERY_KEY } from "../constants/tourProgressQueryKey";
import { withRecordedOutcome } from "../utils/withRecordedOutcome";

export const useRecordTourOutcome = () => {
  const queryClient = useQueryClient();

  return useApiMutation({
    mutationFn: toursApi.recordOutcome,
    onMutate: async (recordedOutcome: RecordTourOutcomeInput) => {
      await queryClient.cancelQueries({ queryKey: TOUR_PROGRESS_QUERY_KEY });
      queryClient.setQueryData<TourProgressList>(TOUR_PROGRESS_QUERY_KEY, (savedProgress) =>
        withRecordedOutcome(savedProgress, recordedOutcome, new Date()),
      );
    },
  });
};

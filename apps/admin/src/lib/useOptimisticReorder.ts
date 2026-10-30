import { type QueryKey, useMutation, useQueryClient } from "@tanstack/react-query";

type OptimisticReorderOptions = {
  queryKey: QueryKey;
  reorderIds: (orderedIds: string[]) => Promise<void>;
  onReorderError?: (error: Error) => void;
};

export const useOptimisticReorder = <Row extends { id: string }>({
  queryKey,
  reorderIds,
  onReorderError,
}: OptimisticReorderOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reorderIds,
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Row[]>(queryKey);
      if (previous) {
        const rowsById = new Map(previous.map((row) => [row.id, row]));
        queryClient.setQueryData(
          queryKey,
          orderedIds.map((id) => rowsById.get(id)).filter((row): row is Row => !!row),
        );
      }
      return { previous };
    },
    onError: (mutationError, _orderedIds, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      onReorderError?.(mutationError);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
};

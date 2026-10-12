"use client";

import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { outfitSocialApi } from "../api/outfitSocialApi";
import type {
  PublicBuildCard,
  PublicBuildDetail,
  PublicBuildFilters,
  PublicBuildPage,
} from "../api/outfitSocialSchemas";

const PUBLIC_BUILDS_ROOT = "public-builds";
const NO_CURSOR = undefined;
const ONE = 1;
const NO_COUNT = 0;

export const publicBuildsQueryKey = (filters: PublicBuildFilters) =>
  [PUBLIC_BUILDS_ROOT, "feed", filters] as const;
export const savedBuildsQueryKey = [PUBLIC_BUILDS_ROOT, "saved"] as const;
export const publicBuildQueryKey = (outfitId: string) =>
  [PUBLIC_BUILDS_ROOT, "detail", outfitId] as const;
export const buildCommentsQueryKey = (outfitId: string) =>
  [PUBLIC_BUILDS_ROOT, "comments", outfitId] as const;
export const buildRepliesQueryKey = (outfitId: string, commentId: string) =>
  [PUBLIC_BUILDS_ROOT, "replies", outfitId, commentId] as const;

type CardPatch = (card: PublicBuildCard) => PublicBuildCard;

const patchCachedBuild = (queryClient: QueryClient, outfitId: string, patch: CardPatch) => {
  queryClient.setQueriesData<InfiniteData<PublicBuildPage>>(
    { queryKey: [PUBLIC_BUILDS_ROOT, "feed"] },
    (feed) =>
      feed && {
        ...feed,
        pages: feed.pages.map((page) => ({
          ...page,
          items: page.items.map((card) => (card.id === outfitId ? patch(card) : card)),
        })),
      },
  );
  queryClient.setQueryData<InfiniteData<PublicBuildPage>>(
    savedBuildsQueryKey,
    (saved) =>
      saved && {
        ...saved,
        pages: saved.pages.map((page) => ({
          ...page,
          items: page.items.map((card) => (card.id === outfitId ? patch(card) : card)),
        })),
      },
  );
  queryClient.setQueryData<PublicBuildDetail>(
    publicBuildQueryKey(outfitId),
    (detail) => detail && { ...detail, ...patch(detail) },
  );
};

export const usePublicBuilds = (filters: PublicBuildFilters, isEnabled = true) =>
  useInfiniteQuery({
    queryKey: publicBuildsQueryKey(filters),
    queryFn: ({ pageParam }) => outfitSocialApi.listPublic(filters, pageParam),
    initialPageParam: NO_CURSOR as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: isEnabled,
  });

export const useSavedBuilds = (isEnabled: boolean) =>
  useInfiniteQuery({
    queryKey: savedBuildsQueryKey,
    queryFn: ({ pageParam }) => outfitSocialApi.listSaved(pageParam),
    initialPageParam: NO_CURSOR as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: isEnabled,
  });

export const usePublicBuild = (outfitId: string, initialBuild?: PublicBuildDetail) =>
  useQuery({
    queryKey: publicBuildQueryKey(outfitId),
    queryFn: () => outfitSocialApi.getPublic(outfitId),
    initialData: initialBuild,
    retry: false,
  });

export const useToggleBuildLike = (outfitId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isLiked: boolean) => outfitSocialApi.setLiked(outfitId, isLiked),
    onMutate: (isLiked) =>
      patchCachedBuild(queryClient, outfitId, (card) => ({
        ...card,
        isLiked,
        likeCount: Math.max(card.likeCount + (isLiked ? ONE : -ONE), NO_COUNT),
      })),
    onSuccess: ({ isLiked, likeCount }) =>
      patchCachedBuild(queryClient, outfitId, (card) => ({ ...card, isLiked, likeCount })),
    onError: (_error, isLiked) =>
      patchCachedBuild(queryClient, outfitId, (card) => ({
        ...card,
        isLiked: !isLiked,
        likeCount: Math.max(card.likeCount + (isLiked ? -ONE : ONE), NO_COUNT),
      })),
  });
};

export const useToggleBuildSave = (outfitId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isSaved: boolean) => outfitSocialApi.setSaved(outfitId, isSaved),
    onMutate: (isSaved) =>
      patchCachedBuild(queryClient, outfitId, (card) => ({
        ...card,
        isSaved,
        saveCount: Math.max(card.saveCount + (isSaved ? ONE : -ONE), NO_COUNT),
      })),
    onSuccess: ({ isSaved, saveCount }) => {
      patchCachedBuild(queryClient, outfitId, (card) => ({ ...card, isSaved, saveCount }));
      void queryClient.invalidateQueries({ queryKey: savedBuildsQueryKey });
    },
    onError: (_error, isSaved) =>
      patchCachedBuild(queryClient, outfitId, (card) => ({
        ...card,
        isSaved: !isSaved,
        saveCount: Math.max(card.saveCount + (isSaved ? -ONE : ONE), NO_COUNT),
      })),
  });
};

export const useBuildComments = (outfitId: string) =>
  useInfiniteQuery({
    queryKey: buildCommentsQueryKey(outfitId),
    queryFn: ({ pageParam }) => outfitSocialApi.listComments(outfitId, pageParam),
    initialPageParam: NO_CURSOR as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });

export const useBuildReplies = (outfitId: string, commentId: string, isEnabled: boolean) =>
  useInfiniteQuery({
    queryKey: buildRepliesQueryKey(outfitId, commentId),
    queryFn: ({ pageParam }) => outfitSocialApi.listReplies(outfitId, commentId, pageParam),
    initialPageParam: NO_CURSOR as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: isEnabled,
  });

const refreshComments = (queryClient: QueryClient, outfitId: string) =>
  queryClient.invalidateQueries({
    predicate: ({ queryKey }) =>
      queryKey[0] === PUBLIC_BUILDS_ROOT &&
      (queryKey[1] === "comments" || queryKey[1] === "replies" || queryKey[1] === "detail") &&
      queryKey[2] === outfitId,
  });

export const useAddBuildComment = (outfitId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { body: string; parentCommentId?: string }) =>
      outfitSocialApi.addComment(outfitId, input),
    onSuccess: () => refreshComments(queryClient, outfitId),
  });
};

export const useRemoveBuildComment = (outfitId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => outfitSocialApi.removeComment(outfitId, commentId),
    onSuccess: () => refreshComments(queryClient, outfitId),
  });
};

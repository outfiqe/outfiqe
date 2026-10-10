"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

const LOOK_QUERY_PARAM = "look";
const EDIT_QUERY_PARAM = "edit";

export const useCreatorLookQueryParams = (handle: string, isOwnProfile: boolean) => {
  const searchParams = useSearchParams();
  const [editingLookId, setEditingLookId] = useState<string | null>(null);

  const detailPostId = searchParams.get(LOOK_QUERY_PARAM);
  const editParamLookId = isOwnProfile ? searchParams.get(EDIT_QUERY_PARAM) : null;
  const activeEditLookId = editingLookId ?? editParamLookId;

  const closeEdit = () => {
    setEditingLookId(null);
    if (searchParams.has(EDIT_QUERY_PARAM)) {
      const params = new URLSearchParams(searchParams);
      params.delete(EDIT_QUERY_PARAM);
      const query = params.toString();
      window.history.replaceState(null, "", `/creator/${handle}${query ? `?${query}` : ""}`);
    }
  };

  const openPost = (lookId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(LOOK_QUERY_PARAM, lookId);
    window.history.replaceState(null, "", `/creator/${handle}?${params.toString()}`);
  };

  const closePost = () => {
    const params = new URLSearchParams(searchParams);
    params.delete(LOOK_QUERY_PARAM);
    const query = params.toString();
    window.history.replaceState(null, "", `/creator/${handle}${query ? `?${query}` : ""}`);
  };

  return { detailPostId, activeEditLookId, setEditingLookId, closeEdit, openPost, closePost };
};

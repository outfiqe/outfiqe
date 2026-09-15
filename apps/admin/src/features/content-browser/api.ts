import { apiClient } from "@/lib/apiClient";

import {
  type AdminLookPage,
  adminLookPageSchema,
  type LookCommentPage,
  lookCommentPageSchema,
  type LookCommentReplyPage,
  lookCommentReplyPageSchema,
} from "./schemas";

export const contentBrowserApi = {
  async listLooks(q: string, cursor?: string): Promise<AdminLookPage> {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (cursor) params.set("cursor", cursor);
    const query = params.toString();
    const res = await apiClient.get<AdminLookPage>(
      `/creator-looks/admin${query ? `?${query}` : ""}`,
    );
    return adminLookPageSchema.parse(res.data);
  },

  async listComments(lookId: string, cursor?: string): Promise<LookCommentPage> {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    const query = params.toString();
    const res = await apiClient.get<LookCommentPage>(
      `/creator-looks/${lookId}/comments${query ? `?${query}` : ""}`,
    );
    return lookCommentPageSchema.parse(res.data);
  },

  async listReplies(
    lookId: string,
    commentId: string,
    cursor?: string,
  ): Promise<LookCommentReplyPage> {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    const query = params.toString();
    const res = await apiClient.get<LookCommentReplyPage>(
      `/creator-looks/${lookId}/comments/${commentId}/replies${query ? `?${query}` : ""}`,
    );
    return lookCommentReplyPageSchema.parse(res.data);
  },

  async deleteLook(lookId: string): Promise<void> {
    await apiClient.del(`/creator-looks/${lookId}`);
  },

  async deleteComment(lookId: string, commentId: string): Promise<void> {
    await apiClient.del(`/creator-looks/${lookId}/comments/${commentId}`);
  },
};

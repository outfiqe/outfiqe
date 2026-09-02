"use client";

import { Button, HiddenFileInput, toast } from "@outfiqe/design-system";
import { useSendMessage } from "@outfiqe/hooks";
import type { NewMessageAttachmentInput } from "@outfiqe/types";
import { ImagePlus, Send, X } from "lucide-react";
import { useRef, useState } from "react";

import { uploadsApi } from "@/shared/api/uploadsApi";
import { conversationsApi } from "@/shared/lib/conversationsApi";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import { EmojiPicker } from "./EmojiPicker";

const MAX_ATTACHMENTS = 6;

type PendingAttachment = NewMessageAttachmentInput & { previewUrl: string };

type MessageComposerProps = {
  conversationId: string;
};

export const MessageComposer = ({ conversationId }: MessageComposerProps) => {
  const [body, setBody] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendMessage = useSendMessage(conversationsApi, conversationId);

  const canSend =
    (body.trim().length > 0 || pendingAttachments.length > 0) &&
    !sendMessage.isPending &&
    !isUploading;

  const handleFilesSelected = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0) return;
    const remainingSlots = MAX_ATTACHMENTS - pendingAttachments.length;
    const selected = Array.from(files).slice(0, remainingSlots);
    if (selected.length === 0) return;

    setIsUploading(true);
    try {
      const urls = await uploadsApi.upload(selected);
      const uploaded: PendingAttachment[] = urls.map((url, index) => ({
        url,
        mimeType: selected[index]?.type ?? "image/jpeg",
        previewUrl: url,
      }));
      setPendingAttachments((current) => [...current, ...uploaded].slice(0, MAX_ATTACHMENTS));
    } catch (uploadError) {
      toast.error(getErrorMessage(uploadError));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (url: string): void => {
    setPendingAttachments((current) => current.filter((attachment) => attachment.url !== url));
  };

  const handleSend = (): void => {
    if (!canSend) return;
    const trimmedBody = body.trim();

    sendMessage.mutate(
      {
        body: trimmedBody.length > 0 ? trimmedBody : undefined,
        attachments: pendingAttachments.map((attachment) => ({
          url: attachment.url,
          mimeType: attachment.mimeType,
          width: attachment.width,
          height: attachment.height,
        })),
      },
      {
        onSuccess: () => {
          setBody("");
          setPendingAttachments([]);
        },
      },
    );
  };

  return (
    <div className="border-t border-border p-3">
      {pendingAttachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {pendingAttachments.map((attachment) => (
            <div
              key={attachment.url}
              className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-border"
            >
              <img src={attachment.previewUrl} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => removeAttachment(attachment.url)}
                aria-label="Remove photo"
                className="absolute right-0.5 top-0.5 flex size-4 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X className="size-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-1.5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || pendingAttachments.length >= MAX_ATTACHMENTS}
          aria-label="Attach a photo"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ImagePlus className="size-5" />
        </button>
        <HiddenFileInput
          inputRef={fileInputRef}
          onFilesSelected={(files) => void handleFilesSelected(files)}
          multiple
        />

        <EmojiPicker onSelect={(emoji) => setBody((current) => `${current}${emoji}`)} />

        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message"
          rows={1}
          className="max-h-28 flex-1 resize-none rounded-2xl border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-foreground"
        />

        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className="shrink-0"
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
};

"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@outfiqe/design-system";
import { Smile } from "lucide-react";
import { useState } from "react";

const QUICK_EMOJIS = [
  "😀",
  "😂",
  "🥹",
  "😍",
  "😎",
  "🤔",
  "😢",
  "😡",
  "👍",
  "👎",
  "🙏",
  "👏",
  "🔥",
  "🎉",
  "❤️",
  "💯",
  "😘",
  "😅",
  "🥳",
  "😴",
  "🤝",
  "✨",
  "😮",
  "🙌",
] as const;

type EmojiPickerProps = {
  onSelect: (emoji: string) => void;
};

export const EmojiPicker = ({ onSelect }: EmojiPickerProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Add an emoji"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Smile className="size-5" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64 p-2">
        <div className="grid grid-cols-8 gap-1">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onSelect(emoji);
                setOpen(false);
              }}
              className="flex size-7 cursor-pointer items-center justify-center rounded-md text-lg transition-colors hover:bg-muted"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

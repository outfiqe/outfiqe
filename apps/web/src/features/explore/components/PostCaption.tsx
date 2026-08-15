"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/shared/lib/cn";

type PostCaptionProps = {
  text: string;
  className?: string;
};

export const PostCaption = ({ text, className }: PostCaptionProps) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const checkTruncation = () => setIsTruncated(el.scrollHeight > el.clientHeight);
    checkTruncation();
    const observer = new ResizeObserver(checkTruncation);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  return (
    <div className={className}>
      <span ref={textRef} className={cn("block", !expanded && "line-clamp-1")}>
        {text}
      </span>
      {(isTruncated || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-0.5 text-xs font-semibold text-foreground hover:underline"
        >
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </div>
  );
};

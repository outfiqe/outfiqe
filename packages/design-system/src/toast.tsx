"use client";

import { useEffect, useState } from "react";

interface ToastMessage {
  id: number;
  message: string;
}

type Listener = (toasts: ToastMessage[]) => void;

let toasts: ToastMessage[] = [];
let nextId = 0;
const listeners = new Set<Listener>();

const AUTO_DISMISS_MS = 4000;

const notify = () => {
  for (const listener of listeners) listener(toasts);
};

const dismiss = (id: number) => {
  toasts = toasts.filter((item) => item.id !== id);
  notify();
};

const push = (message: string) => {
  const id = nextId++;
  toasts = [...toasts, { id, message }];
  notify();
  setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
};

export const toast = {
  error: push,
  success: push,
};

export function Toaster() {
  const [items, setItems] = useState<ToastMessage[]>(toasts);

  useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className="pointer-events-auto max-w-sm rounded-full bg-foreground px-4 py-2.5 text-center text-sm font-medium text-background shadow-lg"
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}

"use client";

import { type DragEvent, useState } from "react";

export const arrayMove = <T>(source: readonly T[], fromIndex: number, toIndex: number): T[] => {
  const reordered = [...source];
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= reordered.length ||
    toIndex >= reordered.length
  ) {
    return reordered;
  }
  const [moved] = reordered.splice(fromIndex, 1);
  if (moved === undefined) return [...source];
  reordered.splice(toIndex, 0, moved);
  return reordered;
};

type UseDragReorderArgs<T> = {
  order: T[];
  getId: (entry: T) => string;
  onReorder: (nextOrder: T[]) => void;
};

type DragProps = {
  draggable: true;
  onDragStart: (event: DragEvent) => void;
  onDragEnter: (event: DragEvent) => void;
  onDragOver: (event: DragEvent) => void;
  onDragEnd: () => void;
  onDrop: (event: DragEvent) => void;
};

export const useDragReorder = <T>({ order, getId, onReorder }: UseDragReorderArgs<T>) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const indexOfId = (id: string) => order.findIndex((entry) => getId(entry) === id);

  const clearDragState = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const moveEntry = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= order.length || toIndex >= order.length)
      return;
    onReorder(arrayMove(order, fromIndex, toIndex));
  };

  const dropOnId = (targetId: string) => {
    const fromIndex = draggingId === null ? -1 : indexOfId(draggingId);
    const toIndex = indexOfId(targetId);
    if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
      onReorder(arrayMove(order, fromIndex, toIndex));
    }
    clearDragState();
  };

  const getDragProps = (id: string): DragProps => ({
    draggable: true,
    onDragStart: (event) => {
      setDraggingId(id);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    },
    onDragEnter: (event) => {
      event.preventDefault();
      if (draggingId !== null && draggingId !== id) setDragOverId(id);
    },
    onDragOver: (event) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    },
    onDragEnd: clearDragState,
    onDrop: (event) => {
      event.preventDefault();
      dropOnId(id);
    },
  });

  return {
    draggingId,
    dragOverId,
    isDragging: draggingId !== null,
    getDragProps,
    moveEntry,
  };
};

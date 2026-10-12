"use client";

import { Button, Modal, Skeleton, toast } from "@outfiqe/design-system";
import { Plus } from "lucide-react";
import { useState } from "react";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { SizeStandard } from "../api/sizeStandardSchemas";
import { useArchiveSizeStandard, useSizeStandards } from "../hooks/useSizeStandards";
import { SizeStandardEditor } from "./SizeStandardEditor";

const LOADING_ROW_COUNT = 2;

type EditorState =
  { mode: "closed" } | { mode: "create" } | { mode: "edit"; standard: SizeStandard };

type SizeStandardsModalProps = {
  open: boolean;
  onClose: () => void;
};

export const SizeStandardsModal = ({ open, onClose }: SizeStandardsModalProps) => {
  const sizeStandards = useSizeStandards();
  const archiveStandard = useArchiveSizeStandard();
  const [editorState, setEditorState] = useState<EditorState>({ mode: "closed" });
  const { data: standards, isPending, isError, error, refetch } = sizeStandards;

  const closeModal = () => {
    setEditorState({ mode: "closed" });
    onClose();
  };

  const archive = (standard: SizeStandard) =>
    archiveStandard.mutate(standard.id, {
      onSuccess: () => toast.success(`${standard.name} archived`),
      onError: (archiveError) => toast.error(getErrorMessage(archiveError)),
    });

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title="Size standards"
      description="Your own size scales. Each product's sizes come from one of them, and products keep their sizes if you change a standard later."
      className="sm:max-w-xl"
    >
      {editorState.mode !== "closed" ? (
        <SizeStandardEditor
          standard={editorState.mode === "edit" ? editorState.standard : undefined}
          onSaved={(savedStandard) => {
            toast.success(`${savedStandard.name} saved`);
            setEditorState({ mode: "closed" });
          }}
          onCancel={() => setEditorState({ mode: "closed" })}
        />
      ) : (
        <div className="space-y-3">
          {isPending &&
            Array.from({ length: LOADING_ROW_COUNT }, (_unused, index) => (
              <Skeleton key={index} className="h-16 rounded-xl" />
            ))}

          {isError && (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Couldn&apos;t load your size standards. {getErrorMessage(error)}
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
                Try again
              </Button>
            </div>
          )}

          {standards?.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No size standards yet. Create one to start adding products.
            </p>
          )}

          {standards?.map((standard) => {
            const { id, name, labels } = standard;
            return (
              <div
                key={id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {labels.map(({ label }) => label).join(" · ")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Edit ${name}`}
                  onClick={() => setEditorState({ mode: "edit", standard })}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Archive ${name}`}
                  disabled={archiveStandard.isPending}
                  onClick={() => archive(standard)}
                >
                  Archive
                </Button>
              </div>
            );
          })}

          {!isPending && !isError && (
            <Button variant="outline" onClick={() => setEditorState({ mode: "create" })}>
              <Plus className="size-4" />
              New size standard
            </Button>
          )}
        </div>
      )}
    </Modal>
  );
};

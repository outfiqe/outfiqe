"use client";

import { useState } from "react";
import { AtSign, Mail, Phone, User } from "lucide-react";

import { Badge } from "@/design-system/components/ui/badge";
import { Button } from "@/design-system/components/ui/button";
import { Input } from "@/design-system/components/ui/input";
import { Modal } from "@/design-system/components/ui/modal";
import { toast } from "@/design-system/components/ui/toast";
import { useBrandProducts } from "../hooks/useBrandProducts";
import type { BrandCategory, BrandProfile } from "../api/brandDashboardSchemas";

const CATEGORY_LABEL: Record<BrandCategory, string> = {
  STREETWEAR: "Streetwear",
  TRADITIONAL: "Traditional",
  THRIFT: "Thrift",
  KIDS: "Kids",
  FORMAL: "Formal",
};

type EditableFields = {
  contactName: string;
  phone: string;
  instagram: string;
};

export const BrandProfileView = ({ profile }: { profile: BrandProfile }) => {
  const products = useBrandProducts();
  const { brand } = profile;

  const [fields, setFields] = useState<EditableFields>({
    contactName: brand.contactName,
    phone: brand.phone,
    instagram: brand.instagram,
  });
  const [draft, setDraft] = useState<EditableFields>(fields);
  const [editOpen, setEditOpen] = useState(false);

  const openEdit = () => {
    setDraft(fields);
    setEditOpen(true);
  };

  const save = () => {
    setFields(draft);
    setEditOpen(false);
    toast.success("Profile updated");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="font-display text-xs font-bold uppercase tracking-wider text-primary-strong">
              {CATEGORY_LABEL[brand.category]}
            </span>
            <h1 className="mt-1 font-display text-2xl font-bold text-foreground">{brand.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            {brand.madeInNepal && <Badge>Made in Nepal</Badge>}
            <Button variant="outline" size="sm" onClick={openEdit}>
              Edit profile
            </Button>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div className="flex items-start gap-2.5">
            <User className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <dt className="text-muted-foreground">Contact</dt>
              <dd className="mt-0.5 text-foreground">{fields.contactName}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="mt-0.5 text-foreground">{brand.email}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="mt-0.5 text-foreground">{fields.phone}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <AtSign className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <dt className="text-muted-foreground">Instagram</dt>
              <dd className="mt-0.5 text-foreground">{fields.instagram}</dd>
            </div>
          </div>
        </dl>

        <p className="mt-6 text-sm text-muted-foreground">
          {products.data?.length ?? 0} products listed
        </p>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit profile"
        description="Changes are saved to your session for now."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Contact name</label>
            <Input
              value={draft.contactName}
              onChange={(event) => setDraft({ ...draft, contactName: event.target.value })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Phone</label>
            <Input
              value={draft.phone}
              onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Instagram</label>
            <Input
              value={draft.instagram}
              onChange={(event) => setDraft({ ...draft, instagram: event.target.value })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Brand name, category, and origin are verified fields — reach out to support to change
            those.
          </p>
        </div>
      </Modal>
    </div>
  );
};

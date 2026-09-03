"use client";

import { Button, FormBanner, ImageUploader, Input, Modal, Rating } from "@outfiqe/design-system";
import { useState } from "react";

import { uploadsApi } from "@/shared/api/uploadsApi";
import { getErrorMessage } from "@/shared/lib/errorMessages";
import { toUploadableImage } from "@/shared/lib/heicImage";

import type { WriteProductReviewInput } from "../api/productReviewsApi";
import {
  MAX_REVIEW_IMAGES,
  RATING_STAR_QUALITY_LABEL_BY_VALUE,
  REVIEW_BODY_MIN_LENGTH,
} from "../product-reviews.constants";

type ReviewFormProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: WriteProductReviewInput) => Promise<unknown>;
  isSubmitting: boolean;
  initialValues?: WriteProductReviewInput;
};

const EMPTY_VALUES: WriteProductReviewInput = { rating: 0, title: "", body: "", imageUrls: [] };

export const ReviewForm = ({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  initialValues = EMPTY_VALUES,
}: ReviewFormProps) => {
  const {
    rating: initialRating,
    title: initialTitle,
    body: initialBody,
    imageUrls: initialImageUrls,
  } = initialValues;

  const [rating, setRating] = useState(initialRating);
  const [title, setTitle] = useState(initialTitle ?? "");
  const [body, setBody] = useState(initialBody);
  const [imageUrls, setImageUrls] = useState(initialImageUrls ?? []);
  const [error, setError] = useState<string | null>(null);

  const isEditing = initialValues !== EMPTY_VALUES;
  const canSubmit = rating > 0 && body.trim().length >= REVIEW_BODY_MIN_LENGTH;

  const submit = async () => {
    if (!canSubmit) return;
    setError(null);
    try {
      await onSubmit({ rating, title: title.trim() || undefined, body: body.trim(), imageUrls });
      onClose();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit your review" : "Write a review"}
      footer={
        <Button
          className="w-full"
          disabled={!canSubmit || isSubmitting}
          onClick={() => void submit()}
        >
          {isSubmitting ? "Posting…" : isEditing ? "Save changes" : "Post review"}
        </Button>
      }
    >
      <div className="space-y-4">
        <div>
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Your rating
          </span>
          <Rating
            value={rating}
            onChange={setRating}
            size="lg"
            label="Your rating"
            starQualityLabelByValue={RATING_STAR_QUALITY_LABEL_BY_VALUE}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="review-title" className="text-xs font-medium text-muted-foreground">
            Title (optional)
          </label>
          <Input
            id="review-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Sum up your experience"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor="review-body" className="text-xs font-medium text-muted-foreground">
              Your review
            </label>
            <span className="text-xs text-muted-foreground">
              {body.trim().length}/{REVIEW_BODY_MIN_LENGTH} min characters
            </span>
          </div>
          <textarea
            id="review-body"
            rows={5}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="What did you like or dislike? How does it fit?"
            className="w-full resize-none rounded-lg border border-border bg-transparent p-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Photos (optional)
          </span>
          <ImageUploader
            value={imageUrls}
            onChange={setImageUrls}
            onUpload={(files) => uploadsApi.upload(files)}
            maxFiles={MAX_REVIEW_IMAGES}
            describeUploadError={getErrorMessage}
            transformFile={toUploadableImage}
          />
        </div>

        {error && <FormBanner>{error}</FormBanner>}
      </div>
    </Modal>
  );
};

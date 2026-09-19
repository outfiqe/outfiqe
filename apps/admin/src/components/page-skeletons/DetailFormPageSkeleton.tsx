import { ShimmerBlock } from "./ShimmerBlock";

const FORM_SECTION_COUNT = 2;
const FIELDS_PER_SECTION = 3;
const ACTION_BUTTON_COUNT = 2;

export const DetailFormPageSkeleton = () => (
  <div role="status" className="flex max-w-3xl flex-col gap-6">
    <div className="flex flex-col gap-3">
      <ShimmerBlock className="h-4 w-24" />
      <ShimmerBlock className="h-8 w-64" />
    </div>
    {Array.from({ length: FORM_SECTION_COUNT }, (_unused, sectionIndex) => (
      <div
        key={sectionIndex}
        className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6"
      >
        <ShimmerBlock className="h-6 w-40" />
        {Array.from({ length: FIELDS_PER_SECTION }, (_fieldUnused, fieldIndex) => (
          <div key={fieldIndex} className="flex flex-col gap-2">
            <ShimmerBlock className="h-4 w-28" />
            <ShimmerBlock className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    ))}
    <div className="flex gap-3">
      {Array.from({ length: ACTION_BUTTON_COUNT }, (_unused, buttonIndex) => (
        <ShimmerBlock key={buttonIndex} className="h-10 w-28 rounded-lg" />
      ))}
    </div>
    <span className="sr-only">Loading page</span>
  </div>
);

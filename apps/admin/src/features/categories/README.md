# categories

## Purpose

Lets admins create, publish, reorder and re-image the shopper-facing categories.

## Structure

- `CategoriesPage.tsx` — the create form, the reorderable list, and the publish and image actions.
- `categoryForm.schema.ts` — the zod schema and empty values for the create form. Its limits mirror the API's `createCategorySchema` (name and slug 2 to 60 characters, slug lowercase letters, numbers and single hyphens).
- `api.ts`, `schemas.ts` — the API client and the response shapes.

## Funnel

**User-facing:** the admin types a name, the slug fills in from it, optionally uploads an image, and presses Create category. A missing or invalid field shows a message under that field, and nothing is sent. On success a toast says the category was created and the form clears. Publish, unpublish and image changes also toast.

**Technical:** `CategoriesPage` → react-hook-form with `zodResolver(categoryFormSchema)` → `useApiMutation` (`successMessage`, `invalidateKeys`) → `categoriesApi` → API.

## Non-obvious rationale

The form uses `noValidate` with the design-system `Form*` pieces, not the browser's `required` attribute, so errors look and read the same as on the web app's forms. The slug follows the name until the admin edits the slug by hand.

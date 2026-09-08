import { toResponsiveImage } from "#lib/responsive-image.utils.js";

import type { CollectionWithProductCount, PublicCollection } from "./collection.types.js";

export const toPublicCollection = (collection: CollectionWithProductCount): PublicCollection => ({
  id: collection.id,
  name: collection.name,
  slug: collection.slug,
  description: collection.description,
  imageUrl: collection.imageUrl,
  image: collection.imageUrl ? toResponsiveImage(collection.imageUrl, collection.imageAsset) : null,
  productCount: collection.productCount,
});

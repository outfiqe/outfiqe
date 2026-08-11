import type { Request, Response } from "express";

import { collectionService } from "./collection.service.js";

import { sendSuccess } from "#lib/api-response.utils.js";

import { validated } from "../../shared/middlewares/validate.js";

import type {
  CollectionIdParam,
  CollectionSlugParam,
  CreateCollectionBody,
  ListCollectionProductsQuery,
  ListCollectionsQuery,
  SetCollectionProductsBody,
  UpdateCollectionBody,
} from "./collection.schemas.js";

const CREATED_STATUS = 201;

export const collectionController = {
  async create(_req: Request, res: Response) {
    const body = validated.body<CreateCollectionBody>(res);
    const collection = await collectionService.create(body);
    sendSuccess(res, collection, "Collection created.", CREATED_STATUS);
  },

  async update(_req: Request, res: Response) {
    const { id } = validated.params<CollectionIdParam>(res);
    const body = validated.body<UpdateCollectionBody>(res);
    const collection = await collectionService.update(id, body);
    sendSuccess(res, collection, "Collection updated.");
  },

  async setProducts(_req: Request, res: Response) {
    const { id } = validated.params<CollectionIdParam>(res);
    const body = validated.body<SetCollectionProductsBody>(res);
    await collectionService.setProducts(id, body);
    sendSuccess(res, null, "Collection products updated.");
  },

  async listAll(_req: Request, res: Response) {
    const collections = await collectionService.listAll();
    sendSuccess(res, collections, "Collections.");
  },

  async listProductsForAdmin(_req: Request, res: Response) {
    const { id } = validated.params<CollectionIdParam>(res);
    const products = await collectionService.listProductsForAdmin(id);
    sendSuccess(res, products, "Collection products.");
  },

  async listPublic(_req: Request, res: Response) {
    const query = validated.query<ListCollectionsQuery>(res);
    const page = await collectionService.listPublic(query);
    sendSuccess(res, page, "Collections.");
  },

  async getPublicBySlug(_req: Request, res: Response) {
    const { slug } = validated.params<CollectionSlugParam>(res);
    const collection = await collectionService.getPublicBySlug(slug);
    sendSuccess(res, collection, "Collection.");
  },

  async listPublicProducts(_req: Request, res: Response) {
    const { slug } = validated.params<CollectionSlugParam>(res);
    const query = validated.query<ListCollectionProductsQuery>(res);
    const page = await collectionService.listPublicProducts(slug, query);
    sendSuccess(res, page, "Collection products.");
  },
};

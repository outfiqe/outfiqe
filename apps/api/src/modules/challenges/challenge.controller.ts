import type { Request, Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { getAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  ChallengeIdParam,
  CreateChallengeBody,
  UpdateChallengeBody,
} from "./challenge.schemas.js";
import { challengeService } from "./challenge.service.js";

export const challengeController = {
  async listActive(_req: Request, res: Response) {
    const viewerId = getAuthPrincipal(res)?.userId;
    const challenges = await challengeService.listActiveChallengesForViewer(viewerId);
    sendSuccess(res, challenges, "Active challenges.");
  },

  async getActive(_req: Request, res: Response) {
    const viewerId = getAuthPrincipal(res)?.userId;
    const { challengeId } = validated.params<ChallengeIdParam>(res);

    const challenge = await challengeService.findActiveChallengeForViewer(challengeId, viewerId);
    sendSuccess(res, challenge, "Challenge.");
  },

  async listAllAdmin(_req: Request, res: Response) {
    const challenges = await challengeService.listAllChallengesAdmin();
    sendSuccess(res, challenges, "Challenges.");
  },

  async create(_req: Request, res: Response) {
    const body = validated.body<CreateChallengeBody>(res);
    const challenge = await challengeService.createChallenge(body);
    sendSuccess(res, challenge, "Challenge created.", HTTP_STATUS.CREATED);
  },

  async update(_req: Request, res: Response) {
    const { challengeId } = validated.params<ChallengeIdParam>(res);
    const body = validated.body<UpdateChallengeBody>(res);
    const challenge = await challengeService.updateChallenge(challengeId, body);
    sendSuccess(res, challenge, "Challenge updated.");
  },
};

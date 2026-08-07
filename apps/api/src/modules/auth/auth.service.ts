import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/middlewares/errorHandler.js";
import { verifyPassword } from "../../shared/utils/password.js";
import { userRepository } from "../users/user.repository.js";

export const authService = {
  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);

    // Same error for "no such user" and "wrong password" so the endpoint
    // can't be used to enumerate which emails are registered.
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new AppError("INVALID_CREDENTIALS", "Invalid email or password", 401);
    }

    const accessToken = jwt.sign({ sub: user.id }, env.JWT_SECRET, {
      expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"],
    });
    const refreshToken = jwt.sign({ sub: user.id }, env.JWT_SECRET, {
      expiresIn: env.JWT_REFRESH_TTL as jwt.SignOptions["expiresIn"],
    });

    return { accessToken, refreshToken };
  },
};

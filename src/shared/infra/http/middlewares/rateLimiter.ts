import { NextFunction, Request, Response } from "express";
import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";

import { AppError } from "@shared/errors/AppError";

const limiter = new RateLimiterMemory({
  keyPrefix: "rateLimiter",
  points: 100,
  duration: 5,
});

export default async function rateLimiter(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    await limiter.consume(request.ip as string);
    return next();
  } catch (err) {
    if (err instanceof RateLimiterRes) {
      throw new AppError("Too many requests", 429);
    }
    console.error("Rate limiter error:", err);
    return next();
  }
}

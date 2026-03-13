import { NextFunction, Request, Response } from "express";
import { RateLimiterRedis, RateLimiterRes } from "rate-limiter-flexible";
import redis from "redis";

import { AppError } from "@shared/errors/AppError";

const redisClient = redis.createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});

redisClient.connect().catch((err) => {
  console.error("Redis connection error:", err);
});

const limiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "rateLimiter",
  points: 5,
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
    // Redis unavailable — fail open to avoid blocking all requests
    console.error("Rate limiter error (Redis unavailable):", err);
    return next();
  }
}

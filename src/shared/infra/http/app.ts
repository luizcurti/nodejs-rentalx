import "reflect-metadata";
import "dotenv/config";
import "express-async-errors";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import "@shared/container";
import upload from "@config/upload";
import { AppError } from "@shared/errors/AppError";
import rateLimiter from "@shared/infra/http/middlewares/rateLimiter";
import swaggerFile from "../../../swagger.json";
import { router } from "./routes";

const app = express();

app.use(rateLimiter);
app.use(cors({
  origin: process.env.APP_CORS_ORIGIN ?? "*",
}));
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.use("/avatar", express.static(`${upload.tmpFolder}/avatar`));
app.use("/cars", express.static(`${upload.tmpFolder}/cars`));
app.use(router);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _request: Request, response: Response, _next: NextFunction): void => {
  if (err instanceof AppError) {
    response.status(err.statusCode).json({
      message: err.message,
    });
    return;
  }
  response.status(500).json({
    status: "error",
    message: "Internal server error",
  });
});

export { app };

import "reflect-metadata";
import { Request, Response } from "express";
import { RefreshTokenController } from "./RefreshTokenController";
import { RefreshTokenUseCase } from "./RefreshTokenUseCase";
import { UsersTokensRepositoryInMemory } from "@modules/accounts/repositories/in-memory/UsersTokensRepositoryInMemory";
import { DayjsDateProvider } from "@shared/container/providers/DateProvider/implementations/DayjsDateProvider";
import { sign } from "jsonwebtoken";
import auth from "@config/auth";

function mockRequest(token: string): Request {
  return { body: { token } } as Request;
}

function mockResponse() {
  const res: Partial<Response> = {};
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("RefreshTokenController", () => {
  let usersTokensRepositoryInMemory: UsersTokensRepositoryInMemory;
  let dateProvider: DayjsDateProvider;
  let refreshTokenUseCase: RefreshTokenUseCase;
  let controller: RefreshTokenController;

  beforeEach(() => {
    usersTokensRepositoryInMemory = new UsersTokensRepositoryInMemory();
    dateProvider = new DayjsDateProvider();
    refreshTokenUseCase = new RefreshTokenUseCase(usersTokensRepositoryInMemory, dateProvider);
    controller = new RefreshTokenController(refreshTokenUseCase);
  });

  it("should refresh token", async () => {
    const user_id = "user-id";
    const email = "refresh@user.com";
    const refresh_token = sign({ email }, auth.secret_refresh_token, {
      subject: user_id,
      expiresIn: auth.expires_in_refresh_token,
    });
    await usersTokensRepositoryInMemory.create({
      user_id,
      refresh_token,
      expires_date: dateProvider.addDays(auth.expires_refresh_token_days),
    });
    const req = mockRequest(refresh_token);
    const res = mockResponse();
    await controller.handle(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: expect.any(String), refresh_token: expect.any(String) }));
  });

  it("should throw error if refresh token does not exist", async () => {
    const req = mockRequest("invalidtoken");
    const res = mockResponse();
    await expect(controller.handle(req, res)).rejects.toThrow();
  });

    it("should set a new useCase via setUseCase", async () => {
      const newRepo = new UsersTokensRepositoryInMemory();
      const newDateProvider = new DayjsDateProvider();
      const newUseCase = new RefreshTokenUseCase(newRepo, newDateProvider);
      controller.setUseCase(newUseCase);
      const user_id = "user-set";
      const email = "set@user.com";
      const refresh_token = sign({ email }, auth.secret_refresh_token, {
        subject: user_id,
        expiresIn: auth.expires_in_refresh_token,
      });
      await newRepo.create({
        user_id,
        refresh_token,
        expires_date: newDateProvider.addDays(auth.expires_refresh_token_days),
      });
      const req = mockRequest(refresh_token);
      const res = mockResponse();
      await controller.handle(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: expect.any(String), refresh_token: expect.any(String) }));
    });

    it("should resolve useCase from container if not provided", async () => {
      const mockExecute = jest.fn().mockResolvedValue({ token: "token", refresh_token: "refresh_token" });
      const { container } = await import("tsyringe");
      jest.spyOn(container, "resolve").mockReturnValue({ execute: mockExecute } as any);
      const controllerNoUseCase = new RefreshTokenController();
      const req = mockRequest("container-token");
      const res = mockResponse();
      await controllerNoUseCase.handle(req, res);
      expect(container.resolve).toHaveBeenCalledWith(RefreshTokenUseCase);
      expect(mockExecute).toHaveBeenCalledWith("container-token");
      expect(res.json).toHaveBeenCalledWith({ token: "token", refresh_token: "refresh_token" });
      jest.restoreAllMocks();
    });

    it("should get token from headers", async () => {
      const user_id = "user-header";
      const email = "header@user.com";
      const refresh_token = sign({ email }, auth.secret_refresh_token, {
        subject: user_id,
        expiresIn: auth.expires_in_refresh_token,
      });
      await usersTokensRepositoryInMemory.create({
        user_id,
        refresh_token,
        expires_date: dateProvider.addDays(auth.expires_refresh_token_days),
      });
      const req = {
        body: {},
        headers: { "x-access-token": refresh_token },
        query: {},
        get: jest.fn(),
        header: jest.fn(),
      } as unknown as Request;
      const res = mockResponse();
      await controller.handle(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: expect.any(String), refresh_token: expect.any(String) }));
    });

    it("should get token from query", async () => {
      const user_id = "user-query";
      const email = "query@user.com";
      const refresh_token = sign({ email }, auth.secret_refresh_token, {
        subject: user_id,
        expiresIn: auth.expires_in_refresh_token,
      });
      await usersTokensRepositoryInMemory.create({
        user_id,
        refresh_token,
        expires_date: dateProvider.addDays(auth.expires_refresh_token_days),
      });
      const req = {
        body: {},
        headers: {},
        query: { token: refresh_token },
        get: jest.fn(),
        header: jest.fn(),
      } as unknown as Request;
      const res = mockResponse();
      await controller.handle(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: expect.any(String), refresh_token: expect.any(String) }));
    });
});

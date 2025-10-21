import "reflect-metadata";
import { Request, Response } from "express";
import { ResetPasswordUserController } from "./ResetPasswordUserController";
import { ResetPasswordUserUseCase } from "./ResetPasswordUserUseCase";
import { UsersRepositoryInMemory } from "@modules/accounts/repositories/in-memory/UsersRepositoryInMemory";
import { UsersTokensRepositoryInMemory } from "@modules/accounts/repositories/in-memory/UsersTokensRepositoryInMemory";
import { DayjsDateProvider } from "@shared/container/providers/DateProvider/implementations/DayjsDateProvider";
import { hash, compare } from "bcrypt";
import { sign } from "jsonwebtoken";
import auth from "@config/auth";

function mockRequest(query: any, body: any): Request {
  return { query, body } as Request;
}

function mockResponse() {
  const res: Partial<Response> = {};
  res.send = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("ResetPasswordUserController", () => {
  let usersRepositoryInMemory: UsersRepositoryInMemory;
  let usersTokensRepositoryInMemory: UsersTokensRepositoryInMemory;
  let dateProvider: DayjsDateProvider;
  let resetPasswordUserUseCase: ResetPasswordUserUseCase;
  let controller: ResetPasswordUserController;

  beforeEach(() => {
    usersRepositoryInMemory = new UsersRepositoryInMemory();
    usersTokensRepositoryInMemory = new UsersTokensRepositoryInMemory();
    dateProvider = new DayjsDateProvider();
    resetPasswordUserUseCase = new ResetPasswordUserUseCase(
      usersTokensRepositoryInMemory,
      dateProvider,
      usersRepositoryInMemory
    );
    controller = new ResetPasswordUserController(resetPasswordUserUseCase);
  });

  it("should reset password with valid token", async () => {
    const user = await usersRepositoryInMemory.create({
      driver_license: "123456",
      email: "reset@user.com",
      password: await hash("oldpass", 8),
      name: "Reset User",
    });
    const refresh_token = sign({ email: user.email }, auth.secret_refresh_token, {
      subject: user.id,
      expiresIn: auth.expires_in_refresh_token,
    });
    await usersTokensRepositoryInMemory.create({
      user_id: user.id,
      refresh_token,
      expires_date: dateProvider.addDays(auth.expires_refresh_token_days),
    });
    const req = mockRequest({ token: refresh_token }, { password: "newpass" });
    const res = mockResponse();
  await controller.handle(req, res);
  const updatedUser = await usersRepositoryInMemory.findById(user.id);
  const isPasswordChanged = await compare("newpass", updatedUser?.password ?? "");
  expect(isPasswordChanged).toBe(true);
  expect(res.send).toHaveBeenCalled();
  });

  it("should return error for invalid token", async () => {
    const { AppError } = await import("@shared/errors/AppError");
    const req = mockRequest({ token: "invalid" }, { password: "newpass" });
    const res = mockResponse();
    await expect(controller.handle(req, res)).rejects.toBeInstanceOf(AppError);
  });

    it("should set a new useCase via setUseCase", async () => {
      const newRepo = new UsersRepositoryInMemory();
      const newTokensRepo = new UsersTokensRepositoryInMemory();
      const newDateProvider = new DayjsDateProvider();
      const newUseCase = new ResetPasswordUserUseCase(
        newTokensRepo,
        newDateProvider,
        newRepo
      );
      controller.setUseCase(newUseCase);
      const user = await newRepo.create({
        driver_license: "999999",
        email: "set@user.com",
        password: await hash("oldset", 8),
        name: "Set User",
      });
      const refresh_token = sign({ email: user.email }, auth.secret_refresh_token, {
        subject: user.id,
        expiresIn: auth.expires_in_refresh_token,
      });
      await newTokensRepo.create({
        user_id: user.id,
        refresh_token,
        expires_date: newDateProvider.addDays(auth.expires_refresh_token_days),
      });
      const req = mockRequest({ token: refresh_token }, { password: "newset" });
      const res = mockResponse();
      await controller.handle(req, res);
      const updatedUser = await newRepo.findById(user.id);
      const isPasswordChanged = await compare("newset", updatedUser?.password ?? "");
      expect(isPasswordChanged).toBe(true);
      expect(res.send).toHaveBeenCalled();
    });

    it("should resolve useCase from container if not provided", async () => {
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      const { container } = await import("tsyringe");
      jest.spyOn(container, "resolve").mockReturnValue({ execute: mockExecute } as any);
      const controllerNoUseCase = new ResetPasswordUserController();
      const req = mockRequest({ token: "container-token" }, { password: "container-pass" });
      const res = mockResponse();
      await controllerNoUseCase.handle(req, res);
      expect(container.resolve).toHaveBeenCalledWith(ResetPasswordUserUseCase);
      expect(mockExecute).toHaveBeenCalledWith({ token: "container-token", password: "container-pass" });
      expect(res.send).toHaveBeenCalled();
      jest.restoreAllMocks();
    });

    it("should return error for expired token", async () => {
      const { AppError } = await import("@shared/errors/AppError");
      const user = await usersRepositoryInMemory.create({
        driver_license: "888888",
        email: "expired@user.com",
        password: await hash("oldexpired", 8),
        name: "Expired User",
      });
      const refresh_token = sign({ email: user.email }, auth.secret_refresh_token, {
        subject: user.id,
        expiresIn: auth.expires_in_refresh_token,
      });
      await usersTokensRepositoryInMemory.create({
        user_id: user.id,
        refresh_token,
        expires_date: dateProvider.addDays(-1), // Expirado
      });
      const req = mockRequest({ token: refresh_token }, { password: "newexpired" });
      const res = mockResponse();
      await expect(controller.handle(req, res)).rejects.toBeInstanceOf(AppError);
    });

    it("should return error for user not found", async () => {
      const { AppError } = await import("@shared/errors/AppError");
      const refresh_token = sign({ email: "notfound@user.com" }, auth.secret_refresh_token, {
        subject: "notfound-id",
        expiresIn: auth.expires_in_refresh_token,
      });
      await usersTokensRepositoryInMemory.create({
        user_id: "notfound-id",
        refresh_token,
        expires_date: dateProvider.addDays(auth.expires_refresh_token_days),
      });
      const req = mockRequest({ token: refresh_token }, { password: "newnotfound" });
      const res = mockResponse();
      await expect(controller.handle(req, res)).rejects.toBeInstanceOf(AppError);
    });
});

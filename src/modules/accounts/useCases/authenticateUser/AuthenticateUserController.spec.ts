import "reflect-metadata";
import { Request, Response } from "express";
import { AuthenticateUserController } from "./AuthenticateUserController";
import { AuthenticateUserUseCase } from "./AuthenticateUserUseCase";
import { container } from "tsyringe";
import { UsersRepositoryInMemory } from "@modules/accounts/repositories/in-memory/UsersRepositoryInMemory";
import { UsersTokensRepositoryInMemory } from "@modules/accounts/repositories/in-memory/UsersTokensRepositoryInMemory";
import { DayjsDateProvider } from "@shared/container/providers/DateProvider/implementations/DayjsDateProvider";
import { CreateUserUseCase } from "../createUser/CreateUserUseCase";
import { AppError } from "@shared/errors/AppError";

function mockRequest(body: any): Request {
  return { body } as Request;
}

function mockResponse() {
  const res: Partial<Response> = {};
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("AuthenticateUserController", () => {
  let usersRepositoryInMemory: UsersRepositoryInMemory;
  let usersTokensRepositoryInMemory: UsersTokensRepositoryInMemory;
  let dateProvider: DayjsDateProvider;
  let authenticateUserUseCase: AuthenticateUserUseCase;
  let createUserUseCase: CreateUserUseCase;
  let controller: AuthenticateUserController;

  beforeEach(() => {
    usersRepositoryInMemory = new UsersRepositoryInMemory();
    usersTokensRepositoryInMemory = new UsersTokensRepositoryInMemory();
    dateProvider = new DayjsDateProvider();
    authenticateUserUseCase = new AuthenticateUserUseCase(
      usersRepositoryInMemory,
      usersTokensRepositoryInMemory,
      dateProvider
    );
    createUserUseCase = new CreateUserUseCase(usersRepositoryInMemory);
    controller = new AuthenticateUserController(authenticateUserUseCase);
  });

  it("should authenticate user and return token", async () => {
    await createUserUseCase.execute({
      driver_license: "000123",
      email: "user@controller.com",
      password: "1234",
      name: "User Controller",
    });
    const req = mockRequest({ email: "user@controller.com", password: "1234" });
    const res = mockResponse();
    await controller.handle(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: expect.any(String) }));
  });

  it("should return error for invalid credentials", async () => {
    const req = mockRequest({ email: "wrong@controller.com", password: "wrong" });
    const res = mockResponse();
    await expect(controller.handle(req, res)).rejects.toEqual(new AppError("Email or password incorrect!"));
  });

  it("should return error if email is missing", async () => {
    const req = mockRequest({ password: "1234" });
    const res = mockResponse();
    await expect(controller.handle(req, res)).rejects.toEqual(new AppError("Email or password incorrect!"));
  });

  it("should return error if password is missing", async () => {
    const req = mockRequest({ email: "user@controller.com" });
    const res = mockResponse();
    await expect(controller.handle(req, res)).rejects.toEqual(new AppError("Email or password incorrect!"));
  });

  it("should not call useCase if body is missing", async () => {
    const req = mockRequest({});
    const res = mockResponse();
    const useCaseSpy = jest.spyOn(authenticateUserUseCase, "execute");
    await expect(controller.handle(req, res)).rejects.toEqual(new AppError("Email or password incorrect!"));
    expect(useCaseSpy).not.toHaveBeenCalled();
  });
  it("should use setUseCase to change use case", async () => {
    await createUserUseCase.execute({
      driver_license: "000999",
      email: "set@user.com",
      password: "setpass",
      name: "Set User",
    });
    const newUseCase = new AuthenticateUserUseCase(
      usersRepositoryInMemory,
      usersTokensRepositoryInMemory,
      dateProvider
    );
    const resolveSpy = jest.spyOn(container, "resolve").mockImplementation(() => newUseCase);
    const controllerNoUseCase = new AuthenticateUserController();
    resolveSpy.mockRestore();
    controllerNoUseCase.setUseCase(newUseCase);
    const req = mockRequest({ email: "set@user.com", password: "setpass" });
    const res = mockResponse();
    await controllerNoUseCase.handle(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: expect.any(String) }));
  });

  it("should fallback to container if no use case injected", async () => {
    await createUserUseCase.execute({
      driver_license: "000888",
      email: "container@user.com",
      password: "containerpass",
      name: "Container User",
    });
    // Mock container.resolve before creating the controller to prevent DI error
    const resolveSpy = jest.spyOn(container, "resolve").mockImplementation(() => authenticateUserUseCase);
    const controllerNoUseCase = new AuthenticateUserController();
    resolveSpy.mockRestore();
    const req = mockRequest({ email: "container@user.com", password: "containerpass" });
    const res = mockResponse();
    await controllerNoUseCase.handle(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: expect.any(String) }));
  });
});

import "reflect-metadata";
import { CreateUserController } from "./CreateUserController";
import { CreateUserUseCase } from "./CreateUserUseCase";
import { UsersRepositoryInMemory } from "@modules/accounts/repositories/in-memory/UsersRepositoryInMemory";
import { hash, compare } from "bcrypt";
import { Request, Response } from "express";

function mockRequest(body: any): Request {
  return { body } as Request;
}

function mockResponse() {
  const res: Partial<Response> = {};
  res.send = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("CreateUserController", () => {
  let usersRepositoryInMemory: UsersRepositoryInMemory;
  let createUserUseCase: CreateUserUseCase;
  let controller: CreateUserController;

  beforeEach(() => {
    usersRepositoryInMemory = new UsersRepositoryInMemory();
    createUserUseCase = new CreateUserUseCase(usersRepositoryInMemory);
    controller = new CreateUserController(createUserUseCase);
  });

  it("should create a new user", async () => {
    const req = mockRequest({
      name: "Test User",
      email: "test@user.com",
      password: "123456",
      driver_license: "000111"
    });
    const res = mockResponse();
    await controller.handle(req, res);
    const user = await usersRepositoryInMemory.findByEmail("test@user.com");
    expect(user).toBeDefined();
    expect(user?.name).toBe("Test User");
    expect(await compare("123456", user?.password ?? "")).toBe(true);
    expect(res.send).toHaveBeenCalled();
  });

  it("should not allow duplicate emails", async () => {
    await usersRepositoryInMemory.create({
      name: "Test User",
      email: "test@user.com",
      password: await hash("123456", 8),
      driver_license: "000111"
    });
    const req = mockRequest({
      name: "Test User 2",
      email: "test@user.com",
      password: "654321",
      driver_license: "222333"
    });
    const res = mockResponse();
    const { AppError } = await import("@shared/errors/AppError");
    await expect(controller.handle(req, res)).rejects.toBeInstanceOf(AppError);
  });

    it("should set a new useCase via setUseCase", async () => {
      const newRepo = new UsersRepositoryInMemory();
      const newUseCase = new CreateUserUseCase(newRepo);
      controller.setUseCase(newUseCase);
      const req = mockRequest({
        name: "User Set",
        email: "set@user.com",
        password: "abc123",
        driver_license: "999888"
      });
      const res = mockResponse();
      await controller.handle(req, res);
      const user = await newRepo.findByEmail("set@user.com");
      expect(user).toBeDefined();
      expect(user?.name).toBe("User Set");
      expect(res.send).toHaveBeenCalled();
    });

    it("should resolve useCase from container if not provided", async () => {
      // Mock container.resolve
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      const { container } = await import("tsyringe");
      jest.spyOn(container, "resolve").mockReturnValue({ execute: mockExecute } as any);
      const controllerNoUseCase = new CreateUserController();
      const req = mockRequest({
        name: "Container User",
        email: "container@user.com",
        password: "pass123",
        driver_license: "123456"
      });
      const res = mockResponse();
      await controllerNoUseCase.handle(req, res);
      expect(container.resolve).toHaveBeenCalledWith(CreateUserUseCase);
      expect(mockExecute).toHaveBeenCalledWith({
        name: "Container User",
        email: "container@user.com",
        password: "pass123",
        driver_license: "123456"
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalled();
      jest.restoreAllMocks();
    });
});

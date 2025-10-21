import "reflect-metadata";
import { Request, Response } from "express";
import { ProfileUserController } from "./ProfileUserController";
import { ProfileUserUseCase } from "./ProfileUserUseCase";
import { UsersRepositoryInMemory } from "@modules/accounts/repositories/in-memory/UsersRepositoryInMemory";
import { CreateUserUseCase } from "../createUser/CreateUserUseCase";

function mockRequest(user: any): Request {
  return { user } as Request;
}

function mockResponse() {
  const res: Partial<Response> = {};
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("ProfileUserController", () => {
  let usersRepositoryInMemory: UsersRepositoryInMemory;
  let profileUserUseCase: ProfileUserUseCase;
  let createUserUseCase: CreateUserUseCase;
  let controller: ProfileUserController;

  beforeEach(async () => {
    usersRepositoryInMemory = new UsersRepositoryInMemory();
    profileUserUseCase = new ProfileUserUseCase(usersRepositoryInMemory);
    createUserUseCase = new CreateUserUseCase(usersRepositoryInMemory);
    controller = new ProfileUserController(profileUserUseCase);
  });

  it("should return user profile", async () => {
    const user = await createUserUseCase.execute({
      driver_license: "123456",
      email: "profile@user.com",
      password: "1234",
      name: "Profile User",
    });
    const req = mockRequest({ id: user.id });
    const res = mockResponse();
    await controller.handle(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ email: "profile@user.com" }));
  });

  it("should throw error if user not found", async () => {
    const req = mockRequest({ id: "nonexistent" });
    const res = mockResponse();
    await expect(controller.handle(req, res)).rejects.toThrow("User not found");
  });

    it("should set a new useCase via setUseCase", async () => {
      const newRepo = new UsersRepositoryInMemory();
      const newCreateUserUseCase = new CreateUserUseCase(newRepo);
      const newUseCase = new ProfileUserUseCase(newRepo);
      controller.setUseCase(newUseCase);
      const user = await newCreateUserUseCase.execute({
        driver_license: "654321",
        email: "set@user.com",
        password: "pass",
        name: "Set User",
      });
      const req = mockRequest({ id: user.id });
      const res = mockResponse();
      await controller.handle(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ email: "set@user.com" }));
    });

    it("should resolve useCase from container if not provided", async () => {
      const mockExecute = jest.fn().mockResolvedValue({ id: "container-id", email: "container@user.com" });
      const { container } = await import("tsyringe");
      jest.spyOn(container, "resolve").mockReturnValue({ execute: mockExecute } as any);
      const controllerNoUseCase = new ProfileUserController();
      const req = mockRequest({ id: "container-id" });
      const res = mockResponse();
      await controllerNoUseCase.handle(req, res);
      expect(container.resolve).toHaveBeenCalledWith(ProfileUserUseCase);
      expect(mockExecute).toHaveBeenCalledWith("container-id");
      expect(res.json).toHaveBeenCalledWith({ id: "container-id", email: "container@user.com" });
      jest.restoreAllMocks();
    });
});

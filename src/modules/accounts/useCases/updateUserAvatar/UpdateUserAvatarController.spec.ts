import "reflect-metadata";
import { Request, Response } from "express";
import { UpdateUserAvatarController } from "./UpdateUserAvatarController";
import { UpdateUserAvatarUseCase } from "./UpdateUserAvatarUseCase";
import { UsersRepositoryInMemory } from "@modules/accounts/repositories/in-memory/UsersRepositoryInMemory";
import { StorageProviderInMemory } from "@shared/container/providers/StorageProvider/in-memory/StorageProviderInMemory";

function mockRequest(user: any, file: any): Request {
  return { user, file } as Request;
}

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("UpdateUserAvatarController", () => {
  let usersRepositoryInMemory: UsersRepositoryInMemory;
  let storageProviderInMemory: StorageProviderInMemory;
  let updateUserAvatarUseCase: UpdateUserAvatarUseCase;
  let controller: UpdateUserAvatarController;

  beforeEach(() => {
    usersRepositoryInMemory = new UsersRepositoryInMemory();
    storageProviderInMemory = new StorageProviderInMemory();
    updateUserAvatarUseCase = new UpdateUserAvatarUseCase(
      usersRepositoryInMemory,
      storageProviderInMemory
    );
    controller = new UpdateUserAvatarController(updateUserAvatarUseCase);
  });

  it("should update user avatar", async () => {
    const user = await usersRepositoryInMemory.create({
      driver_license: "123456",
      email: "avatar@user.com",
      password: "1234",
      name: "Avatar User",
    });
    const req = mockRequest({ id: user.id }, { filename: "avatar.png" });
    const res = mockResponse();
    await controller.handle(req, res);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  it("should return 400 if file is missing", async () => {
    const user = await usersRepositoryInMemory.create({
      driver_license: "654321",
      email: "nofile@user.com",
      password: "1234",
      name: "NoFile User",
    });
    const req = mockRequest({ id: user.id }, undefined);
    const res = mockResponse();
    await controller.handle(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "File is required" });
  });

    it("should set a new useCase via setUseCase", async () => {
      const newRepo = new UsersRepositoryInMemory();
      const newStorage = new StorageProviderInMemory();
      const newUseCase = new UpdateUserAvatarUseCase(newRepo, newStorage);
      controller.setUseCase(newUseCase);
      const user = await newRepo.create({
        driver_license: "999999",
        email: "set@user.com",
        password: "pass",
        name: "Set User",
      });
      const req = mockRequest({ id: user.id }, { filename: "setavatar.png" });
      const res = mockResponse();
      await controller.handle(req, res);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it("should resolve useCase from container if not provided", async () => {
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      const { container } = await import("tsyringe");
      jest.spyOn(container, "resolve").mockReturnValue({ execute: mockExecute } as any);
      const controllerNoUseCase = new UpdateUserAvatarController();
      const req = mockRequest({ id: "container-id" }, { filename: "container.png" });
      const res = mockResponse();
      await controllerNoUseCase.handle(req, res);
      expect(container.resolve).toHaveBeenCalledWith(UpdateUserAvatarUseCase);
      expect(mockExecute).toHaveBeenCalledWith({ user_id: "container-id", avatar_file: "container.png" });
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
      jest.restoreAllMocks();
    });

    it("should throw error if user not found in useCase", async () => {
      const req = mockRequest({ id: "nonexistent" }, { filename: "avatar.png" });
      const res = mockResponse();
      await expect(controller.handle(req, res)).rejects.toThrow("User not found!");
    });
});

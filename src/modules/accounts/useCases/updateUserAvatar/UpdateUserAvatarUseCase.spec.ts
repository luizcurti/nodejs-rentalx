import "reflect-metadata";
import { UpdateUserAvatarUseCase } from "./UpdateUserAvatarUseCase";
import { UsersRepositoryInMemory } from "@modules/accounts/repositories/in-memory/UsersRepositoryInMemory";
import { StorageProviderInMemory } from "@shared/container/providers/StorageProvider/in-memory/StorageProviderInMemory";

describe("UpdateUserAvatarUseCase", () => {
  let usersRepositoryInMemory: UsersRepositoryInMemory;
  let storageProviderInMemory: StorageProviderInMemory;
  let updateUserAvatarUseCase: UpdateUserAvatarUseCase;

  beforeEach(() => {
    usersRepositoryInMemory = new UsersRepositoryInMemory();
    storageProviderInMemory = new StorageProviderInMemory();
    updateUserAvatarUseCase = new UpdateUserAvatarUseCase(
      usersRepositoryInMemory,
      storageProviderInMemory
    );
  });

  it("should update user avatar", async () => {
    const user = await usersRepositoryInMemory.create({
      driver_license: "789123",
      email: "avatar@usecase.com",
      password: "1234",
      name: "Avatar UseCase",
    });

    await updateUserAvatarUseCase.execute({ user_id: user.id, avatar_file: "avatar.png" });

    const updatedUser = await usersRepositoryInMemory.findById(user.id);
    expect(updatedUser?.avatar).toBe("avatar.png");
  });

  it("should throw error if user not found", async () => {
    await expect(
      updateUserAvatarUseCase.execute({ user_id: "nonexistent", avatar_file: "avatar.png" })
    ).rejects.toThrow("User not found!");
  });

  it("should delete old avatar if user already has one", async () => {
    const user = await usersRepositoryInMemory.create({
      driver_license: "555555",
      email: "oldavatar@usecase.com",
      password: "1234",
      name: "Old Avatar",
      avatar: "old.png"
    });

    const spyDelete = jest.spyOn(storageProviderInMemory, "delete");

    await updateUserAvatarUseCase.execute({ user_id: user.id, avatar_file: "newavatar.png" });

    expect(spyDelete).toHaveBeenCalledWith("old.png", "avatar");

    const updatedUser = await usersRepositoryInMemory.findById(user.id);
    expect(updatedUser?.avatar).toBe("newavatar.png");
  });

  it("should call save and create when updating avatar", async () => {
    const user = await usersRepositoryInMemory.create({
      driver_license: "666666",
      email: "savecreate@usecase.com",
      password: "1234",
      name: "Save Create"
    });

    const spySave = jest.spyOn(storageProviderInMemory, "save");
    const spyCreate = jest.spyOn(usersRepositoryInMemory, "create");

    await updateUserAvatarUseCase.execute({ user_id: user.id, avatar_file: "avatar2.png" });

    expect(spySave).toHaveBeenCalledWith("avatar2.png", "avatar");
    expect(spyCreate).toHaveBeenCalled();
  });

  it("should cover ?? '' defaults when user fields are undefined", async () => {
    // cria usuário com todos os campos undefined para forçar uso do ??
    const user = await usersRepositoryInMemory.create({
      driver_license: undefined as any,
      email: undefined as any,
      password: undefined as any,
      name: undefined as any,
      avatar: undefined as any,
    });

    const spyCreate = jest.spyOn(usersRepositoryInMemory, "create");

    await updateUserAvatarUseCase.execute({ user_id: user.id, avatar_file: "defaultavatar.png" });

    expect(spyCreate).toHaveBeenCalled();

    const calledArg = spyCreate.mock.calls[0][0];
    expect(calledArg.driver_license).toBe("");
    expect(calledArg.email).toBe("");
    expect(calledArg.password).toBe("");
    expect(calledArg.name).toBe("");
    expect(calledArg.avatar).toBe("defaultavatar.png");
  });
});

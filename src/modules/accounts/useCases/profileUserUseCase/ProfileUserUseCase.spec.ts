import "reflect-metadata";
import { ProfileUserUseCase } from "./ProfileUserUseCase";
import { UsersRepositoryInMemory } from "@modules/accounts/repositories/in-memory/UsersRepositoryInMemory";
import { CreateUserUseCase } from "../createUser/CreateUserUseCase";

describe("ProfileUserUseCase", () => {
  let usersRepositoryInMemory: UsersRepositoryInMemory;
  let profileUserUseCase: ProfileUserUseCase;
  let createUserUseCase: CreateUserUseCase;

  beforeEach(() => {
    usersRepositoryInMemory = new UsersRepositoryInMemory();
    profileUserUseCase = new ProfileUserUseCase(usersRepositoryInMemory);
    createUserUseCase = new CreateUserUseCase(usersRepositoryInMemory);
  });

  it("should return user profile", async () => {
    const user = await createUserUseCase.execute({
      driver_license: "654321",
      email: "usecase@user.com",
      password: "1234",
      name: "UseCase User",
    });
    const result = await profileUserUseCase.execute(user.id);
    expect(result.email).toBe("usecase@user.com");
  });

  it("should throw error if user not found", async () => {
    await expect(profileUserUseCase.execute("nonexistent")).rejects.toThrow("User not found");
  });
});

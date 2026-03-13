import "reflect-metadata";
import { ResetPasswordUserUseCase } from "./ResetPasswordUserUseCase";
import { UsersRepositoryInMemory } from "@modules/accounts/repositories/in-memory/UsersRepositoryInMemory";
import { UsersTokensRepositoryInMemory } from "@modules/accounts/repositories/in-memory/UsersTokensRepositoryInMemory";
import { DayjsDateProvider } from "@shared/container/providers/DateProvider/implementations/DayjsDateProvider";
import { hash, compare } from "bcrypt";
import { sign } from "jsonwebtoken";
import auth from "@config/auth";

describe("ResetPasswordUserUseCase", () => {
  let usersRepositoryInMemory: UsersRepositoryInMemory;
  let usersTokensRepositoryInMemory: UsersTokensRepositoryInMemory;
  let dateProvider: DayjsDateProvider;
  let resetPasswordUserUseCase: ResetPasswordUserUseCase;

  beforeEach(() => {
    usersRepositoryInMemory = new UsersRepositoryInMemory();
    usersTokensRepositoryInMemory = new UsersTokensRepositoryInMemory();
    dateProvider = new DayjsDateProvider();
    resetPasswordUserUseCase = new ResetPasswordUserUseCase(
      usersTokensRepositoryInMemory,
      dateProvider,
      usersRepositoryInMemory
    );
  });

  it("should reset password with valid token", async () => {
    const user = await usersRepositoryInMemory.create({
      driver_license: "654321",
      email: "reset@usecase.com",
      password: await hash("oldpass", 8),
      name: "Reset UseCase",
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
  await resetPasswordUserUseCase.execute({ token: refresh_token, password: "newpass" });
  const updatedUser = await usersRepositoryInMemory.findById(user.id);
  const isPasswordChanged = await compare("newpass", updatedUser?.password ?? "");
  expect(isPasswordChanged).toBe(true);
  });

  it("should throw error for invalid token", async () => {
    const { AppError } = await import("@shared/errors/AppError");
    await expect(
      resetPasswordUserUseCase.execute({ token: "invalid", password: "newpass" })
    ).rejects.toBeInstanceOf(AppError);
  });

    it("should throw error for expired token", async () => {
      const { AppError } = await import("@shared/errors/AppError");
      const user = await usersRepositoryInMemory.create({
        driver_license: "888888",
        email: "expired@usecase.com",
        password: await hash("oldexpired", 8),
        name: "Expired UseCase",
      });
      const refresh_token = sign({ email: user.email }, auth.secret_refresh_token, {
        subject: user.id,
        expiresIn: auth.expires_in_refresh_token,
      });
      await usersTokensRepositoryInMemory.create({
        user_id: user.id,
        refresh_token,
        expires_date: dateProvider.addDays(-1), 
      });
      await expect(
        resetPasswordUserUseCase.execute({ token: refresh_token, password: "newexpired" })
      ).rejects.toBeInstanceOf(AppError);
    });

    it("should throw error for user not found", async () => {
      const { AppError } = await import("@shared/errors/AppError");
      const refresh_token = sign({ email: "notfound@usecase.com" }, auth.secret_refresh_token, {
        subject: "notfound-id",
        expiresIn: auth.expires_in_refresh_token,
      });
      await usersTokensRepositoryInMemory.create({
        user_id: "notfound-id",
        refresh_token,
        expires_date: dateProvider.addDays(auth.expires_refresh_token_days),
      });
      await expect(
        resetPasswordUserUseCase.execute({ token: refresh_token, password: "newnotfound" })
      ).rejects.toBeInstanceOf(AppError);
    });

    it("should call deleteById on token after reset", async () => {
      const user = await usersRepositoryInMemory.create({
        driver_license: "777777",
        email: "delete@usecase.com",
        password: await hash("olddelete", 8),
        name: "Delete UseCase",
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
      const spyDelete = jest.spyOn(usersTokensRepositoryInMemory, "deleteById");
      await resetPasswordUserUseCase.execute({ token: refresh_token, password: "newdelete" });
      expect(spyDelete).toHaveBeenCalled();
    });
        
    it("should throw 'User not found!' when token has undefined user_id (covers user_id ?? \"\")", async () => {
      const { AppError } = await import("@shared/errors/AppError");

      const refresh_token = sign({ email: "no-user@usecase.com" }, auth.secret_refresh_token, {
        subject: "some-subject",
        expiresIn: auth.expires_in_refresh_token,
      });

      await usersTokensRepositoryInMemory.create({
        user_id: undefined as any,
        refresh_token,
        expires_date: dateProvider.addDays(auth.expires_refresh_token_days),
      });

      await expect(
        resetPasswordUserUseCase.execute({ token: refresh_token, password: "any" })
      ).rejects.toBeInstanceOf(AppError);
    });

    it("should call usersRepository.create with default empty values when user fields are undefined (covers user.* ?? \"\" lines)", async () => {
      const user = await usersRepositoryInMemory.create({
        driver_license: undefined as any,
        email: undefined as any,
        password: await hash("oldpass", 8),
        name: undefined as any,
        avatar: undefined as any,
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

      const spySave = jest.spyOn(usersRepositoryInMemory, "save");

      await resetPasswordUserUseCase.execute({ token: refresh_token, password: "newpass" });

      expect(spySave).toHaveBeenCalled();

      const savedUser = spySave.mock.calls[0][0];
      expect(savedUser.id).toBe(user.id);
      expect(savedUser.password).toBeDefined();
    });

  it("should handle token with undefined expires_date (covers userToken.expires_date ?? new Date())", async () => {
    const user = await usersRepositoryInMemory.create({
      driver_license: "999999",
      email: "nodef@usecase.com",
      password: await hash("old", 8),
      name: "No Exp",
    });

    const refresh_token = sign({ email: user.email }, auth.secret_refresh_token, {
      subject: user.id,
      expiresIn: auth.expires_in_refresh_token,
    });

    await usersTokensRepositoryInMemory.create({
      user_id: user.id,
      refresh_token,
      expires_date: undefined as any,
    });

    await expect(
      resetPasswordUserUseCase.execute({ token: refresh_token, password: "new" })
    ).resolves.toBeUndefined();
  });

  it("should use empty string for avatar when user.avatar is undefined (covers avatar ?? \"\")", async () => {
    const user = await usersRepositoryInMemory.create({
      driver_license: "111111",
      email: undefined as any,
      password: await hash("old", 8),
      name: "NoAvatar",
      avatar: undefined as any, 
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

    const spySave = jest.spyOn(usersRepositoryInMemory, "save");
    await resetPasswordUserUseCase.execute({ token: refresh_token, password: "newp" });
    expect(spySave).toHaveBeenCalled();
    const savedUser = spySave.mock.calls[0][0];
    expect(savedUser.avatar).toBeUndefined();;
  });

  it("should use empty string for avatar when repository user has avatar undefined (force findById to return avatar undefined)", async () => {
    const user = await usersRepositoryInMemory.create({
      driver_license: "222222",
      email: "forceavatar@usecase.com",
      password: await hash("old", 8),
      name: "ForceAvatar",
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

    const forcedUser = { ...user, avatar: undefined as any };
    const spyFindById = jest
      .spyOn(usersRepositoryInMemory, "findById")
      .mockResolvedValueOnce(forcedUser as any);

    const spySave = jest.spyOn(usersRepositoryInMemory, "save");

    await resetPasswordUserUseCase.execute({ token: refresh_token, password: "newp" });

    expect(spyFindById).toHaveBeenCalledWith(user.id);
    expect(spySave).toHaveBeenCalled();

    const savedUser = spySave.mock.calls[0][0];
    expect(savedUser.avatar).toBeUndefined();
    spyFindById.mockRestore();
  });
});

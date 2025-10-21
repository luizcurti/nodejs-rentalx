import "reflect-metadata";
import { RefreshTokenUseCase } from "./RefreshTokenUseCase";
import { UsersTokensRepositoryInMemory } from "@modules/accounts/repositories/in-memory/UsersTokensRepositoryInMemory";
import { DayjsDateProvider } from "@shared/container/providers/DateProvider/implementations/DayjsDateProvider";
import { sign } from "jsonwebtoken";
import auth from "@config/auth";
import { AppError } from "@shared/errors/AppError";

describe("RefreshTokenUseCase", () => {
  it("should await all create calls for multiple tokens", async () => {
    const user_id = "multi-user-id";
    const email = "multi@usecase.com";
    const refresh_token = sign({ email }, auth.secret_refresh_token, {
      subject: user_id,
      expiresIn: auth.expires_in_refresh_token,
    });
    const createSpy = jest.spyOn(usersTokensRepositoryInMemory, "create");
    await usersTokensRepositoryInMemory.create({
      user_id,
      refresh_token,
      expires_date: dateProvider.addDays(auth.expires_refresh_token_days),
    });
    // Executa o use case e aguarda todas as promessas
    const result = await refreshTokenUseCase.execute(refresh_token);
    expect(result).toHaveProperty("token");
    expect(result).toHaveProperty("refresh_token");
    expect(createSpy).toHaveBeenCalled();
  });
  it("should call usersTokensRepository.create with correct params", async () => {
    const user_id = "user-create-id";
    const email = "create@usecase.com";
    const refresh_token = sign({ email }, auth.secret_refresh_token, {
      subject: user_id,
      expiresIn: auth.expires_in_refresh_token,
    });
    const createSpy = jest.spyOn(usersTokensRepositoryInMemory, "create");
    await usersTokensRepositoryInMemory.create({
      user_id,
      refresh_token,
      expires_date: dateProvider.addDays(auth.expires_refresh_token_days),
    });
    await refreshTokenUseCase.execute(refresh_token);
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id,
        refresh_token: expect.any(String),
        expires_date: expect.any(Date),
      })
    );
  });
  let usersTokensRepositoryInMemory: UsersTokensRepositoryInMemory;
  let dateProvider: DayjsDateProvider;
  let refreshTokenUseCase: RefreshTokenUseCase;

  beforeEach(() => {
    usersTokensRepositoryInMemory = new UsersTokensRepositoryInMemory();
    dateProvider = new DayjsDateProvider();
    refreshTokenUseCase = new RefreshTokenUseCase(usersTokensRepositoryInMemory, dateProvider);
  });

  it("should refresh token", async () => {
    const user_id = "user-id";
    const email = "refresh@usecase.com";
    const refresh_token = sign({ email }, auth.secret_refresh_token, {
      subject: user_id,
      expiresIn: auth.expires_in_refresh_token,
    });
    await usersTokensRepositoryInMemory.create({
      user_id,
      refresh_token,
      expires_date: dateProvider.addDays(auth.expires_refresh_token_days),
    });
    const result = await refreshTokenUseCase.execute(refresh_token);
    expect(result).toHaveProperty("token");
    expect(result).toHaveProperty("refresh_token");
  });

  it("should throw error if refresh token does not exist", async () => {
    await expect(refreshTokenUseCase.execute("invalidtoken")).rejects.toThrow();
  });

    it("should throw error if JWT is invalid", async () => {
      // Token malformado
      await expect(refreshTokenUseCase.execute("not.a.jwt.token")).rejects.toThrow();
    });

    it("should throw error if JWT is expired", async () => {
      const user_id = "expired-user";
      const email = "expired@usecase.com";
      // Cria token já expirado
      const expired_token = sign({ email }, auth.secret_refresh_token, {
        subject: user_id,
        expiresIn: -10, // Expirado
      });
      await usersTokensRepositoryInMemory.create({
        user_id,
        refresh_token: expired_token,
        expires_date: dateProvider.addDays(-1),
      });
      await expect(refreshTokenUseCase.execute(expired_token)).rejects.toThrow();
    });

    it("should throw AppError when refresh token is valid but not stored in repository", async () => {
      const user_id = "not-stored-user";
      const email = "notstored@usecase.com";

      // Gera um JWT de refresh válido, mas NÃO persiste no repositório
      const validButNotStoredToken = sign({ email }, auth.secret_refresh_token, {
        subject: user_id,
        expiresIn: auth.expires_in_refresh_token,
      });

      // Invoca e captura o erro para assertar tipo e mensagem (evita executar a função duas vezes)
      await refreshTokenUseCase.execute(validButNotStoredToken).catch((err) => {
        expect(err).toBeInstanceOf(AppError);
        expect(err.message).toBe("Refresh Token does not exists!");
      });
    }); 
});


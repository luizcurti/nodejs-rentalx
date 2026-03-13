import "reflect-metadata";
import { SendForgotPasswordMailController } from "./SendForgotPasswordMailController";
import { SendForgotPasswordMailUseCase } from "./SendForgotPasswordMailUseCase";
import { UsersRepositoryInMemory } from "@modules/accounts/repositories/in-memory/UsersRepositoryInMemory";
import { UsersTokensRepositoryInMemory } from "@modules/accounts/repositories/in-memory/UsersTokensRepositoryInMemory";
import { DayjsDateProvider } from "@shared/container/providers/DateProvider/implementations/DayjsDateProvider";
import { MailProviderInMemory } from "@shared/container/providers/MailProvider/in-memory/MailProviderInMemory";
import { hash } from "bcrypt";
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

describe("SendForgotPasswordMailController", () => {
  let usersRepositoryInMemory: UsersRepositoryInMemory;
  let usersTokensRepositoryInMemory: UsersTokensRepositoryInMemory;
  let dateProvider: DayjsDateProvider;
  let mailProviderInMemory: MailProviderInMemory;
  let sendForgotPasswordMailUseCase: SendForgotPasswordMailUseCase;
  let controller: SendForgotPasswordMailController;

  beforeEach(() => {
    usersRepositoryInMemory = new UsersRepositoryInMemory();
    usersTokensRepositoryInMemory = new UsersTokensRepositoryInMemory();
    dateProvider = new DayjsDateProvider();
    mailProviderInMemory = new MailProviderInMemory();
    sendForgotPasswordMailUseCase = new SendForgotPasswordMailUseCase(
      usersRepositoryInMemory,
      usersTokensRepositoryInMemory,
      dateProvider,
      mailProviderInMemory
    );
    controller = new SendForgotPasswordMailController(sendForgotPasswordMailUseCase);
  });

  it("should send forgot password mail to existing user", async () => {
    await usersRepositoryInMemory.create({
      name: "Forgot User",
      email: "forgot@user.com",
      password: await hash("123456", 8),
      driver_license: "999888"
    });
    const req = mockRequest({ email: "forgot@user.com" });
    const res = mockResponse();
    const sendMailSpy = jest.spyOn(mailProviderInMemory, "sendMail");
    await controller.handle(req, res);
    expect(sendMailSpy).toHaveBeenCalled();
    expect(res.send).toHaveBeenCalled();
  });

  it("should return successfully even if user does not exist (no user enumeration)", async () => {
    const req = mockRequest({ email: "notfound@user.com" });
    const res = mockResponse();
    await controller.handle(req, res);
    expect(res.send).toHaveBeenCalled();
  });

    it("should set a new useCase via setUseCase", async () => {
      const newRepo = new UsersRepositoryInMemory();
      const newTokensRepo = new UsersTokensRepositoryInMemory();
      const newDateProvider = new DayjsDateProvider();
      const newMailProvider = new MailProviderInMemory();
      const newUseCase = new SendForgotPasswordMailUseCase(
        newRepo,
        newTokensRepo,
        newDateProvider,
        newMailProvider
      );
      controller.setUseCase(newUseCase);
      await newRepo.create({
        name: "Set User",
        email: "set@user.com",
        password: await hash("abc123", 8),
        driver_license: "111222"
      });
      const req = mockRequest({ email: "set@user.com" });
      const res = mockResponse();
      const sendMailSpy = jest.spyOn(newMailProvider, "sendMail");
      await controller.handle(req, res);
      expect(sendMailSpy).toHaveBeenCalled();
      expect(res.send).toHaveBeenCalled();
    });

    it("should resolve useCase from container if not provided", async () => {
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      const { container } = await import("tsyringe");
      jest.spyOn(container, "resolve").mockReturnValue({ execute: mockExecute } as any);
      const controllerNoUseCase = new SendForgotPasswordMailController();
      const req = mockRequest({ email: "container@user.com" });
      const res = mockResponse();
      await controllerNoUseCase.handle(req, res);
      expect(container.resolve).toHaveBeenCalledWith(SendForgotPasswordMailUseCase);
      expect(mockExecute).toHaveBeenCalledWith("container@user.com");
      expect(res.send).toHaveBeenCalled();
      jest.restoreAllMocks();
    });
});

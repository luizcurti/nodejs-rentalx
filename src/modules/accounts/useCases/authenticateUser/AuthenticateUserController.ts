import { Request, Response } from "express";

import { AuthenticateUserUseCase } from "./AuthenticateUserUseCase";


class AuthenticateUserController {
  private authenticateUserUseCase?: AuthenticateUserUseCase;

  constructor(authenticateUserUseCase?: AuthenticateUserUseCase) {
    // Se não for passado, mantém compatibilidade com DI do tsyringe
    this.authenticateUserUseCase = authenticateUserUseCase;
  }

  setUseCase(useCase: AuthenticateUserUseCase) {
    this.authenticateUserUseCase = useCase;
  }

  async handle(request: Request, response: Response): Promise<Response> {
    const { password, email } = request.body;
    if (!email || !password) {
      const { AppError } = await import("@shared/errors/AppError");
      throw new AppError("Email or password incorrect!");
    }
    let useCase = this.authenticateUserUseCase;
    if (!useCase) {
      const { container } = await import("tsyringe");
      useCase = container.resolve(AuthenticateUserUseCase);
    }
    const token = await useCase.execute({
      password,
      email,
    });
    return response.json(token);
  }
}

export { AuthenticateUserController };

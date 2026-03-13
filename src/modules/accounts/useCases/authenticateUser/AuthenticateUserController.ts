import { Request, Response } from "express";
import { container } from "tsyringe";

import { AppError } from "@shared/errors/AppError";
import { AuthenticateUserUseCase } from "./AuthenticateUserUseCase";

class AuthenticateUserController {
  private authenticateUserUseCase: AuthenticateUserUseCase;

  constructor(authenticateUserUseCase?: AuthenticateUserUseCase) {
    this.authenticateUserUseCase = authenticateUserUseCase ?? container.resolve(AuthenticateUserUseCase);
  }

  setUseCase(useCase: AuthenticateUserUseCase) {
    this.authenticateUserUseCase = useCase;
  }

  async handle(request: Request, response: Response): Promise<Response> {
    const { password, email } = request.body;

    if (!email || !password) {
      throw new AppError("Email or password incorrect!");
    }

    const token = await this.authenticateUserUseCase.execute({
      password,
      email,
    });

    return response.json(token);
  }
}

export { AuthenticateUserController };

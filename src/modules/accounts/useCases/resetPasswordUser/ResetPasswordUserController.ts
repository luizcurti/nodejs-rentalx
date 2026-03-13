import { Request, Response } from "express";
import { container } from "tsyringe";

import { ResetPasswordUserUseCase } from "./ResetPasswordUserUseCase";

class ResetPasswordUserController {
  private resetPasswordUserUseCase: ResetPasswordUserUseCase;

  constructor(resetPasswordUserUseCase?: ResetPasswordUserUseCase) {
    this.resetPasswordUserUseCase = resetPasswordUserUseCase ?? container.resolve(ResetPasswordUserUseCase);
  }

  setUseCase(useCase: ResetPasswordUserUseCase) {
    this.resetPasswordUserUseCase = useCase;
  }

  async handle(request: Request, response: Response): Promise<Response> {
    const { token } = request.query;
    const { password } = request.body;

    await this.resetPasswordUserUseCase.execute({ token: String(token), password });

    return response.send();
  }
}

export { ResetPasswordUserController };

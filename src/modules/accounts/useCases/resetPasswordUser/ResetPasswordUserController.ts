import { Request, Response } from "express";

import { ResetPasswordUserUseCase } from "./ResetPasswordUserUseCase";

class ResetPasswordUserController {
  private resetPasswordUserUseCase?: ResetPasswordUserUseCase;

  constructor(resetPasswordUserUseCase?: ResetPasswordUserUseCase) {
    this.resetPasswordUserUseCase = resetPasswordUserUseCase;
  }

  setUseCase(useCase: ResetPasswordUserUseCase) {
    this.resetPasswordUserUseCase = useCase;
  }

  async handle(request: Request, response: Response): Promise<Response> {
    const { token } = request.query;
    const { password } = request.body;
    let useCase = this.resetPasswordUserUseCase;
    if (!useCase) {
      const { container } = await import("tsyringe");
      useCase = container.resolve(ResetPasswordUserUseCase);
    }
    await useCase.execute({ token: String(token), password });
    return response.send();
  }
}

export { ResetPasswordUserController };

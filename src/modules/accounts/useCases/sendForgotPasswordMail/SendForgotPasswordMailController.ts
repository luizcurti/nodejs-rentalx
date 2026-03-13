import "reflect-metadata";
import { Request, Response } from "express";
import { container } from "tsyringe";

import { SendForgotPasswordMailUseCase } from "./SendForgotPasswordMailUseCase";

class SendForgotPasswordMailController {
  private sendForgotPasswordMailUseCase: SendForgotPasswordMailUseCase;

  constructor(sendForgotPasswordMailUseCase?: SendForgotPasswordMailUseCase) {
    this.sendForgotPasswordMailUseCase =
      sendForgotPasswordMailUseCase ?? container.resolve(SendForgotPasswordMailUseCase);
  }

  setUseCase(useCase: SendForgotPasswordMailUseCase) {
    this.sendForgotPasswordMailUseCase = useCase;
  }

  async handle(request: Request, response: Response): Promise<Response> {
    const { email } = request.body;
    await this.sendForgotPasswordMailUseCase.execute(email);
    return response.send();
  }
}

export { SendForgotPasswordMailController };

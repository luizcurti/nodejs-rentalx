import "reflect-metadata";
import { Request, Response } from "express";

import { SendForgotPasswordMailUseCase } from "./SendForgotPasswordMailUseCase";

class SendForgotPasswordMailController {
  private sendForgotPasswordMailUseCase?: SendForgotPasswordMailUseCase;

  constructor(sendForgotPasswordMailUseCase?: SendForgotPasswordMailUseCase) {
    this.sendForgotPasswordMailUseCase = sendForgotPasswordMailUseCase;
  }

  setUseCase(useCase: SendForgotPasswordMailUseCase) {
    this.sendForgotPasswordMailUseCase = useCase;
  }

  async handle(request: Request, response: Response): Promise<Response> {
    const { email } = request.body;
    let useCase = this.sendForgotPasswordMailUseCase;
    if (!useCase) {
      const { container } = await import("tsyringe");
      useCase = container.resolve(SendForgotPasswordMailUseCase);
    }
    await useCase.execute(email);
    return response.send();
  }
}

export { SendForgotPasswordMailController };

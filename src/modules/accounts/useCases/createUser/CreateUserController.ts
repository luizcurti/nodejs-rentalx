import { Request, Response } from "express";
import { container } from "tsyringe";

import { CreateUserUseCase } from "./CreateUserUseCase";

class CreateUserController {
  private createUserUseCase: CreateUserUseCase;

  constructor(createUserUseCase?: CreateUserUseCase) {
    this.createUserUseCase = createUserUseCase ?? container.resolve(CreateUserUseCase);
  }

  setUseCase(useCase: CreateUserUseCase) {
    this.createUserUseCase = useCase;
  }

  async handle(request: Request, response: Response): Promise<Response> {
    const { name, email, password, driver_license } = request.body;

    await this.createUserUseCase.execute({
      name,
      email,
      password,
      driver_license,
    });

    return response.status(201).send();
  }
}

export { CreateUserController };

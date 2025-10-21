import { Request, Response } from "express";

import { CreateUserUseCase } from "./CreateUserUseCase";


class CreateUserController {
  private createUserUseCase?: CreateUserUseCase;

  constructor(createUserUseCase?: CreateUserUseCase) {
    this.createUserUseCase = createUserUseCase;
  }

  setUseCase(useCase: CreateUserUseCase) {
    this.createUserUseCase = useCase;
  }

  async handle(request: Request, response: Response): Promise<Response> {
    const { name, email, password, driver_license } = request.body;
    let useCase = this.createUserUseCase;
    if (!useCase) {
      const { container } = await import("tsyringe");
      useCase = container.resolve(CreateUserUseCase);
    }
    await useCase.execute({
      name,
      email,
      password,
      driver_license,
    });
    return response.status(201).send();
  }
}

export { CreateUserController };

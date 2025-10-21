import { Response, Request } from "express";
import { container } from "tsyringe";

import { CreateCarSpecificationUseCase } from "./CreateCarSpecificationUseCase";

class CreateCarSpecificationController {
  private createCarSpecificationUseCase: CreateCarSpecificationUseCase;

  constructor(createCarSpecificationUseCase?: CreateCarSpecificationUseCase) {
    this.createCarSpecificationUseCase = createCarSpecificationUseCase ?? container.resolve(CreateCarSpecificationUseCase);
  }

  async handle(request: Request, response: Response): Promise<Response> {
    const { id } = request.params;
    const { specifications_id } = request.body;

    const cars = await this.createCarSpecificationUseCase.execute({
      car_id: id,
      specifications_id,
    });

    return response.json(cars);
  }
}

export { CreateCarSpecificationController };

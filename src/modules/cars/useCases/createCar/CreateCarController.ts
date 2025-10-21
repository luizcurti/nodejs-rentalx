import { Request, Response } from "express";
import { container } from "tsyringe";

import { CreateCarUseCase } from "./CreateCarUseCase";

class CreateCarController {
  private createCarUseCase: CreateCarUseCase;

  constructor(createCarUseCase?: CreateCarUseCase) {
    this.createCarUseCase = createCarUseCase ?? container.resolve(CreateCarUseCase);
  }

  async handle(request: Request, response: Response): Promise<Response> {
    const {
      name,
      description,
      daily_rate,
      license_plate,
      fine_amount,
      brand,
      category_id,
    } = request.body;

    const car = await this.createCarUseCase.execute({
      name,
      description,
      daily_rate,
      license_plate,
      fine_amount,
      brand,
      category_id,
    });

    return response.status(201).json(car);
  }
}

export { CreateCarController };

import { Request, Response } from "express";
import { container } from "tsyringe";

import { DevolutionRentalUseCase } from "./DevolutionRentalUseCase";

class DevolutionRentalController {
  private devolutionRentalUseCase: DevolutionRentalUseCase;

  constructor(devolutionRentalUseCase?: DevolutionRentalUseCase) {
    this.devolutionRentalUseCase = devolutionRentalUseCase ?? container.resolve(DevolutionRentalUseCase);
  }

  async handle(request: Request, response: Response): Promise<Response> {
    const { id: user_id } = request.user;
    const { id } = request.params;

    const rental = await this.devolutionRentalUseCase.execute({
      id,
      user_id,
    });

    return response.status(200).json(rental);
  }
}

export { DevolutionRentalController };

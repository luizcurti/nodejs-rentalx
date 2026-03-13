import { Request, Response } from "express";
import { container } from "tsyringe";
import { AppError } from "@shared/errors/AppError";
import { CreateRentalUseCase } from "./CreateRentalUseCase";

class CreateRentalController {
  private createRentalUseCase: CreateRentalUseCase;

  constructor(createRentalUseCase?: CreateRentalUseCase) {
    this.createRentalUseCase = createRentalUseCase ?? container.resolve(CreateRentalUseCase);
  }

  async handle(request: Request, response: Response): Promise<Response> {
    const { expected_return_date, car_id } = request.body;
    const { id } = request.user;

    if (!expected_return_date) {
      throw new AppError("expected_return_date is required!", 400);
    }

    const parsedDate = new Date(expected_return_date);
    if (isNaN(parsedDate.getTime())) {
      throw new AppError("expected_return_date is not a valid date!", 400);
    }

    const rental = await this.createRentalUseCase.execute({
      car_id,
      expected_return_date: parsedDate,
      user_id: id,
    });

    return response.status(201).json(rental);
  }
}

export { CreateRentalController };

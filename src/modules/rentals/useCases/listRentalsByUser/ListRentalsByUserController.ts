import { Request, Response } from "express";
import { container } from "tsyringe";

import { ListRentalsByUserUseCase } from "./ListRentalsByUserUseCase";

class ListRentalsByUserController {
  private listRentalsByUserUseCase: ListRentalsByUserUseCase;

  constructor(listRentalsByUserUseCase?: ListRentalsByUserUseCase) {
    this.listRentalsByUserUseCase = listRentalsByUserUseCase ?? container.resolve(ListRentalsByUserUseCase);
  }

  async handle(request: Request, response: Response): Promise<Response> {
    const { id } = request.user;
    const page = Number(request.query.page) || 1;
    const limit = Number(request.query.limit) || 20;

    const rentals = await this.listRentalsByUserUseCase.execute(id, page, limit);

    return response.json(rentals);
  }
}

export { ListRentalsByUserController };

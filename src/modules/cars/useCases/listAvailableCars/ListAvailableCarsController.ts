import { Request, Response } from "express";
import { container } from "tsyringe";

import { ListAvailableCarsUseCase } from "./ListAvailableCarsUseCase";

class ListAvailableCarsController {
  private listAvailableCarsUseCase: ListAvailableCarsUseCase;

  constructor(listAvailableCarsUseCase?: ListAvailableCarsUseCase) {
    this.listAvailableCarsUseCase = listAvailableCarsUseCase ?? container.resolve(ListAvailableCarsUseCase);
  }

  async handle(request: Request, response: Response): Promise<Response> {
    const { brand, name, category_id } = request.query;
    const page = Number(request.query.page) || 1;
    const limit = Number(request.query.limit) || 20;

    const cars = await this.listAvailableCarsUseCase.execute({
      brand: brand as string,
      name: name as string,
      category_id: category_id as string,
      page,
      limit,
    });

    return response.json(cars);
  }
}

export { ListAvailableCarsController };

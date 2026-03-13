import { Request, Response } from "express";
import { container } from "tsyringe";

import { ListSpecificationsUseCase } from "./ListSpecificationsUseCase";

class ListSpecificationsController {
  private listSpecificationsUseCase: ListSpecificationsUseCase;

  constructor(listSpecificationsUseCase?: ListSpecificationsUseCase) {
    this.listSpecificationsUseCase =
      listSpecificationsUseCase ?? container.resolve(ListSpecificationsUseCase);
  }

  async handle(request: Request, response: Response): Promise<Response> {
    const page = Number(request.query.page) || 1;
    const limit = Number(request.query.limit) || 20;

    const specifications = await this.listSpecificationsUseCase.execute(page, limit);
    return response.json(specifications);
  }
}

export { ListSpecificationsController };

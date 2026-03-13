import { Request, Response } from "express";
import { container } from "tsyringe";

import { ListCategoriesUseCase } from "./ListCategoriesUseCase";

class ListCategoriesController {
  private listCategoriesUseCase: ListCategoriesUseCase;

  constructor(listCategoriesUseCase?: ListCategoriesUseCase) {
    this.listCategoriesUseCase = listCategoriesUseCase ?? container.resolve(ListCategoriesUseCase);
  }

  async handle(request: Request, response: Response): Promise<Response> {
    const page = Number(request.query.page) || 1;
    const limit = Number(request.query.limit) || 20;

    const all = await this.listCategoriesUseCase.execute(page, limit);
    return response.json(all);
  }
}

export { ListCategoriesController };

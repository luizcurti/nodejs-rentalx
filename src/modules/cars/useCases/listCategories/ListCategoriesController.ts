import { Request, Response } from "express";
import { container } from "tsyringe";

import { ListCategoriesUseCase } from "./ListCategoriesUseCase";

class ListCategoriesController {
  private listCategoriesUseCase: ListCategoriesUseCase;

  constructor(listCategoriesUseCase?: ListCategoriesUseCase) {
    this.listCategoriesUseCase = listCategoriesUseCase ?? container.resolve(ListCategoriesUseCase);
  }

  async handle(request: Request, response: Response): Promise<Response> {
    const all = await this.listCategoriesUseCase.execute();
    return response.json(all);
  }
}

export { ListCategoriesController };

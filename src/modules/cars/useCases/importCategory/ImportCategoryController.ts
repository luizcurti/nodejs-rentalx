import { Request, Response } from "express";
import { container } from "tsyringe";

import { ImportCategoryUseCase } from "./ImportCategoryUseCase";

class ImportCategoryController {
  private importCategoryUseCase: ImportCategoryUseCase;

  constructor(importCategoryUseCase?: ImportCategoryUseCase) {
    this.importCategoryUseCase = importCategoryUseCase ?? container.resolve(ImportCategoryUseCase);
  }

  async handle(request: Request, response: Response): Promise<Response> {
    const { file } = request;

    if (!file) {
      return response.status(400).json({ error: "File is required" });
    }

    await this.importCategoryUseCase.execute(file);

    return response.status(201).send();
  }
}

export { ImportCategoryController };

import { inject, injectable } from "tsyringe";

import { ICategoriesRepository } from "@modules/cars/repositories/ICategoriesRepository";
import { Category } from "@modules/cars/infra/typeorm/entities/Category";

@injectable()
class ListCategoriesUseCase {
  constructor(
    @inject("CategoriesRepository")
    private categoriesRepository: ICategoriesRepository
  ) {}

  async execute(page = 1, limit = 20): Promise<Category[]> {
    const categories = await this.categoriesRepository.list(page, limit);

    return categories;
  }
}

export { ListCategoriesUseCase };

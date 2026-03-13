import { Repository } from "typeorm";

import { AppDataSource } from "@config/data-source";
import {
  ICategoriesRepository,
  ICreateCategoryDTO,
} from "@modules/cars/repositories/ICategoriesRepository";

import { Category } from "../entities/Category";

class CategoriesRepository implements ICategoriesRepository {
  private repository: Repository<Category>;

  constructor() {
    this.repository = AppDataSource.getRepository(Category);
  }

  async create({ description, name }: ICreateCategoryDTO): Promise<void> {
    const category = this.repository.create({
      description,
      name,
    });

    await this.repository.save(category);
  }

  async list(page = 1, limit = 20): Promise<Category[]> {
    const categories = await this.repository.find({
      skip: (page - 1) * limit,
      take: limit,
    });
    return categories;
  }

  async findByName(name: string): Promise<Category | undefined> {
    // Select * from categories where name = "name" limit 1
    const category = await this.repository.findOne({ where: { name } });
    return category ?? undefined;
  }
}

export { CategoriesRepository };

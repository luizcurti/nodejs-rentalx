import { inject, injectable } from "tsyringe";

import { Specification } from "@modules/cars/infra/typeorm/entities/Specification";
import { ISpecificationsRepository } from "@modules/cars/repositories/ISpecificationsRepository";

@injectable()
class ListSpecificationsUseCase {
  constructor(
    @inject("SpecificationsRepository")
    private specificationsRepository: ISpecificationsRepository
  ) {}

  async execute(page = 1, limit = 20): Promise<Specification[]> {
    const specifications = await this.specificationsRepository.list(page, limit);
    return specifications;
  }
}

export { ListSpecificationsUseCase };

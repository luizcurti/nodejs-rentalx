import { inject, injectable } from "tsyringe";

import { Rental } from "@modules/rentals/infra/typeorm/entities/Rental";
import { IRentalsRepository } from "@modules/rentals/repositories/IRentalsRepository";

@injectable()
class ListRentalsByUserUseCase {
  constructor(
    @inject("RentalsRepository")
    private rentalsRepository: IRentalsRepository
  ) {}

  async execute(user_id: string, page = 1, limit = 20): Promise<Rental[]> {
    const rentalsByUser = await this.rentalsRepository.findByUser(
      user_id,
      page,
      limit
    );

    return rentalsByUser;
  }
}

export { ListRentalsByUserUseCase };

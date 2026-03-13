import { ICreateRentalDTO } from "@modules/rentals/dtos/ICreateRentalDTO";
import { Rental } from "@modules/rentals/infra/typeorm/entities/Rental";

import { IRentalsRepository } from "../IRentalsRepository";

class RentalsRepositoryInMemory implements IRentalsRepository {
  rentals: Rental[] = [];

  async findOpenRentalByCar(car_id: string): Promise<Rental | undefined> {
    return this.rentals.find(
      (rental) => rental.car_id === car_id && !rental.end_date
    );
  }

  async findOpenRentalByUser(user_id: string): Promise<Rental | undefined> {
    return this.rentals.find(
      (rental) => rental.user_id === user_id && !rental.end_date
    );
  }

  async create(data: ICreateRentalDTO): Promise<Rental> {
    let rental: Rental;
    if (data.id) {
      // Atualiza rental existente
      rental = this.rentals.find(r => r.id === data.id) ?? new Rental();
      Object.assign(rental, data);
      if (!this.rentals.includes(rental)) {
        this.rentals.push(rental);
      }
    } else {
      rental = new Rental();
      Object.assign(rental, {
        ...data,
        start_date: new Date(),
      });
      this.rentals.push(rental);
    }
    return rental;
  }

  async findById(id: string): Promise<Rental | undefined> {
    return this.rentals.find((rental) => rental.id === id);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async findByUser(user_id: string, _page?: number, _limit?: number): Promise<Rental[]> {
    return this.rentals.filter((rental) => rental.user_id === user_id);
  }
}

export { RentalsRepositoryInMemory };

import { inject, injectable } from "tsyringe";

import { ICarsRepository } from "@modules/cars/repositories/ICarsRepository";
import { Rental } from "@modules/rentals/infra/typeorm/entities/Rental";
import { IRentalsRepository } from "@modules/rentals/repositories/IRentalsRepository";
import { IDateProvider } from "@shared/container/providers/DateProvider/IDateProvider";
import { AppError } from "@shared/errors/AppError";

interface IRequest {
  id: string;
  user_id: string;
}

@injectable()
class DevolutionRentalUseCase {
  constructor(
    @inject("RentalsRepository")
    private rentalsRepository: IRentalsRepository,
    @inject("CarsRepository")
    private carsRepository: ICarsRepository,
    @inject("DayjsDateProvider")
    private dateProvider: IDateProvider
  ) {}

  async execute({ id, user_id }: IRequest): Promise<Rental> {
    const rental = await this.rentalsRepository.findById(id);
    if (!rental) {
      throw new AppError("Rental does not exists!");
    }

    if ((rental.user_id ?? "") !== user_id) {
      throw new AppError("Rental does not belong to user!", 403);
    }
    const car = await this.carsRepository.findById(rental.car_id ?? "");

    const minimum_daily = 1;

    const dateNow = this.dateProvider.dateNow();

    let daily = this.dateProvider.compareInDays(
      rental.start_date ?? new Date(),
      this.dateProvider.dateNow()
    );

    if (daily <= 0) {
      daily = minimum_daily;
    }

    const delay = this.dateProvider.compareInDays(
      dateNow,
      rental.expected_return_date ?? new Date()
    );

    let total = 0;

    if (delay > 0 && car && car.fine_amount !== undefined) {
      const calculate_fine = delay * car.fine_amount;
      total = calculate_fine;
    }

    if (car && car.daily_rate !== undefined) {
      total += daily * car.daily_rate;
    }

    rental.end_date = this.dateProvider.dateNow();
    rental.total = total;

    await this.rentalsRepository.create({
      ...rental,
      user_id: rental.user_id ?? "",
      car_id: rental.car_id ?? "",
      expected_return_date: rental.expected_return_date ?? new Date(),
    });

    if (car) {
      await this.carsRepository.updateAvailable(car.id, true);
    }

    return rental;
  }
}

export { DevolutionRentalUseCase };

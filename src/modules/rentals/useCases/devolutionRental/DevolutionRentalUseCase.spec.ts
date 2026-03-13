import "reflect-metadata";

// tests/devolutionRentalUseCase.unit.spec.ts
import { DevolutionRentalUseCase } from "@modules/rentals/useCases/devolutionRental/DevolutionRentalUseCase";
import { IRentalsRepository } from "@modules/rentals/repositories/IRentalsRepository";
import { ICarsRepository } from "@modules/cars/repositories/ICarsRepository";
import { IDateProvider } from "@shared/container/providers/DateProvider/IDateProvider";
import { AppError } from "@shared/errors/AppError";

describe("DevolutionRentalUseCase (unit)", () => {
  let rentalsRepoMock: jest.Mocked<IRentalsRepository>;
  let carsRepoMock: jest.Mocked<ICarsRepository>;
  let dateProviderMock: jest.Mocked<IDateProvider>;
  let useCase: DevolutionRentalUseCase;

  beforeEach(() => {
    rentalsRepoMock = { findById: jest.fn(), create: jest.fn() } as unknown as jest.Mocked<IRentalsRepository>;
    carsRepoMock = { findById: jest.fn(), updateAvailable: jest.fn() } as unknown as jest.Mocked<ICarsRepository>;
    dateProviderMock = { dateNow: jest.fn(), compareInDays: jest.fn() } as unknown as jest.Mocked<IDateProvider>;

    useCase = new DevolutionRentalUseCase(rentalsRepoMock, carsRepoMock, dateProviderMock);
  });

  it("should handle rental.car_id undefined", async () => {
    const rental = {
      id: "rental8",
      car_id: undefined,
      user_id: "user8",
      start_date: new Date("2025-10-01"),
      expected_return_date: new Date("2025-10-05"),
      end_date: null,
      total: 0
    };
    rentalsRepoMock.findById.mockResolvedValue(rental as any);
    carsRepoMock.findById.mockResolvedValue(undefined);
    dateProviderMock.dateNow.mockReturnValue(new Date("2025-10-06"));
    dateProviderMock.compareInDays.mockReturnValue(1);
    await useCase.execute({ id: "rental8", user_id: "user8" });
    expect(carsRepoMock.findById).toHaveBeenCalledWith("");
    expect(carsRepoMock.updateAvailable).not.toHaveBeenCalled();
  });

  it("should handle rental.start_date undefined", async () => {
    const rental = {
      id: "rental9",
      car_id: "car9",
      user_id: "user9",
      start_date: undefined,
      expected_return_date: new Date("2025-10-05"),
      end_date: null,
      total: 0
    };
    const car = { id: "car9", daily_rate: 100, fine_amount: 20, available: false };
    rentalsRepoMock.findById.mockResolvedValue(rental as any);
    carsRepoMock.findById.mockResolvedValue(car as any);
    dateProviderMock.dateNow.mockReturnValue(new Date("2025-10-06"));
    dateProviderMock.compareInDays.mockReturnValue(1);
    const result = await useCase.execute({ id: "rental9", user_id: "user9" });
    expect(result.total).toBe((1 * car.daily_rate) + (1 * car.fine_amount));
  });

  it("should handle rental.expected_return_date undefined", async () => {
    const rental = {
      id: "rental10",
      car_id: "car10",
      user_id: "user10",
      start_date: new Date("2025-10-01"),
      expected_return_date: undefined,
      end_date: null,
      total: 0
    };
    const car = { id: "car10", daily_rate: 100, fine_amount: 20, available: false };
    rentalsRepoMock.findById.mockResolvedValue(rental as any);
    carsRepoMock.findById.mockResolvedValue(car as any);
    dateProviderMock.dateNow.mockReturnValue(new Date("2025-10-06"));
    dateProviderMock.compareInDays.mockReturnValue(1);
    const result = await useCase.execute({ id: "rental10", user_id: "user10" });
    expect(result.total).toBe((1 * car.daily_rate) + (1 * car.fine_amount));
  });

  it("should handle car.fine_amount = 0 and car.daily_rate = 0", async () => {
    const rental = {
      id: "rental11",
      car_id: "car11",
      user_id: "user11",
      start_date: new Date("2025-10-01"),
      expected_return_date: new Date("2025-10-05"),
      end_date: null,
      total: 0
    };
    const car = { id: "car11", daily_rate: 0, fine_amount: 0, available: false };
    rentalsRepoMock.findById.mockResolvedValue(rental as any);
    carsRepoMock.findById.mockResolvedValue(car as any);
    dateProviderMock.dateNow.mockReturnValue(new Date("2025-10-10"));
    dateProviderMock.compareInDays.mockReturnValue(5);
    const result = await useCase.execute({ id: "rental11", user_id: "user11" });
    expect(result.total).toBe(0);
  });

  it("should handle delay = 0 (no fine)", async () => {
    const rental = {
      id: "rental12",
      car_id: "car12",
      user_id: "user12",
      start_date: new Date("2025-10-01"),
      expected_return_date: new Date("2025-10-05"),
      end_date: null,
      total: 0
    };
    const car = { id: "car12", daily_rate: 100, fine_amount: 20, available: false };
    rentalsRepoMock.findById.mockResolvedValue(rental as any);
    carsRepoMock.findById.mockResolvedValue(car as any);
    dateProviderMock.dateNow.mockReturnValue(new Date("2025-10-05"));
    dateProviderMock.compareInDays.mockImplementation((start: Date) => {
      if (start.getTime() === rental.start_date.getTime()) return 4; // daily = 4
      return 0; // delay = 0
    });
    const result = await useCase.execute({ id: "rental12", user_id: "user12" });
    expect(result.total).toBe(4 * car.daily_rate);
  });

  it("should handle rental.user_id, car_id, expected_return_date undefined in create", async () => {
    const rental = {
      id: "rental13",
      car_id: undefined,
      user_id: undefined,
      start_date: new Date("2025-10-01"),
      expected_return_date: undefined,
      end_date: null,
      total: 0
    };
    const car = { id: "car13", daily_rate: 100, fine_amount: 20, available: false };
    rentalsRepoMock.findById.mockResolvedValue(rental as any);
    carsRepoMock.findById.mockResolvedValue(car as any);
    dateProviderMock.dateNow.mockReturnValue(new Date("2025-10-06"));
    dateProviderMock.compareInDays.mockReturnValue(1);
    await useCase.execute({ id: "rental13", user_id: "" });
    expect(rentalsRepoMock.create).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "",
      car_id: "",
      expected_return_date: expect.any(Date)
    }));
  });
  it("should not call updateAvailable if car does not exist", async () => {
    const rental = {
      id: "rental4",
      car_id: "car4",
      user_id: "user4",
      start_date: new Date("2025-10-01"),
      expected_return_date: new Date("2025-10-05"),
      end_date: null,
      total: 0
    };
    rentalsRepoMock.findById.mockResolvedValue(rental as any);
    carsRepoMock.findById.mockResolvedValue(undefined);
    dateProviderMock.dateNow.mockReturnValue(new Date("2025-10-06"));
    dateProviderMock.compareInDays.mockReturnValue(1);
    await useCase.execute({ id: "rental4", user_id: "user4" });
    expect(carsRepoMock.updateAvailable).not.toHaveBeenCalled();
  });

  it("should not add fine if car.fine_amount is undefined", async () => {
    const rental = {
      id: "rental5",
      car_id: "car5",
      user_id: "user5",
      start_date: new Date("2025-10-01"),
      expected_return_date: new Date("2025-10-05"),
      end_date: null,
      total: 0
    };
    const car = { id: "car5", daily_rate: 100, available: false };
    rentalsRepoMock.findById.mockResolvedValue(rental as any);
    carsRepoMock.findById.mockResolvedValue(car as any);
    dateProviderMock.dateNow.mockReturnValue(new Date("2025-10-10"));
    dateProviderMock.compareInDays.mockReturnValue(5);
    const result = await useCase.execute({ id: "rental5", user_id: "user5" });
    expect(result.total).toBe(5 * car.daily_rate);
  });

  it("should not add daily if car.daily_rate is undefined", async () => {
    const rental = {
      id: "rental6",
      car_id: "car6",
      user_id: "user6",
      start_date: new Date("2025-10-01"),
      expected_return_date: new Date("2025-10-05"),
      end_date: null,
      total: 0
    };
    const car = { id: "car6", fine_amount: 50, available: false };
    rentalsRepoMock.findById.mockResolvedValue(rental as any);
    carsRepoMock.findById.mockResolvedValue(car as any);
    dateProviderMock.dateNow.mockReturnValue(new Date("2025-10-10"));
    dateProviderMock.compareInDays.mockReturnValue(5);
    const result = await useCase.execute({ id: "rental6", user_id: "user6" });
    expect(result.total).toBe(5 * car.fine_amount);
  });

  it("should not add fine if delay > 0 but car.fine_amount is undefined", async () => {
    const rental = {
      id: "rental7",
      car_id: "car7",
      user_id: "user7",
      start_date: new Date("2025-10-01"),
      expected_return_date: new Date("2025-10-05"),
      end_date: null,
      total: 0
    };
    const car = { id: "car7", daily_rate: 80, available: false };
    rentalsRepoMock.findById.mockResolvedValue(rental as any);
    carsRepoMock.findById.mockResolvedValue(car as any);
    dateProviderMock.dateNow.mockReturnValue(new Date("2025-10-10"));
    dateProviderMock.compareInDays.mockReturnValue(5);
    const result = await useCase.execute({ id: "rental7", user_id: "user7" });
    expect(result.total).toBe(5 * car.daily_rate);
  });

  it("should throw AppError if rental does not exist", async () => {
    rentalsRepoMock.findById.mockResolvedValue(undefined);

    await expect(useCase.execute({ id: "rental1", user_id: "user1" }))
      .rejects
      .toEqual(new AppError("Rental does not exists!"));
  });

  it("should calculate total and update car availability", async () => {
    const rental = {
      id: "rental1",
      car_id: "car1",
      user_id: "user1",
      start_date: new Date("2025-10-01"),
      expected_return_date: new Date("2025-10-05"),
      end_date: null,
      total: 0
    };
    const car = { id: "car1", daily_rate: 50, fine_amount: 20, available: false };

    rentalsRepoMock.findById.mockResolvedValue(rental as any);
    carsRepoMock.findById.mockResolvedValue(car as any);
    dateProviderMock.dateNow.mockReturnValue(new Date("2025-10-06"));
    dateProviderMock.compareInDays.mockImplementation((start: Date, end: Date) => {
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    });

    const result = await useCase.execute({ id: "rental1", user_id: "user1" });

    expect(rentalsRepoMock.create).toHaveBeenCalled();
    expect(carsRepoMock.updateAvailable).toHaveBeenCalledWith(car.id, true);
    expect(result.total).toBeGreaterThan(0);
    expect(result.end_date).toBeDefined();
  });

  it("should set daily to minimum if compareInDays returns 0 or negative", async () => {
    const rental = {
      id: "rental2",
      car_id: "car2",
      user_id: "user2",
      start_date: new Date("2025-10-10"),
      expected_return_date: new Date("2025-10-12"),
      end_date: null,
      total: 0
    };
    const car = { id: "car2", daily_rate: 100, fine_amount: 30, available: false };

    rentalsRepoMock.findById.mockResolvedValue(rental as any);
    carsRepoMock.findById.mockResolvedValue(car as any);
    dateProviderMock.dateNow.mockReturnValue(new Date("2025-10-10"));
    // Simula daily <= 0
    dateProviderMock.compareInDays.mockImplementation((start: Date) => {
      if (start.getTime() === rental.start_date.getTime()) return 0; // daily <= 0
      return -1; // delay <= 0
    });

    const result = await useCase.execute({ id: "rental2", user_id: "user2" });
    // daily deve ser setado para minimum_daily (1), então total = 1 * daily_rate
    expect(result.total).toBe(car.daily_rate);
    expect(result.end_date).toBeDefined();
  });

  it("should calculate fine if delay > 0 and fine_amount is defined", async () => {
    const rental = {
      id: "rental3",
      car_id: "car3",
      user_id: "user3",
      start_date: new Date("2025-10-01"),
      expected_return_date: new Date("2025-10-05"),
      end_date: null,
      total: 0
    };
    const car = { id: "car3", daily_rate: 80, fine_amount: 25, available: false };

    rentalsRepoMock.findById.mockResolvedValue(rental as any);
    carsRepoMock.findById.mockResolvedValue(car as any);
    dateProviderMock.dateNow.mockReturnValue(new Date("2025-10-10"));
    // Simula daily > 0 e delay > 0
    dateProviderMock.compareInDays.mockImplementation((start: Date) => {
      if (start.getTime() === rental.start_date.getTime()) return 5; // daily = 5
      return 5; // delay = 5
    });

    const result = await useCase.execute({ id: "rental3", user_id: "user3" });
    // total = (delay * fine_amount) + (daily * daily_rate)
    expect(result.total).toBe((5 * car.fine_amount) + (5 * car.daily_rate));
    expect(result.end_date).toBeDefined();
  });
});

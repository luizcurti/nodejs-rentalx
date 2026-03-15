import "reflect-metadata";
import { Request, Response } from "express";
import { container } from "tsyringe";
import { CreateRentalController } from "@modules/rentals/useCases/createRental/CreateRentalController";
import { CreateRentalUseCase } from "@modules/rentals/useCases/createRental/CreateRentalUseCase";
import { RentalsRepositoryInMemory } from "@modules/rentals/repositories/in-memory/RentalsRepositoryInMemory";
import { DateProviderInMemory } from "@shared/container/providers/DateProvider/in-memory/DateProviderInMemory";
import { CarsRepositoryInMemory } from "@modules/cars/repositories/in-memory/CarsRepositoryInMemory";

describe("CreateRentalController (unit)", () => {
  let controller: CreateRentalController;
  let useCase: CreateRentalUseCase;
  let rentalsRepositoryInMemory: RentalsRepositoryInMemory;
  let dateProviderInMemory: DateProviderInMemory;
  let carsRepositoryInMemory: CarsRepositoryInMemory;

  beforeEach(() => {
    rentalsRepositoryInMemory = new RentalsRepositoryInMemory();
    dateProviderInMemory = new DateProviderInMemory();
    carsRepositoryInMemory = new CarsRepositoryInMemory();
    useCase = new CreateRentalUseCase(
      rentalsRepositoryInMemory,
      dateProviderInMemory,
      carsRepositoryInMemory
    );
    // Mock container.resolve before creating the controller to support the constructor DI pattern
    jest.spyOn(container, "resolve").mockImplementation((target: any) => {
      if (target === CreateRentalUseCase) {
        return useCase;
      }
      return undefined;
    });
    controller = new CreateRentalController();
  });

  function mockRequest(body?: any, user?: any): Partial<Request> {
    return {
      body,
      user
    };
  }

  function mockResponse(): Partial<Response> {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  it("should call use case with correct data and return 201 with rental, using in-memory repo", async () => {
    // Add available car
    await carsRepositoryInMemory.create({
      id: "car1",
      name: "Car Test",
      brand: "Brand",
      category_id: "cat1",
      daily_rate: 100,
      description: "desc",
      fine_amount: 10,
      license_plate: "ABC-1234"
    });

    const body = {
      car_id: "car1",
      expected_return_date: new Date(Date.now() + 25 * 60 * 60 * 1000) // 25h later
    };
    const user = { id: "user1" };
    const req = mockRequest(body, user) as Request;
    const res = mockResponse() as Response;

    await controller.handle(req, res);

    // Verify the rental was created in the in-memory repo
    const rentals = await rentalsRepositoryInMemory.findByUser("user1");
    expect(rentals.length).toBe(1);
    expect(rentals[0].car_id).toBe("car1");

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      car_id: "car1",
      user_id: "user1"
    }));
  });
});

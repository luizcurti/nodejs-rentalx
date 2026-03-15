import "reflect-metadata";
import { Request, Response } from "express";
import { container } from "tsyringe";
import { ListAvailableCarsController } from "./ListAvailableCarsController";
import { ListAvailableCarsUseCase } from "./ListAvailableCarsUseCase";
import { CarsRepositoryInMemory } from "@modules/cars/repositories/in-memory/CarsRepositoryInMemory";

describe("ListAvailableCarsController (unit)", () => {
  let controller: ListAvailableCarsController;
  let useCase: ListAvailableCarsUseCase;
  let carsRepositoryInMemory: CarsRepositoryInMemory;

  beforeEach(() => {
    carsRepositoryInMemory = new CarsRepositoryInMemory();
    useCase = new ListAvailableCarsUseCase(carsRepositoryInMemory);

    // Mock container.resolve before creating the controller to support the constructor DI pattern
    jest.spyOn(container, "resolve").mockImplementation((target: any) => {
      if (target === ListAvailableCarsUseCase) {
        return useCase;
      }
      return undefined;
    });
    controller = new ListAvailableCarsController();
  });

  function mockRequest(query?: any): Partial<Request> {
    return { query: query || {} };
  }

  function mockResponse(): Partial<Response> {
    const res: Partial<Response> = {};
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  it("should call useCase with query params and return json, using in-memory repo", async () => {
    // Add available cars
    await carsRepositoryInMemory.create({
      id: "1",
      name: "Corolla",
      brand: "Toyota",
      category_id: "123",
      daily_rate: 100,
      description: "desc",
      fine_amount: 10,
      license_plate: "ABC-1234"
    });
    await carsRepositoryInMemory.create({
      id: "2",
      name: "Civic",
      brand: "Honda",
      category_id: "456",
      daily_rate: 100,
      description: "desc",
      fine_amount: 10,
      license_plate: "DEF-5678"
    });

    const req = mockRequest({ brand: "Toyota", name: "Corolla", category_id: "123" }) as Request;
    const res = mockResponse() as Response;

    await controller.handle(req, res);

    // Should return only the Toyota Corolla
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: "Corolla", brand: "Toyota" })
      ])
    );
  });

  it("should call useCase with empty query if no query provided, using in-memory repo", async () => {
    // Add available cars
    await carsRepositoryInMemory.create({
      id: "1",
      name: "Corolla",
      brand: "Toyota",
      category_id: "123",
      daily_rate: 100,
      description: "desc",
      fine_amount: 10,
      license_plate: "ABC-1234"
    });
    await carsRepositoryInMemory.create({
      id: "2",
      name: "Civic",
      brand: "Honda",
      category_id: "456",
      daily_rate: 100,
      description: "desc",
      fine_amount: 10,
      license_plate: "DEF-5678"
    });

    const req = mockRequest() as Request;
    const res = mockResponse() as Response;

    await controller.handle(req, res);

    // Should return all available cars
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: "Corolla" }),
        expect.objectContaining({ name: "Civic" })
      ])
    );
  });
});

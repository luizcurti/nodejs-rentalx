import "reflect-metadata";
import { Request, Response } from "express";
import { CarsRepositoryInMemory } from "@modules/cars/repositories/in-memory/CarsRepositoryInMemory";
import { CreateCarUseCase } from "@modules/cars/useCases/createCar/CreateCarUseCase";
import { CreateCarController } from "@modules/cars/useCases/createCar/CreateCarController";
import { container } from "tsyringe";

function mockRequest(body = {}) {
  return { body } as Request;
}

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("CreateCarController (unit)", () => {
  let carsRepositoryInMemory: CarsRepositoryInMemory;
  let createCarUseCase: CreateCarUseCase;
  let createCarController: CreateCarController;

  beforeEach(() => {
    carsRepositoryInMemory = new CarsRepositoryInMemory();
    createCarUseCase = new CreateCarUseCase(carsRepositoryInMemory);
    createCarController = new CreateCarController(createCarUseCase);
  });

  it("should be able to create a new car", async () => {
    const req = mockRequest({
      name: "Car1",
      description: "desc",
      daily_rate: 100,
      license_plate: "ABC-1234",
      fine_amount: 50,
      brand: "Brand",
      category_id: "cat1"
    });
    const res = mockResponse();
    await createCarController.handle(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: "Car1" }));
  });

  it("should not allow duplicate license plate", async () => {
    const req = mockRequest({
      name: "Car1",
      description: "desc",
      daily_rate: 100,
      license_plate: "ABC-1234",
      fine_amount: 50,
      brand: "Brand",
      category_id: "cat1"
    });
    const res = mockResponse();
    await createCarController.handle(req, res);

    try {
      await createCarController.handle(req, res);
    } catch (error: any) {
      expect(error.message).toBe("Car already exists!");
    }
  });

  it("should resolve CreateCarUseCase from container if not provided", () => {
    const mockUseCase = { execute: jest.fn() };
    const spyResolve = jest.spyOn(container, "resolve").mockImplementation(() => mockUseCase as any);
    // Instantiate the controller while the mock is active
    const controller = new CreateCarController(); // no argument
    expect(spyResolve).toHaveBeenCalledWith(CreateCarUseCase);
    expect(controller).toBeInstanceOf(CreateCarController);
    spyResolve.mockRestore();
  });
});
import { Request, Response } from "express";
import { CarsRepositoryInMemory } from "@modules/cars/repositories/in-memory/CarsRepositoryInMemory";
import { SpecificationsRepositoryInMemory } from "@modules/cars/repositories/in-memory/SpecificationsRepositoryInMemory";
import { CreateCarSpecificationUseCase } from "@modules/cars/useCases/createCarSpecification/CreateCarSpecificationUseCase";
import { CreateCarSpecificationController } from "@modules/cars/useCases/createCarSpecification/CreateCarSpecificationController";
import { container } from "tsyringe";

function mockRequest(params = {}, body = {}) {
  return { params, body } as Request;
}

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("CreateCarSpecificationController (unit)", () => {
  let carsRepositoryInMemory: CarsRepositoryInMemory;
  let specificationsRepositoryInMemory: SpecificationsRepositoryInMemory;
  let createCarSpecificationUseCase: CreateCarSpecificationUseCase;
  let createCarSpecificationController: CreateCarSpecificationController;

  beforeEach(() => {
    carsRepositoryInMemory = new CarsRepositoryInMemory();
    specificationsRepositoryInMemory = new SpecificationsRepositoryInMemory();
    createCarSpecificationUseCase = new CreateCarSpecificationUseCase(
      carsRepositoryInMemory,
      specificationsRepositoryInMemory
    );
    createCarSpecificationController = new CreateCarSpecificationController(createCarSpecificationUseCase);
  });

  it("should add specifications to a car", async () => {
    const car = await carsRepositoryInMemory.create({
      name: "Car1",
      description: "desc",
      daily_rate: 100,
      license_plate: "ABC-1234",
      fine_amount: 50,
      brand: "Brand",
      category_id: "cat1"
    });
    const spec = await specificationsRepositoryInMemory.create({
      name: "Spec1",
      description: "desc"
    });
    const req = mockRequest({ id: car.id }, { specifications_id: [spec.id] });
    const res = mockResponse();
    await createCarSpecificationController.handle(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: car.id }));
  });

  it("should resolve CreateCarSpecificationUseCase from container if not provided", () => {
    const mockUseCase = { execute: jest.fn() };
    const spyResolve = jest.spyOn(container, "resolve").mockReturnValue(mockUseCase as any);
    const controller = new CreateCarSpecificationController(); // sem argumento
    expect(spyResolve).toHaveBeenCalledWith(CreateCarSpecificationUseCase);
    expect(controller).toBeInstanceOf(CreateCarSpecificationController);
    jest.restoreAllMocks();
  });
});
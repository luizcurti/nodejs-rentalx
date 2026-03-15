import { CarsRepositoryInMemory } from "@modules/cars/repositories/in-memory/CarsRepositoryInMemory";
import { SpecificationsRepositoryInMemory } from "@modules/cars/repositories/in-memory/SpecificationsRepositoryInMemory";

import { AppError } from "@shared/errors/AppError";
import { CreateCarSpecificationUseCase } from "./CreateCarSpecificationUseCase";

let createCarSpecificationUseCase: CreateCarSpecificationUseCase;
let carsRepositoryInMemory: CarsRepositoryInMemory;
let specificationsRepositoryInMemory: SpecificationsRepositoryInMemory;

describe("Create Car Specification", () => {
  beforeEach(() => {
    carsRepositoryInMemory = new CarsRepositoryInMemory();
    specificationsRepositoryInMemory = new SpecificationsRepositoryInMemory();
    createCarSpecificationUseCase = new CreateCarSpecificationUseCase(
      carsRepositoryInMemory,
      specificationsRepositoryInMemory
    );
  });

  it("should not be able to add a new specification to a now-existent car", async () => {
    const car_id = "1234";
    const specifications_id = ["54321"];

    await expect(
      createCarSpecificationUseCase.execute({
        car_id,
        specifications_id,
      })
    ).rejects.toEqual(new AppError("Car does not exists!"));
  });

  it("should be able to add a new specification to the car", async () => {
    const car = await carsRepositoryInMemory.create({
      name: "Name Car",
      description: "Description Car",
      daily_rate: 100,
      license_plate: "ABC-1234",
      fine_amount: 60,
      brand: "Brand",
      category_id: "category",
    });

    const specification = await specificationsRepositoryInMemory.create({
      description: "test",
      name: "test",
    });

    const specifications_id = [specification.id].filter((id) => id !== undefined);

    const specificationsCars = await createCarSpecificationUseCase.execute({
      car_id: car.id,
      specifications_id,
    });

    expect(specificationsCars).toHaveProperty("specifications");
    expect(specificationsCars.specifications?.length).toBe(1);
  });

    it("should add multiple specifications to the car", async () => {
      const car = await carsRepositoryInMemory.create({
        name: "Multi Car",
        description: "Multi Desc",
        daily_rate: 200,
        license_plate: "XYZ-9876",
        fine_amount: 80,
        brand: "MultiBrand",
        category_id: "multi-category",
      });
      const spec1 = await specificationsRepositoryInMemory.create({ name: "Spec1", description: "Desc1" });
      const spec2 = await specificationsRepositoryInMemory.create({ name: "Spec2", description: "Desc2" });
      const specifications_id = [spec1.id, spec2.id].filter((id) => id !== undefined);
      const spyCreate = jest.spyOn(carsRepositoryInMemory, "create");
      const spyFindByIds = jest.spyOn(specificationsRepositoryInMemory, "findByIds");
      const specificationsCars = await createCarSpecificationUseCase.execute({
        car_id: car.id,
        specifications_id,
      });
      expect(specificationsCars.specifications?.length).toBe(2);
      expect(spyCreate).toHaveBeenCalled();
      expect(spyFindByIds).toHaveBeenCalledWith(specifications_id);
    });

    it("should fill default values when car properties are missing", async () => {
      // Create a car with missing properties
      const car = await carsRepositoryInMemory.create({
        name: undefined as any,
        description: undefined as any,
        daily_rate: undefined as any,
        license_plate: undefined as any,
        fine_amount: undefined as any,
        brand: undefined as any,
        category_id: undefined as any,
      });

      const specification = await specificationsRepositoryInMemory.create({
        name: "Default Spec",
        description: "Default Desc",
      });

      const specifications_id = [specification.id].filter((id) => id !== undefined);

      const spyCreate = jest.spyOn(carsRepositoryInMemory, "create");

      const result = await createCarSpecificationUseCase.execute({
        car_id: car.id,
        specifications_id,
      });

      expect(spyCreate).toHaveBeenCalled();

      // Verify that the defaults were actually applied
      const [arg] = spyCreate.mock.calls[0];
      expect(arg.name).toBe('');
      expect(arg.daily_rate).toBe(0);
      expect(arg.license_plate).toBe('');
      expect(result.specifications?.length).toBe(1);
    });

});

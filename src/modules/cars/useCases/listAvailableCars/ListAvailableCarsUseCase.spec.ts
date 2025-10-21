import "reflect-metadata";

// tests/listAvailableCarsUseCase.unit.spec.ts
import { ListAvailableCarsUseCase } from "./ListAvailableCarsUseCase";
import { CarsRepositoryInMemory } from "@modules/cars/repositories/in-memory/CarsRepositoryInMemory";

describe("ListAvailableCarsUseCase (unit)", () => {
  let carsRepositoryInMemory: CarsRepositoryInMemory;
  let useCase: ListAvailableCarsUseCase;

  beforeEach(() => {
    carsRepositoryInMemory = new CarsRepositoryInMemory();
    useCase = new ListAvailableCarsUseCase(carsRepositoryInMemory);
  });

  it("should return empty array if no cars available", async () => {
    const result = await useCase.execute({ brand: "Toyota", name: "Corolla", category_id: "123" });
    expect(result).toEqual([]);
  });

  it("should return all available cars", async () => {
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

    const result = await useCase.execute({ brand: undefined, name: undefined, category_id: undefined });

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Corolla" }),
        expect.objectContaining({ name: "Civic" })
      ])
    );
  });
});

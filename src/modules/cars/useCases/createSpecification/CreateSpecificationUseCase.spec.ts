import "reflect-metadata";
import { CreateSpecificationUseCase } from "@modules/cars/useCases/createSpecification/CreateSpecificationUseCase";
import { SpecificationsRepositoryInMemory } from "@modules/cars/repositories/in-memory/SpecificationsRepositoryInMemory";
import { AppError } from "@shared/errors/AppError";

describe("CreateSpecificationUseCase (unit)", () => {
  let specificationsRepositoryInMemory: SpecificationsRepositoryInMemory;
  let useCase: CreateSpecificationUseCase;

  beforeEach(() => {
    specificationsRepositoryInMemory = new SpecificationsRepositoryInMemory();
    useCase = new CreateSpecificationUseCase(specificationsRepositoryInMemory);
  });

  it("should create a specification if it does not exist", async () => {
    await useCase.execute({ name: "Spec1", description: "Desc1" });

    const created = await specificationsRepositoryInMemory.findByName("Spec1");
    expect(created).toBeDefined();
    expect(created?.name).toBe("Spec1");
    expect(created?.description).toBe("Desc1");
  });

  it("should throw AppError if specification already exists", async () => {
    await useCase.execute({ name: "Spec1", description: "Desc1" });

    await expect(useCase.execute({ name: "Spec1", description: "Desc1" }))
      .rejects
      .toEqual(new AppError("Specification already exists!"));

    // Ensure no new specification was created
    const all = await specificationsRepositoryInMemory.findByName("Spec1");
    expect(all).toBeDefined();
  });
});

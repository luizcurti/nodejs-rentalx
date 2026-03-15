import "reflect-metadata";

// tests/createCategoryUseCase.unit.spec.ts
import { CreateCategoryUseCase } from "@modules/cars/useCases/createCategory/CreateCategoryUseCase";
import { CategoriesRepositoryInMemory } from "@modules/cars/repositories/in-memory/CategoriesRepositoryInMemory";
import { AppError } from "@shared/errors/AppError";

describe("CreateCategoryUseCase (unit)", () => {
  let categoriesRepositoryInMemory: CategoriesRepositoryInMemory;
  let useCase: CreateCategoryUseCase;

  beforeEach(() => {
    categoriesRepositoryInMemory = new CategoriesRepositoryInMemory();
    useCase = new CreateCategoryUseCase(categoriesRepositoryInMemory);
  });

  it("should create a new category if it does not exist", async () => {
    await useCase.execute({ name: "SUV", description: "Some description" });

    const created = await categoriesRepositoryInMemory.findByName("SUV");
    expect(created).toBeDefined();
    expect(created?.name).toBe("SUV");
    expect(created?.description).toBe("Some description");
  });

  it("should throw AppError if category already exists", async () => {
    await useCase.execute({ name: "SUV", description: "Some description" });

    await expect(useCase.execute({ name: "SUV", description: "Some description" }))
      .rejects
      .toEqual(new AppError("Category already exists!"));

    // Ensure no new category was created
    const all = await categoriesRepositoryInMemory.list();
    expect(all.filter(c => c.name === "SUV").length).toBe(1);
  });
});

import "reflect-metadata";

// tests/listCategoriesUseCase.unit.spec.ts
import { ListCategoriesUseCase } from "@modules/cars/useCases/listCategories/ListCategoriesUseCase";
import { CategoriesRepositoryInMemory } from "@modules/cars/repositories/in-memory/CategoriesRepositoryInMemory";

describe("ListCategoriesUseCase (unit)", () => {
  let categoriesRepositoryInMemory: CategoriesRepositoryInMemory;
  let listCategoriesUseCase: ListCategoriesUseCase;

  beforeEach(() => {
    categoriesRepositoryInMemory = new CategoriesRepositoryInMemory();
    listCategoriesUseCase = new ListCategoriesUseCase(categoriesRepositoryInMemory);
  });

  it("should return empty array if no categories", async () => {
    const result = await listCategoriesUseCase.execute();
    expect(result).toEqual([]);
  });

  it("should return all categories", async () => {
    await categoriesRepositoryInMemory.create({ name: "A", description: "desc A" });
    await categoriesRepositoryInMemory.create({ name: "B", description: "desc B" });

    const result = await listCategoriesUseCase.execute();

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "A" }),
        expect.objectContaining({ name: "B" })
      ])
    );
  });
});

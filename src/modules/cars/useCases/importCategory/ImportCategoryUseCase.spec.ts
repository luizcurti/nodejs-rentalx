import "reflect-metadata";

// tests/importCategoryUseCase.unit.spec.ts
import { EventEmitter } from "events";
const parserMock = new EventEmitter() as EventEmitter & { pipe: jest.Mock };
parserMock.pipe = jest.fn();
jest.doMock("csv-parse", () => ({
  parse: () => parserMock
}));
import { ImportCategoryUseCase } from "@modules/cars/useCases/importCategory/ImportCategoryUseCase";
import { CategoriesRepositoryInMemory } from "@modules/cars/repositories/in-memory/CategoriesRepositoryInMemory";
import fs from "fs";

describe("ImportCategoryUseCase (unit)", () => {
  it("should resolve categories and call unlink on end", async () => {
    const file = { path: "dummy.csv" } as any;
    jest.spyOn(fs, "createReadStream").mockReturnValue({ pipe: jest.fn() } as any);
    const useCaseLocal = new ImportCategoryUseCase(categoriesRepositoryInMemory);
    const unlinkSpy = jest.spyOn(fs.promises, "unlink").mockResolvedValue();
    // Executa a promise e dispara os eventos manualmente
    const promise = useCaseLocal.loadCategories(file);
    global.setImmediate(() => {
      parserMock.emit("data", ["cat1", "desc1"]);
      parserMock.emit("data", ["cat2", "desc2"]);
      parserMock.emit("end");
    });
    const result = await promise;
    expect(result).toEqual([
      { name: "cat1", description: "desc1" },
      { name: "cat2", description: "desc2" }
    ]);
    expect(unlinkSpy).toHaveBeenCalledWith(file.path);
    jest.dontMock("csv-parse");
  });
  let categoriesRepositoryInMemory: CategoriesRepositoryInMemory;
  let useCase: ImportCategoryUseCase;

  beforeEach(() => {
    categoriesRepositoryInMemory = new CategoriesRepositoryInMemory();
    useCase = new ImportCategoryUseCase(categoriesRepositoryInMemory);
    jest.spyOn(fs.promises, "unlink").mockResolvedValue();
  });

  it("should call repository create for new categories", async () => {
    // Mock loadCategories para não ler arquivo real
    const categories = [
      { name: "A", description: "desc A" },
      { name: "B", description: "desc B" }
    ];
    jest.spyOn(useCase, "loadCategories").mockResolvedValue(categories);

    const file = { path: "dummy.csv" } as any;

    await useCase.execute(file);

    for (const category of categories) {
      const found = await categoriesRepositoryInMemory.findByName(category.name);
      expect(found).toBeDefined();
      expect(found?.description).toBe(category.description);
    }
    const all = await categoriesRepositoryInMemory.list();
    expect(all.length).toBe(categories.length);
  });

  it("should not create category if it already exists", async () => {
    const categories = [{ name: "A", description: "desc A" }];
    jest.spyOn(useCase, "loadCategories").mockResolvedValue(categories);

    // Cria a categoria antes
    await categoriesRepositoryInMemory.create(categories[0]);

    const file = { path: "dummy.csv" } as any;

    await useCase.execute(file);

    // Garante que não foi criada uma nova categoria
    const all = await categoriesRepositoryInMemory.list();
    expect(all.length).toBe(1);
  });
  it("should reject if loadCategories emits error", async () => {
    jest.resetModules();
    jest.doMock("csv-parse", () => ({
      parse: () => ({
        on(event: string, cb: (...args: any[]) => void) {
          if (event === "error") {
            cb(new Error("Parse error"));
          }
          return this;
        },
        pipe: jest.fn(),
      })
    }));
  const { ImportCategoryUseCase: ImportCategoryUseCaseLocal } = await import("./ImportCategoryUseCase");
  const file = { path: "dummy.csv" } as any;
  jest.spyOn(fs, "createReadStream").mockReturnValue({ pipe: jest.fn() } as any);
  const useCaseLocal = new ImportCategoryUseCaseLocal(categoriesRepositoryInMemory);
  await expect(useCaseLocal.loadCategories(file)).rejects.toThrow("Parse error");
  jest.dontMock("csv-parse");
  });
});

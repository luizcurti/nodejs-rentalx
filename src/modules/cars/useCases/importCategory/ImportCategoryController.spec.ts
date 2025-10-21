import "reflect-metadata";

// tests/importCategoryController.unit.spec.ts
import { Request, Response } from "express";
import { ImportCategoryController } from "@modules/cars/useCases/importCategory/ImportCategoryController";
import { ImportCategoryUseCase } from "@modules/cars/useCases/importCategory/ImportCategoryUseCase";
import { CategoriesRepositoryInMemory } from "@modules/cars/repositories/in-memory/CategoriesRepositoryInMemory";
import { container } from "tsyringe";

describe("ImportCategoryController (unit)", () => {
  let controller: ImportCategoryController;
  let useCase: ImportCategoryUseCase;
  let categoriesRepositoryInMemory: CategoriesRepositoryInMemory;

  beforeEach(() => {
    categoriesRepositoryInMemory = new CategoriesRepositoryInMemory();
    useCase = new ImportCategoryUseCase(categoriesRepositoryInMemory);
    controller = new ImportCategoryController();

    // Mock container.resolve para retornar nosso use case real
    jest.spyOn(container, "resolve").mockImplementation((target: any) => {
      if (target === ImportCategoryUseCase) {
        return useCase;
      }
      return undefined;
    });
  });

  function mockRequest(file?: any): Partial<Request> {
    return { file };
  }

  function mockResponse(): Partial<Response> {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  }

  it("should return 400 if no file provided", async () => {
    const req = mockRequest() as Request;
    const res = mockResponse() as Response;

    await controller.handle(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "File is required" });
    // Não chama o use case
  });

  it("should call use case and return 201 if file provided, using in-memory repo", async () => {
    const file = { path: "dummy.csv" };
    const req = mockRequest(file) as Request;
    const res = mockResponse() as Response;

    // Mock loadCategories para não ler arquivo real
    jest.spyOn(useCase, "loadCategories").mockResolvedValue([{ name: "A", description: "desc A" }]);

    await controller.handle(req, res);

    // Verifica se a categoria foi criada no repo in-memory
    const found = await categoriesRepositoryInMemory.findByName("A");
    expect(found).toBeDefined();
    expect(found?.description).toBe("desc A");

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalled();
  });
});

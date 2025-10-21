import "reflect-metadata";
import { Request, Response } from "express";
import { ListCategoriesController } from "@modules/cars/useCases/listCategories/ListCategoriesController";
import { ListCategoriesUseCase } from "@modules/cars/useCases/listCategories/ListCategoriesUseCase";
import { CategoriesRepositoryInMemory } from "@modules/cars/repositories/in-memory/CategoriesRepositoryInMemory";

function mockRequest(): Request {
  return {} as Request;
}

function mockResponse(): Response {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("ListCategoriesController (pure unit)", () => {
  let categoriesRepositoryInMemory: CategoriesRepositoryInMemory;
  let useCase: ListCategoriesUseCase;
  let listCategoriesController: ListCategoriesController;

  beforeEach(() => {
    categoriesRepositoryInMemory = new CategoriesRepositoryInMemory();
    useCase = new ListCategoriesUseCase(categoriesRepositoryInMemory);
    listCategoriesController = new ListCategoriesController(useCase);
  });

  it("should return empty array if no categories", async () => {
    const req = mockRequest();
    const res = mockResponse();

    await listCategoriesController.handle(req, res);

    expect(res.json).toHaveBeenCalledWith([]);
  });

  it("should return all categories", async () => {
    await categoriesRepositoryInMemory.create({ name: "A", description: "desc A" });
    await categoriesRepositoryInMemory.create({ name: "B", description: "desc B" });

    const req = mockRequest();
    const res = mockResponse();

    await listCategoriesController.handle(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: "A" }),
        expect.objectContaining({ name: "B" })
      ])
    );
  });
  it("should resolve useCase from container if not provided", async () => {
    const { container } = await import("tsyringe");
    const mockExecute = jest.fn().mockResolvedValue([]);
    jest.spyOn(container, "resolve").mockReturnValue({ execute: mockExecute } as any);
    const controllerNoUseCase = new ListCategoriesController();
    const req = mockRequest();
    const res = mockResponse();
    await controllerNoUseCase.handle(req, res);
    expect(container.resolve).toHaveBeenCalledWith(ListCategoriesUseCase);
    expect(mockExecute).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith([]);
    jest.restoreAllMocks();
  });
});

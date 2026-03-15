import "reflect-metadata";
import { Request, Response } from "express";
import { CreateCategoryController } from "@modules/cars/useCases/createCategory/CreateCategoryController";
import { CreateCategoryUseCase } from "@modules/cars/useCases/createCategory/CreateCategoryUseCase";
import { CategoriesRepositoryInMemory } from "@modules/cars/repositories/in-memory/CategoriesRepositoryInMemory";
import { container } from "tsyringe";

describe("CreateCategoryController (unit)", () => {
  let controller: CreateCategoryController;
  let useCase: CreateCategoryUseCase;
  let categoriesRepositoryInMemory: CategoriesRepositoryInMemory;

  beforeEach(() => {
    categoriesRepositoryInMemory = new CategoriesRepositoryInMemory();
    useCase = new CreateCategoryUseCase(categoriesRepositoryInMemory);
    controller = new CreateCategoryController(useCase);
  });

  function mockRequest(body?: any): Partial<Request> {
    return { body };
  }

  function mockResponse(): Partial<Response> {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  }

  it("should call use case with request body and return 201, using in-memory repo", async () => {
    const req = mockRequest({ name: "SUV", description: "Some description" }) as Request;
    const res = mockResponse() as Response;

    await controller.handle(req, res);

    // Verify the category was created in the in-memory repo
    const created = await categoriesRepositoryInMemory.findByName("SUV");
    expect(created).toBeDefined();
    expect(created?.description).toBe("Some description");

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalled();
  });

  it("should resolve use case from container when not provided", () => {
    const mockUseCase = { execute: jest.fn() };
    const resolveSpy = jest.spyOn(container, "resolve").mockReturnValue(mockUseCase as any);
    controller = new CreateCategoryController(); // no argument
    expect(resolveSpy).toHaveBeenCalledWith(CreateCategoryUseCase);
    jest.restoreAllMocks();
  });
});

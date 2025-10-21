import "reflect-metadata";
import { Request, Response } from "express";
import { container } from "tsyringe";
import { CreateSpecificationController } from "@modules/cars/useCases/createSpecification/CreateSpecificationController";
import { CreateSpecificationUseCase } from "@modules/cars/useCases/createSpecification/CreateSpecificationUseCase";
import { SpecificationsRepositoryInMemory } from "@modules/cars/repositories/in-memory/SpecificationsRepositoryInMemory";

describe("CreateSpecificationController (unit)", () => {
  let controller: CreateSpecificationController;
  let useCase: CreateSpecificationUseCase;
  let specificationsRepositoryInMemory: SpecificationsRepositoryInMemory;

  beforeEach(() => {
    specificationsRepositoryInMemory = new SpecificationsRepositoryInMemory();
    useCase = new CreateSpecificationUseCase(specificationsRepositoryInMemory);
    controller = new CreateSpecificationController();

    // Mock container.resolve para retornar nosso use case real
    jest.spyOn(container, "resolve").mockImplementation((target: any) => {
      if (target === CreateSpecificationUseCase) {
        return useCase;
      }
      return undefined;
    });
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
    const req = mockRequest({ name: "Spec1", description: "Desc1" }) as Request;
    const res = mockResponse() as Response;

    await controller.handle(req, res);

    // Verifica se a specification foi criada no repo in-memory
    const spec = await specificationsRepositoryInMemory.findByName("Spec1");
    expect(spec).toBeDefined();
    expect(spec?.description).toBe("Desc1");

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalled();
  });
});

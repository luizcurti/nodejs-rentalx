import "reflect-metadata";
import { Request, Response } from "express";
import { container } from "tsyringe";

import { ListSpecificationsController } from "./ListSpecificationsController";
import { ListSpecificationsUseCase } from "./ListSpecificationsUseCase";

describe("ListSpecificationsController", () => {
  let controller: ListSpecificationsController;
  let mockUseCase: Partial<ListSpecificationsUseCase>;

  beforeEach(() => {
    mockUseCase = {
      execute: jest.fn().mockResolvedValue([
        { id: "spec1", name: "Spec 1", description: "Desc 1" },
        { id: "spec2", name: "Spec 2", description: "Desc 2" },
      ]),
    };
    // Mock container.resolve antes de criar o controller para suportar o padrão constructor DI
    jest.spyOn(container, "resolve").mockReturnValue(mockUseCase);
    controller = new ListSpecificationsController();
  });

  function mockResponse(): Partial<Response> {
    const res: Partial<Response> = {};
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  it("should return list of specifications", async () => {
    const req = { query: {} } as unknown as Request;
    const res = mockResponse() as Response;

    await controller.handle(req, res);

    expect(mockUseCase.execute).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: "spec1" }),
        expect.objectContaining({ id: "spec2" }),
      ])
    );
  });
});

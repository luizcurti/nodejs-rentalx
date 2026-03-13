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
    controller = new ListSpecificationsController();
    jest.spyOn(container, "resolve").mockReturnValue(mockUseCase);
  });

  function mockResponse(): Partial<Response> {
    const res: Partial<Response> = {};
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  it("should return list of specifications", async () => {
    const req = {} as Request;
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

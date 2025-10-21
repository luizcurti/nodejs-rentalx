import "reflect-metadata";
import { container } from "tsyringe";
import { Request, Response } from "express";
import { DevolutionRentalController } from "@modules/rentals/useCases/devolutionRental/DevolutionRentalController";
import { DevolutionRentalUseCase } from "@modules/rentals/useCases/devolutionRental/DevolutionRentalUseCase";

describe("DevolutionRentalController (unit)", () => {
  let controller: DevolutionRentalController;
  let mockUseCase: Partial<DevolutionRentalUseCase>;

  beforeEach(() => {
    mockUseCase = {
      execute: jest.fn().mockResolvedValue({
        id: "rental1",
        car_id: "car1",
        user_id: "user1",
        total: 100,
        start_date: new Date(),
        end_date: new Date(),
        expected_return_date: new Date()
      })
    };

    controller = new DevolutionRentalController();

  jest.spyOn(container, "resolve").mockReturnValue(mockUseCase);
  });

  function mockRequest(params?: any): Partial<Request> {
    return { params };
  }

  function mockResponse(): Partial<Response> {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  it("should call use case with rental id and return rental", async () => {
    const req = mockRequest({ id: "rental1" }) as Request;
    const res = mockResponse() as Response;

    await controller.handle(req, res);

  expect(mockUseCase.execute).toHaveBeenCalledWith({ id: "rental1" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "rental1",
        car_id: "car1",
        user_id: "user1",
        total: 100,
      })
    );
  });
});

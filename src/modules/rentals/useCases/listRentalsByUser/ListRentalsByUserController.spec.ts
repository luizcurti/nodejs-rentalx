import "reflect-metadata";
import { Request, Response } from "express";
import { container } from "tsyringe";
import { ListRentalsByUserController } from "@modules/rentals/useCases/listRentalsByUser/ListRentalsByUserController";
import { ListRentalsByUserUseCase } from "@modules/rentals/useCases/listRentalsByUser/ListRentalsByUserUseCase";
import { RentalsRepositoryInMemory } from "@modules/rentals/repositories/in-memory/RentalsRepositoryInMemory";


describe("ListRentalsByUserController (unit)", () => {
  let controller: ListRentalsByUserController;
  let useCase: ListRentalsByUserUseCase;
  let rentalsRepositoryInMemory: RentalsRepositoryInMemory;

  beforeEach(() => {
    rentalsRepositoryInMemory = new RentalsRepositoryInMemory();
    useCase = new ListRentalsByUserUseCase(rentalsRepositoryInMemory);
    // Mock container.resolve before creating the controller to support the constructor DI pattern
    jest.spyOn(container, "resolve").mockImplementation((target: any) => {
      if (target === ListRentalsByUserUseCase) {
        return useCase;
      }
      return undefined;
    });
    controller = new ListRentalsByUserController();
  });

  function mockRequest(user?: any): Partial<Request> {
    return { user, query: {} };
  }

  function mockResponse(): Partial<Response> {
    const res: Partial<Response> = {};
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  it("should call use case with user id and return rentals, using in-memory repo", async () => {
    // Add rental
    await rentalsRepositoryInMemory.create({
      car_id: "car1",
      user_id: "user1",
      expected_return_date: new Date(Date.now() + 25 * 60 * 60 * 1000)
    });

    const req = mockRequest({ id: "user1" }) as Request;
    const res = mockResponse() as Response;

    await controller.handle(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ car_id: "car1", user_id: "user1" })
    ]));
  });
});

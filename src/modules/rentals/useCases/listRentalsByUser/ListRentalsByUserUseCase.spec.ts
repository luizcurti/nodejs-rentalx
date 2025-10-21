import "reflect-metadata";

// tests/listRentalsByUserUseCase.unit.spec.ts
import { ListRentalsByUserUseCase } from "@modules/rentals/useCases/listRentalsByUser/ListRentalsByUserUseCase";
import { IRentalsRepository } from "@modules/rentals/repositories/IRentalsRepository";

describe("ListRentalsByUserUseCase (unit)", () => {
  let rentalsRepoMock: jest.Mocked<IRentalsRepository>;
  let useCase: ListRentalsByUserUseCase;

  beforeEach(() => {
    rentalsRepoMock = {
      findByUser: jest.fn()
    } as unknown as jest.Mocked<IRentalsRepository>;

    useCase = new ListRentalsByUserUseCase(rentalsRepoMock);
  });

  it("should return rentals for a given user", async () => {
    const sampleRentals = [
      { id: "rental1", car_id: "car1", user_id: "user1" },
      { id: "rental2", car_id: "car2", user_id: "user1" }
    ];
    rentalsRepoMock.findByUser.mockResolvedValue(sampleRentals as any);

    const result = await useCase.execute("user1");

    expect(rentalsRepoMock.findByUser).toHaveBeenCalledWith("user1");
    expect(result).toEqual(sampleRentals);
  });

  it("should return empty array if user has no rentals", async () => {
    rentalsRepoMock.findByUser.mockResolvedValue([]);

    const result = await useCase.execute("user2");

    expect(rentalsRepoMock.findByUser).toHaveBeenCalledWith("user2");
    expect(result).toEqual([]);
  });
});

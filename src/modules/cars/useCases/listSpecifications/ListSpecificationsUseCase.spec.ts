import { SpecificationsRepositoryInMemory } from "@modules/cars/repositories/in-memory/SpecificationsRepositoryInMemory";

import { ListSpecificationsUseCase } from "./ListSpecificationsUseCase";

let listSpecificationsUseCase: ListSpecificationsUseCase;
let specificationsRepositoryInMemory: SpecificationsRepositoryInMemory;

describe("List Specifications", () => {
  beforeEach(() => {
    specificationsRepositoryInMemory = new SpecificationsRepositoryInMemory();
    listSpecificationsUseCase = new ListSpecificationsUseCase(
      specificationsRepositoryInMemory
    );
  });

  it("should be able to list all specifications", async () => {
    await specificationsRepositoryInMemory.create({
      name: "Spec 1",
      description: "Description 1",
    });
    await specificationsRepositoryInMemory.create({
      name: "Spec 2",
      description: "Description 2",
    });

    const specifications = await listSpecificationsUseCase.execute();

    expect(specifications).toHaveLength(2);
    expect(specifications[0]).toHaveProperty("id");
  });

  it("should return empty array when no specifications exist", async () => {
    const specifications = await listSpecificationsUseCase.execute();
    expect(specifications).toEqual([]);
  });
});

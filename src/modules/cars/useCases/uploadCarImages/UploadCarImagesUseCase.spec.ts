import "reflect-metadata";
import { UploadCarImagesUseCase } from "./UploadCarImageUseCase";
import { CarsImagesRepositoryInMemory } from "@modules/cars/repositories/in-memory/CarsImagesRepositoryInMemory";
import { StorageProviderInMemory } from "@shared/container/providers/StorageProvider/in-memory/StorageProviderInMemory";

describe("UploadCarImagesUseCase (unit)", () => {
  let carsImagesRepositoryInMemory: CarsImagesRepositoryInMemory;
  let storageProviderInMemory: StorageProviderInMemory;
  let useCase: UploadCarImagesUseCase;

  beforeEach(() => {
    carsImagesRepositoryInMemory = new CarsImagesRepositoryInMemory();
    storageProviderInMemory = new StorageProviderInMemory();
    useCase = new UploadCarImagesUseCase(carsImagesRepositoryInMemory, storageProviderInMemory);
  });

  it("should call repository and storage provider for each image", async () => {
    const data = {
      car_id: "123",
      images_name: ["image1.jpg", "image2.jpg"]
    };

    await useCase.execute(data);

    // Verify images were saved in the in-memory repository
    const images = carsImagesRepositoryInMemory.getImagesByCarId("123");
    expect(images.map(img => img.image_name)).toEqual(["image1.jpg", "image2.jpg"]);

    // Verify the files were saved in the in-memory storage
    expect(storageProviderInMemory.getFiles("cars")).toEqual(["image1.jpg", "image2.jpg"]);
  });
});

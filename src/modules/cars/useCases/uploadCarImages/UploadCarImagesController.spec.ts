import "reflect-metadata";
import { Request, Response } from "express";
import { container } from "tsyringe";
import { UploadCarImagesController } from "./UploadCarImagesController";
import { UploadCarImagesUseCase } from "./UploadCarImageUseCase";
import { CarsImagesRepositoryInMemory } from "../../repositories/in-memory/CarsImagesRepositoryInMemory";
import { StorageProviderInMemory } from "@shared/container/providers/StorageProvider/in-memory/StorageProviderInMemory";

describe("UploadCarImagesController (unit)", () => {

  let controller: UploadCarImagesController;
  let useCase: UploadCarImagesUseCase;
  let carsImagesRepositoryInMemory: CarsImagesRepositoryInMemory;
  let storageProviderInMemory: StorageProviderInMemory;

  beforeEach(() => {
    carsImagesRepositoryInMemory = new CarsImagesRepositoryInMemory();
    storageProviderInMemory = new StorageProviderInMemory();

    useCase = new UploadCarImagesUseCase(
      carsImagesRepositoryInMemory,
      storageProviderInMemory
    );

    // Mock container.resolve antes de criar o controller
    jest.spyOn(container, "resolve").mockImplementation((target: any) => {
      if (target === UploadCarImagesUseCase) {
        return useCase;
      }
      return undefined;
    });

    controller = new UploadCarImagesController();
  });

  function mockRequest(): Partial<Request> {
    // Simula arquivos no formato esperado pelo multer
    return {
      params: { id: "123" },
      files: [
        {
          filename: "image1.jpg",
          fieldname: "images",
          originalname: "image1.jpg",
          encoding: "7bit",
          mimetype: "image/jpeg",
          size: 100,
          destination: "",
          path: "",
          buffer: Buffer.from([]),
          stream: {} as any // mock do stream
        },
        {
          filename: "image2.jpg",
          fieldname: "images",
          originalname: "image2.jpg",
          encoding: "7bit",
          mimetype: "image/jpeg",
          size: 100,
          destination: "",
          path: "",
          buffer: Buffer.from([]),
          stream: {} as any // mock do stream
        }
      ]
    };
  }

  function mockResponse(): Partial<Response> {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  }

  it("should call use case with correct data and return 201, using in-memory repos", async () => {
    const req = mockRequest() as Request;
    const res = mockResponse() as Response;

    await controller.handle(req, res);

  // Verifica se as imagens foram salvas no repositório in-memory
  const images = carsImagesRepositoryInMemory.getImagesByCarId("123");
  expect(images.map((img: { image_name: string }) => img.image_name)).toEqual(["image1.jpg", "image2.jpg"]);

  // Verifica se os arquivos foram salvos no storage in-memory
  expect(storageProviderInMemory.getFiles("cars")).toEqual(["image1.jpg", "image2.jpg"]);

  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.send).toHaveBeenCalled();
  });
});

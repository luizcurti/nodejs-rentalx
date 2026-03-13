import { Request, Response } from "express";
import { container } from "tsyringe";

import { UploadCarImagesUseCase } from "./UploadCarImageUseCase";

interface IFiles {
  filename: string;
}

class UploadCarImagesController {
  private uploadCarImagesUseCase: UploadCarImagesUseCase;

  constructor(uploadCarImagesUseCase?: UploadCarImagesUseCase) {
    this.uploadCarImagesUseCase = uploadCarImagesUseCase ?? container.resolve(UploadCarImagesUseCase);
  }

  async handle(request: Request, response: Response): Promise<Response> {
    const { id } = request.params;
    const images = request.files as IFiles[];

    const images_name = images.map((file) => file.filename);

    await this.uploadCarImagesUseCase.execute({
      car_id: id,
      images_name,
    });

    return response.status(201).send();
  }
}

export { UploadCarImagesController };

import { CarImage } from "../../infra/typeorm/entities/CarImage";
import { ICarsImagesRepository } from "../ICarsImagesRepository";

class CarsImagesRepositoryInMemory implements ICarsImagesRepository {
  private images: CarImage[] = [];

  async create(car_id: string, image_name: string): Promise<CarImage> {
    const image = new CarImage();
    image.car_id = car_id;
    image.image_name = image_name;
    image.created_at = new Date();
    this.images.push(image);
    return image;
  }

  // Helper methods for tests
  getImagesByCarId(car_id: string): CarImage[] {
    return this.images.filter(img => img.car_id === car_id);
  }

  clear(): void {
    this.images = [];
  }
}

export { CarsImagesRepositoryInMemory };
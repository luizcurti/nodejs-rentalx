import { Specification } from "@modules/cars/infra/typeorm/entities/Specification";
import {
  ICreateSpecificationDTO,
  ISpecificationsRepository,
} from "../ISpecificationsRepository";
import { v4 as uuidV4 } from "uuid";

class SpecificationsRepositoryInMemory implements ISpecificationsRepository {
  specifications: Specification[] = [];

  async create({
    description,
    name,
  }: ICreateSpecificationDTO): Promise<Specification> {
    const specification = new Specification();

    Object.assign(specification, {
      description,
      name,
    });

    if (!specification.id) {
      specification.id = uuidV4();
    }
  
    this.specifications.push(specification);
  
    return specification;
  }

  async findByName(name: string): Promise<Specification | undefined> {
    return this.specifications.find(
      (specification) => specification.name === name
    );
  }
  async findByIds(ids: string[]): Promise<Specification[]> {
    const validIds = ids.filter((id): id is string => !!id);

    return this.specifications.filter(spec => spec.id && validIds.includes(spec.id));
  }
}

export { SpecificationsRepositoryInMemory };

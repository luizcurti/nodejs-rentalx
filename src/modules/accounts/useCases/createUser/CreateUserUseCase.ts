import { hash } from "bcrypt";
import { inject, injectable } from "tsyringe";

import { ICreateUserDTO } from "@modules/accounts/dtos/ICreateUserDTO";
import { IUsersRepository } from "@modules/accounts/repositories/IUsersRepository";
import { AppError } from "@shared/errors/AppError";

@injectable()
class CreateUserUseCase {
  constructor(
    @inject("UsersRepository")
    private usersRepository: IUsersRepository
  ) {}

  async execute({
    name,
    email,
    password,
    driver_license,
    id,
    avatar
  }: ICreateUserDTO & { id?: string; avatar?: string }): Promise<import("@modules/accounts/infra/typeorm/entities/User").User> {
    const userAlreadyExists = await this.usersRepository.findByEmail(email);

    if (userAlreadyExists) {
      throw new AppError("User already exists");
    }

    const passwordHash = await hash(password, 8);

    return this.usersRepository.create({
      name,
      email,
      password: passwordHash,
      driver_license,
      id,
      avatar
    });
  }
}

export { CreateUserUseCase };

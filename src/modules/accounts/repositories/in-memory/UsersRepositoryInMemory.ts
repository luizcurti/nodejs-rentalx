import { User } from "@modules/accounts/infra/typeorm/entities/User";

import { ICreateUserDTO } from "../../dtos/ICreateUserDTO";
import { IUsersRepository } from "../IUsersRepository";

class UsersRepositoryInMemory implements IUsersRepository {
  users: User[] = [];

  async create({
    driver_license,
    email,
    name,
    password,
    id,
    avatar
  }: ICreateUserDTO & { id?: string; avatar?: string }): Promise<User> {
    const user = new User();

    Object.assign(user, {
      driver_license,
      email,
      name,
      password,
      avatar
    });
    // Garante que sempre haverá um id válido
    if (!id && !user.id) {
      const { v4: uuidV4 } = await import('uuid');
      user.id = uuidV4();
    } else {
      user.id = id ?? user.id;
    }

    this.users.push(user);
    return user;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.users.find((user) => user.email === email);
  }

  async findById(id: string): Promise<User | undefined> {
    return this.users.find((user) => user.id === id);
  }
}

export { UsersRepositoryInMemory };

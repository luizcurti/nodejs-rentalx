import { instanceToInstance } from "class-transformer";
import { IUserResponseDTO } from "../dtos/IUserResponseDTO";
import { User } from "../infra/typeorm/entities/User";

class UserMap {
  static toDTO({
    email,
    name,
    id,
    avatar,
    driver_license,
    avatar_url,
  }: User): IUserResponseDTO {
    const user = instanceToInstance({
      email: email ?? "",
      name: name ?? "",
      id,
      avatar: avatar ?? "",
      driver_license: driver_license ?? "",
      avatar_url,
    });
    return user as IUserResponseDTO;
  }
}

export { UserMap };

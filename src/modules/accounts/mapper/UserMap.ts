import { instanceToInstance } from "class-transformer";
import { IUserResponseDTO } from "../dtos/IUserResponseDTO";
import { User } from "../infra/typeorm/entities/User";

class UserMap {
  static toDTO(user: User): IUserResponseDTO {
    const { email, name, id, avatar, driver_license } = user;
    const result = instanceToInstance({
      email: email ?? "",
      name: name ?? "",
      id,
      avatar: avatar ?? "",
      driver_license: driver_license ?? "",
      avatar_url: user.avatar_url(),
    });
    return result as IUserResponseDTO;
  }
}

export { UserMap };

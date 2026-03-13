import { Request, Response } from "express";
import { container } from "tsyringe";

import { ProfileUserUseCase } from "./ProfileUserUseCase";

class ProfileUserController {
  private profileUserUseCase: ProfileUserUseCase;

  constructor(profileUserUseCase?: ProfileUserUseCase) {
    this.profileUserUseCase = profileUserUseCase ?? container.resolve(ProfileUserUseCase);
  }

  setUseCase(useCase: ProfileUserUseCase) {
    this.profileUserUseCase = useCase;
  }

  async handle(request: Request, response: Response): Promise<Response> {
    const { id } = request.user;
    const user = await this.profileUserUseCase.execute(id);
    return response.json(user);
  }
}

export { ProfileUserController };

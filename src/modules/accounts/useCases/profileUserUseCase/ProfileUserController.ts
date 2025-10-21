import { Request, Response } from "express";

import { ProfileUserUseCase } from "./ProfileUserUseCase";

class ProfileUserController {
  private profileUserUseCase?: ProfileUserUseCase;

  constructor(profileUserUseCase?: ProfileUserUseCase) {
    this.profileUserUseCase = profileUserUseCase;
  }

  setUseCase(useCase: ProfileUserUseCase) {
    this.profileUserUseCase = useCase;
  }

  async handle(request: Request, response: Response): Promise<Response> {
    const { id } = request.user;
    let useCase = this.profileUserUseCase;
    if (!useCase) {
      const { container } = await import("tsyringe");
      useCase = container.resolve(ProfileUserUseCase);
    }
    const user = await useCase.execute(id);
    return response.json(user);
  }
}

export { ProfileUserController };

import { Request, Response } from "express";
import { container } from "tsyringe";

import { UpdateUserAvatarUseCase } from "./UpdateUserAvatarUseCase";

class UpdateUserAvatarController {
  private updateUserAvatarUseCase: UpdateUserAvatarUseCase;

  constructor(updateUserAvatarUseCase?: UpdateUserAvatarUseCase) {
    this.updateUserAvatarUseCase = updateUserAvatarUseCase ?? container.resolve(UpdateUserAvatarUseCase);
  }

  setUseCase(useCase: UpdateUserAvatarUseCase) {
    this.updateUserAvatarUseCase = useCase;
  }

  async handle(request: Request, response: Response): Promise<Response> {
    const { id } = request.user;
    if (!request.file) {
      return response.status(400).json({ error: "File is required" });
    }
    const avatar_file = request.file.filename;

    await this.updateUserAvatarUseCase.execute({ user_id: id, avatar_file });

    return response.status(204).send();
  }
}

export { UpdateUserAvatarController };

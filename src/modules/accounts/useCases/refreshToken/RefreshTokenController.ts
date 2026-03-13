import { Request, Response } from "express";
import { container } from "tsyringe";

import { RefreshTokenUseCase } from "./RefreshTokenUseCase";

class RefreshTokenController {
  private refreshTokenUseCase: RefreshTokenUseCase;

  constructor(refreshTokenUseCase?: RefreshTokenUseCase) {
    this.refreshTokenUseCase = refreshTokenUseCase ?? container.resolve(RefreshTokenUseCase);
  }

  setUseCase(useCase: RefreshTokenUseCase) {
    this.refreshTokenUseCase = useCase;
  }

  async handle(request: Request, response: Response): Promise<Response> {
    const token =
      request.body.token ||
      request.headers["x-access-token"] ||
      request.query.token;

    const refresh_token = await this.refreshTokenUseCase.execute(token);

    return response.json(refresh_token);
  }
}

export { RefreshTokenController };

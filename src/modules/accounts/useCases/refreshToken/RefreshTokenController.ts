import { Request, Response } from "express";

import { RefreshTokenUseCase } from "./RefreshTokenUseCase";

class RefreshTokenController {
  private refreshTokenUseCase?: RefreshTokenUseCase;

  constructor(refreshTokenUseCase?: RefreshTokenUseCase) {
    this.refreshTokenUseCase = refreshTokenUseCase;
  }

  setUseCase(useCase: RefreshTokenUseCase) {
    this.refreshTokenUseCase = useCase;
  }

  async handle(request: Request, response: Response): Promise<Response> {
    const token =
      request.body.token ||
      request.headers["x-access-token"] ||
      request.query.token;

    let useCase = this.refreshTokenUseCase;
    if (!useCase) {
      const { container } = await import("tsyringe");
      useCase = container.resolve(RefreshTokenUseCase);
    }

    const refresh_token = await useCase.execute(token);

    return response.json(refresh_token);
  }
}

export { RefreshTokenController };

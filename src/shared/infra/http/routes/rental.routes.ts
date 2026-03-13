import { Router } from "express";

import { CreateRentalController } from "@modules/rentals/useCases/createRental/CreateRentalController";
import { DevolutionRentalController } from "@modules/rentals/useCases/devolutionRental/DevolutionRentalController";
import { ListRentalsByUserController } from "@modules/rentals/useCases/listRentalsByUser/ListRentalsByUserController";

import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";

const rentalRoutes = Router();

const createRentalController = new CreateRentalController();
const devolutionRentalController = new DevolutionRentalController();
const listRentalsByUserController = new ListRentalsByUserController();

rentalRoutes.post("/", ensureAuthenticated, (req, res) => createRentalController.handle(req, res));
rentalRoutes.patch(
  "/devolution/:id",
  ensureAuthenticated,
  (req, res) => devolutionRentalController.handle(req, res)
);

rentalRoutes.get(
  "/user",
  ensureAuthenticated,
  (req, res) => listRentalsByUserController.handle(req, res)
);

export { rentalRoutes };

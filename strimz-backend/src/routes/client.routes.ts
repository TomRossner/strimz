import { Router } from "express";
import { createNewClient, updateClientLimits } from "../controllers/stream.controller.js";

const clientRouter = Router();

clientRouter.get('/', createNewClient);
clientRouter.post('/limits', updateClientLimits);

export default clientRouter;
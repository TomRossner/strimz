import { Router } from "express";
import { createNewClient } from "../controllers/stream.controller.js";

const clientRouter = Router();

clientRouter.get('/', createNewClient);

export default clientRouter;
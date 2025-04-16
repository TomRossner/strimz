import { Router } from "express";
import { handleNewReport } from "../controllers/report.controller.js";

const reportRouter = Router();

reportRouter.post('/', handleNewReport);
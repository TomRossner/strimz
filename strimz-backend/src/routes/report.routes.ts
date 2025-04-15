import { Router } from "express";
import { handleNewReport } from "../controllers/report.controller";

const reportRouter = Router();

reportRouter.post('/', handleNewReport);
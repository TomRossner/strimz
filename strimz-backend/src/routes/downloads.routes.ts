import { Router } from "express";
import { getAllDownloads, getDownloadedFiles } from "../controllers/stream.controller.js";

const downloadsRouter = Router();

downloadsRouter.get('/get-downloads', getAllDownloads);
downloadsRouter.get('/get-downloaded-files', getDownloadedFiles);

export default downloadsRouter;
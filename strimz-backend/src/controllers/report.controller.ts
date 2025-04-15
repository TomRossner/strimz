import { Request, Response } from "express";

export const handleNewReport = async (req: Request, res: Response) => {
    try {
        console.log(req.body);
        res.status(200).json("Report sent!");
    } catch (error) {
        res.status(400).json({error: "Failed sending report"});
    }
}
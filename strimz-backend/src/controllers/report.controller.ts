import { Request, Response } from "express";
import fs from "fs";
import os from "os";
import path from "path";

const reportsDir = path.join(os.homedir(), ".strimz");
const reportsFile = path.join(reportsDir, "reports.json");

type StoredReport = {
    id: string;
    description: string;
    screenshots: string[];
    createdAt: string;
};

export const handleNewReport = async (req: Request, res: Response) => {
    try {
        const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";
        if (!description) {
            return res.status(400).json({ error: "Description is required" });
        }

        const screenshots = Array.isArray(req.body?.screenshots)
            ? req.body.screenshots.filter((shot: unknown) => typeof shot === "string").slice(0, 4)
            : [];

        const entry: StoredReport = {
            id: `${Date.now()}`,
            description,
            screenshots,
            createdAt: new Date().toISOString(),
        };

        fs.mkdirSync(reportsDir, { recursive: true });
        const existing: StoredReport[] = fs.existsSync(reportsFile)
            ? JSON.parse(fs.readFileSync(reportsFile, "utf8"))
            : [];
        existing.push(entry);
        fs.writeFileSync(reportsFile, JSON.stringify(existing, null, 2));

        return res.status(200).json({ ok: true, id: entry.id });
    } catch (error) {
        console.error(error);
        return res.status(400).json({ error: "Failed sending report" });
    }
};

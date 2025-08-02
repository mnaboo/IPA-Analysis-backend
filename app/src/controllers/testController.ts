import { Request, Response } from "express";

export const testApi = (req: Request, res: Response): void => {
  res.status(200).json({ message: "API is working 🚀" });
};

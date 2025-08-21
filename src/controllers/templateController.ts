// src/controllers/templateController.ts
import { Request, Response } from "express";
import {
  createTemplate,
  deleteTemplateById,
  getTemplateById,
  getTemplates,
  updateTemplateById,
} from "../models/template";

// POST /api/v1/templates
export const createTemplateController = async (req: Request, res: Response) => {
  try {
    const { name, description, closedQuestions, openQuestion } = req.body;

    const createdBy = (req as any).currentUser?._id ?? null;
    if (!createdBy) return res.status(401).json({ message: "Unauthorized" });

    if (!name || !name.trim()) {
      return res.status(400).json({ status: "failed", message: "Name is required" });
    }

    const template = await createTemplate({
      name: name.trim(),
      description: description ?? '',
      closedQuestions,
      openQuestion,
      createdBy,
    });

    return res.status(201).json({ status: "success", data: template });
  } catch (err) {
    console.error("createTemplate error:", err);
    return res.status(500).json({ status: "error", message: "Template creation failed" });
  }
};

// PUT /api/v1/templates/:id
export const updateTemplateController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await updateTemplateById(id, req.body);

    if (!updated) {
      return res.status(404).json({ status: "fail", message: "Template not found" });
    }

    return res.status(200).json({ status: "success", data: updated });
  } catch (err) {
    console.error("updateTemplate error:", err);
    return res.status(500).json({ status: "error", message: "Template update failed" });
  }
};

// DELETE /api/v1/templates/:id
export const deleteTemplateController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await deleteTemplateById(id);

    if (!deleted) {
      return res.status(404).json({ status: "fail", message: "Template not found" });
    }

    return res.status(204).send();
  } catch (err) {
    console.error("deleteTemplate error:", err);
    return res.status(500).json({ status: "error", message: "Template deletion failed" });
  }
};

// GET /api/v1/templates
export const getTemplatesController = async (_req: Request, res: Response) => {
  try {
    const templates = await getTemplates();
    return res.status(200).json({ status: "success", data: templates });
  } catch (err) {
    console.error("getTemplates error:", err);
    return res.status(500).json({ status: "error", message: "Fetching templates failed" });
  }
};

// GET /api/v1/templates/:id
export const getTemplateByIdController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const template = await getTemplateById(id);

    if (!template) {
      return res.status(404).json({ status: "fail", message: "Template not found" });
    }

    return res.status(200).json({ status: "success", data: template });
  } catch (err) {
    console.error("getTemplateById error:", err);
    return res.status(500).json({ status: "error", message: "Fetching template failed" });
  }
};

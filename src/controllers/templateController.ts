// src/controllers/templateController.ts
import { Request, Response } from "express";
import { isValidObjectId, Types } from "mongoose";
import templateModel, {
  createTemplate,
  deleteTemplateById,
  getTemplateById,
  updateTemplateById,
} from "../models/template";
import userModel from "../models/user";

// POST /api/v1/templates
export const createTemplateController = async (req: Request, res: Response) => {
  try {
    const { name, description, closedQuestions, openQuestion } = req.body;

    const createdBy = (req as any).currentUser?._id ?? null;
    if (!createdBy) return res.status(401).json({ status: "failed", message: "Unauthorized" });

    if (!name || !String(name).trim()) {
      return res.status(400).json({ status: "failed", message: "Name is required" });
    }

    const template = await createTemplate({
      name: String(name).trim(),
      description: description ?? "",
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

    if (!isValidObjectId(id)) {
      return res.status(400).json({ status: "failed", message: "Invalid template id" });
    }

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

    if (!isValidObjectId(id)) {
      return res.status(400).json({ status: "failed", message: "Invalid template id" });
    }

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

// POST /api/v1/admin/templates/list
export const getTemplatesController = async (req: Request, res: Response) => {
  try {
    const rowPePage = Math.min(Math.max(parseInt(String(req.body?.rowPePage ?? "10"), 10) || 10, 1), 100);
    const Page = Math.max(parseInt(String(req.body?.Page ?? "1"), 10) || 1, 1);
    const skip = (Page - 1) * rowPePage;
    const search = String(req.body?.search ?? "").trim();

    const filter: any = {};
    if (search) filter.name = { $regex: `^${escapeRegex(search)}`, $options: "i" };

    const projection = {
      _id: 1,
      name: 1,
      description: 1,
      closedQuestions: 1,
      openQuestion: 1,
      createdBy: 1,
      createdAt: 1,
      updatedAt: 1,
    };

    const [templates, total] = await Promise.all([
      templateModel.find(filter, projection).sort({ createdAt: -1 }).skip(skip).limit(rowPePage).lean(),
      templateModel.countDocuments(filter),
    ]);

    // 🔹 Pobierz userów tworzących template’y
    const userIds = [...new Set(templates.map(t => String(t.createdBy)).filter(Boolean))];
    const users = await userModel.find({ _id: { $in: userIds } }, { _id: 1, index: 1 }).lean();
    const userMap = new Map(users.map(u => [String(u._id), u.index]));

    const data = templates.map(t => ({
      ...t,
      createdByIndex: t.createdBy ? userMap.get(String(t.createdBy)) ?? null : null,
    }));

    return res.status(200).json({ total, data });
  } catch (err) {
    console.error("getTemplates error:", err);
    return res.status(500).json({ status: "error", message: "Fetching templates failed" });
  }
};

// GET /api/v1/templates/:id
export const getTemplateByIdController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ status: "failed", message: "Invalid template id" });
    }

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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// src/controllers/templateController.ts
import { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import templateModel, {
  createTemplate,
  deleteTemplateById,
  getTemplateById,
  updateTemplateById,
} from "../models/template";

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

/**
 * LIST TEMPLATES with pagination + search by name
 *
 * POST /api/v1/templates/list
 * Body:
 * {
 *   "rowPePage": 10,
 *   "Page": 1,
 *   "search": "ABC"
 * }
 *
 * Response:
 * {
 *   "total": 17,
 *   "data": [...]
 * }
 */
export const getTemplatesController = async (req: Request, res: Response) => {
  try {
    const rowPePageRaw = req.body?.rowPePage;
    const pageRaw = req.body?.Page;
    const searchRaw = req.body?.search;

    const rowPePage = Math.min(Math.max(parseInt(String(rowPePageRaw ?? "10"), 10) || 10, 1), 100);
    const Page = Math.max(parseInt(String(pageRaw ?? "1"), 10) || 1, 1);
    const skip = (Page - 1) * rowPePage;

    const search = String(searchRaw ?? "").trim();

    const filter: Record<string, any> = {};
    if (search) {
      // prefix search po name (case-insensitive)
      filter.name = { $regex: `^${escapeRegex(search)}`, $options: "i" };

      // jeśli chcesz "contains", zamień na:
      // filter.name = { $regex: escapeRegex(search), $options: "i" };
    }

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

    const [data, total] = await Promise.all([
      templateModel
        .find(filter, projection)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(rowPePage)
        .lean(),
      templateModel.countDocuments(filter),
    ]);

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

// --- helpers ---
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// src/controllers/testController.ts
import { Request, Response } from "express";
import { isValidObjectId } from "mongoose";

import {
  createTest,
  deleteTestById,
  getTestById,
  getTests,
  updateTestById,
} from "../models/test";

import groupModel, { assignTestToGroup, getGroupById } from "../models/group";
import { getTemplateById } from "../models/template";

type Id = string;

function parseDateOrNull(v: any): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * POST /api/v1/tests
 * Create a new test from a template and assign it to a group
 *
 * Body:
 * {
 *   templateId: string,
 *   groupId: string,
 *   name?: string,
 *   description?: string,
 *   startsAt: string | Date,
 *   endsAt: string | Date
 * }
 */
export const createTestFromTemplate = async (req: Request, res: Response) => {
  try {
    const { templateId, groupId, name, description, startsAt, endsAt } = req.body;

    const createdBy: Id | null = (req as any).currentUser?._id ?? null;
    if (!createdBy) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    if (!isValidObjectId(templateId)) {
      return res.status(400).json({ status: "failed", message: "Invalid templateId" });
    }
    if (!isValidObjectId(groupId)) {
      return res.status(400).json({ status: "failed", message: "Invalid groupId" });
    }

    const s = parseDateOrNull(startsAt);
    const e = parseDateOrNull(endsAt);

    if (!s) return res.status(400).json({ status: "failed", message: "startsAt is required and must be a valid date" });
    if (!e) return res.status(400).json({ status: "failed", message: "endsAt is required and must be a valid date" });
    if (e <= s) return res.status(400).json({ status: "failed", message: "endsAt must be later than startsAt" });

    const [template, group] = await Promise.all([
      getTemplateById(templateId),
      getGroupById(groupId),
    ]);

    if (!template) {
      return res.status(404).json({ status: "fail", message: "Template not found" });
    }
    if (!group) {
      return res.status(404).json({ status: "fail", message: "Group not found" });
    }

    const newTest = await createTest({
      name: String(name ?? "").trim() || template.name,
      description: description ?? template.description,
      template: templateId,
      createdBy,
      startsAt: s,
      endsAt: e,
    });

    await assignTestToGroup(groupId, newTest._id.toString());

    return res.status(201).json({ status: "success", data: newTest });
  } catch (err) {
    console.error("createTestFromTemplate error:", err);
    return res.status(500).json({ status: "error", message: "Test creation failed" });
  }
};

/**
 * GET /api/v1/tests/group/:groupId
 * Fetch all tests assigned to a given group
 */
export const getTestsForGroup = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;

    if (!isValidObjectId(groupId)) {
      return res.status(400).json({ status: "failed", message: "Invalid groupId" });
    }

    const group = await getGroupById(groupId);
    if (!group || !group.tests || group.tests.length === 0) {
      return res.status(404).json({ status: "fail", message: "Group not found or has no tests" });
    }

    const testIds = group.tests.map((t: any) => t.test || t); // wspiera oba formaty

    const tests = await getTests().where("_id").in(testIds);
    return res.status(200).json({ status: "success", data: tests });
  } catch (err) {
    console.error("getTestsForGroup error:", err);
    return res.status(500).json({ status: "error", message: "Fetching tests failed" });
  }
};

/**
 * GET /api/v1/tests/:id
 * Fetch a single test by its ID
 */
export const getTestByIdController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ status: "failed", message: "Invalid test id" });
    }

    const test = await getTestById(id);

    if (!test) {
      return res.status(404).json({ status: "fail", message: "Test not found" });
    }

    return res.status(200).json({ status: "success", data: test });
  } catch (err) {
    console.error("getTestById error:", err);
    return res.status(500).json({ status: "error", message: "Fetching test failed" });
  }
};

/**
 * PATCH /api/v1/tests/:id
 * Partial update of test params (name/description/startsAt/endsAt/active).
 *
 * Body (any subset):
 * {
 *   name?: string,
 *   description?: string,
 *   startsAt?: string | Date,
 *   endsAt?: string | Date,
 *   active?: boolean
 * }
 */
export const updateTestController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ status: "failed", message: "Invalid test id" });
    }

    const existing = await getTestById(id);
    if (!existing) {
      return res.status(404).json({ status: "fail", message: "Test not found" });
    }

    const patch: Record<string, any> = {};

    if (req.body?.name !== undefined) patch.name = String(req.body.name).trim();
    if (req.body?.description !== undefined) patch.description = req.body.description;

    const s = req.body?.startsAt !== undefined ? parseDateOrNull(req.body.startsAt) : null;
    const e = req.body?.endsAt !== undefined ? parseDateOrNull(req.body.endsAt) : null;

    if (req.body?.startsAt !== undefined && !s) {
      return res.status(400).json({ status: "failed", message: "startsAt must be a valid date" });
    }
    if (req.body?.endsAt !== undefined && !e) {
      return res.status(400).json({ status: "failed", message: "endsAt must be a valid date" });
    }

    const startsAtFinal = s ?? (existing as any).startsAt;
    const endsAtFinal = e ?? (existing as any).endsAt;

    if (startsAtFinal && endsAtFinal && new Date(endsAtFinal) <= new Date(startsAtFinal)) {
      return res.status(400).json({ status: "failed", message: "endsAt must be later than startsAt" });
    }

    if (s) patch.startsAt = s;
    if (e) patch.endsAt = e;

    if (req.body?.active !== undefined) {
      const v = req.body.active;
      if (typeof v === "boolean") patch.active = v;
      else if (typeof v === "string") patch.active = v.toLowerCase() === "true";
      else patch.active = Boolean(v);
    }

    const updated = await updateTestById(id, patch);

    if (!updated) {
      return res.status(404).json({ status: "fail", message: "Test not found" });
    }

    return res.status(200).json({ status: "success", data: updated });
  } catch (err) {
    console.error("updateTest error:", err);
    return res.status(500).json({ status: "error", message: "Test update failed" });
  }
};


/**
 * DELETE /api/v1/tests/:id/group/:groupId
 * Delete test AND remove its assignment from the given group.
 *
 * To keep it deterministic, you pass groupId in URL.
 */
export const deleteTestController = async (req: Request, res: Response) => {
  try {
    const { id, groupId } = req.params as { id: Id; groupId: Id };

    if (!isValidObjectId(id)) {
      return res.status(400).json({ status: "failed", message: "Invalid test id" });
    }
    if (!isValidObjectId(groupId)) {
      return res.status(400).json({ status: "failed", message: "Invalid groupId" });
    }

    const group = await getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ status: "fail", message: "Group not found" });
    }

    // usuń przypisanie testu z grupy
    await Promise.all([
      groupModel.updateOne({ _id: groupId }, { $pull: { tests: { test: id } } }),
      groupModel.updateOne({ _id: groupId }, { $pull: { tests: id } }),
    ]);

    const deleted = await deleteTestById(id);

    if (!deleted) {
      return res.status(404).json({ status: "fail", message: "Test not found" });
    }

    return res.status(200).json({
      status: "success",
      message: "Test deleted and unassigned from group",
      data: {
        _id: deleted._id,
        name: deleted.name,
        groupId,
      },
    });
  } catch (err) {
    console.error("deleteTest error:", err);
    return res.status(500).json({ status: "error", message: "Test deletion failed" });
  }
};

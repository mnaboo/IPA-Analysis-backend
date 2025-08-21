// src/controllers/testController.ts
import { Request, Response } from "express";
import { createTest, getTestById, getTests } from "../models/test";
import { assignTestToGroup, getGroupById } from "../models/group";
import { getTemplateById } from "../models/template";

/**
 * POST /api/v1/tests
 * Create a new test from a template and assign it to a group
 */
export const createTestFromTemplate = async (req: Request, res: Response) => {
  try {
    const { templateId, groupId, name, description } = req.body;

    const createdBy = (req as any).currentUser?._id ?? null;
    if (!createdBy) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    const template = await getTemplateById(templateId);
    if (!template) {
      return res.status(404).json({ status: "fail", message: "Template not found" });
    }

    const newTest = await createTest({
      name: name?.trim() || template.name,
      description: description ?? template.description,
      template: templateId,
      createdBy,
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

    const group = await getGroupById(groupId);
    if (!group || !group.tests || group.tests.length === 0) {
      return res.status(404).json({ status: "fail", message: "Group not found or has no tests" });
    }

    const testIds = group.tests.map((t: any) => t.test || t); // wspiera oba formaty: ObjectId i { test: ObjectId }

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

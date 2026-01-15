// src/controllers/questionTemplateController.ts
import { Request, Response } from "express";
import templateModel from "../models/template";

// POST /api/v1/templates/:templateId/questions
export const addQuestionToTemplate = async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const { text, type } = req.body;

    if (!text || !type || !['importance', 'performance'].includes(type)) {
      return res.status(400).json({ status: "fail", message: "Invalid question data" });
    }

    const updatedTemplate = await templateModel.findByIdAndUpdate(
      templateId,
      { $push: { closedQuestions: { text, type } } },
      { new: true }
    );

    if (!updatedTemplate) {
      return res.status(404).json({ status: "fail", message: "Template not found" });
    }

    return res.status(200).json({ status: "success", data: updatedTemplate });
  } catch (err) {
    console.error("addQuestionToTemplate error:", err);
    return res.status(500).json({ status: "error", message: "Adding question failed" });
  }
};

// PUT /api/v1/templates/questions/:questionId
export const updateQuestion = async (req: Request, res: Response) => {
  try {
    const { questionId } = req.params;
    const { text, type } = req.body;

    if (!text || !type || !['importance', 'performance'].includes(type)) {
      return res.status(400).json({ status: "fail", message: "Invalid question data" });
    }

    const template = await templateModel.findOneAndUpdate(
      { "closedQuestions._id": questionId },
      {
        $set: {
          "closedQuestions.$.text": text,
          "closedQuestions.$.type": type
        }
      },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ status: "fail", message: "Question not found" });
    }

    return res.status(200).json({ status: "success", data: template });
  } catch (err) {
    console.error("updateQuestion error:", err);
    return res.status(500).json({ status: "error", message: "Updating question failed" });
  }
};

// DELETE /api/v1/templates/questions/:questionId
export const deleteQuestion = async (req: Request, res: Response) => {
  try {
    const { questionId } = req.params;

    const template = await templateModel.findOneAndUpdate(
      { "closedQuestions._id": questionId },
      { $pull: { closedQuestions: { _id: questionId } } },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ status: "fail", message: "Question not found" });
    }

    return res.status(200).json({ status: "success", data: template });
  } catch (err) {
    console.error("deleteQuestion error:", err);
    return res.status(500).json({ status: "error", message: "Deleting question failed" });
  }
};

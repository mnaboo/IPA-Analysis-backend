// src/controllers/answerController.ts
import { Request, Response } from "express";
import {
  createAnswer,
  getAnswersByTestId,
  getAnswersByUserId,
  hasUserAnsweredTest,
  getAveragedResultsForTest,
} from "../models/testResponse";

import { getTestById } from "../models/test";

// POST /api/v1/answers/:testId
export const submitAnswersController = async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    const userId = (req as any).currentUser?._id;

    const { closedAnswers, openAnswer } = req.body as {
      closedAnswers: { questionId: string; value: number }[];
      openAnswer?: string;
    };

    if (!userId) {
      return res.status(401).json({ status: "fail", message: "Unauthorized" });
    }

    if (!Array.isArray(closedAnswers) || closedAnswers.length === 0) {
      return res.status(400).json({ status: "fail", message: "At least one closed answer is required." });
    }

    const test = await getTestById(testId);
    if (!test) {
      return res.status(404).json({ status: "fail", message: "Test not found" });
    }

    const alreadyAnswered = await hasUserAnsweredTest(userId, testId);
    if (alreadyAnswered) {
      return res.status(400).json({ status: "fail", message: "User already submitted answers for this test" });
    }

    const saved = await createAnswer({
      test: testId,
      user: userId,
      closedAnswers,
      openAnswer: openAnswer?.trim() || null,
    });

    return res.status(201).json({ status: "success", data: saved });
  } catch (err) {
    console.error("submitAnswers error:", err);
    return res.status(500).json({ status: "error", message: "Submitting answers failed" });
  }
};

// GET /api/v1/answers/test/:testId
export const getAnswersByTestController = async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    const answers = await getAnswersByTestId(testId);
    return res.status(200).json({ status: "success", data: answers });
  } catch (err) {
    console.error("getAnswersByTest error:", err);
    return res.status(500).json({ status: "error", message: "Failed to get answers by test" });
  }
};

// GET /api/v1/answers/user/:userId
export const getAnswersByUserController = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const answers = await getAnswersByUserId(userId);
    return res.status(200).json({ status: "success", data: answers });
  } catch (err) {
    console.error("getAnswersByUser error:", err);
    return res.status(500).json({ status: "error", message: "Failed to get answers by user" });
  }
};

// GET /api/v1/answers/results/:testId
export const getAggregatedResultsController = async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    const results = await getAveragedResultsForTest(testId);

    if (!results) {
      return res.status(404).json({ status: "fail", message: "No responses found for this test" });
    }

    return res.status(200).json({
  status: "success",
  data: {
    avgImportance: results.avgImportance,
    avgPerformance: results.avgPerformance,
  },
});

  } catch (err) {
    console.error("getAggregatedResults error:", err);
    return res.status(500).json({ status: "error", message: "Failed to aggregate IPA results" });
  }
};

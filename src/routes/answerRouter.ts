import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  submitAnswersController,
  getAnswersByTestController,
  getAnswersByUserController,
  getAggregatedResultsController,
} from '../controllers/answerController';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Answers
 *     description: Submit and retrieve answers
 */

// Wszystkie endpointy wymagają autoryzacji
router.use(requireAuth);

/**
 * @openapi
 * /api/v1/answers/{testId}:
 *   post:
 *     tags: [Answers]
 *     summary: Submit answers to a test
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [closedAnswers]
 *             properties:
 *               closedAnswers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionId: { type: string }
 *                     importance: { type: integer, minimum: 1, maximum: 5 }
 *                     performance: { type: integer, minimum: 1, maximum: 5 }
 *               openAnswer:
 *                 type: string
 *     responses:
 *       201: { description: Answers submitted successfully }
 *       400: { description: Already submitted or invalid data }
 *       404: { description: Test not found }
 */
router.post('/:testId', submitAnswersController);

/**
 * @openapi
 * /api/v1/answers/test/{testId}:
 *   get:
 *     tags: [Answers]
 *     summary: Get all answers for a given test
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Answers retrieved }
 *       404: { description: Test not found }
 */
router.get('/test/:testId', getAnswersByTestController);

/**
 * @openapi
 * /api/v1/answers/user/{userId}:
 *   get:
 *     tags: [Answers]
 *     summary: Get all answers by a user
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Answers retrieved }
 *       404: { description: User not found }
 */
router.get('/user/:userId', getAnswersByUserController);

/**
 * @openapi
 * /api/v1/answers/results/{testId}:
 *   get:
 *     tags: [Answers]
 *     summary: Get aggregated IPA results for a test
 *     description: Returns averaged importance and performance
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Aggregated results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     importance: { type: number }
 *                     performance: { type: number }
 *                     totalResponses: { type: number }
 *       404: { description: Test not found }
 */
router.get('/results/:testId', getAggregatedResultsController);

export default router;

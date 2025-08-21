import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { Role } from '../models/user';

import {
  addQuestionToTemplate,
  updateQuestion,
  deleteQuestion,
} from '../controllers/questionTemplateController';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: QuestionTemplates
 *     description: Manage closed questions within a template (admin only)
 */

// Wszystkie operacje tylko dla admina
router.use(requireAuth, requireRole(Role.Admin));

/**
 * @openapi
 * /api/v1/questions/{templateId}:
 *   post:
 *     tags: [QuestionTemplates]
 *     summary: Add a closed question to a template
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text, type]
 *             properties:
 *               text:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [importance, performance]
 *     responses:
 *       201:
 *         description: Question added
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Template not found
 */
router.post('/:templateId', addQuestionToTemplate);

/**
 * @openapi
 * /api/v1/questions/{questionId}:
 *   patch:
 *     tags: [QuestionTemplates]
 *     summary: Update an existing closed question
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [importance, performance]
 *     responses:
 *       200:
 *         description: Question updated
 *       404:
 *         description: Question not found
 */
router.patch('/:questionId', updateQuestion);

/**
 * @openapi
 * /api/v1/questions/{questionId}:
 *   delete:
 *     tags: [QuestionTemplates]
 *     summary: Delete a closed question from a template
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Question deleted
 *       404:
 *         description: Question not found
 */
router.delete('/:questionId', deleteQuestion);

export default router;

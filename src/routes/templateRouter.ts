import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { Role } from '../models/user';
import {
  createTemplateController,
  deleteTemplateController,
  getTemplateByIdController,
  getTemplatesController,
  updateTemplateController,
} from '../controllers/templateController';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Templates
 *     description: Admin endpoints for managing question templates
 */

// Wszystkie endpointy wymagają autoryzacji i roli Admin
router.use(requireAuth, requireRole(Role.Admin));

/**
 * @openapi
 * /api/v1/templates:
 *   post:
 *     tags: [Templates]
 *     summary: Create a new question template
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, closedQuestions]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               closedQuestions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     text: { type: string }
 *               openQuestion:
 *                 type: object
 *                 nullable: true
 *                 properties:
 *                   text: { type: string }
 *     responses:
 *       201: { description: Template created }
 *       401: { description: Unauthorized }
 *       500: { description: Internal server error }
 */
router.post('/', createTemplateController);

/**
 * @openapi
 * /api/v1/templates:
 *   get:
 *     tags: [Templates]
 *     summary: Get all templates
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     responses:
 *       200:
 *         description: List of templates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Template' }
 */
router.get('/', getTemplatesController);

/**
 * @openapi
 * /api/v1/templates/{id}:
 *   get:
 *     tags: [Templates]
 *     summary: Get a single template by ID
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Template found }
 *       404: { description: Template not found }
 */
router.get('/:id', getTemplateByIdController);

/**
 * @openapi
 * /api/v1/templates/{id}:
 *   put:
 *     tags: [Templates]
 *     summary: Update a template by ID
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               closedQuestions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     text: { type: string }
 *               openQuestion:
 *                 type: object
 *                 nullable: true
 *                 properties:
 *                   text: { type: string }
 *     responses:
 *       200: { description: Template updated }
 *       404: { description: Template not found }
 */
router.put('/:id', updateTemplateController);

/**
 * @openapi
 * /api/v1/templates/{id}:
 *   delete:
 *     tags: [Templates]
 *     summary: Delete a template by ID
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Template deleted successfully }
 *       404: { description: Template not found }
 */
router.delete('/:id', deleteTemplateController);

export default router;

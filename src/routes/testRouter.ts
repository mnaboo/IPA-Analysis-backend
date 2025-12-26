import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { Role } from '../models/user';

import {
  createTestFromTemplate,
  getTestsForGroup,
  getTestByIdController,
  updateTestController,
  deleteTestController,
} from '../controllers/testController';

const router = Router();
const routerAdmin = Router();

/**
 * @openapi
 * tags:
 *   - name: Test
 *     description: Endpoints related to test instances
 */

// User routes (auth required)
router.use(requireAuth);

// Admin routes (auth + admin)
routerAdmin.use(requireAuth, requireRole(Role.Admin));

/**
 * @openapi
 * /api/v1/admin/tests:
 *   post:
 *     tags: [Test]
 *     summary: Create a test from template and assign to group (admin)
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [templateId, groupId, startsAt, endsAt]
 *             properties:
 *               templateId: { type: string }
 *               groupId: { type: string }
 *               name: { type: string }
 *               description: { type: string }
 *               startsAt:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-01-01T10:00:00.000Z"
 *               endsAt:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-01-10T10:00:00.000Z"
 *     responses:
 *       201: { description: Test created and assigned }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       404: { description: Template or group not found }
 *       500: { description: Server error }
 */
routerAdmin.post('/', createTestFromTemplate);

/**
 * @openapi
 * /api/v1/admin/tests/{id}:
 *   patch:
 *     tags: [Test]
 *     summary: Update test parameters (admin)
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
 *               startsAt:
 *                 type: string
 *                 format: date-time
 *               endsAt:
 *                 type: string
 *                 format: date-time
 *               active: { type: boolean }
 *     responses:
 *       200: { description: Updated }
 *       400: { description: Invalid id / validation error }
 *       404: { description: Test not found }
 *       500: { description: Server error }
 */
routerAdmin.patch('/:id', updateTestController);

/**
 * @openapi
 * /api/v1/admin/tests/{id}/group/{groupId}:
 *   delete:
 *     tags: [Test]
 *     summary: Delete test and remove its assignment from given group (admin)
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 *       400: { description: Invalid id / groupId }
 *       404: { description: Group or test not found }
 *       500: { description: Server error }
 */
routerAdmin.delete('/:id/group/:groupId', deleteTestController);

/**
 * @openapi
 * /api/v1/tests/group/{groupId}:
 *   get:
 *     tags: [Test]
 *     summary: Get all tests for a given group (authenticated users)
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of tests }
 *       400: { description: Invalid groupId }
 *       404: { description: Group not found or has no tests }
 *       500: { description: Server error }
 */
router.get('/group/:groupId', getTestsForGroup);

/**
 * @openapi
 * /api/v1/tests/{id}:
 *   get:
 *     tags: [Test]
 *     summary: Get test by ID (authenticated users)
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Test details }
 *       400: { description: Invalid test id }
 *       404: { description: Test not found }
 *       500: { description: Server error }
 */
router.get('/:id', getTestByIdController);

export default router;
export { routerAdmin };

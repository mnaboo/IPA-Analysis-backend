import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { Role } from '../models/user';

import {
  createTestFromTemplate,
  getTestsForGroup,
  getTestByIdController,
} from '../controllers/testController';

const router = Router();
const routerAdmin = Router();
/**
 * @openapi
 * tags:
 *   - name: Test
 *     description: Endpoints related to test instances (admin only)
 */

// Wszystkie poniższe endpointy wymagają uwierzytelnienia i roli admina
router.use(requireAuth);
routerAdmin.use(requireAuth, requireRole(Role.Admin));
/**
 * @openapi
 * /api/v1/admin/tests:
 *   post:
 *     tags: [Test]
 *     summary: Create a test from template and assign to group
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [templateId, groupId]
 *             properties:
 *               templateId: { type: string }
 *               groupId: { type: string }
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Test created and assigned
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
routerAdmin.post('/', createTestFromTemplate);

/**
 * @openapi
 * /api/v1/tests/group/{groupId}:
 *   get:
 *     tags: [Test]
 *     summary: Get all tests for a given group
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of tests
 *       404:
 *         description: Group not found
 *       500:
 *         description: Server error
 */
router.get('/group/:groupId', getTestsForGroup);

/**
 * @openapi
 * /api/v1/tests/{id}:
 *   get:
 *     tags: [Test]
 *     summary: Get test by ID
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Test details
 *       404:
 *         description: Test not found
 *       500:
 *         description: Server error
 */
router.get('/:id', getTestByIdController);

export default router;
export {routerAdmin};

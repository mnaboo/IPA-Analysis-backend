import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { Role } from '../models/user';
import { listUsers, getUser, setUserRole, deleteUser } from '../controllers/adminController';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Admin - User Management
 *     description: Admin-only endpoints for User Management
 */

// Wszystko poniżej tylko dla zalogowanych adminów
router.use(requireAuth, requireRole(Role.Admin));

/**
 * @openapi
 * /api/v1/admin/users:
 *   get:
 *     tags: [Admin - User Management]
 *     summary: List users (admin only)
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     responses:
 *       200:
 *         description: Users list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "success" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/User' }
 */
router.get('/users', listUsers);

/**
 * @openapi
 * /api/v1/admin/users/{id}:
 *   get:
 *     tags: [Admin - User Management]
 *     summary: Get single user (admin only)
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
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     user: { $ref: '#/components/schemas/User' }
 *       404: { description: User not found }
 */
router.get('/users/:id', getUser);

/**
 * @openapi
 * /api/v1/admin/users/{id}/role:
 *   patch:
 *     tags: [Admin - User Management]
 *     summary: Change user role (admin only)
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
 *             required: [role]
 *             properties:
 *               role: { $ref: '#/components/schemas/Role' }
 *     responses:
 *       200: { description: Role updated }
 *       400: { description: Invalid role or last-admin protection }
 *       401: { description: Not authenticated }
 *       403: { description: Forbidden }
 *       404: { description: User not found }
 */
router.patch('/users/:id/role', setUserRole);

/**
 * @openapi
 * /api/v1/admin/users/{id}:
 *   delete:
 *     tags: [Admin - User Management]
 *     summary: Delete user (admin only)
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User deleted }
 *       400: { description: Cannot delete yourself / last admin }
 *       401: { description: Not authenticated }
 *       403: { description: Forbidden }
 *       404: { description: User not found }
 */
router.delete('/users/:id', deleteUser);

export default router;

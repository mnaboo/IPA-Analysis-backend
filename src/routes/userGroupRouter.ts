import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { listGroups, myGroups, getGroup, joinGroup, leaveGroup } from '../controllers/userGroupController';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Groups
 *     description: User endpoints for class groups
 */

// Wszystko poniżej tylko dla zalogowanych użytkowników
router.use(requireAuth);

/**
 * @openapi
 * /api/v1/groups:
 *   get:
 *     tags: [Groups]
 *     summary: List all groups (basic info)
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     responses:
 *       200:
 *         description: Groups list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "success" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     groups:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id: { type: string }
 *                           name: { type: string }
 *                           description: { type: string }
 *                           membersCount: { type: number }
 */
router.get('/', listGroups);

/**
 * @openapi
 * /api/v1/groups/me:
 *   get:
 *     tags: [Groups]
 *     summary: List groups the current user belongs to
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     responses:
 *       200:
 *         description: My groups
 */
router.get('/me', myGroups);

/**
 * @openapi
 * /api/v1/groups/{id}:
 *   get:
 *     tags: [Groups]
 *     summary: Get group details
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
 *         description: Group details
 *       400:
 *         description: Invalid group id
 *       404:
 *         description: Group not found
 */
router.get('/:id', getGroup);

/**
 * @openapi
 * /api/v1/groups/{id}/join:
 *   post:
 *     tags: [Groups]
 *     summary: Join a group
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
 *         description: Joined (idempotent)
 *       400:
 *         description: Invalid group id
 *       404:
 *         description: Group not found
 */
router.post('/:id/join', joinGroup);

/**
 * @openapi
 * /api/v1/groups/{id}/leave:
 *   post:
 *     tags: [Groups]
 *     summary: Leave a group
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
 *         description: Left (idempotent)
 *       400:
 *         description: Invalid group id
 *       404:
 *         description: Group not found
 */
router.post('/:id/leave', leaveGroup);

export default router;

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
 *   post:
 *     tags: [Groups]
 *     summary: List groups with pagination and optional search by name
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rowPePage, Page]
 *             properties:
 *               rowPePage:
 *                 type: integer
 *                 example: 10
 *                 minimum: 1
 *                 maximum: 100
 *               Page:
 *                 type: integer
 *                 example: 1
 *                 minimum: 1
 *               search:
 *                 type: string
 *                 example: "Grupa"
 *                 description: Optional search by group name (prefix match, case-insensitive)
 *     responses:
 *       200:
 *         description: Paginated groups list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total: { type: integer, example: 17 }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id: { type: string }
 *                       name: { type: string }
 *                       description: { type: string }
 *                       membersCount: { type: number }
 *                       createdAt: { type: string }
 *                       updatedAt: { type: string }
 */
router.post('/', listGroups);

/**
 * @openapi
 * /api/v1/groups/me:
 *   post:
 *     tags: [Groups]
 *     summary: List groups the current user belongs to (pagination + optional search by name)
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rowPePage, Page]
 *             properties:
 *               rowPePage:
 *                 type: integer
 *                 example: 10
 *                 minimum: 1
 *                 maximum: 100
 *               Page:
 *                 type: integer
 *                 example: 1
 *                 minimum: 1
 *               search:
 *                 type: string
 *                 example: "Grupa"
 *                 description: Optional search by group name (prefix match, case-insensitive)
 *     responses:
 *       200:
 *         description: Paginated my groups list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total: { type: integer, example: 5 }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id: { type: string }
 *                       name: { type: string }
 *                       description: { type: string }
 *                       membersCount: { type: number }
 *                       createdAt: { type: string }
 *                       updatedAt: { type: string }
 */
router.post('/me', myGroups);

/**
 * @openapi
 * /api/v1/groups/{id}:
 *   get:
 *     tags: [Groups]
 *     summary: Get group details (members list only for admin, empty for normal user)
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "success" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     group:
 *                       type: object
 *                       properties:
 *                         _id: { type: string }
 *                         name: { type: string }
 *                         description: { type: string }
 *                         isMember: { type: boolean }
 *                         members:
 *                           type: array
 *                           description: "For admin: list of users. For normal user: empty array."
 *                           items:
 *                             type: object
 *                             properties:
 *                               _id: { type: string }
 *                               index: { type: string }
 *                               mail: { type: string }
 *                               role: { type: string }
 *                               createdAt: { type: string }
 *                               updatedAt: { type: string }
 *                         tests:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               test: { type: string }
 *                               assignedAt: { type: string }
 *                               dueAt: { type: string, nullable: true }
 *                         createdAt: { type: string }
 *                         updatedAt: { type: string }
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

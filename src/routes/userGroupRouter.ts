import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { listGroups, myGroups, getGroup, joinGroup, leaveGroup } from "../controllers/userGroupController";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Groups
 *     description: User endpoints for class groups
 */

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
 *               rowPePage: { type: integer, example: 10, minimum: 1, maximum: 100 }
 *               Page: { type: integer, example: 1, minimum: 1 }
 *               search:
 *                 type: string
 *                 example: "Grupa"
 *                 description: Optional prefix search by group name (case-insensitive)
 *     responses:
 *       200:
 *         description: Paginated groups list
 */
router.post("/", listGroups);

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
 *               rowPePage: { type: integer, example: 10, minimum: 1, maximum: 100 }
 *               Page: { type: integer, example: 1, minimum: 1 }
 *               search:
 *                 type: string
 *                 example: "Grupa"
 *                 description: Optional prefix search by group name (case-insensitive)
 *     responses:
 *       200:
 *         description: Paginated my groups list
 */
router.post("/me", myGroups);

/**
 * @openapi
 * /api/v1/groups/{id}:
 *   get:
 *     tags: [Groups]
 *     summary: Get group details (members list only for admin; normal user gets empty members array)
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
 *         description: Group details with tests (assignedAt + full test info incl. template questions)
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
 *                         tests:
 *                           type: array
 *                           description: "Tests assigned to this group (NO duplication: assignedAt + test object)"
 *                           items:
 *                             type: object
 *                             properties:
 *                               assignedAt: { type: string, format: date-time, nullable: true }
 *                               test:
 *                                 type: object
 *                                 properties:
 *                                   _id: { type: string }
 *                                   name: { type: string }
 *                                   description: { type: string }
 *                                   active: { type: boolean }
 *                                   startsAt: { type: string, format: date-time, nullable: true }
 *                                   endsAt: { type: string, format: date-time, nullable: true }
 *                                   createdAt: { type: string, format: date-time, nullable: true }
 *                                   template:
 *                                     type: object
 *                                     nullable: true
 *                                     properties:
 *                                       _id: { type: string }
 *                                       name: { type: string }
 *                                       description: { type: string }
 *                                       closedQuestions:
 *                                         type: array
 *                                         items:
 *                                           type: object
 *                                           properties:
 *                                             _id: { type: string }
 *                                             text: { type: string }
 *                                             type:
 *                                               type: string
 *                                               enum: [importance, performance]
 *                                       openQuestion:
 *                                         type: object
 *                                         nullable: true
 *                                         properties:
 *                                           text: { type: string, nullable: true }
 *                         createdAt: { type: string, format: date-time }
 *                         updatedAt: { type: string, format: date-time }
 *       400: { description: Invalid group id }
 *       404: { description: Group not found }
 *       500: { description: Server error }
 */
router.get("/:id", getGroup);

/**
 * @openapi
 * /api/v1/groups/{id}/join:
 *   post:
 *     tags: [Groups]
 *     summary: Join a group (idempotent)
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Joined (or already a member) }
 *       400: { description: Invalid group id }
 *       404: { description: Group not found }
 *       500: { description: Server error }
 */
router.post("/:id/join", joinGroup);

/**
 * @openapi
 * /api/v1/groups/{id}/leave:
 *   post:
 *     tags: [Groups]
 *     summary: Leave a group (idempotent)
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Left (or not a member) }
 *       400: { description: Invalid group id }
 *       404: { description: Group not found }
 *       500: { description: Server error }
 */
router.post("/:id/leave", leaveGroup);

export default router;
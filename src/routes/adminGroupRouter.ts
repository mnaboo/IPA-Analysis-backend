import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { Role } from '../models/user';
import {
  createGroup,
  updateGroup,
  deleteGroup,
  assignTest,
  unassignTest,
} from '../controllers/adminGroupController';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: AdminGroups
 *   description: Admin endpoints for managing groups and assignments
 */

// Wszystko poniżej tylko dla zalogowanych adminów
router.use(requireAuth, requireRole(Role.Admin));

/**
 * @swagger
 * /api/v1/admin/groups:
 *   post:
 *     summary: Create a new group
 *     tags: [AdminGroups]
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Grupa A
 *               description:
 *                 type: string
 *                 example: Laboratoria poniedziałek 8:00
 *     responses:
 *       201:
 *         description: Group created
 *       400:
 *         description: Name is required
 */
router.post('/', createGroup);

/**
 * @swagger
 * /api/v1/admin/groups/{id}:
 *   patch:
 *     summary: Update group (name/description)
 *     tags: [AdminGroups]
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               name:
 *                 type: string
 *                 example: Grupa A1
 *               description:
 *                 type: string
 *                 example: Zmieniony opis grupy
 *     responses:
 *       200:
 *         description: Group updated
 *       400:
 *         description: Invalid group id
 *       404:
 *         description: Group not found
 */
router.patch('/:id', updateGroup);

/**
 * @swagger
 * /api/v1/admin/groups/{id}:
 *   delete:
 *     summary: Delete group
 *     tags: [AdminGroups]
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group deleted
 *       400:
 *         description: Invalid group id
 *       404:
 *         description: Group not found
 */
router.delete('/:id', deleteGroup);

/**
 * @swagger
 * /api/v1/admin/groups/{id}/tests:
 *   post:
 *     summary: Assign a test to group
 *     tags: [AdminGroups]
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - testId
 *             properties:
 *               testId:
 *                 type: string
 *                 example: 66d3f1a5e1b2c3d4a5f6b789
 *               dueAt:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-09-30T23:59:00.000Z
 *     responses:
 *       200:
 *         description: Test assigned
 *       400:
 *         description: Invalid ids or invalid dueAt date
 *       404:
 *         description: Group not found
 */
router.post('/:id/tests', assignTest);

/**
 * @swagger
 * /api/v1/admin/groups/{id}/tests/{testId}:
 *   delete:
 *     summary: Unassign a test from group
 *     tags: [AdminGroups]
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Test unassigned
 *       400:
 *         description: Invalid ids
 *       404:
 *         description: Group not found
 */
router.delete('/:id/tests/:testId', unassignTest);

export default router;

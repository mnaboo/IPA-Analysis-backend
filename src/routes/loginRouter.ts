import express from "express";
import { getUser, login } from "../controllers/loginController";
import { requireAuth, requireGuest } from "../middleware/auth";

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Auth (login / logout / signup)
 *     description: Endpoints for user login, logout and signup
 */

/**
 * @openapi
 * /api/v1/login:
 *   post:
 *     tags: [Auth (login / logout / signup)]
 *     summary: Log in a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful (cookie set)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Missing or invalid credentials
 *       403:
 *         description: Incorrect password
 */
router.route("/").post(requireGuest, login);

/**
 * @openapi
 * /api/v1/login/getUser:
 *   post:
 *     tags: [Auth (login / logout / signup)]
 *     summary: Get a user based on session token
 *     description: Reads session from cookie **MACIEJ-AUTH** or header **x-session-token**. Body `token` jest tylko fallbackiem.
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 example: d3f0c9...your-token...
 *     responses:
 *       200:
 *         description: User data returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: No session token
 *       404:
 *         description: User not found
 */
router.route("/getUser").post(requireAuth, getUser);

export default router;

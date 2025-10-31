// src/routes/logoutRouter.ts
import express from "express";
import { logout } from "../controllers/logoutController";
import { requireAuth } from "../middleware/auth";

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Logout
 *     description: Endpoint to terminate the current session
 */

// Tylko zalogowani mogą wywołać logout
router.use(requireAuth);

/**
 * @openapi
 * /api/v1/logout:
 *   post:
 *     tags: [Logout]
 *     summary: Log out current user (invalidate session token and clear cookie)
 *     description: Unieważnia `authentication.sessionToken` w bazie i czyści cookie **MACIEJ-AUTH**.
 *     security:
 *       - cookieAuth: []
 *       - sessionToken: []
 *     responses:
 *       200:
 *         description: Logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Logged out
 *       401:
 *         description: Not authenticated
 */
router.post("/", logout);

export default router;

import express from "express";
import { getUser, login } from "../controllers/loginController";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Login
 *   description: Endpoints for user login and authentication
 */

/**
 * @swagger
 * /api/v1/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Login]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mail
 *               - password
 *             properties:
 *               mail:
 *                 type: string
 *                 example: 123456@stud.prz.edu.pl
 *               password:
 *                 type: string
 *                 example: qwerty123
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Missing or invalid credentials
 *       403:
 *         description: Incorrect password
 */
router.route("/").post(login);

/**
 * @swagger
 * /api/v1/login/getUser:
 *   post:
 *     summary: Get a user based on session token
 *     tags: [Login]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 example: d3f0c9...your-token...
 *     responses:
 *       200:
 *         description: User data returned successfully
 *       404:
 *         description: User not found
 */
router.route("/getUser").post(getUser);

export default router;
